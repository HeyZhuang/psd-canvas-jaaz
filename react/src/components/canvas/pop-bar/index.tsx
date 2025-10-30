import { useCanvas } from '@/contexts/canvas'
import { TCanvasAddImagesToChatEvent } from '@/lib/event'
import {
  ExcalidrawImageElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types'
import { AnimatePresence } from 'motion/react'
import { useRef, useState } from 'react'
import CanvasPopbarContainer from './CanvasPopbarContainer'

const CanvasPopbarWrapper = () => {
  const { excalidrawAPI } = useCanvas()

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [showAddToChat, setShowAddToChat] = useState(false)
  const [showMagicGenerate, setShowMagicGenerate] = useState(false)
  const [elementType, setElementType] = useState<'text' | 'image' | 'shape' | 'mixed' | null>(null)

  const selectedImagesRef = useRef<TCanvasAddImagesToChatEvent>([])
  const selectedElementsRef = useRef<OrderedExcalidrawElement[]>([])

  excalidrawAPI?.onChange((elements, appState, files) => {
    const selectedIds = appState.selectedElementIds
    if (Object.keys(selectedIds).length === 0) {
      setPos(null)
      setShowAddToChat(false)
      setShowMagicGenerate(false)
      setElementType(null)
      return
    }

    const selectedImages = elements.filter(
      (element) => element.type === 'image' && selectedIds[element.id]
    ) as ExcalidrawImageElement[]

    // 获取所有选中的元素
    const allSelectedElements = elements.filter((element) => selectedIds[element.id])
    const selectedCount = allSelectedElements.length

    // 判断元素类型
    let detectedType: 'text' | 'image' | 'shape' | 'mixed' | null = null
    if (selectedCount === 1) {
      const element = allSelectedElements[0]
      if (element.type === 'text') {
        detectedType = 'text'
      } else if (element.type === 'image') {
        detectedType = 'image'
      } else if (['rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(element.type)) {
        detectedType = 'shape'
      }
    } else if (selectedCount > 1) {
      detectedType = 'mixed'
    }
    setElementType(detectedType)

    // 判断是否显示添加到对话按钮：选中图片元素
    const hasSelectedImages = selectedImages.length > 0
    setShowAddToChat(hasSelectedImages)

    // 判断是否显示魔法生成按钮：选中2个以上元素（包含所有类型）
    setShowMagicGenerate(selectedCount >= 2)

    // 如果既没有选中图片，也没有满足魔法生成条件，且没有单个特定类型元素，隐藏弹窗
    if (!hasSelectedImages && selectedCount < 2 && !['text', 'image', 'shape'].includes(detectedType || '')) {
      setPos(null)
      return
    }

    // 处理选中的图片数据
    selectedImagesRef.current = selectedImages
      .filter((image) => image.fileId)
      .map((image) => {
        const file = files[image.fileId!]
        if (!file || !file.dataURL) {
          console.warn(`File not found for image ${image.fileId}`)
          return null
        }
        const isBase64 = file.dataURL.startsWith('data:')
        const id = isBase64 ? file.id : file.dataURL.split('/').at(-1)!
        return {
          fileId: id,
          base64: isBase64 ? file.dataURL : undefined,
          width: image.width,
          height: image.height,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    // 处理选中的元素数据
    selectedElementsRef.current = elements.filter(
      (element) => selectedIds[element.id] && element.index !== null
    ) as OrderedExcalidrawElement[]

    // 计算位置：如果有图片，基于图片；否则基于所有选中的元素
    let centerX: number
    let bottomY: number

    if (hasSelectedImages) {
      // 基于选中的图片计算位置
      centerX =
        selectedImages.reduce((acc, image) => acc + image.x + image.width / 2, 0) /
        selectedImages.length

      bottomY = selectedImages.reduce(
        (acc, image) => Math.max(acc, image.y + image.height),
        Number.NEGATIVE_INFINITY
      )
    } else {
      // 基于所有选中的元素计算位置
      const selectedElements = elements.filter((element) => selectedIds[element.id])

      centerX =
        selectedElements.reduce(
          (acc, element) => acc + element.x + (element.width || 0) / 2,
          0
        ) / selectedElements.length

      bottomY = selectedElements.reduce(
        (acc, element) => Math.max(acc, element.y + (element.height || 0)),
        Number.NEGATIVE_INFINITY
      )
    }

    const scrollX = appState.scrollX
    const scrollY = appState.scrollY
    const zoom = appState.zoom.value
    const offsetX = (scrollX + centerX) * zoom
    const offsetY = (scrollY + bottomY) * zoom
    setPos({ x: offsetX, y: offsetY })
    // console.log(offsetX, offsetY)
  })

  return (
    // Pop-bar 功能已移至顶部工具栏，此组件保留但不显示
    null
    // <div className='absolute left-0 bottom-0 w-full h-full z-20 pointer-events-none'>
    //   <AnimatePresence>
    //     {pos && (showAddToChat || showMagicGenerate || elementType === 'text' || elementType === 'image' || elementType === 'shape') && (
    //       <CanvasPopbarContainer
    //         pos={pos}
    //         selectedImages={selectedImagesRef.current}
    //         selectedElements={selectedElementsRef.current}
    //         showAddToChat={showAddToChat}
    //         showMagicGenerate={showMagicGenerate}
    //         elementType={elementType}
    //       />
    //     )}
    //   </AnimatePresence>
    // </div>
  )
}

export default CanvasPopbarWrapper
