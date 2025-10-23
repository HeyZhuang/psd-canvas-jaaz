import { getCanvas, renameCanvas } from '@/api/canvas'
import CanvasExcali from '@/components/canvas/CanvasExcali'
import CanvasHeader from '@/components/canvas/CanvasHeader'
import CanvasMenu from '@/components/canvas/menu'
import CanvasPopbarWrapper from '@/components/canvas/pop-bar'
// VideoCanvasOverlay removed - using native Excalidraw embeddable elements instead
import ChatInterface from '@/components/chat/Chat'
import { PSDLayerSidebar } from '@/components/canvas/PSDLayerSidebar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { CanvasProvider } from '@/contexts/canvas'
import { Session } from '@/types/types'
import { createFileRoute, useParams, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PSDUploadResponse } from '@/api/upload'

export const Route = createFileRoute('/canvas/$id')({
  component: Canvas,
})

function Canvas() {
  const { id } = useParams({ from: '/canvas/$id' })
  const [canvas, setCanvas] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [canvasName, setCanvasName] = useState('')
  const [sessionList, setSessionList] = useState<Session[]>([])
  // initialVideos removed - using native Excalidraw embeddable elements instead

  // PSD图层侧边栏状态
  const [psdData, setPsdData] = useState<PSDUploadResponse | null>(null)
  const [isLayerSidebarVisible, setIsLayerSidebarVisible] = useState(false)
  const search = useSearch({ from: '/canvas/$id' }) as {
    sessionId: string
  }
  const searchSessionId = search?.sessionId || ''
  useEffect(() => {
    let mounted = true

    const fetchCanvas = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getCanvas(id)
        if (mounted) {
          // getCanvas 现在总是返回有效数据，不需要额外验证
          setCanvas(data)
          setCanvasName(data.name)
          setSessionList(data.sessions)
          // Video elements now handled by native Excalidraw embeddable elements
        }
      } catch (err) {
        // 这个 catch 现在主要用于处理其他类型的错误
        if (mounted) {
          console.error('Unexpected error in fetchCanvas:', err)
          setError(err instanceof Error ? err : new Error('Unexpected error occurred'))
          // 设置默认值
          setCanvas(null)
          setCanvasName('未命名画布')
          setSessionList([])
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchCanvas()

    return () => {
      mounted = false
    }
  }, [id])

  const handleNameSave = async () => {
    await renameCanvas(id, canvasName)
  }

  // PSD数据更新处理
  const handlePSDUpdate = (updatedPsdData: PSDUploadResponse) => {
    setPsdData(updatedPsdData)
    // 当有PSD数据时，自动显示图层侧边栏
    if (updatedPsdData) {
      setIsLayerSidebarVisible(true)
    }
  }

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-screen bg-background'>
        <div className='text-center p-8'>
          <h2 className='text-2xl font-bold text-destructive mb-4'>加载画布失败</h2>
          <p className='text-muted-foreground mb-4'>{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className='px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90'
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <CanvasProvider>
      <div className='flex flex-col w-screen h-screen'>
        <CanvasHeader
          canvasName={canvasName}
          canvasId={id}
          onNameChange={setCanvasName}
          onNameSave={handleNameSave}
          psdData={psdData}
          onPSDUpdate={handlePSDUpdate}
          onApplyTemplate={(template) => {
            console.log('Applying template:', template)
            // 这里可以添加应用模板的逻辑
          }}
        />
        <ResizablePanelGroup
          direction='horizontal'
          className='w-screen h-screen'
          autoSaveId='jaaz-chat-panel'
        >
          <ResizablePanel className='relative' defaultSize={80}>
            <div className='w-full h-full'>
              {isLoading ? (
                <div className='flex-1 flex-grow px-4 bg-accent w-[24%] absolute right-0'>
                  <div className='flex items-center justify-center h-full'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                  </div>
                </div>
              ) : (
                <div className='relative w-full h-full'>
                  <CanvasExcali canvasId={id} initialData={canvas?.data} />
                  <CanvasMenu canvasId={id} />
                  <CanvasPopbarWrapper />
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={20}>
            <div className='flex-1 flex-grow bg-accent/50 w-full'>
              <PSDLayerSidebar
                psdData={psdData}
                isVisible={isLayerSidebarVisible}
                onClose={() => {
                  setIsLayerSidebarVisible(false)
                }}
                onUpdate={handlePSDUpdate}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </CanvasProvider>
  )
}
