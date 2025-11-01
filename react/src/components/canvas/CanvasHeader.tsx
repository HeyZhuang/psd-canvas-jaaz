import { Input } from '@/components/ui/input'
import CanvasExport from './CanvasExport'
import { PSDCanvasUploader } from './PSDCanvasUploader'
import TopMenu from '../TopMenu'

type CanvasHeaderProps = {
  canvasName: string
  canvasId: string
  onNameChange: (name: string) => void
  onNameSave: () => void
  psdData?: any
  onPSDUpdate?: (psdData: any) => void
  onApplyTemplate?: (template: any) => void
}

const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  canvasName,
  canvasId,
  onNameChange,
  onNameSave,
  psdData,
  onPSDUpdate,
  onApplyTemplate,
}) => {
  return (
    <TopMenu
      middle={
        <Input
          className="text-sm text-muted-foreground text-center bg-transparent border-none shadow-none w-fit h-7 hover:bg-primary-foreground transition-all"
          value={canvasName}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onNameSave}
        />
      }
      right={
        <div className="flex items-center gap-2">
          <PSDCanvasUploader
            canvasId={canvasId}
            onPSDUploaded={onPSDUpdate}
          />
          <CanvasExport />
        </div>
      }
    />
  )
}

export default CanvasHeader
