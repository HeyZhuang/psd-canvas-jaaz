import { Separator } from '@/components/ui/separator'
import { useCanvas } from '@/contexts/canvas'
import { useState, useEffect, useRef } from 'react'
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
import { uploadPSD, uploadImage, type PSDUploadResponse, updateLayerProperties, type PSDLayer } from '@/api/upload'
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
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [currentFont, setCurrentFont] = useState<string>('Arial')
  const [psdData, setPsdData] = useState<PSDUploadResponse | null>(null)
  // 用于跟踪手型/选择工具切换状态
  const [isHandToolActive, setIsHandToolActive] = useState(false)

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

  // 形状工具相关状态
  const [selectedShapeTool, setSelectedShapeTool] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<string>('hand')

  // 用于跟踪菜单元素的引用
  const uploadButtonRef = useRef<HTMLDivElement>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const shapeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 判断是否选中了形状工具
  const isShapeToolSelected = ['rectangle', 'circle', 'triangle', 'star', 'image'].includes(selectedTool)
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false)

  const handleToolChange = (tool: ToolType) => {
    // 将本地 ToolType 映射为 Excalidraw 合法的 active-tool type
    const toExcalidrawTool = (t: ToolType): Exclude<ToolType, 'plus'> => {
      // 'plus' 只是 UI 上的占位，实际应切换到 selection
      if (t === 'plus') return 'selection'
      return t
    }
    excalidrawAPI?.setActiveTool({ type: toExcalidrawTool(tool) })
  }

  // 点击外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 关闭上传菜单
      if (showUploadMenu && uploadButtonRef.current && uploadMenuRef.current) {
        if (!uploadButtonRef.current.contains(event.target as Node) && !uploadMenuRef.current.contains(event.target as Node)) {
          setShowUploadMenu(false);
        }
      }

      // 关闭形状菜单
      if (showShapeMenu && shapeButtonRef.current && shapeMenuRef.current) {
        if (!shapeButtonRef.current.contains(event.target as Node) && !shapeMenuRef.current.contains(event.target as Node)) {
          setShowShapeMenu(false);
        }
      }
    };

    // 添加事件监听器
    document.addEventListener('mousedown', handleClickOutside);

    // 清理事件监听器
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUploadMenu, showShapeMenu]);

  excalidrawAPI?.onChange((_elements, appState, _files) => {
    setActiveTool(appState.activeTool.type as ToolType)
  })

  const handlePSDUploaded = (psdData: any) => {
    console.log('PSD uploaded:', psdData)
    setPsdData(psdData)
    // 可以在這裡添加額外的處理邏輯
  }

  // const handleImageUploaded = async (file: File) => {
  //   try {
  //     const result = await uploadImage(file);
  //     console.log('Image uploaded:', result);
  //     // 将图片添加到画布
  //     if (excalidrawAPI) {
  //       excalidrawAPI?.addImageElement({
  //         fileId: result.file_id,
  //         width: result.width,
  //         height: result.height,
  //         url: result.url
  //       });
  //     }
  //     toast.success('图片上传成功');
  //   } catch (error) {
  //     console.error('Image upload failed:', error);
  //     toast.error('图片上传失败');
  //   }
  // }

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

  // 添加缩放后的图片到画布
  const addResizedImageToCanvas = async (imageUrl: string, width: number, height: number) => {
    if (!excalidrawAPI) {
      console.error('excalidrawAPI 不可用')
      toast.error('画布API不可用')
      return
    }

    try {
      console.log('正在添加缩放后的图片到画布:', imageUrl)

      // 获取图片
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status}`)
      }

      const blob = await response.blob()
      const file = new File([blob], `resized_${Date.now()}.png`, { type: 'image/png' })

      // 转换为 Base64
      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 生成唯一的文件ID
      const fileId = `resized-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // 创建 Excalidraw 文件数据
      const fileData = {
        mimeType: 'image/png' as const,
        id: fileId as any,
        dataURL: dataURL as any,
        created: Date.now()
      }

      // 添加到 Excalidraw 文件系统
      excalidrawAPI.addFiles([fileData])
      console.log('文件已添加到 Excalidraw:', fileId)

      // 等待文件完全加载
      await new Promise(resolve => setTimeout(resolve, 200))

      // 获取当前画布元素
      const currentElements = excalidrawAPI.getSceneElements()

      // 计算画布中心位置
      const appState = excalidrawAPI.getAppState()
      const canvasWidth = appState.width || 800
      const canvasHeight = appState.height || 600
      const centerX = (canvasWidth - width) / 2
      const centerY = (canvasHeight - height) / 2

      // 创建图片元素
      const imageElement = {
        type: 'image' as const,
        id: `resized-${Date.now()}`,
        x: centerX > 0 ? centerX : 100,
        y: centerY > 0 ? centerY : 100,
        width: width,
        height: height,
        angle: 0,
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        fillStyle: 'solid' as const,
        strokeWidth: 0,
        strokeStyle: 'solid' as const,
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1000000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        fileId: fileId as any,
        scale: [1, 1] as [number, number],
        status: 'saved' as const,
        index: null,
        crop: null,
        customData: {
          isResizedPSD: true,
          originalPSDFileId: psdData?.file_id,
          resizedAt: Date.now()
        }
      } as any

      // 更新场景，添加新图片元素
      excalidrawAPI.updateScene({
        elements: [...currentElements, imageElement],
      })

      console.log('缩放后的图片已添加到画布')

    } catch (error) {
      console.error('添加图片到画布失败:', error)
      toast.error('添加图片到画布失败: ' + (error instanceof Error ? error.message : '未知错误'))
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
    setResult(null)

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

      // 增加超时时间到5分钟（300秒），并添加更好的错误处理
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.warn('请求超时，已取消')
      }, 300000) // 300秒超时

      try {
        // 检查API端点是否可访问
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
            errorMessage = errorData.detail || errorData.error || errorMessage

            // 检查是否是后端服务器未运行
            if (resizeResponse.status === 502 || resizeResponse.status === 503) {
              errorMessage = '后端服务器未运行或无法访问。请确保后端服务器已启动。'
            }
          } catch {
            errorMessage = `HTTP ${resizeResponse.status}: ${resizeResponse.statusText}`
          }
          throw new Error(errorMessage)
        }

        setProgress(90)
        setCurrentStep('正在处理结果...')

        const resultData = await resizeResponse.json()

        setProgress(95)
        setCurrentStep('正在添加图片到画布...')

        // 自动添加缩放后的图片到画布
        if (resultData.output_url && excalidrawAPI) {
          await addResizedImageToCanvas(
            resultData.output_url,
            resultData.target_size.width,
            resultData.target_size.height
          )
        }

        setProgress(100)
        setCurrentStep('缩放完成')
        setResult(resultData)

        console.log('缩放完成:', resultData)
        toast.success('智能缩放完成！图片已添加到画布')

      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === 'AbortError') {
          throw new Error('处理超时（超过5分钟）。可能原因：\n1. Gemini API响应慢\n2. 图层数量过多\n3. 网络连接问题\n4. 后端服务器未运行\n\n请稍后重试或减少图层数量。')
        }

        // 处理网络错误
        if (fetchError.message === 'Failed to fetch') {
          throw new Error('无法连接到后端服务器。请确保：\n1. 后端服务器已启动\n2. API路径正确\n3. 网络连接正常')
        }

        throw fetchError
      }

    } catch (err) {
      console.error('PSD缩放错误:', err)

      let errorMessage = err instanceof Error ? err.message : '缩放失败'

      // 检查是否是配额错误
      if (errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('配额')) {
        errorMessage = `🚫 Gemini API 配额已用尽\n\n` +
          `免费配额限制：\n` +
          `• 每分钟：15 次请求\n` +
          `• 每天：1,500 次请求\n\n` +
          `解决方案：\n` +
          `1. ⏰ 等待几分钟后重试\n` +
          `2. 📊 访问配额管理页面查看使用情况\n` +
          `3. 💳 考虑升级到付费计划\n\n` +
          `📎 配额管理：https://ai.dev/usage?tab=rate-limit`
      }

      setError(errorMessage)
      toast.error('智能缩放失败')
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

  // 工具定义现在直接在JSX中使用，不再需要这个数组

  return (
    <>
      <div className="absolute left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 bg-[#1e1e1e] backdrop-blur-lg rounded-lg p-1 shadow-lg border border-gray-700">
        {/* 手型/选择工具切换按钮 - 默认显示选择工具 */}
        <CanvasMenuButton
          type={isHandToolActive ? 'hand' : 'selection'}
          active={activeTool === (isHandToolActive ? 'hand' : 'selection')}
          onClick={() => {
            const newTool = isHandToolActive ? 'selection' : 'hand';
            handleToolChange(newTool as ToolType);
            setIsHandToolActive(!isHandToolActive);
          }}
          className="h-9 w-9 p-0"
        />

        {/* Frame按钮 */}
        <CanvasMenuButton
          type="frame"
          activeTool={activeTool}
          onClick={() => handleToolChange('frame')}
          className="h-9 w-9 p-0"
        />

        {/* 核心添加按钮 - 上传按钮 */}
        <div className="relative" ref={uploadButtonRef}>
          <CanvasMenuButton
            type="plus" // 使用plus类型作为上传按钮
            activeTool={activeTool}
            onClick={() => {
              // 点击上传按钮时，如果形状菜单是打开的，先关闭形状菜单
              if (showShapeMenu) {
                setShowShapeMenu(false);
              }
              // 切换上传菜单的显示状态
              setShowUploadMenu(!showUploadMenu);
            }}
            className="h-14 w-14 p-0 rounded-full bg-[#1e1e1e] hover:bg-primary text-white border border-gray-700 hover:bg-primary"
          />

          {showUploadMenu && (
            <div className="absolute left-16 top-0 z-30 w-48 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-lg overflow-hidden" ref={uploadMenuRef}>
              <div className="p-2 text-sm font-medium bg-zinc-800 text-white">添加内容</div>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-9 hover:bg-white/10 text-white"
                onClick={() => {
                  // 触发文件选择器
                  fileInputRef.current?.click();
                  setShowUploadMenu(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 3L12 7M12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 13L12 21M8 17L12 21M16 17L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                上传图片
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-9 hover:bg-white/10 text-white"
                onClick={() => {
                  // 上传PSD文件逻辑
                  // handlePSDUploaded();
                  setShowUploadMenu(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                上传PSD文件
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-9 hover:bg-white/10 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  // 上传模板逻辑
                  setShowUploadMenu(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                上传模板
              </Button>
            </div>
          )}
        </div>

        {/* 形状选择下拉菜单 */}
        <div className="relative">
          <CanvasMenuButton
            type="rectangle" // 使用rectangle类型作为形状菜单的默认图标
            active={['rectangle', 'ellipse', 'arrow', 'line', 'freedraw'].includes(activeTool || '')}
            onClick={() => {
              // 点击形状菜单时，如果上传菜单是打开的，先关闭上传菜单
              if (showUploadMenu) {
                setShowUploadMenu(false);
              }
              // 切换形状菜单的显示状态
              setShowShapeMenu(!showShapeMenu);
            }}
            className="h-9 w-9 p-0"
          />

          {showShapeMenu && (
            <div className="absolute left-16 top-0 z-30 w-64 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-lg p-4" ref={shapeMenuRef}>
              <div className="text-base font-medium mb-3 text-white">形状工具</div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center justify-center p-3 h-auto hover:bg-white/10 text-white"
                  onClick={() => {
                    handleToolChange('rectangle');
                    setShowShapeMenu(false);
                  }}
                  title="矩形"
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-xs">矩形</span>
                </Button>
                <Button
                  variant={activeTool === 'ellipse' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center justify-center p-3 h-auto hover:bg-white/10 text-white"
                  onClick={() => {
                    handleToolChange('ellipse');
                    setShowShapeMenu(false);
                  }}
                  title="圆形"
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="12" cy="12" rx="9" ry="9" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-xs">圆形</span>
                </Button>
                <Button
                  variant={activeTool === 'arrow' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center justify-center p-3 h-auto hover:bg-white/10 text-white"
                  onClick={() => {
                    handleToolChange('arrow');
                    setShowShapeMenu(false);
                  }}
                  title="箭头"
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-xs">箭头</span>
                </Button>
                <Button
                  variant={activeTool === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center justify-center p-3 h-auto hover:bg-white/10 text-white"
                  onClick={() => {
                    handleToolChange('line');
                    setShowShapeMenu(false);
                  }}
                  title="直线"
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-xs">直线</span>
                </Button>
                {/* <Button
                  variant={activeTool === 'freedraw' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    handleToolChange('freedraw');
                    setShowShapeMenu(false);
                  }}
                  title="自由绘制"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 15L15 10M4.31 17.56C3.53 16.78 3 15.78 3 14.71C3 13.64 3.53 12.64 4.31 11.86L12.14 4.03C12.92 3.25 13.92 2.72 14.99 2.72C16.06 2.72 17.06 3.25 17.84 4.03L19.97 6.16C20.75 6.94 21.28 7.94 21.28 9C21.28 10.07 20.75 11.07 19.97 11.84L12.14 19.67C11.36 20.45 10.36 21 9.29 21C8.22 21 7.22 20.47 6.44 19.69L4.31 17.56Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button> */}
              </div>
            </div>
          )}
        </div>

        {/* 文本工具 */}
        <CanvasMenuButton
          type="text"
          activeTool={activeTool}
          onClick={() => handleToolChange('text')}
          className="h-9 w-9 p-0"
        />

        {/* 画笔工具 */}
        <CanvasMenuButton
          type="freedraw"
          activeTool={activeTool}
          onClick={() => handleToolChange('freedraw')}
          className="h-9 w-9 p-0"
        />
        {/* PSD 上傳按鈕 */}
        <div className="w-6 h-[1px] bg-gray-600 my-1"></div>
        <PSDCanvasUploader
          canvasId={canvasId}
          onPSDUploaded={handlePSDUploaded}
        />
      </div>

      {/* 图层列表侧边栏 */}
      {/*{showLayerList && psdData && (*/}
      {/*  <div className="absolute left-20 top-1/2 -translate-y-1/2 z-30 w-80 max-h-[80vh] bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg overflow-hidden">*/}
      {/*    /!* 图层列表头部 *!/*/}
      {/*    <div className="flex items-center justify-between p-3 border-b">*/}
      {/*      <div className="flex items-center gap-2">*/}
      {/*        <Layers className="h-4 w-4" />*/}
      {/*        <span className="text-sm font-medium">图层列表</span>*/}
      {/*        <Badge variant="secondary" className="text-xs">*/}
      {/*          {filteredLayers.length}*/}
      {/*        </Badge>*/}
      {/*      </div>*/}
      {/*      <Button*/}
      {/*        variant="ghost"*/}
      {/*        size="sm"*/}
      {/*        onClick={() => setShowLayerList(false)}*/}
      {/*        className="h-6 w-6 p-0"*/}
      {/*      >*/}
      {/*        <X className="h-3 w-3" />*/}
      {/*      </Button>*/}
      {/*    </div>*/}

      {/*    /!* 搜索和过滤 *!/*/}
      {/*    <div className="p-3 space-y-2 border-b">*/}
      {/*      <Input*/}
      {/*        placeholder="搜索图层..."*/}
      {/*        value={searchTerm}*/}
      {/*        onChange={(e) => setSearchTerm(e.target.value)}*/}
      {/*        className="h-7 text-xs"*/}
      {/*      />*/}
      {/*      <select*/}
      {/*        value={filterType}*/}
      {/*        onChange={(e) => setFilterType(e.target.value as any)}*/}
      {/*        className="w-full h-7 text-xs border rounded px-2"*/}
      {/*      >*/}
      {/*        <option value="all">所有图层</option>*/}
      {/*        <option value="text">文字图层</option>*/}
      {/*        <option value="layer">图像图层</option>*/}
      {/*        <option value="group">群组图层</option>*/}
      {/*      </select>*/}
      {/*    </div>*/}

      {/*    /!* 图层列表 *!/*/}
      {/*    /!*<div className="flex-1 overflow-y-auto max-h-60">*!/*/}
      {/*    /!*  <div className="p-2 space-y-1">*!/*/}
      {/*    /!*    {filteredLayers.map((layer) => {*!/*/}
      {/*    /!*      const canvasState = getLayerCanvasState(layer.index)*!/*/}
      {/*    /!*      const isVisible = canvasState.exists ? canvasState.visible : layer.visible*!/*/}
      {/*    /!*      const currentOpacity = canvasState.exists ? canvasState.opacity : Math.round((layer.opacity || 255) / 255 * 100)*!/*/}

      {/*    /!*      return (*!/*/}
      {/*    /!*        <div key={layer.index} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">*!/*/}
      {/*    /!*          /!* 图层图标 *!/*!/*/}
      {/*    /!*          <div className="flex-shrink-0">*!/*/}
      {/*    /!*            {getLayerIcon(layer)}*!/*/}
      {/*    /!*          </div>*!/*/}

      {/*    /!*          /!* 图层信息 *!/*!/*/}
      {/*    /!*          <div className="flex-1 min-w-0">*!/*/}
      {/*    /!*            <div className="flex items-center gap-1">*!/*/}
      {/*    /!*              <span className="text-xs font-medium truncate">*!/*/}
      {/*    /!*                {layer.name}*!/*/}
      {/*    /!*              </span>*!/*/}
      {/*    /!*              <Badge variant="secondary" className="text-xs px-1 py-0">*!/*/}
      {/*    /!*                {getLayerTypeLabel(layer)}*!/*/}
      {/*    /!*              </Badge>*!/*/}
      {/*    /!*              {canvasState.exists && (*!/*/}
      {/*    /!*                <Badge variant="outline" className="text-xs px-1 py-0 text-green-600">*!/*/}
      {/*    /!*                  画布中*!/*/}
      {/*    /!*                </Badge>*!/*/}
      {/*    /!*              )}*!/*/}
      {/*    /!*            </div>*!/*/}
      {/*    /!*            <div className="text-xs text-muted-foreground">*!/*/}
      {/*    /!*              {currentOpacity}%*!/*/}
      {/*    /!*              {canvasState.exists && (*!/*/}
      {/*    /!*                <span className="ml-1 text-green-600">• 实时</span>*!/*/}
      {/*    /!*              )}*!/*/}
      {/*    /!*            </div>*!/*/}
      {/*    /!*          </div>*!/*/}

      {/*    /!*          /!* 控制按钮 *!/*!/*/}
      {/*    /!*          <div className="flex items-center gap-1">*!/*/}
      {/*    /!*            <Button*!/*/}
      {/*    /!*              variant="ghost"*!/*/}
      {/*    /!*              size="sm"*!/*/}
      {/*    /!*              className="h-6 w-6 p-0"*!/*/}
      {/*    /!*              onClick={() => handleLayerVisibilityToggle(layer.index)}*!/*/}
      {/*    /!*              title={isVisible ? '隐藏图层' : '显示图层'}*!/*/}
      {/*    /!*            >*!/*/}
      {/*    /!*              {isVisible ? (*!/*/}
      {/*    /!*                <Eye className="h-3 w-3" />*!/*/}
      {/*    /!*              ) : (*!/*/}
      {/*    /!*                <EyeOff className="h-3 w-3 opacity-50" />*!/*/}
      {/*    /!*              )}*!/*/}
      {/*    /!*            </Button>*!/*/}

      {/*    /!*            {layer.type === 'text' && (*!/*/}
      {/*    /!*              <Button*!/*/}
      {/*    /!*                variant="ghost"*!/*/}
      {/*    /!*                size="sm"*!/*/}
      {/*    /!*                className="h-6 w-6 p-0"*!/*/}
      {/*    /!*                onClick={() => setSelectedLayer(selectedLayer?.index === layer.index ? null : layer)}*!/*/}
      {/*    /!*                title="编辑文字"*!/*/}
      {/*    /!*              >*!/*/}
      {/*    /!*                <Edit3 className="h-3 w-3" />*!/*/}
      {/*    /!*              </Button>*!/*/}
      {/*    /!*            )}*!/*/}
      {/*    /!*          </div>*!/*/}
      {/*    /!*        </div>*!/*/}
      {/*    /!*      )*!/*/}
      {/*    /!*    })}*!/*/}
      {/*    /!*  </div>*!/*/}
      {/*    /!*</div>*!/*/}

      {/*    /!* 文字编辑面板 *!/*/}
      {/*    {selectedLayer && selectedLayer.type === 'text' && (*/}
      {/*      <div className="p-3 border-t bg-muted/30">*/}
      {/*        <div className="text-xs font-medium text-blue-600 mb-2">文字编辑</div>*/}
      {/*        <div className="space-y-2">*/}
      {/*          <Input*/}
      {/*            value={(() => {*/}
      {/*              const canvasState = getLayerCanvasState(selectedLayer.index)*/}
      {/*              if (canvasState.exists && canvasState.element) {*/}
      {/*                return (canvasState.element as any).text || selectedLayer.text_content || selectedLayer.name || ''*/}
      {/*              }*/}
      {/*              return selectedLayer.text_content || selectedLayer.name || ''*/}
      {/*            })()}*/}
      {/*            onChange={(e) => handleTextPropertyUpdate(selectedLayer.index, 'text_content', e.target.value)}*/}
      {/*            placeholder="输入文字内容"*/}
      {/*            className="text-xs h-7"*/}
      {/*          />*/}
      {/*          <div className="flex gap-1">*/}
      {/*            <Button*/}
      {/*              variant={(() => {*/}
      {/*                const canvasState = getLayerCanvasState(selectedLayer.index)*/}
      {/*                const fontWeight = canvasState.exists && canvasState.element*/}
      {/*                  ? ((canvasState.element as any).fontWeight >= 600 ? 'bold' : 'normal')*/}
      {/*                  : selectedLayer.font_weight*/}
      {/*                return fontWeight === 'bold' ? 'default' : 'outline'*/}
      {/*              })()}*/}
      {/*              size="sm"*/}
      {/*              className="h-6 px-2"*/}
      {/*              onClick={() => handleTextPropertyUpdate(selectedLayer.index, 'font_weight',*/}
      {/*                (() => {*/}
      {/*                  const canvasState = getLayerCanvasState(selectedLayer.index)*/}
      {/*                  const currentWeight = canvasState.exists && canvasState.element*/}
      {/*                    ? ((canvasState.element as any).fontWeight >= 600 ? 'bold' : 'normal')*/}
      {/*                    : selectedLayer.font_weight*/}
      {/*                  return currentWeight === 'bold' ? 'normal' : 'bold'*/}
      {/*                })()*/}
      {/*              )}*/}
      {/*            >*/}
      {/*              <span className="text-xs font-bold">B</span>*/}
      {/*            </Button>*/}
      {/*            <Button*/}
      {/*              variant={(() => {*/}
      {/*                const canvasState = getLayerCanvasState(selectedLayer.index)*/}
      {/*                const fontStyle = canvasState.exists && canvasState.element*/}
      {/*                  ? (canvasState.element as any).fontStyle*/}
      {/*                  : selectedLayer.font_style*/}
      {/*                return fontStyle === 'italic' ? 'default' : 'outline'*/}
      {/*              })()}*/}
      {/*              size="sm"*/}
      {/*              className="h-6 px-2"*/}
      {/*              onClick={() => handleTextPropertyUpdate(selectedLayer.index, 'font_style',*/}
      {/*                (() => {*/}
      {/*                  const canvasState = getLayerCanvasState(selectedLayer.index)*/}
      {/*                  const currentStyle = canvasState.exists && canvasState.element*/}
      {/*                    ? (canvasState.element as any).fontStyle*/}
      {/*                    : selectedLayer.font_style*/}
      {/*                  return currentStyle === 'italic' ? 'normal' : 'italic'*/}
      {/*                })()*/}
      {/*              )}*/}
      {/*            >*/}
      {/*              <span className="text-xs italic">I</span>*/}
      {/*            </Button>*/}
      {/*          </div>*/}
      {/*        </div>*/}
      {/*      </div>*/}
      {/*    )}*/}
      {/*  </div>*/}
      {/*)}*/}

      {/* Resize缩放工具侧边栏 */}
      {/*{showResizeTool && psdData && (*/}
      {/*  <div className="absolute left-20 top-1/2 -translate-y-1/2 z-30 w-80 max-h-[80vh] bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg overflow-hidden">*/}
      {/*    /!* Resize工具头部 *!/*/}
      {/*    <div className="flex items-center justify-between p-3 border-b">*/}
      {/*      <div className="flex items-center gap-2">*/}
      {/*        <Settings className="h-4 w-4" />*/}
      {/*        <span className="text-sm font-medium">智能缩放</span>*/}
      {/*        <Badge variant="secondary" className="text-xs">*/}
      {/*          AI*/}
      {/*        </Badge>*/}
      {/*      </div>*/}
      {/*      <Button*/}
      {/*        variant="ghost"*/}
      {/*        size="sm"*/}
      {/*        onClick={() => setShowResizeTool(false)}*/}
      {/*        className="h-6 w-6 p-0"*/}
      {/*      >*/}
      {/*        <X className="h-3 w-3" />*/}
      {/*      </Button>*/}
      {/*    </div>*/}

      {/*    <div className="p-3 space-y-4 overflow-y-auto max-h-[60vh]">*/}
      {/*      /!* PSD文件信息 *!/*/}
      {/*      <Card>*/}
      {/*        <CardHeader className="pb-2">*/}
      {/*          <CardTitle className="text-sm">当前PSD文件</CardTitle>*/}
      {/*        </CardHeader>*/}
      {/*        <CardContent className="pt-0">*/}
      {/*          <div className="space-y-1 text-xs">*/}
      {/*            <div><strong>文件ID:</strong> {psdData.file_id}</div>*/}
      {/*            <div><strong>原始尺寸:</strong> {psdData.width} × {psdData.height}</div>*/}
      {/*            <div><strong>图层数量:</strong> {psdData.layers?.length || 0}</div>*/}
      {/*          </div>*/}
      {/*        </CardContent>*/}
      {/*      </Card>*/}

      {/*      /!* 目标尺寸设置 *!/*/}
      {/*      <Card>*/}
      {/*        <CardHeader className="pb-2">*/}
      {/*          <CardTitle className="text-sm">目标尺寸设置</CardTitle>*/}
      {/*        </CardHeader>*/}
      {/*        <CardContent className="pt-0 space-y-3">*/}
      {/*          <div className="grid grid-cols-2 gap-2">*/}
      {/*            <div className="space-y-1">*/}
      {/*              <Label htmlFor="target-width" className="text-xs">目标宽度</Label>*/}
      {/*              <Input*/}
      {/*                id="target-width"*/}
      {/*                type="number"*/}
      {/*                value={targetWidth}*/}
      {/*                onChange={(e) => setTargetWidth(Number(e.target.value))}*/}
      {/*                disabled={isProcessing}*/}
      {/*                min="1"*/}
      {/*                max="4000"*/}
      {/*                className="h-7 text-xs"*/}
      {/*              />*/}
      {/*            </div>*/}
      {/*            <div className="space-y-1">*/}
      {/*              <Label htmlFor="target-height" className="text-xs">目标高度</Label>*/}
      {/*              <Input*/}
      {/*                id="target-height"*/}
      {/*                type="number"*/}
      {/*                value={targetHeight}*/}
      {/*                onChange={(e) => setTargetHeight(Number(e.target.value))}*/}
      {/*                disabled={isProcessing}*/}
      {/*                min="1"*/}
      {/*                max="4000"*/}
      {/*                className="h-7 text-xs"*/}
      {/*              />*/}
      {/*            </div>*/}
      {/*          </div>*/}

      {/*          /!* API密钥设置 *!/*/}
      {/*          <div className="space-y-1">*/}
      {/*            <Label htmlFor="api-key" className="text-xs">Gemini API密钥 (可选)</Label>*/}
      {/*            <Input*/}
      {/*              id="api-key"*/}
      {/*              type="password"*/}
      {/*              value={apiKey}*/}
      {/*              onChange={(e) => setApiKey(e.target.value)}*/}
      {/*              disabled={isProcessing}*/}
      {/*              placeholder="如果不提供，将使用环境变量中的密钥"*/}
      {/*              className="h-7 text-xs"*/}
      {/*            />*/}
      {/*          </div>*/}
      {/*        </CardContent>*/}
      {/*      </Card>*/}

      {/*      /!* 错误提示 *!/*/}
      {/*      {error && (*/}
      {/*        <Alert variant="destructive">*/}
      {/*          <AlertCircle className="h-3 w-3" />*/}
      {/*          <AlertDescription className="text-xs">{error}</AlertDescription>*/}
      {/*        </Alert>*/}
      {/*      )}*/}

      {/*      /!* 进度条 *!/*/}
      {/*      {isProcessing && (*/}
      {/*        <div className="space-y-2">*/}
      {/*          <div className="flex justify-between text-xs">*/}
      {/*            <span>{currentStep}</span>*/}
      {/*            <span>{progress}%</span>*/}
      {/*          </div>*/}
      {/*          <Progress value={progress} className="w-full h-2" />*/}
      {/*        </div>*/}
      {/*      )}*/}

      {/*      /!* 操作按钮 *!/*/}
      {/*      <div className="flex gap-2">*/}
      {/*        <Button*/}
      {/*          onClick={handleResize}*/}
      {/*          disabled={!psdData || isProcessing}*/}
      {/*          className="flex-1 h-8 text-xs"*/}
      {/*        >*/}
      {/*          {isProcessing ? (*/}
      {/*            <Loader2 className="h-3 w-3 mr-1 animate-spin" />*/}
      {/*          ) : (*/}
      {/*            <Settings className="h-3 w-3 mr-1" />*/}
      {/*          )}*/}
      {/*          开始智能缩放*/}
      {/*        </Button>*/}
      {/*      </div>*/}

      {/*      /!* 缩放结果 *!/*/}
      {/*      {result && (*/}
      {/*        <Card>*/}
      {/*          <CardHeader className="pb-2">*/}
      {/*            <CardTitle className="text-sm">缩放完成</CardTitle>*/}
      {/*          </CardHeader>*/}
      {/*          <CardContent className="pt-0 space-y-3">*/}
      {/*            <div className="grid grid-cols-2 gap-2">*/}
      {/*              <div>*/}
      {/*                <Label className="text-xs">原始尺寸</Label>*/}
      {/*                <div className="text-sm font-semibold">*/}
      {/*                  {result.original_size.width} × {result.original_size.height}*/}
      {/*                </div>*/}
      {/*              </div>*/}
      {/*              <div>*/}
      {/*                <Label className="text-xs">目标尺寸</Label>*/}
      {/*                <div className="text-sm font-semibold">*/}
      {/*                  {result.target_size.width} × {result.target_size.height}*/}
      {/*                </div>*/}
      {/*              </div>*/}
      {/*            </div>*/}

      {/*            <Button onClick={downloadResult} className="w-full h-8 text-xs">*/}
      {/*              <Download className="h-3 w-3 mr-1" />*/}
      {/*              下载缩放结果*/}
      {/*            </Button>*/}
      {/*          </CardContent>*/}
      {/*        </Card>*/}
      {/*      )}*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*)}*/}

      {/* 模板管理器 */}
      {/*<TemplateManager*/}
      {/*  isOpen={showTemplateManager}*/}
      {/*  onClose={() => setShowTemplateManager(false)}*/}
      {/*  onApplyTemplate={async (template) => {*/}
      {/*    try {*/}
      {/*      // 直接在Excalidraw画布上显示模板*/}
      {/*      if (excalidrawAPI) {*/}
      {/*        await applyTemplateToExcalidraw(excalidrawAPI, template)*/}
      {/*      }*/}

      {/*      toast.success('模板已应用到画布')*/}
      {/*      setShowTemplateManager(false)*/}
      {/*    } catch (error) {*/}
      {/*      console.error('Failed to apply template:', error)*/}
      {/*      toast.error('应用模板失败')*/}
      {/*    }*/}
      {/*  }}*/}
      {/*  currentCanvasId={canvasId}*/}
      {/*  onSuccess={() => {*/}
      {/*    setShowTemplateManager(false)*/}
      {/*  }}*/}
      {/*/>*/}

      {/* 字体选择器 */}
      <FontSelector
        isOpen={showFontSelector}
        onClose={() => setShowFontSelector(false)}
        currentFont={currentFont}
        onFontSelect={handleFontSelect}
      />

      {/* 隐藏的文件输入元素 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            //将图片上传到画布上 Todo
            // handleImageUploaded(file);
          }
        }}
        className="hidden"
      />
    </>
  )
}

export default CanvasToolMenu




