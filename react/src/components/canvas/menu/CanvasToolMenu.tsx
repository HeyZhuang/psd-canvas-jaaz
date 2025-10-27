import { Separator } from '@/components/ui/separator'
import { useCanvas } from '@/contexts/canvas'
import { useState } from 'react'
import CanvasMenuButton from './CanvasMenuButton'
import { ToolType } from './CanvasMenuIcon'
import { PSDCanvasUploader } from '../PSDCanvasUploader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Type, Layers, Settings, Eye, EyeOff, Edit3, Bookmark, X, ChevronDown, ChevronRight } from 'lucide-react'
import { TemplateManager } from '@/components/template/TemplateManager'
import { applyTemplateToExcalidraw } from '@/utils/templateCanvas'
import { FontSelector } from '../FontSelector'
import { FontItem } from '@/api/font'
import { toast } from 'sonner'
import { uploadPSD, type PSDUploadResponse, updateLayerProperties, type PSDLayer } from '@/api/upload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, AlertCircle } from 'lucide-react'

interface CanvasToolMenuProps {
  canvasId: string
}

const CanvasToolMenu = ({ canvasId }: CanvasToolMenuProps) => {
  const { excalidrawAPI } = useCanvas()

  const [activeTool, setActiveTool] = useState<ToolType | undefined>(undefined)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showFontSelector, setShowFontSelector] = useState(false)
  const [currentFont, setCurrentFont] = useState<string>('Arial')
  const [psdData, setPsdData] = useState<PSDUploadResponse | null>(null)

  // 图层列表相关状态
  const [showLayerList, setShowLayerList] = useState(false)
  const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'text' | 'layer' | 'group'>('all')
  const [canvasElements, setCanvasElements] = useState<any[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)

  // Resize功能相关状态
  const [showResizeTool, setShowResizeTool] = useState(false)
  const [targetWidth, setTargetWidth] = useState<number>(800)
  const [targetHeight, setTargetHeight] = useState<number>(600)
  const [apiKey, setApiKey] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const handleToolChange = (tool: ToolType) => {
    excalidrawAPI?.setActiveTool({ type: tool })
  }

  excalidrawAPI?.onChange((_elements, appState, _files) => {
    setActiveTool(appState.activeTool.type as ToolType)
  })

  const handlePSDUploaded = (psdData: any) => {
    console.log('PSD uploaded:', psdData)
    setPsdData(psdData)
    // 可以在這裡添加額外的處理邏輯
  }

  const handleFontSelect = (font: FontItem | string) => {
    let fontFamily: string

    if (typeof font === 'string') {
      fontFamily = font
      setCurrentFont(font)
    } else {
      fontFamily = font.font_family
      setCurrentFont(font.font_family)

      // 动态加载自定义字体
      const fontFace = new FontFace(font.font_family, `url(${font.font_file_url})`)
      fontFace.load().then(() => {
        document.fonts.add(fontFace)
        console.log(`字体 ${font.name} 已加载`)
      }).catch((error) => {
        console.error('Failed to load font:', error)
        toast.error('字体加载失败')
      })
    }

    // 通过CSS变量设置全局字体
    document.documentElement.style.setProperty('--excalidraw-font-family', fontFamily)

    // 同时设置Excalidraw容器的字体
    const excalidrawContainer = document.querySelector('.excalidraw')
    if (excalidrawContainer) {
      (excalidrawContainer as HTMLElement).style.fontFamily = fontFamily
    }

    // 通过CSS强制更新所有文本元素的字体
    setTimeout(() => {
      const textElements = document.querySelectorAll('.excalidraw .excalidraw-element[data-type="text"]')
      textElements.forEach(element => {
        (element as HTMLElement).style.fontFamily = fontFamily
      })
    }, 100)

    toast.success(`已选择字体: ${typeof font === 'string' ? font : font.name}`)
  }

  // 图层列表相关函数
  const getLayerCanvasState = (layerIndex: number) => {
    const canvasElement = canvasElements.find(element =>
      element.customData?.psdLayerIndex === layerIndex
    )

    if (!canvasElement) {
      return {
        exists: false,
        visible: false,
        opacity: 100,
        element: null
      }
    }

    const opacityVisible = canvasElement.opacity > 0
    const customDataVisible = canvasElement.customData?.visible !== false
    const isVisible = opacityVisible && customDataVisible

    return {
      exists: true,
      visible: isVisible,
      opacity: canvasElement.opacity || 100,
      element: canvasElement
    }
  }

  const handleLayerVisibilityToggle = async (layerIndex: number) => {
    if (!psdData || !excalidrawAPI) return

    try {
      const canvasState = getLayerCanvasState(layerIndex)
      const newVisible = !canvasState.visible

      if (canvasState.exists) {
        const currentElements = excalidrawAPI.getSceneElements()
        const updatedElements = currentElements.map(element => {
          if (element.customData?.psdLayerIndex === layerIndex) {
            const originalOpacity = element.customData?.originalOpacity || 100
            return {
              ...element,
              opacity: newVisible ? originalOpacity : 0,
              isDeleted: false,
              customData: {
                ...element.customData,
                visible: newVisible
              }
            }
          }
          return element
        })

        excalidrawAPI.updateScene({
          elements: updatedElements,
          appState: excalidrawAPI.getAppState()
        })

        excalidrawAPI.history.clear()
      } else {
        const updatedLayers = psdData.layers.map((layer) =>
          layer.index === layerIndex ? { ...layer, visible: newVisible } : layer
        )

        await updateLayerProperties(psdData.file_id, layerIndex, {
          visible: newVisible
        })

        setPsdData({
          ...psdData,
          layers: updatedLayers,
        })
      }

      toast.success(`图层可见性已切换为: ${newVisible ? '可见' : '隐藏'}`)
    } catch (error) {
      console.error('更新图层可见性失败:', error)
      toast.error('更新图层可见性失败')
    }
  }

  const handleTextPropertyUpdate = async (layerIndex: number, property: string, value: any) => {
    if (!psdData || !excalidrawAPI) return

    try {
      const canvasState = getLayerCanvasState(layerIndex)

      if (canvasState.exists) {
        const currentElements = excalidrawAPI.getSceneElements()
        const updatedElements = currentElements.map(element => {
          if (element.customData?.psdLayerIndex === layerIndex) {
            const updatedElement = { ...element }

            if (property === 'text_content') {
              if (updatedElement.type === 'text') {
                (updatedElement as any).text = value
              }
            } else if (property === 'font_weight') {
              if (updatedElement.type === 'text') {
                (updatedElement as any).fontWeight = value === 'bold' ? 600 : 400
              }
            } else if (property === 'font_style') {
              if (updatedElement.type === 'text') {
                (updatedElement as any).fontStyle = value === 'italic' ? 'italic' : 'normal'
              }
            }

            updatedElement.customData = {
              ...updatedElement.customData,
              [property]: value
            }

            return updatedElement
          }
          return element
        })

        excalidrawAPI.updateScene({
          elements: updatedElements,
          appState: excalidrawAPI.getAppState()
        })
      } else {
        const updatedLayers = psdData.layers.map((layer) =>
          layer.index === layerIndex ? { ...layer, [property]: value } : layer
        )

        await updateLayerProperties(psdData.file_id, layerIndex, { [property]: value })

        setPsdData({
          ...psdData,
          layers: updatedLayers,
        })
      }

      toast.success('文字属性已更新')
    } catch (error) {
      console.error('更新文字属性失败:', error)
      toast.error('更新文字属性失败')
    }
  }

  // Resize功能相关函数 - 使用服务端直接处理（无需下载大文件）
  const handleResize = async () => {
    if (!psdData) {
      setError('没有可用的PSD数据')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setCurrentStep('正在处理PSD文件...')
    setError('')

    try {
      setProgress(10)
      setCurrentStep('正在准备缩放请求...')
      
      // 使用新的服务端处理API，直接传递file_id，无需下载大文件
      const formData = new FormData()
      formData.append('file_id', psdData.file_id)
      formData.append('target_width', targetWidth.toString())
      formData.append('target_height', targetHeight.toString())
      if (apiKey) {
        formData.append('api_key', apiKey)
      }

      setProgress(30)
      setCurrentStep('正在调用Gemini API分析图层（这可能需要1-2分钟）...')

      console.log('开始智能缩放:', {
        file_id: psdData.file_id,
        target_width: targetWidth,
        target_height: targetHeight,
        original_size: { width: psdData.width, height: psdData.height }
      })

      // 使用AbortController设置超时（180秒，因为Gemini API可能需要较长时间）
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180000) // 180秒超时

      try {
        const resizeResponse = await fetch('/api/psd/resize/resize-by-id', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!resizeResponse.ok) {
          let errorMessage = '缩放失败'
          try {
            const errorData = await resizeResponse.json()
            errorMessage = errorData.detail || errorMessage
          } catch {
            errorMessage = `HTTP ${resizeResponse.status}: ${resizeResponse.statusText}`
          }
          throw new Error(errorMessage)
        }

        setProgress(90)
        setCurrentStep('正在处理结果...')

        const resultData = await resizeResponse.json()
        
        setProgress(100)
        setCurrentStep('缩放完成')
        setResult(resultData)
        
        console.log('缩放完成:', resultData)

      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          throw new Error('处理超时（超过3分钟）。可能原因：\n1. Gemini API响应慢\n2. 图层数量过多\n3. 网络连接问题\n\n请稍后重试或减少图层数量。')
        }
        throw fetchError
      }

    } catch (err) {
      console.error('PSD缩放错误:', err)
      
      let errorMessage = err instanceof Error ? err.message : '缩放失败'
      
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (result?.output_url) {
      window.open(result.output_url, '_blank')
    }
  }

  const getLayerIcon = (layer: PSDLayer) => {
    switch (layer.type) {
      case 'text':
        return <Type className="h-3 w-3 text-blue-500" />
      case 'group':
        return <Layers className="h-3 w-3 text-yellow-500" />
      default:
        return <Layers className="h-3 w-3 text-green-500" />
    }
  }

  const getLayerTypeLabel = (layer: PSDLayer) => {
    switch (layer.type) {
      case 'text':
        return '文字'
      case 'group':
        return '群组'
      default:
        return '图层'
    }
  }

  const filteredLayers = psdData?.layers.filter(layer => {
    const matchesSearch = layer.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || layer.type === filterType
    return matchesSearch && matchesFilter
  }).sort((a, b) => a.index - b.index) || []

  const tools: (ToolType | null)[] = [
    'hand',
    'selection',
    null,
    'rectangle',
    'ellipse',
    'arrow',
    'line',
    'freedraw',
    null,
    'text',
    'image',
  ]

  return (
    <>
      <div className="absolute left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 bg-primary-foreground/75 backdrop-blur-lg rounded-lg p-1 shadow-[0_5px_10px_rgba(0,0,0,0.08)] border border-primary/10">
        {tools.map((tool, index) =>
          tool ? (
            <div key={tool} className="flex flex-col items-center gap-1">
              <CanvasMenuButton
                type={tool}
                activeTool={activeTool}
                onClick={() => handleToolChange(tool)}
              />
              {/* 文本工具旁边显示字体选择按钮 */}
              {tool === 'text' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFontSelector(true)}
                  className="h-6 w-6 p-0 text-xs"
                  title={`当前字体: ${currentFont}`}
                >
                  <Type className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <Separator
              key={index}
              orientation="horizontal"
              className="w-6! bg-primary/5"
            />
          )
        )}

        {/* 图层列表按钮 */}
        <Separator
          orientation="horizontal"
          className="w-6! bg-primary/5"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLayerList(!showLayerList)}
          className="h-9 w-9 p-2 flex flex-col items-center gap-1"
          title="图层列表"
          disabled={!psdData}
        >
          <Layers className="h-4 w-4" />
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4 min-w-4">
            {psdData?.layers?.length || 0}
          </Badge>
        </Button>

        {/* Resize缩放按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResizeTool(!showResizeTool)}
          className="h-9 w-9 p-2 flex flex-col items-center gap-1"
          title="智能缩放"
          disabled={!psdData}
        >
          <Settings className="h-4 w-4" />
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4 min-w-4">
            AI
          </Badge>
        </Button>

        {/* 模板按钮 */}
        <Separator
          orientation="horizontal"
          className="w-6! bg-primary/5"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplateManager(true)}
          className="h-9 w-9 p-2 flex flex-col items-center gap-1"
          title="模板管理"
        >
          <Star className="h-4 w-4" />
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4 min-w-4">
            5
          </Badge>
        </Button>

        {/* PSD 上傳按鈕 */}
        <Separator
          orientation="horizontal"
          className="w-6! bg-primary/5"
        />
        <PSDCanvasUploader
          canvasId={canvasId}
          onPSDUploaded={handlePSDUploaded}
        />

      </div>

      {/* 图层列表侧边栏 */}
      {showLayerList && psdData && (
        <div className="absolute left-20 top-1/2 -translate-y-1/2 z-30 w-80 max-h-[80vh] bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg overflow-hidden">
          {/* 图层列表头部 */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="text-sm font-medium">图层列表</span>
              <Badge variant="secondary" className="text-xs">
                {filteredLayers.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLayerList(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* 搜索和过滤 */}
          <div className="p-3 space-y-2 border-b">
            <Input
              placeholder="搜索图层..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full h-7 text-xs border rounded px-2"
            >
              <option value="all">所有图层</option>
              <option value="text">文字图层</option>
              <option value="layer">图像图层</option>
              <option value="group">群组图层</option>
            </select>
          </div>

          {/* 图层列表 */}
          <div className="flex-1 overflow-y-auto max-h-60">
            <div className="p-2 space-y-1">
              {filteredLayers.map((layer) => {
                const canvasState = getLayerCanvasState(layer.index)
                const isVisible = canvasState.exists ? canvasState.visible : layer.visible
                const currentOpacity = canvasState.exists ? canvasState.opacity : Math.round((layer.opacity || 255) / 255 * 100)

                return (
                  <div key={layer.index} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
                    {/* 图层图标 */}
                    <div className="flex-shrink-0">
                      {getLayerIcon(layer)}
                    </div>

                    {/* 图层信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium truncate">
                          {layer.name}
                        </span>
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {getLayerTypeLabel(layer)}
                        </Badge>
                        {canvasState.exists && (
                          <Badge variant="outline" className="text-xs px-1 py-0 text-green-600">
                            画布中
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentOpacity}%
                        {canvasState.exists && (
                          <span className="ml-1 text-green-600">• 实时</span>
                        )}
                      </div>
                    </div>

                    {/* 控制按钮 */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleLayerVisibilityToggle(layer.index)}
                        title={isVisible ? '隐藏图层' : '显示图层'}
                      >
                        {isVisible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3 opacity-50" />
                        )}
                      </Button>

                      {layer.type === 'text' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setSelectedLayer(selectedLayer?.index === layer.index ? null : layer)}
                          title="编辑文字"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 文字编辑面板 */}
          {selectedLayer && selectedLayer.type === 'text' && (
            <div className="p-3 border-t bg-muted/30">
              <div className="text-xs font-medium text-blue-600 mb-2">文字编辑</div>
              <div className="space-y-2">
                <Input
                  value={(() => {
                    const canvasState = getLayerCanvasState(selectedLayer.index)
                    if (canvasState.exists && canvasState.element) {
                      return (canvasState.element as any).text || selectedLayer.text_content || selectedLayer.name || ''
                    }
                    return selectedLayer.text_content || selectedLayer.name || ''
                  })()}
                  onChange={(e) => handleTextPropertyUpdate(selectedLayer.index, 'text_content', e.target.value)}
                  placeholder="输入文字内容"
                  className="text-xs h-7"
                />
                <div className="flex gap-1">
                  <Button
                    variant={(() => {
                      const canvasState = getLayerCanvasState(selectedLayer.index)
                      const fontWeight = canvasState.exists && canvasState.element
                        ? ((canvasState.element as any).fontWeight >= 600 ? 'bold' : 'normal')
                        : selectedLayer.font_weight
                      return fontWeight === 'bold' ? 'default' : 'outline'
                    })()}
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleTextPropertyUpdate(selectedLayer.index, 'font_weight',
                      (() => {
                        const canvasState = getLayerCanvasState(selectedLayer.index)
                        const currentWeight = canvasState.exists && canvasState.element
                          ? ((canvasState.element as any).fontWeight >= 600 ? 'bold' : 'normal')
                          : selectedLayer.font_weight
                        return currentWeight === 'bold' ? 'normal' : 'bold'
                      })()
                    )}
                  >
                    <span className="text-xs font-bold">B</span>
                  </Button>
                  <Button
                    variant={(() => {
                      const canvasState = getLayerCanvasState(selectedLayer.index)
                      const fontStyle = canvasState.exists && canvasState.element
                        ? (canvasState.element as any).fontStyle
                        : selectedLayer.font_style
                      return fontStyle === 'italic' ? 'default' : 'outline'
                    })()}
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleTextPropertyUpdate(selectedLayer.index, 'font_style',
                      (() => {
                        const canvasState = getLayerCanvasState(selectedLayer.index)
                        const currentStyle = canvasState.exists && canvasState.element
                          ? (canvasState.element as any).fontStyle
                          : selectedLayer.font_style
                        return currentStyle === 'italic' ? 'normal' : 'italic'
                      })()
                    )}
                  >
                    <span className="text-xs italic">I</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resize缩放工具侧边栏 */}
      {showResizeTool && psdData && (
        <div className="absolute left-20 top-1/2 -translate-y-1/2 z-30 w-80 max-h-[80vh] bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg overflow-hidden">
          {/* Resize工具头部 */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">智能缩放</span>
              <Badge variant="secondary" className="text-xs">
                AI
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResizeTool(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="p-3 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* PSD文件信息 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">当前PSD文件</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 text-xs">
                  <div><strong>文件ID:</strong> {psdData.file_id}</div>
                  <div><strong>原始尺寸:</strong> {psdData.width} × {psdData.height}</div>
                  <div><strong>图层数量:</strong> {psdData.layers?.length || 0}</div>
                </div>
              </CardContent>
            </Card>

            {/* 目标尺寸设置 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">目标尺寸设置</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="target-width" className="text-xs">目标宽度</Label>
                    <Input
                      id="target-width"
                      type="number"
                      value={targetWidth}
                      onChange={(e) => setTargetWidth(Number(e.target.value))}
                      disabled={isProcessing}
                      min="1"
                      max="4000"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="target-height" className="text-xs">目标高度</Label>
                    <Input
                      id="target-height"
                      type="number"
                      value={targetHeight}
                      onChange={(e) => setTargetHeight(Number(e.target.value))}
                      disabled={isProcessing}
                      min="1"
                      max="4000"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                {/* API密钥设置 */}
                <div className="space-y-1">
                  <Label htmlFor="api-key" className="text-xs">Gemini API密钥 (可选)</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isProcessing}
                    placeholder="如果不提供，将使用环境变量中的密钥"
                    className="h-7 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* 进度条 */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>{currentStep}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full h-2" />
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                onClick={handleResize}
                disabled={!psdData || isProcessing}
                className="flex-1 h-8 text-xs"
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Settings className="h-3 w-3 mr-1" />
                )}
                开始智能缩放
              </Button>
            </div>

            {/* 缩放结果 */}
            {result && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">缩放完成</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">原始尺寸</Label>
                      <div className="text-sm font-semibold">
                        {result.original_size.width} × {result.original_size.height}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">目标尺寸</Label>
                      <div className="text-sm font-semibold">
                        {result.target_size.width} × {result.target_size.height}
                      </div>
                    </div>
                  </div>

                  <Button onClick={downloadResult} className="w-full h-8 text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    下载缩放结果
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 模板管理器 */}
      <TemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onApplyTemplate={async (template) => {
          try {
            // 直接在Excalidraw画布上显示模板
            if (excalidrawAPI) {
              await applyTemplateToExcalidraw(excalidrawAPI, template)
            }

            toast.success('模板已应用到画布')
            setShowTemplateManager(false)
          } catch (error) {
            console.error('Failed to apply template:', error)
            toast.error('应用模板失败')
          }
        }}
        currentCanvasId={canvasId}
        onSuccess={() => {
          setShowTemplateManager(false)
        }}
      />

      {/* 字体选择器 */}
      <FontSelector
        isOpen={showFontSelector}
        onClose={() => setShowFontSelector(false)}
        currentFont={currentFont}
        onFontSelect={handleFontSelect}
      />

    </>
  )
}

export default CanvasToolMenu


