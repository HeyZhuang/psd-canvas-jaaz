import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { useCanvas } from '@/contexts/canvas'
import { 
  Palette,
  PaintBucket,
  Minus
} from 'lucide-react'
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

interface ShapeToolbarProps {
  selectedElement: ExcalidrawElement
}

// 描边样式类型
type StrokeStyle = 'solid' | 'dashed' | 'dotted'

export function ShapeToolbar({ selectedElement }: ShapeToolbarProps) {
  const { excalidrawAPI } = useCanvas()
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [backgroundColor, setBackgroundColor] = useState('transparent')
  const [strokeWidth, setStrokeWidth] = useState(1)
  const [opacity, setOpacity] = useState(100)
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('solid')
  
  // 使用 ref 存储当前选中元素的 ID，避免依赖整个对象
  const selectedElementIdRef = useRef<string>(selectedElement.id)

  // 同步状态 - 监听具体属性变化
  useEffect(() => {
    if (selectedElement) {
      selectedElementIdRef.current = selectedElement.id
      setStrokeColor(selectedElement.strokeColor)
    }
  }, [selectedElement?.strokeColor])

  useEffect(() => {
    if (selectedElement) {
      setBackgroundColor(selectedElement.backgroundColor)
    }
  }, [selectedElement?.backgroundColor])

  useEffect(() => {
    if (selectedElement) {
      setStrokeWidth(selectedElement.strokeWidth)
    }
  }, [selectedElement?.strokeWidth])

  useEffect(() => {
    if (selectedElement) {
      setOpacity(selectedElement.opacity)
    }
  }, [selectedElement?.opacity])

  useEffect(() => {
    if (selectedElement) {
      setStrokeStyle((selectedElement.strokeStyle as StrokeStyle) || 'solid')
    }
  }, [selectedElement?.strokeStyle])

  // 更新元素方法
  const updateElement = useCallback((updates: Partial<ExcalidrawElement>) => {
    if (!excalidrawAPI) return
    
    const elements = excalidrawAPI.getSceneElements()
    const elementIndex = elements.findIndex(el => el.id === selectedElementIdRef.current)
    
    if (elementIndex === -1) return
    
    const updatedElement = {
      ...elements[elementIndex],
      ...updates,
      versionNonce: elements[elementIndex].versionNonce + 1
    }
    
    excalidrawAPI.updateScene({ 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: [...elements.slice(0, elementIndex), updatedElement, ...elements.slice(elementIndex + 1)] as any 
    })
  }, [excalidrawAPI])

  return (
    <div className="flex items-center gap-2 bg-[#1e1e1e] text-white px-2 py-1.5 rounded-lg shadow-lg border border-gray-700">
      {/* 描边颜色 */}
      <div className="relative group">
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => {
            setStrokeColor(e.target.value)
            updateElement({ strokeColor: e.target.value })
          }}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          title="描边颜色"
        />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors">
          <Palette className="h-4 w-4 pointer-events-none" />
          <div 
            className="w-6 h-6 rounded border border-gray-600 shadow-inner pointer-events-none"
            style={{ backgroundColor: strokeColor }}
          />
        </div>
      </div>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 背景颜色 */}
      <div className="relative group">
        <input
          type="color"
          value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
          onChange={(e) => {
            setBackgroundColor(e.target.value)
            updateElement({ backgroundColor: e.target.value })
          }}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          title="背景颜色"
        />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors">
          <PaintBucket className="h-4 w-4 pointer-events-none" />
          <div 
            className="w-6 h-6 rounded border border-gray-600 shadow-inner pointer-events-none"
            style={{ backgroundColor: backgroundColor === 'transparent' ? '#ffffff' : backgroundColor }}
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-white/10"
        onClick={() => {
          setBackgroundColor('transparent')
          updateElement({ backgroundColor: 'transparent' })
        }}
        title="透明背景"
      >
        透明
      </Button>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 描边样式 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs ${strokeStyle === 'solid' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          onClick={() => {
            setStrokeStyle('solid')
            updateElement({ strokeStyle: 'solid' })
          }}
          title="实线"
        >
          <div className="w-8 h-0.5 bg-current" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs ${strokeStyle === 'dashed' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          onClick={() => {
            setStrokeStyle('dashed')
            updateElement({ strokeStyle: 'dashed' })
          }}
          title="虚线"
        >
          <div className="w-8 h-0.5 border-t-2 border-dashed border-current" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs ${strokeStyle === 'dotted' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          onClick={() => {
            setStrokeStyle('dotted')
            updateElement({ strokeStyle: 'dotted' })
          }}
          title="点线"
        >
          <div className="w-8 h-0.5 border-t-2 border-dotted border-current" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 描边宽度 */}
      <div className="flex items-center gap-2">
        <Minus className="h-4 w-4" />
        <div className="w-20">
          <Slider
            value={[strokeWidth]}
            onValueChange={([value]) => {
              setStrokeWidth(value)
              updateElement({ strokeWidth: value })
            }}
            min={0}
            max={20}
            step={1}
            className="w-full"
          />
        </div>
        <span className="text-xs w-6">{strokeWidth}</span>
      </div>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 透明度 */}
      <div className="flex items-center gap-2">
        <span className="text-xs">不透明度</span>
        <div className="w-20">
          <Slider
            value={[opacity]}
            onValueChange={([value]) => {
              setOpacity(value)
              updateElement({ opacity: value })
            }}
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
