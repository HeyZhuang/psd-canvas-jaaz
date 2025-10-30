import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { useCanvas } from '@/contexts/canvas'
import { 
  Image as ImageIcon,
  RotateCw,
  FlipHorizontal,
  FlipVertical
} from 'lucide-react'
import { ExcalidrawImageElement } from '@excalidraw/excalidraw/element/types'

interface ImagePopbarProps {
  selectedElement: ExcalidrawImageElement
}

export function ImagePopbar({ selectedElement }: ImagePopbarProps) {
  const { excalidrawAPI } = useCanvas()
  const [opacity, setOpacity] = useState(100)

  // 从选中元素同步状态
  useEffect(() => {
    if (selectedElement) {
      setOpacity((1 - (selectedElement.opacity || 0)) * 100)
    }
  }, [selectedElement])

  // 更新图片属性
  const updateImageElement = useCallback((updates: Partial<ExcalidrawImageElement>) => {
    if (!excalidrawAPI || !selectedElement) return

    const elements = excalidrawAPI.getSceneElements()
    const updatedElements = elements.map(el => {
      if (el.id === selectedElement.id && el.type === 'image') {
        return { ...el, ...updates } as ExcalidrawImageElement
      }
      return el
    })
    
    excalidrawAPI.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: updatedElements as any
    })
  }, [excalidrawAPI, selectedElement])

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    updateImageElement({ opacity: 1 - value / 100 })
  }

  const handleRotate = () => {
    if (!selectedElement) return
    const currentAngle = selectedElement.angle || 0
    const newAngle = (currentAngle + Math.PI / 2) % (Math.PI * 2)
    updateImageElement({ angle: newAngle })
  }

  const handleFlipHorizontal = () => {
    if (!selectedElement) return
    updateImageElement({ 
      width: -selectedElement.width
    })
  }

  const handleFlipVertical = () => {
    if (!selectedElement) return
    updateImageElement({ 
      height: -selectedElement.height
    })
  }

  return (
    <div className="flex items-center gap-2 bg-primary-foreground/90 backdrop-blur-lg text-foreground px-2 py-1.5 rounded-lg shadow-lg border border-primary/20">
      {/* 透明度滑块 */}
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        <span className="text-xs">透明度</span>
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
        <span className="text-xs w-8">{Math.round(opacity)}%</span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* 旋转 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 hover:bg-primary/10"
        onClick={handleRotate}
        title="旋转90°"
      >
        <RotateCw className="h-4 w-4" />
      </Button>

      {/* 水平翻转 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 hover:bg-primary/10"
        onClick={handleFlipHorizontal}
        title="水平翻转"
      >
        <FlipHorizontal className="h-4 w-4" />
      </Button>

      {/* 垂直翻转 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 hover:bg-primary/10"
        onClick={handleFlipVertical}
        title="垂直翻转"
      >
        <FlipVertical className="h-4 w-4" />
      </Button>
    </div>
  )
}
