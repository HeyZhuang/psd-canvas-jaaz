import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import React from 'react'
import { useTranslation } from 'react-i18next'
import icons, { toolShortcuts, ToolType } from './CanvasMenuIcon'

type CanvasMenuButtonProps = {
  type: ToolType
  active?: boolean
  activeTool?: ToolType
  onClick?: () => void
  className?: string
}

const CanvasMenuButton = ({
  type,
  active,
  activeTool,
  onClick,
  className,
}: CanvasMenuButtonProps) => {
  const { t } = useTranslation()
  const isActive = activeTool === type || active

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'p-2 rounded-md cursor-pointer hover:bg-primary/5',
            isActive && 'bg-primary/10',
            className
          )}
          onMouseDown={(e) => {
            e.preventDefault()
            onClick?.()
          }}
        >
          {React.createElement(icons[type], {
            className: 'size-4',
          })}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {t(`canvas:tool.${type}`)} ({toolShortcuts[type]})
      </TooltipContent>
    </Tooltip>
  )
}

export default CanvasMenuButton
