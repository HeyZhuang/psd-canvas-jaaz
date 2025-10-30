import { useCanvas } from '@/contexts/canvas'
import { TCanvasAddImagesToChatEvent } from '@/lib/event'
import { motion } from 'motion/react'
import { memo } from 'react'
import { 
    OrderedExcalidrawElement,
    ExcalidrawTextElement,
    ExcalidrawImageElement,
    ExcalidrawRectangleElement,
    ExcalidrawEllipseElement,
    ExcalidrawDiamondElement,
    ExcalidrawLinearElement,
    ExcalidrawArrowElement
} from '@excalidraw/excalidraw/element/types'
import CanvasMagicGenerator from './CanvasMagicGenerator'
import CanvasPopbar from './CanvasPopbar'
import { TextPopbar } from './TextPopbar'
import { ImagePopbar } from './ImagePopbar'
import { ShapePopbar } from './ShapePopbar'

type CanvasPopbarContainerProps = {
    pos: { x: number; y: number }
    selectedImages: TCanvasAddImagesToChatEvent
    selectedElements: OrderedExcalidrawElement[]
    showAddToChat: boolean
    showMagicGenerate: boolean
    elementType: 'text' | 'image' | 'shape' | 'mixed' | null
}

const CanvasPopbarContainer = ({
    pos,
    selectedImages,
    selectedElements,
    showAddToChat,
    showMagicGenerate,
    elementType
}: CanvasPopbarContainerProps) => {

    // 获取单个选中元素
    const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null

    // 判断是否显示特定工具栏
    const showTextTools = elementType === 'text' && selectedElement
    const showImageTools = elementType === 'image' && selectedElement
    const showShapeTools = elementType === 'shape' && selectedElement

    return (
        <motion.div
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="absolute z-20 flex items-center gap-1 -translate-x-1/2 "
            style={{
                left: `${pos.x}px`,
                top: `${pos.y + 5}px`,
            }}
        >
            <div className="flex items-center gap-1 bg-primary-foreground/75 backdrop-blur-lg rounded-lg p-1 shadow-[0_5px_10px_rgba(0,0,0,0.08)] border border-primary/10 pointer-events-auto">
                {/* 文字编辑工具栏 */}
                {showTextTools && (
                    <TextPopbar selectedElement={selectedElement as ExcalidrawTextElement} />
                )}
                
                {/* 图片编辑工具栏 */}
                {showImageTools && (
                    <ImagePopbar selectedElement={selectedElement as ExcalidrawImageElement} />
                )}
                
                {/* 形状编辑工具栏 */}
                {showShapeTools && (
                    <ShapePopbar 
                        selectedElement={selectedElement as (ExcalidrawRectangleElement | ExcalidrawEllipseElement | ExcalidrawDiamondElement | ExcalidrawLinearElement | ExcalidrawArrowElement)} 
                    />
                )}
                
                {/* 添加到对话 */}
                {showAddToChat && !showTextTools && !showImageTools && !showShapeTools && (
                    <CanvasPopbar selectedImages={selectedImages} />
                )}
                
                {/* 魔法生成 */}
                {showMagicGenerate && !showTextTools && !showImageTools && !showShapeTools && (
                    <CanvasMagicGenerator selectedImages={selectedImages} selectedElements={selectedElements} />
                )}
            </div>
        </motion.div>
    )
}

export default memo(CanvasPopbarContainer) 