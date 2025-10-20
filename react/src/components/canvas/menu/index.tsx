import CanvasToolMenu from './CanvasToolMenu'
import CanvasViewMenu from './CanvasViewMenu'

interface CanvasMenuProps {
  canvasId: string
}

const CanvasMenu = ({ canvasId }: CanvasMenuProps) => {
  return (
    <>
      <CanvasToolMenu canvasId={canvasId} />
      <CanvasViewMenu />
    </>
  )
}

export default CanvasMenu
