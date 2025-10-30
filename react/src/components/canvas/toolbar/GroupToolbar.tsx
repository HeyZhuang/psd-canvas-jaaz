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
    // Excalidraw 原生不支持 group，但可以通过 Ctrl+G 快捷键
    console.log('Group action - use Ctrl+G')
  }, [excalidrawAPI])

  const handleAlign = useCallback((alignment: string) => {
    if (!excalidrawAPI) return
    console.log('Align:', alignment)
    // TODO: 实现对齐逻辑
  }, [excalidrawAPI])

  const handleResize = useCallback((width: number, height: number) => {
    if (!excalidrawAPI) return
    console.log('Resize to:', width, height)
    // TODO: 实现调整大小逻辑
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
        onClick={() => console.log('Merge - not implemented')}
      >
        <Merge className="h-4 w-4 mr-1" />
        <span className="text-xs">Merge</span>
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
                />
              </div>
              <span className="text-xs text-gray-400">×</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="H"
                  className="h-7 bg-[#1e1e1e] border-gray-700 text-white text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
