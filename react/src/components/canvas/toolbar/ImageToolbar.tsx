import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { useCanvas } from '@/contexts/canvas'
import {
  Layers,
  Crop,
  Scissors,
  Lock,
  Unlock
} from 'lucide-react'
import { ExcalidrawImageElement } from '@excalidraw/excalidraw/element/types'

interface ImageToolbarProps {
  selectedElement: ExcalidrawImageElement
}

export function ImageToolbar({ selectedElement }: ImageToolbarProps) {
  const { excalidrawAPI } = useCanvas()
  const [opacity, setOpacity] = useState(100)
  const [cornerRadius, setCornerRadius] = useState(0)
  const [layersOpen, setLayersOpen] = useState(false)
  const [cropMode, setCropMode] = useState(false)
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(1)
  const layersRef = useRef<HTMLDivElement>(null)

  // 使用 ref 存储当前选中元素的 ID，避免依赖整个对象
  const selectedElementIdRef = useRef<string>(selectedElement.id)

  // 从选中元素同步状态
  useEffect(() => {
    if (selectedElement) {
      selectedElementIdRef.current = selectedElement.id
      setOpacity(selectedElement.opacity || 100)
      setCornerRadius(selectedElement.roundness?.value || 0)
    }
  }, [selectedElement?.opacity, selectedElement?.roundness])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(event.target as Node)) {
        setLayersOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 更新图片属性 - 只依赖 excalidrawAPI，使用 ref 获取元素 ID
  const updateImageElement = useCallback((updates: Partial<ExcalidrawImageElement>) => {
    if (!excalidrawAPI) return

    const elements = excalidrawAPI.getSceneElements()
    const elementIndex = elements.findIndex(el => el.id === selectedElementIdRef.current)

    if (elementIndex === -1) return

    // 只更新目标元素，避免遍历整个数组
    const updatedElement = {
      ...elements[elementIndex],
      ...updates,
      versionNonce: elements[elementIndex].versionNonce + 1
    }

    const updatedElements = [
      ...elements.slice(0, elementIndex),
      updatedElement,
      ...elements.slice(elementIndex + 1)
    ]

    excalidrawAPI.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: updatedElements as any
    })
  }, [excalidrawAPI])

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    updateImageElement({ opacity: value })
  }

  const handleCornerRadiusChange = (value: number) => {
    setCornerRadius(value)
    updateImageElement({
      roundness: { type: 3, value: value }
    })
  }

  const handleLayerAction = (action: string) => {
    if (!excalidrawAPI || !selectedElement) return

    const elements = excalidrawAPI.getSceneElements()
    const currentIndex = elements.findIndex(el => el.id === selectedElement.id)

    if (currentIndex === -1) return

    const newElements = [...elements]
    const [element] = newElements.splice(currentIndex, 1)

    switch (action) {
      case 'sendToBack':
        newElements.unshift(element)
        break
      case 'sendBackward':
        if (currentIndex > 0) {
          newElements.splice(currentIndex - 1, 0, element)
        } else {
          newElements.splice(currentIndex, 0, element)
        }
        break
      case 'bringForward':
        if (currentIndex < elements.length - 1) {
          newElements.splice(currentIndex + 1, 0, element)
        } else {
          newElements.splice(currentIndex, 0, element)
        }
        break
      case 'bringToFront':
        newElements.push(element)
        break
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    excalidrawAPI.updateScene({ elements: newElements as any })
    excalidrawAPI.refresh()
    setLayersOpen(false)
  }

  const handleRemoveBackground = () => {
    console.log('Remove Background')
    // TODO: 实现移除背景功能
  }

  const handleCrop = () => {
    if (!excalidrawAPI || !selectedElement) return;

    // 调用Excalidraw原生的裁剪功能
    console.log("Activating Excalidraw native crop tool for element:", selectedElement.id);

    // 设置为选择工具，确保选中了图片元素
    excalidrawAPI.setActiveTool({ type: "selection" });

    // Excalidraw的原生裁剪功能通常通过以下方式激活：
    // 1. 选中图片元素
    // 2. 使用快捷键 Ctrl+Shift+C (Windows) 或 Cmd+Shift+C (Mac)
    // 3. 或者通过上下文菜单选择裁剪选项

    // 由于Excalidraw的API没有直接暴露裁剪功能，
    // 我们提示用户使用快捷键来激活原生裁剪工具
    console.log("Please use Ctrl+Shift+C (Windows) or Cmd+Shift+C (Mac) to activate crop tool in Excalidraw");
  }

  const applyCrop = useCallback(async () => {
    // 使用Excalidraw原生裁剪，不需要自定义实现
    // 原生裁剪会直接修改元素的crop属性
    console.log("Using Excalidraw native crop functionality");
    setCropMode(false);
    setAspectRatioLocked(false);
  }, [excalidrawAPI, selectedElement]);

  const cancelCrop = () => {
    setCropMode(false);
    setAspectRatioLocked(false);

    // 取消裁剪模式，回到选择工具
    if (excalidrawAPI) {
      excalidrawAPI.setActiveTool({ type: "selection" });
    }
  }

  // 设置快捷比例
  const setQuickRatio = (ratio: string) => {
    const currentWidth = cropRect.width
    const newWidth = currentWidth
    let newHeight = currentWidth

    switch (ratio) {
      case '1:1':
        newHeight = currentWidth
        setAspectRatio(1)
        setAspectRatioLocked(true)
        break
      case '16:9':
        newHeight = currentWidth * 9 / 16
        setAspectRatio(16 / 9)
        setAspectRatioLocked(true)
        break
      case '4:3':
        newHeight = currentWidth * 3 / 4
        setAspectRatio(4 / 3)
        setAspectRatioLocked(true)
        break
      case '3:2':
        newHeight = currentWidth * 2 / 3
        setAspectRatio(3 / 2)
        setAspectRatioLocked(true)
        break
      case 'free':
        setAspectRatioLocked(false)
        return
    }

    setCropRect(prev => ({
      ...prev,
      width: newWidth,
      height: newHeight
    }))
  }

  // 处理裁剪区域 X 坐标变化
  const handleCropXChange = (newX: number) => {
    if (!selectedElement) return
    const maxX = Math.abs(selectedElement.width) - cropRect.width
    setCropRect(prev => ({ ...prev, x: Math.max(0, Math.min(newX, maxX)) }))
  }

  // 处理裁剪区域 Y 坐标变化
  const handleCropYChange = (newY: number) => {
    if (!selectedElement) return
    const maxY = Math.abs(selectedElement.height) - cropRect.height
    setCropRect(prev => ({ ...prev, y: Math.max(0, Math.min(newY, maxY)) }))
  }

  // 处理裁剪区域宽度变化
  const handleCropWidthChange = (newWidth: number) => {
    if (!selectedElement) return
    const maxWidth = Math.abs(selectedElement.width) - cropRect.x
    const validWidth = Math.max(1, Math.min(newWidth, maxWidth))

    if (aspectRatioLocked) {
      const newHeight = validWidth / aspectRatio
      const maxHeight = Math.abs(selectedElement.height) - cropRect.y
      const validHeight = Math.min(newHeight, maxHeight)
      const adjustedWidth = validHeight * aspectRatio

      setCropRect(prev => ({
        ...prev,
        width: adjustedWidth,
        height: validHeight
      }))
    } else {
      setCropRect(prev => ({ ...prev, width: validWidth }))
    }
  }

  // 处理裁剪区域高度变化
  const handleCropHeightChange = (newHeight: number) => {
    if (!selectedElement) return
    const maxHeight = Math.abs(selectedElement.height) - cropRect.y
    const validHeight = Math.max(1, Math.min(newHeight, maxHeight))

    if (aspectRatioLocked) {
      const newWidth = validHeight * aspectRatio
      const maxWidth = Math.abs(selectedElement.width) - cropRect.x
      const validWidth = Math.min(newWidth, maxWidth)
      const adjustedHeight = validWidth / aspectRatio

      setCropRect(prev => ({
        ...prev,
        width: validWidth,
        height: adjustedHeight
      }))
    } else {
      setCropRect(prev => ({ ...prev, height: validHeight }))
    }
  }

  const handleExtractLayers = () => {
    console.log('Extract Layers')
    // TODO: 实现提取图层功能
  }

  return (
    <>
      <div className="flex items-center gap-1 bg-[#1e1e1e] text-white px-2 py-1.5 rounded-lg shadow-lg border border-gray-700">
        {/* 圆角半径 */}
        <div className="flex items-center gap-2 px-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 5H9C6.79086 5 5 6.79086 5 9V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="number"
            value={cornerRadius}
            onChange={(e) => handleCornerRadiusChange(parseInt(e.target.value, 10) || 0)}
            min="0"
            max="100"
            className="w-16 h-9 bg-transparent border-none text-sm focus:outline-none focus:ring-0"
          />
        </div>

        <Separator orientation="vertical" className="h-5 bg-[#4A4E57]" />

        {/* 透明度滑块 */}
        <div className="flex items-center gap-2 px-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4V20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4Z" fill="currentColor" />
          </svg>
          <div className="w-24">
            <Slider
              value={[opacity]}
              onValueChange={([value]) => handleOpacityChange(value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          <span className="text-xs w-10">{Math.round(opacity)}%</span>
        </div>

        <Separator orientation="vertical" className="h-5 bg-gray-600" />

        {/* 图层操作 */}
        <div className="relative" ref={layersRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 hover:bg-white/10"
            onClick={() => setLayersOpen(!layersOpen)}
            title="图层"
          >
            <Layers className="h-5 w-5" />
          </Button>
          {layersOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-lg p-2 z-50">
              <div className="text-xs text-gray-400 px-2 py-1 mb-1">图层</div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-white/10"
                  onClick={() => handleLayerAction('sendToBack')}
                  title="置于底层"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 15L12 18L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 21H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-white/10"
                  onClick={() => handleLayerAction('sendBackward')}
                  title="后移一层"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 15L12 18L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-white/10"
                  onClick={() => handleLayerAction('bringForward')}
                  title="前移一层"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 9L12 6L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-white/10"
                  onClick={() => handleLayerAction('bringToFront')}
                  title="置于顶层"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 9L12 6L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 3H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-5 bg-gray-600" />

        {/* 移除背景 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 hover:bg-white/10"
          onClick={handleRemoveBackground}
          title="移除背景"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.4998 2H19.9998C21.1044 2 21.9998 2.89543 21.9998 4V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 16.5V19.9998C2 21.1044 2.89543 21.9998 4 21.9998H7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 7.5V4C2 2.89543 2.89543 2 4 2H7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16.5 22H20C21.1044 22 22 21.1044 22 20V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15.5 9.5L12 6L9.5 9.5L7 7L2 15H22L15.5 9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>

        {/* 裁剪 */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 w-9 p-0 hover:bg-white/10 ${cropMode ? 'bg-blue-600' : ''}`}
          onClick={handleCrop}
          title={cropMode ? '应用裁剪' : '裁剪'}
        >
          <Crop className="h-5 w-5" />
        </Button>

        {/* 裁剪模式下的取消按钮 */}
        {cropMode && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 hover:bg-white/10 text-xs"
            onClick={cancelCrop}
          >
            取消
          </Button>
        )}

        {/* 提取图层 */}
        {!cropMode && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 hover:bg-white/10"
            onClick={handleExtractLayers}
            title="提取图层"
          >
            <Scissors className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* 裁剪控制面板 */}
      {cropMode && (
        <div className="mt-2 bg-[#1e1e1e] text-white px-3 py-3 rounded-lg shadow-lg border border-gray-700">
          {/* 快捷比例按钮 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400">比例:</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs hover:bg-white/10"
                onClick={() => setQuickRatio('free')}
              >
                自由
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs hover:bg-white/10"
                onClick={() => setQuickRatio('1:1')}
              >
                1:1
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs hover:bg-white/10"
                onClick={() => setQuickRatio('16:9')}
              >
                16:9
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs hover:bg-white/10"
                onClick={() => setQuickRatio('4:3')}
              >
                4:3
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs hover:bg-white/10"
                onClick={() => setQuickRatio('3:2')}
              >
                3:2
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-white/10"
                onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                title={aspectRatioLocked ? '解锁比例' : '锁定比例'}
              >
                {aspectRatioLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* 裁剪参数 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <label className="text-gray-400 w-8">X:</label>
              <input
                type="number"
                value={Math.round(cropRect.x)}
                onChange={(e) => handleCropXChange(parseInt(e.target.value, 10) || 0)}
                className="flex-1 h-7 bg-[#2a2a2a] border border-gray-600 rounded px-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-400 w-8">Y:</label>
              <input
                type="number"
                value={Math.round(cropRect.y)}
                onChange={(e) => handleCropYChange(parseInt(e.target.value, 10) || 0)}
                className="flex-1 h-7 bg-[#2a2a2a] border border-gray-600 rounded px-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-400 w-8">宽:</label>
              <input
                type="number"
                value={Math.round(cropRect.width)}
                onChange={(e) => handleCropWidthChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min="1"
                className="flex-1 h-7 bg-[#2a2a2a] border border-gray-600 rounded px-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-400 w-8">高:</label>
              <input
                type="number"
                value={Math.round(cropRect.height)}
                onChange={(e) => handleCropHeightChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min="1"
                className="flex-1 h-7 bg-[#2a2a2a] border border-gray-600 rounded px-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 提示信息 */}
          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {aspectRatioLocked ? `比例已锁定 (${aspectRatio.toFixed(2)})` : '自由裁剪'}
              </span>
              <span className="text-gray-500">
                裁剪尺寸: {Math.round(cropRect.width)} × {Math.round(cropRect.height)}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              位置: ({Math.round(cropRect.x)}, {Math.round(cropRect.y)})
            </div>
          </div>
        </div>
      )}
    </>
  )
}
