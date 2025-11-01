import { Button } from '@/components/ui/button'
import { Hotkey } from '@/components/ui/hotkey'
import { useCanvas } from '@/contexts/canvas'
import { useKeyPress } from 'ahooks'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { LayerArrangementDialog } from '../LayerArrangementDialog'
import { arrangeCanvasElements, ElementArrangement } from '@/api/upload'
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'

type CanvasSmartArrangeButtonProps = {
  selectedElements: OrderedExcalidrawElement[]
}

const CanvasSmartArrangeButton = ({ selectedElements }: CanvasSmartArrangeButtonProps) => {
  const { t } = useTranslation()
  const { excalidrawAPI } = useCanvas()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isArranging, setIsArranging] = useState(false)

  // 只有当选择了2个或更多元素时才显示按钮
  if (selectedElements.length < 2) {
    return null
  }

  const handleArrangeLayers = async (targetWidth: number, targetHeight: number) => {
    if (!excalidrawAPI || selectedElements.length < 2) return

    try {
      setIsArranging(true)
      
      // 获取当前画布尺寸
      const sceneState = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      
      // 计算当前画布的实际尺寸
      let canvasWidth = appState.width || 800
      let canvasHeight = appState.height || 600
      
      // 如果有元素，基于元素计算画布边界
      if (sceneState.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        sceneState.forEach(element => {
          minX = Math.min(minX, element.x)
          minY = Math.min(minY, element.y)
          maxX = Math.max(maxX, element.x + element.width)
          maxY = Math.max(maxY, element.y + element.height)
        })
        canvasWidth = maxX - minX
        canvasHeight = maxY - minY
      }

      // 准备请求数据
      const requestData = {
        selectedElements: selectedElements.map(element => ({
          id: element.id,
          type: element.type,
          x: element.x,
          y: element.y,
          width: Math.abs(element.width),  // 确保宽度为正数
          height: Math.abs(element.height), // 确保高度为正数
          angle: element.angle || 0,
          strokeColor: element.strokeColor,
          backgroundColor: element.backgroundColor,
          fillStyle: element.fillStyle,
          strokeWidth: element.strokeWidth,
        })).filter(element => 
          // 过滤掉无效的元素
          element.width > 0 && 
          element.height > 0 &&
          isFinite(element.x) &&
          isFinite(element.y) &&
          isFinite(element.width) &&
          isFinite(element.height)
        ),
        canvasWidth: Math.abs(canvasWidth),
        canvasHeight: Math.abs(canvasHeight),
        targetWidth: Math.abs(targetWidth),
        targetHeight: Math.abs(targetHeight),
      }

      console.log('发送图层排列请求:', requestData)
      console.log('选中的图层数量:', selectedElements.length)
      console.log('每个图层的详细信息:')
      selectedElements.forEach((element, index) => {
        console.log(`  图层 ${index + 1}:`, {
          id: element.id,
          type: element.type,
          position: { x: element.x, y: element.y },
          size: { width: element.width, height: element.height },
          angle: element.angle
        })
      })
      console.log('画布信息:', { canvasWidth, canvasHeight })
      console.log('目标尺寸:', { targetWidth, targetHeight })

      // 调用API进行图层排列
      const response = await arrangeCanvasElements(requestData)
      
      console.log('收到图层排列响应:', response)

      if (response.success) {
        console.log('排列成功，准备创建新的排列图层');
        console.log('排列结果数量:', response.arrangements.length);
        console.log('排列结果:', response.arrangements);
        console.log('选中的元素ID:', selectedElements.map(e => e.id));
        
        // 计算原图层的右边界（最大X坐标），用于确定新图层的位置
        let maxOriginalX = -Infinity
        selectedElements.forEach(element => {
          const rightEdge = element.x + element.width
          maxOriginalX = Math.max(maxOriginalX, rightEdge)
        })
        
        // 设置新图层与原图层的间距
        const spacing = 100
        const offsetX = maxOriginalX + spacing
        
        // 计算排列后图层的最小Y坐标，用于对齐
        let minNewY = Infinity
        response.arrangements.forEach((arr: ElementArrangement) => {
          minNewY = Math.min(minNewY, arr.new_coords.y)
        })
        
        // 计算原图层的最小Y坐标
        let minOriginalY = Infinity
        selectedElements.forEach(element => {
          minOriginalY = Math.min(minOriginalY, element.y)
        })
        
        // 计算Y方向的偏移，使新图层与原图层顶部对齐
        const offsetY = minOriginalY - minNewY
        
        // 创建新的排列后的元素（保留原图层不变）
        const newElements: OrderedExcalidrawElement[] = []
        
        response.arrangements.forEach((arrangement: ElementArrangement) => {
          // 找到对应的原始元素
          const originalElement = selectedElements.find(
            elem => String(elem.id) === String(arrangement.id)
          )
          
          if (originalElement) {
            // 生成新的唯一ID
            const newId = `${originalElement.id}_arranged_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
            
            // 创建新元素，复制原元素的所有属性，但使用新的位置和尺寸
            const newElement: OrderedExcalidrawElement = {
              ...originalElement,
              id: newId,
              // 使用排列后的坐标，并应用偏移量
              x: arrangement.new_coords.x + offsetX,
              y: arrangement.new_coords.y + offsetY,
              width: arrangement.new_coords.width,
              height: arrangement.new_coords.height,
              // 更新时间戳和版本号
              updated: Date.now(),
              versionNonce: Math.floor(Math.random() * 1000000),
              // 添加自定义标记，表示这是排列后的元素
              customData: {
                ...(originalElement.customData || {}),
                isArranged: true,
                originalElementId: originalElement.id,
                arrangementTimestamp: Date.now()
              }
            }
            
            console.log(`创建新元素 ${newId} (原元素: ${originalElement.id}):`, {
              old: { x: originalElement.x, y: originalElement.y, width: originalElement.width, height: originalElement.height },
              new: { 
                x: newElement.x, 
                y: newElement.y, 
                width: newElement.width, 
                height: newElement.height 
              },
              offset: { x: offsetX, y: offsetY }
            })
            
            newElements.push(newElement)
          } else {
            console.warn(`找不到原始元素，ID: ${arrangement.id}`)
          }
        })
        
        if (newElements.length > 0) {
          // 获取当前所有画布元素
          const currentElements = excalidrawAPI.getSceneElements()
          
          // 添加新元素到画布（原图层保持不变）
          excalidrawAPI.updateScene({
            elements: [...currentElements, ...newElements],
          })
          
          // 选中新创建的元素
          excalidrawAPI.updateScene({
            appState: {
              selectedElementIds: newElements.reduce((acc, element) => {
                acc[element.id] = true
                return acc
              }, {} as Record<string, boolean>)
            }
          })
          
          // 强制刷新以确保更新正确显示
          excalidrawAPI.refresh()
          
          console.log(`成功创建 ${newElements.length} 个新的排列图层，原图层保持不变`);
          
          toast.success(t('canvas:messages.layerArrangement.arrangementSuccess'))
        } else {
          console.warn('没有创建任何新元素');
          toast.error(t('canvas:messages.layerArrangement.arrangementFailed'))
        }
      } else {
        console.log('排列失败:', response);
        toast.error(t('canvas:messages.layerArrangement.arrangementFailed'))
      }
    } catch (error) {
      console.error('图层排列失败:', error);
      // 检查是否是由于模型过载导致的错误
      if (error instanceof Error && error.message.includes('overloaded')) {
        toast.error(t('canvas:messages.layerArrangement.modelOverloaded'));
      } else {
        toast.error(t('canvas:messages.layerArrangement.arrangementError'));
      }
    } finally {
      setIsArranging(false)
      setIsDialogOpen(false)
    }
  }

  const openDialog = () => {
    setIsDialogOpen(true)
  }

  useKeyPress(['meta.shift.r', 'ctrl.shift.r'], openDialog)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={openDialog}
        disabled={isArranging}
      >
        {t('canvas:popbar.smartArrange')} <Hotkey keys={['⇧', '⌘', 'R']} />
      </Button>

      <LayerArrangementDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onArrange={handleArrangeLayers}
        isArranging={isArranging}
        selectedCount={selectedElements.length}
      />
    </>
  )
}

export default memo(CanvasSmartArrangeButton)