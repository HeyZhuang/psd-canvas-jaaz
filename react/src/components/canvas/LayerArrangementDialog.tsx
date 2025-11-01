import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface LayerArrangementDialogProps {
  isOpen: boolean
  onClose: () => void
  onArrange: (width: number, height: number) => void
  isArranging: boolean
  selectedCount: number
}

const presetSizes = [
  { name: 'Instagram Post', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Facebook Post', width: 1200, height: 630 },
  { name: 'Twitter Post', width: 1200, height: 675 },
  { name: 'LinkedIn Post', width: 1200, height: 627 },
  { name: 'A4 (300 DPI)', width: 2480, height: 3508 },
]

export function LayerArrangementDialog({
  isOpen,
  onClose,
  onArrange,
  isArranging,
  selectedCount,
}: LayerArrangementDialogProps) {
  const { t } = useTranslation()
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)

  // 重置表单当对话框打开时
  useEffect(() => {
    if (isOpen) {
      setWidth(800)
      setHeight(600)
    }
  }, [isOpen])

  const handlePresetSelect = (preset: { width: number; height: number }) => {
    setWidth(preset.width)
    setHeight(preset.height)
  }

  const handleArrange = () => {
    if (width <= 0 || height <= 0) {
      toast.error(t('canvas:layerArrangement.invalidDimensions'))
      return
    }
    
    onArrange(width, height)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('canvas:layerArrangement.title')}</DialogTitle>
          <DialogDescription>
            {t('canvas:layerArrangement.description', { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">{t('canvas:layerArrangement.width')}</Label>
              <Input
                id="width"
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                min="1"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">{t('canvas:layerArrangement.height')}</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min="1"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>{t('canvas:layerArrangement.presets')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {presetSizes.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 text-xs"
                  onClick={() => handlePresetSelect(preset)}
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-muted-foreground">
                    {preset.width} × {preset.height}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleArrange} disabled={isArranging}>
            {isArranging 
              ? t('canvas:layerArrangement.arranging') 
              : t('canvas:layerArrangement.arrange')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}