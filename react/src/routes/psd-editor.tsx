import { PSDEditor } from '@/components/psd/PSDEditor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/psd-editor')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PSDEditor />
}
