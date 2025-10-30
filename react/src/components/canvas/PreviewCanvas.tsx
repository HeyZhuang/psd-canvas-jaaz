import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreviewLayer {
    index: number
    name: string
    type: 'text' | 'layer' | 'group'
    original: {
        x: number
        y: number
        width: number
        height: number
        opacity: number
    }
    preview: {
        x: number
        y: number
        width: number
        height: number
        opacity: number
    }
    thumbnailUrl: string
    isAdjusted: boolean
}

interface PreviewData {
    fileId: string
    originalSize: { width: number; height: number }
    targetSize: { width: number; height: number }
    layers: PreviewLayer[]
    timestamp: number
}

interface PreviewCanvasProps {
    previewData: PreviewData | null
    selectedLayer: number | null
    onLayerSelect: (index: number | null) => void
    onLayerAdjust: (index: number, bounds: Partial<PreviewLayer['preview']>) => void
}

export function PreviewCanvas({
    previewData,
    selectedLayer,
    onLayerSelect,
    onLayerAdjust
}: PreviewCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map())

    // 加载图层缩略图
    useEffect(() => {
        if (!previewData) return

        const imagePromises = previewData.layers.map(layer => {
            return new Promise<{ url: string; img: HTMLImageElement }>((resolve, reject) => {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => resolve({ url: layer.thumbnailUrl, img })
                img.onerror = reject
                img.src = layer.thumbnailUrl
            })
        })

        Promise.all(imagePromises)
            .then(results => {
                const newMap = new Map<string, HTMLImageElement>()
                results.forEach(({ url, img }) => {
                    newMap.set(url, img)
                })
                setLoadedImages(newMap)
            })
            .catch(error => {
                console.error('加载图层缩略图失败:', error)
            })
    }, [previewData])

    // 渲染预览画布
    useEffect(() => {
        if (!canvasRef.current || !previewData) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 设置画布尺寸
        canvas.width = previewData.targetSize.width
        canvas.height = previewData.targetSize.height

        // 清空画布
        ctx.fillStyle = '#f5f5f5'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 绘制网格
        drawGrid(ctx, canvas.width, canvas.height)

        // 绘制图层
        previewData.layers.forEach(layer => {
            drawLayer(ctx, layer, layer.index === selectedLayer, loadedImages)
        })
    }, [previewData, selectedLayer, loadedImages])

    // 绘制网格
    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = '#e0e0e0'
        ctx.lineWidth = 1

        const gridSize = 50

        // 垂直线
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
            ctx.stroke()
        }

        // 水平线
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(width, y)
            ctx.stroke()
        }
    }

    // 绘制图层
    const drawLayer = (
        ctx: CanvasRenderingContext2D,
        layer: PreviewLayer,
        isSelected: boolean,
        images: Map<string, HTMLImageElement>
    ) => {
        const { x, y, width, height, opacity } = layer.preview
        const img = images.get(layer.thumbnailUrl)

        ctx.save()
        ctx.globalAlpha = opacity / 100

        // 绘制图层图片
        if (img) {
            ctx.drawImage(img, x, y, width, height)
        } else {
            // 如果图片未加载，绘制占位符
            ctx.fillStyle = '#ccc'
            ctx.fillRect(x, y, width, height)
            ctx.fillStyle = '#666'
            ctx.font = '12px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('Loading...', x + width / 2, y + height / 2)
        }

        // 如果选中，绘制边框
        if (isSelected) {
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 2
            ctx.strokeRect(x - 1, y - 1, width + 2, height + 2)

            // 绘制调整手柄
            const handleSize = 8
            ctx.fillStyle = '#3b82f6'
            // 四个角
            ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
            ctx.fillRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
            ctx.fillRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
            ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
        } else if (layer.isAdjusted) {
            // 已调整的图层用黄色边框
            ctx.strokeStyle = '#f59e0b'
            ctx.lineWidth = 1
            ctx.strokeRect(x, y, width, height)
        }

        ctx.restore()

        // 绘制图层名称
        if (isSelected) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'
            ctx.fillRect(x, y - 20, Math.min(width, 150), 18)
            ctx.fillStyle = '#fff'
            ctx.font = '12px sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.fillText(
                layer.name.length > 15 ? layer.name.substring(0, 15) + '...' : layer.name,
                x + 4,
                y - 11
            )
        }
    }

    // 查找点击位置的图层
    const findLayerAtPosition = (x: number, y: number, layers: PreviewLayer[]): PreviewLayer | null => {
        // 从上往下查找（后面的图层在上面）
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i]
            const { x: lx, y: ly, width, height } = layer.preview

            if (x >= lx && x <= lx + width && y >= ly && y <= ly + height) {
                return layer
            }
        }
        return null
    }

    // 鼠标按下
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect || !previewData) return

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const clickedLayer = findLayerAtPosition(x, y, previewData.layers)
        if (clickedLayer) {
            onLayerSelect(clickedLayer.index)
            setIsDragging(true)
            setDragStart({ x, y })
        } else {
            onLayerSelect(null)
        }
    }

    // 鼠标移动
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || !dragStart || selectedLayer === null || !previewData) return

        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const dx = x - dragStart.x
        const dy = y - dragStart.y

        const layer = previewData.layers.find(l => l.index === selectedLayer)
        if (layer) {
            onLayerAdjust(selectedLayer, {
                x: Math.max(0, Math.min(layer.preview.x + dx, previewData.targetSize.width - layer.preview.width)),
                y: Math.max(0, Math.min(layer.preview.y + dy, previewData.targetSize.height - layer.preview.height))
            })
        }

        setDragStart({ x, y })
    }

    // 鼠标抬起
    const handleMouseUp = () => {
        setIsDragging(false)
        setDragStart(null)
    }

    // 缩放控制
    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 3))
    }

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.25, 0.25))
    }

    const handleFitToScreen = () => {
        if (!containerRef.current || !previewData) return

        const containerWidth = containerRef.current.clientWidth - 40
        const containerHeight = containerRef.current.clientHeight - 40

        const scaleX = containerWidth / previewData.targetSize.width
        const scaleY = containerHeight / previewData.targetSize.height

        setScale(Math.min(scaleX, scaleY, 1))
        setOffset({ x: 0, y: 0 })
    }

    return (
        <div ref={containerRef} className="relative w-full h-full bg-muted/30 rounded-lg overflow-hidden">
            {/* 工具栏 */}
            <div className="absolute top-2 right-2 z-10 flex gap-2">
                <div className="bg-background/95 backdrop-blur-sm rounded-md shadow-md p-1 flex gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleZoomIn}
                        title="放大"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleZoomOut}
                        title="缩小"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleFitToScreen}
                        title="适应屏幕"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center px-2 text-xs text-muted-foreground">
                        {Math.round(scale * 100)}%
                    </div>
                </div>
            </div>

            {/* 画布容器 */}
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                <div
                    style={{
                        transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        className={cn(
                            "border border-border shadow-lg bg-white",
                            isDragging ? "cursor-grabbing" : "cursor-grab"
                        )}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>
            </div>

            {/* 提示信息 */}
            <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-md shadow-md px-3 py-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Move className="w-3 h-3" />
                    <span>拖拽图层调整位置</span>
                </div>
            </div>
        </div>
    )
}

