import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { useCanvas } from '@/contexts/canvas'
import {
  Layers,
  Merge,
  ChevronDown,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Edit3
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export function GroupToolbar() {
  const { excalidrawAPI } = useCanvas()
  const [showAlignMenu, setShowAlignMenu] = useState(false)
  const [showResizeMenu, setShowResizeMenu] = useState(false)

  const handleGroup = useCallback(() => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    // 至少需要两个元素才能分组
    if (selectedElements.length < 2) {
      console.log('至少需要选择两个元素才能进行分组')
      return
    }

    // 生成一个新的group ID
    const groupId = `${Date.now()}-${Math.random().toString(36)}`

    // 为选中的元素添加group ID
    const updatedElements = selectedElements.map(element => ({
      ...element,
      groupIds: [...element.groupIds, groupId]
    }))

    // 更新场景中的元素
    excalidrawAPI.updateScene({
      elements: allElements.map(el => {
        const updatedElement = updatedElements.find(uEl => uEl.id === el.id)
        return updatedElement ? updatedElement : el
      })
    })

    console.log(`成功将 ${selectedElements.length} 个元素分组`)
  }, [excalidrawAPI])

  const handleUngroup = useCallback(() => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    // 至少需要一个元素才能取消分组
    if (selectedElements.length < 1) {
      console.log('至少需要选择一个元素才能取消分组')
      return
    }

    // 移除选中元素的最后一个group ID（实现取消分组）
    const updatedElements = selectedElements.map(element => {
      const newElement = { ...element }
      if (newElement.groupIds.length > 0) {
        // 移除最后一个group ID
        newElement.groupIds = newElement.groupIds.slice(0, -1)
      }
      return newElement
    })

    // 更新场景中的元素
    excalidrawAPI.updateScene({
      elements: allElements.map(el => {
        const updatedElement = updatedElements.find(uEl => uEl.id === el.id)
        return updatedElement ? updatedElement : el
      })
    })

    console.log(`成功将 ${selectedElements.length} 个元素取消分组`)
  }, [excalidrawAPI])

  const handleAlign = useCallback((alignment: string) => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    if (selectedElements.length < 2) return

    // 计算边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    selectedElements.forEach(element => {
      minX = Math.min(minX, element.x)
      minY = Math.min(minY, element.y)
      maxX = Math.max(maxX, element.x + element.width)
      maxY = Math.max(maxY, element.y + element.height)
    })

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // 根据对齐类型调整元素位置
    const updatedElements = selectedElements.map(element => {
      const newElement = { ...element }

      switch (alignment) {
        case 'left':
          // 将元素的左侧对齐到整体的最左侧
          newElement.x = minX
          break
        case 'horizontal-center':
          // 将元素的中心对齐到整体的水平中心
          newElement.x = centerX - element.width / 2
          break
        case 'right':
          // 将元素的右侧对齐到整体的最右侧
          newElement.x = maxX - element.width
          break
        case 'top':
          // 将元素的顶部对齐到整体的顶部
          newElement.y = minY
          break
        case 'vertical-center':
          // 将元素的中心对齐到整体的垂直中心
          newElement.y = centerY - element.height / 2
          break
        case 'bottom':
          // 将元素的底部对齐到整体的底部
          newElement.y = maxY - element.height
          break
      }

      return newElement
    })

    // 更新场景
    excalidrawAPI.updateScene({
      elements: allElements.map(el => {
        const updatedElement = updatedElements.find(uEl => uEl.id === el.id)
        return updatedElement ? updatedElement : el
      })
    })
  }, [excalidrawAPI])

  const handleResize = useCallback((width: number, height: number) => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    if (selectedElements.length === 0) return

    // 计算当前选中元素的边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    selectedElements.forEach(element => {
      minX = Math.min(minX, element.x)
      minY = Math.min(minY, element.y)
      maxX = Math.max(maxX, element.x + element.width)
      maxY = Math.max(maxY, element.y + element.height)
    })

    const currentWidth = maxX - minX
    const currentHeight = maxY - minY

    // 计算缩放比例
    const scaleX = width / currentWidth
    const scaleY = height / currentHeight

    // 根据缩放比例调整元素
    const updatedElements = selectedElements.map(element => {
      const newElement = { ...element }

      // 相对于边界框左上角的位置比例
      const ratioX = (element.x - minX) / currentWidth
      const ratioY = (element.y - minY) / currentHeight
      const ratioWidth = element.width / currentWidth
      const ratioHeight = element.height / currentHeight

      // 根据新尺寸调整元素位置和大小
      newElement.x = minX + ratioX * width
      newElement.y = minY + ratioY * height
      newElement.width = ratioWidth * width
      newElement.height = ratioHeight * height

      return newElement
    })

    // 更新场景
    excalidrawAPI.updateScene({
      elements: allElements.map(el => {
        const updatedElement = updatedElements.find(uEl => uEl.id === el.id)
        return updatedElement ? updatedElement : el
      })
    })
  }, [excalidrawAPI])

  // 预设尺寸
  const presetSizes = [
    { name: 'Instagram Post', width: 1080, height: 1080 },
    { name: 'Instagram Story', width: 1080, height: 1920 },
    { name: 'Facebook Post', width: 1200, height: 630 },
    { name: 'Facebook Cover', width: 851, height: 315 },
    { name: 'Twitter Post', width: 1024, height: 512 }
  ]

  const alignments = [
    { icon: AlignStartVertical, label: 'Align Left', value: 'left' },
    { icon: AlignCenterHorizontal, label: 'Horizontal Center', value: 'horizontal-center' },
    { icon: AlignEndVertical, label: 'Align Right', value: 'right' },
    { icon: AlignStartHorizontal, label: 'Align Top', value: 'top' },
    { icon: AlignCenterVertical, label: 'Vertical Center', value: 'vertical-center' },
    { icon: AlignEndHorizontal, label: 'Align Bottom', value: 'bottom' }
  ]

  return (
    <div className="flex items-center gap-1 bg-[#1e1e1e] text-white px-2 py-1.5 rounded-lg shadow-lg border border-gray-700">
      {/* Group按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 hover:bg-white/10"
        onClick={handleGroup}
      >
        <Layers className="h-4 w-4 mr-1" />
        <span className="text-xs">Group</span>
      </Button>

      {/* Merge按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 hover:bg-white/10"
        onClick={handleUngroup}
      >
        <Merge className="h-4 w-4 mr-1" />
        <span className="text-xs">Ungroup</span>
      </Button>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 对齐菜单 */}
      <DropdownMenu open={showAlignMenu} onOpenChange={setShowAlignMenu}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-white/10">
            <AlignCenterHorizontal className="h-4 w-4 mr-1" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-[#2a2a2a] text-white border-gray-700 w-48"
          align="start"
        >
          {alignments.map((alignment, index) => (
            <div key={alignment.value}>
              <DropdownMenuItem
                onClick={() => {
                  handleAlign(alignment.value)
                  setShowAlignMenu(false)
                }}
                className="hover:bg-white/10 flex items-center gap-2"
              >
                <alignment.icon className="h-4 w-4" />
                <span className="text-xs">{alignment.label}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {alignment.value === 'left' && '⌘ H'}
                  {alignment.value === 'vertical-center' && '⌘ V'}
                </span>
              </DropdownMenuItem>
              {index === 2 && <DropdownMenuSeparator className="bg-gray-700" />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* Resize按钮 */}
      <DropdownMenu open={showResizeMenu} onOpenChange={setShowResizeMenu}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-white/10">
            <Edit3 className="h-4 w-4 mr-1" />
            <span className="text-xs">Resize</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-[#2a2a2a] text-white border-gray-700 w-56 p-3"
          align="start"
        >
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-400 uppercase">预设尺寸</div>
            {presetSizes.map((preset) => (
              <DropdownMenuItem
                key={preset.name}
                onClick={() => {
                  handleResize(preset.width, preset.height)
                  setShowResizeMenu(false)
                }}
                className="hover:bg-white/10 flex items-center gap-2 text-xs"
              >
                <div className="flex-1">
                  <div className="font-medium">{preset.name}</div>
                </div>
                <div className="text-gray-400">
                  {preset.width} × {preset.height}
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className="bg-gray-700" />

            {/* 自定义尺寸 */}
            <div className="text-xs font-medium text-gray-400 uppercase mb-2">自定义尺寸</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="W"
                  className="h-7 bg-[#1e1e1e] border-gray-700 text-white text-xs"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement
                      const width = parseInt(target.value)
                      const heightInput = target.parentElement?.nextElementSibling?.nextElementSibling?.firstChild as HTMLInputElement
                      const height = parseInt(heightInput?.value || '0')
                      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                        handleResize(width, height)
                        setShowResizeMenu(false)
                      }
                    }
                  }}
                />
              </div>
              <span className="text-xs text-gray-400">×</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="H"
                  className="h-7 bg-[#1e1e1e] border-gray-700 text-white text-xs"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement
                      const height = parseInt(target.value)
                      const widthInput = target.parentElement?.previousElementSibling?.previousElementSibling?.firstChild as HTMLInputElement
                      const width = parseInt(widthInput?.value || '0')
                      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                        handleResize(width, height)
                        setShowResizeMenu(false)
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}