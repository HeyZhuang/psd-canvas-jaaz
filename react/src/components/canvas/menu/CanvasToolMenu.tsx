import { Separator } from '@/components/ui/separator'
import { useCanvas } from '@/contexts/canvas'
import { useState } from 'react'
import CanvasMenuButton from './CanvasMenuButton'
import { ToolType } from './CanvasMenuIcon'
import { PSDCanvasUploader } from '../PSDCanvasUploader'

interface CanvasToolMenuProps {
  canvasId: string
}

const CanvasToolMenu = ({ canvasId }: CanvasToolMenuProps) => {
  const { excalidrawAPI } = useCanvas()

  const [activeTool, setActiveTool] = useState<ToolType | undefined>(undefined)

  const handleToolChange = (tool: ToolType) => {
    excalidrawAPI?.setActiveTool({ type: tool })
  }

  excalidrawAPI?.onChange((_elements, appState, _files) => {
    setActiveTool(appState.activeTool.type as ToolType)
  })

  const handlePSDUploaded = (psdData: any) => {
    console.log('PSD uploaded:', psdData)
    // 可以在這裡添加額外的處理邏輯
  }

  const tools: (ToolType | null)[] = [
    'hand',
    'selection',
    null,
    'rectangle',
    'ellipse',
    'arrow',
    'line',
    'freedraw',
    null,
    'text',
    'image',
  ]

  return (
    <div className="absolute left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 bg-primary-foreground/75 backdrop-blur-lg rounded-lg p-1 shadow-[0_5px_10px_rgba(0,0,0,0.08)] border border-primary/10">
      {tools.map((tool, index) =>
        tool ? (
          <CanvasMenuButton
            key={tool}
            type={tool}
            activeTool={activeTool}
            onClick={() => handleToolChange(tool)}
          />
        ) : (
          <Separator
            key={index}
            orientation="horizontal"
            className="w-6! bg-primary/5"
          />
        )
      )}

      {/* PSD 上傳按鈕 */}
      <Separator
        orientation="horizontal"
        className="w-6! bg-primary/5"
      />
      <PSDCanvasUploader
        canvasId={canvasId}
        onPSDUploaded={handlePSDUploaded}
      />
    </div>
  )
}

export default CanvasToolMenu
