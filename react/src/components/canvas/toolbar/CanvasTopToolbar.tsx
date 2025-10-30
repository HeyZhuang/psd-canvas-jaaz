import { useState, useEffect } from 'react'
import { useCanvas } from '@/contexts/canvas'
import { TextToolbar } from './TextToolbar'
import { ImageToolbar } from './ImageToolbar'
import { GroupToolbar } from './GroupToolbar'
import { ShapeToolbar } from './ShapeToolbar'
import { 
  ExcalidrawTextElement,
  ExcalidrawImageElement,
  ExcalidrawElement
} from '@excalidraw/excalidraw/element/types'

export function CanvasTopToolbar() {
  const { excalidrawAPI } = useCanvas()
  const [selectedElementType, setSelectedElementType] = useState<'text' | 'image' | 'shape' | 'group' | null>(null)
  const [selectedElement, setSelectedElement] = useState<ExcalidrawElement | null>(null)
  const [updateKey, setUpdateKey] = useState(0)

  useEffect(() => {
    if (!excalidrawAPI) return

    const handleChange = () => {
      const selectedElements = excalidrawAPI.getAppState().selectedElementIds
      const elements = excalidrawAPI.getSceneElements()

      if (Object.keys(selectedElements).length === 0) {
        setSelectedElementType(null)
        setSelectedElement(null)
        return
      }

      // 获取选中的元素
      const selected = elements.filter(el => selectedElements[el.id])

      // 判断选中元素的类型
      if (selected.length === 1) {
        const element = selected[0]
        // 创建新的对象引用，确保 React 能检测到变化
        setSelectedElement({ ...element })
        // 强制更新组件
        // setUpdateKey(prev => prev + 1)
        
        if (element.type === 'text') {
          setSelectedElementType('text')
        } else if (element.type === 'image') {
          setSelectedElementType('image')
        } else if (['rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(element.type)) {
          setSelectedElementType('shape')
        } else {
          setSelectedElementType(null)
        }
      } else if (selected.length > 1) {
        // 多选时显示Group工具栏
        setSelectedElementType('group')
        setSelectedElement(null)
      } else {
        setSelectedElementType(null)
        setSelectedElement(null)
      }
    }

    // 监听画布变化
    excalidrawAPI.onChange(handleChange)
  }, [excalidrawAPI])

  if (!selectedElementType) {
    return null
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-5 z-20">
      {selectedElementType === 'text' && selectedElement && (
        <TextToolbar key={`text-${selectedElement.id}-${updateKey}`} selectedElement={selectedElement as ExcalidrawTextElement} />
      )}
      {selectedElementType === 'image' && selectedElement && (
        <ImageToolbar key={`image-${selectedElement.id}-${updateKey}`} selectedElement={selectedElement as ExcalidrawImageElement} />
      )}
      {selectedElementType === 'shape' && selectedElement && (
        <ShapeToolbar key={`shape-${selectedElement.id}-${updateKey}`} selectedElement={selectedElement} />
      )}
      {selectedElementType === 'group' && (
        <GroupToolbar />
      )}
    </div>
  )
}
