import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { useCanvas } from '@/contexts/canvas'
import { 
  Palette,
  PaintBucket,
  Minus
} from 'lucide-react'
import { 
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawLinearElement,
  ExcalidrawArrowElement
} from '@excalidraw/excalidraw/element/types'

type ShapeElement = ExcalidrawRectangleElement | ExcalidrawEllipseElement | ExcalidrawDiamondElement | ExcalidrawLinearElement | ExcalidrawArrowElement

interface ShapePopbarProps {
  selectedElement: ShapeElement
}

export function ShapePopbar({ selectedElement }: ShapePopbarProps) {
  const { excalidrawAPI } = useCanvas()
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [backgroundColor, setBackgroundColor] = useState('transparent')
  const [strokeWidth, setStrokeWidth] = useState(1)
  const [opacity, setOpacity] = useState(100)

  // 从选中元素同步状态
  useEffect(() => {
    if (selectedElement) {
      setStrokeColor(selectedElement.strokeColor || '#000000')
      setBackgroundColor(selectedElement.backgroundColor || 'transparent')
      setStrokeWidth(selectedElement.strokeWidth || 1)
      setOpacity((1 - (selectedElement.opacity || 0)) * 100)
    }
  }, [selectedElement])

  // 更新形状属性
  const updateShapeElement = useCallback((updates: Partial<ShapeElement>) => {
    if (!excalidrawAPI || !selectedElement) return

    const elements = excalidrawAPI.getSceneElements()
    const updatedElements = elements.map(el => {
      if (el.id === selectedElement.id) {
        return { ...el, ...updates }
      }
      return el
    })
    
    excalidrawAPI.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: updatedElements as any
    })
  }, [excalidrawAPI, selectedElement])

  const handleStrokeColorChange = (color: string) => {
    setStrokeColor(color)
    updateShapeElement({ strokeColor: color })
  }

  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color)
    updateShapeElement({ backgroundColor: color })
  }

  const handleStrokeWidthChange = (value: number) => {
    setStrokeWidth(value)
    updateShapeElement({ strokeWidth: value })
  }

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    updateShapeElement({ opacity: 1 - value / 100 })
  }

  return (
    <div className="flex items-center gap-2 bg-primary-foreground/90 backdrop-blur-lg text-foreground px-2 py-1.5 rounded-lg shadow-lg border border-primary/20">
      {/* 描边颜色 */}
      <div className="relative">
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => handleStrokeColorChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-7 h-7 cursor-pointer"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-primary/10 relative"
          title="描边颜色"
        >
          <Palette className="h-4 w-4" />
          <div 
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
            style={{ backgroundColor: strokeColor }}
          />
        </Button>
      </div>

      {/* 背景颜色 */}
      <div className="relative">
        <input
          type="color"
          value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
          onChange={(e) => handleBackgroundColorChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-7 h-7 cursor-pointer"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-primary/10 relative"
          title="背景颜色"
        >
          <PaintBucket className="h-4 w-4" />
          <div 
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
            style={{ backgroundColor: backgroundColor === 'transparent' ? '#ffffff' : backgroundColor }}
          />
        </Button>
      </div>

      {/* 透明按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-primary/10"
        onClick={() => handleBackgroundColorChange('transparent')}
        title="透明背景"
      >
        透明
      </Button>

      <Separator orientation="vertical" className="h-5" />

      {/* 描边宽度 */}
      <div className="flex items-center gap-2">
        <Minus className="h-4 w-4" />
        <div className="w-20">
          <Slider
            value={[strokeWidth]}
            onValueChange={([value]) => handleStrokeWidthChange(value)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>
        <span className="text-xs w-6">{strokeWidth}</span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* 透明度 */}
      <div className="flex items-center gap-2">
        <span className="text-xs">透明度</span>
        <div className="w-20">
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
    </div>
  )
}
