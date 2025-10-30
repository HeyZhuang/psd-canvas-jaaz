import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCanvas } from '@/contexts/canvas'
import { 
  Layers,
  Crop,
  Scissors
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
    if (!selectedElement) return
    
    // 切换裁剪模式
    if (cropMode) {
      // 应用裁剪
      applyCrop()
    } else {
      // 进入裁剪模式
      setCropMode(true)
      // 初始化裁剪区域为图片的完整大小
      setCropRect({
        x: 0,
        y: 0,
        width: Math.abs(selectedElement.width),
        height: Math.abs(selectedElement.height)
      })
    }
  }

  const applyCrop = useCallback(() => {
    if (!excalidrawAPI) return

    const elements = excalidrawAPI.getSceneElements()
    const elementIndex = elements.findIndex(el => el.id === selectedElementIdRef.current)
    
    if (elementIndex === -1) return
    
    const currentElement = elements[elementIndex] as ExcalidrawImageElement
    
    // 更新图片元素的尺寸和位置
    const newX = currentElement.x + cropRect.x
    const newY = currentElement.y + cropRect.y
    
    updateImageElement({
      x: newX,
      y: newY,
      width: cropRect.width * (currentElement.width < 0 ? -1 : 1),
      height: cropRect.height * (currentElement.height < 0 ? -1 : 1),
    })
    
    setCropMode(false)
  }, [excalidrawAPI, cropRect, updateImageElement])

  const cancelCrop = () => {
    setCropMode(false)
  }

  const handleExtractLayers = () => {
    console.log('Extract Layers')
    // TODO: 实现提取图层功能
  }

  return (
    <>
      <div className="flex items-center gap-1 bg-[#2C2F36] text-[#EAEAEA] px-1 py-1 rounded-lg shadow-lg border border-[#4A4E57]">
        {/* 圆角半径 */}
        <div className="flex items-center gap-2 px-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 5H9C6.79086 5 5 6.79086 5 9V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4V20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4Z" fill="currentColor"/>
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => handleOpacityChange(parseInt(e.target.value, 10))}
            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs w-10">{Math.round(opacity)}%</span>
        </div>

        <Separator orientation="vertical" className="h-5 bg-[#4A4E57]" />

        {/* 图层操作 */}
        <div className="relative" ref={layersRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 hover:bg-[#3D414A]"
            onClick={() => setLayersOpen(!layersOpen)}
            title="图层"
          >
            <Layers className="h-5 w-5" />
          </Button>
          {layersOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#2C2F36] border border-[#4A4E57] rounded-lg shadow-lg p-2 z-50">
              <div className="text-xs text-gray-400 px-2 py-1 mb-1">图层</div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-[#3D414A]"
                  onClick={() => handleLayerAction('sendToBack')}
                  title="置于底层"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 15L12 18L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 21H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-[#3D414A]"
                  onClick={() => handleLayerAction('sendBackward')}
                  title="后移一层"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 15L12 18L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-[#3D414A]"
                  onClick={() => handleLayerAction('bringForward')}
                  title="前移一层"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 9L12 6L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-[#3D414A]"
                  onClick={() => handleLayerAction('bringToFront')}
                  title="置于顶层"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 9L12 6L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 3H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-5 bg-[#4A4E57]" />

        {/* 移除背景 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 hover:bg-[#3D414A]"
          onClick={handleRemoveBackground}
          title="移除背景"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.4998 2H19.9998C21.1044 2 21.9998 2.89543 21.9998 4V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 16.5V19.9998C2 21.1044 2.89543 21.9998 4 21.9998H7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 7.5V4C2 2.89543 2.89543 2 4 2H7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16.5 22H20C21.1044 22 22 21.1044 22 20V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15.5 9.5L12 6L9.5 9.5L7 7L2 15H22L15.5 9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Button>

        {/* 裁剪 */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 w-9 p-0 hover:bg-[#3D414A] ${cropMode ? 'bg-blue-600' : ''}`}
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
            className="h-9 px-3 hover:bg-[#3D414A] text-xs"
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
            className="h-9 w-9 p-0 hover:bg-[#3D414A]"
            onClick={handleExtractLayers}
            title="提取图层"
          >
            <Scissors className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* 裁剪控制面板 */}
      {cropMode && (
        <div className="mt-2 bg-[#2C2F36] text-[#EAEAEA] px-3 py-2 rounded-lg shadow-lg border border-[#4A4E57]">
          <div className="text-xs text-gray-400 mb-2">裁剪区域</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <label className="text-gray-400 w-8">X:</label>
              <input
                type="number"
                value={Math.round(cropRect.x)}
                onChange={(e) => setCropRect(prev => ({ ...prev, x: parseInt(e.target.value, 10) || 0 }))}
                className="flex-1 h-7 bg-[#1e1e1e] border border-gray-600 rounded px-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-400 w-8">Y:</label>
              <input
                type="number"
                value={Math.round(cropRect.y)}
                onChange={(e) => setCropRect(prev => ({ ...prev, y: parseInt(e.target.value, 10) || 0 }))}
                className="flex-1 h-7 bg-[#1e1e1e] border border-gray-600 rounded px-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-400 w-8">宽:</label>
              <input
                type="number"
                value={Math.round(cropRect.width)}
                onChange={(e) => setCropRect(prev => ({ ...prev, width: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                min="1"
                className="flex-1 h-7 bg-[#1e1e1e] border border-gray-600 rounded px-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-400 w-8">高:</label>
              <input
                type="number"
                value={Math.round(cropRect.height)}
                onChange={(e) => setCropRect(prev => ({ ...prev, height: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                min="1"
                className="flex-1 h-7 bg-[#1e1e1e] border border-gray-600 rounded px-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            提示: 调整裁剪区域参数后点击裁剪按钮应用
          </div>
        </div>
      )}
    </>
  )
}
