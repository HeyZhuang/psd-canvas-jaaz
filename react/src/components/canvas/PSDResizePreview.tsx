import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { Loader2, Check, RefreshCw, Eye, EyeOff, Type, Image as ImageIcon, FolderOpen } from 'lucide-react'
import { PSDUploadResponse } from '@/api/upload'
import { PreviewCanvas } from './PreviewCanvas'
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

interface PSDResizePreviewProps {
    psdData: PSDUploadResponse
    selectedLayerIndices: number[]
    targetWidth: number
    targetHeight: number
    apiKey?: string
    onConfirm: (adjustedLayers?: PreviewLayer[]) => void
    onCancel: () => void
}

export function PSDResizePreview({
    psdData,
    selectedLayerIndices,
    targetWidth,
    targetHeight,
    apiKey,
    onConfirm,
    onCancel
}: PSDResizePreviewProps) {
    const [previewData, setPreviewData] = useState<PreviewData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedPreviewLayer, setSelectedPreviewLayer] = useState<number | null>(null)
    const [error, setError] = useState<string>('')

    // 获取预览数据
    const fetchPreviewData = useCallback(async () => {
        setIsLoading(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('file_id', psdData.file_id)
            formData.append('layer_indices', JSON.stringify(selectedLayerIndices))
            formData.append('target_width', targetWidth.toString())
            formData.append('target_height', targetHeight.toString())
            if (apiKey) {
                formData.append('api_key', apiKey)
            }

            const response = await fetch('/api/psd/resize/preview-selected-layers', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => null)
                throw new Error(errorData?.detail || `API 错误: ${response.status}`)
            }

            const data = await response.json()
            setPreviewData(data)
            console.log('预览数据加载成功:', data)
        } catch (error: any) {
            console.error('获取预览数据失败:', error)
            setError(error.message || '获取预览数据失败')
            toast.error('获取预览失败: ' + (error.message || '未知错误'))
        } finally {
            setIsLoading(false)
        }
    }, [psdData, selectedLayerIndices, targetWidth, targetHeight, apiKey])

    // 初始加载
    useEffect(() => {
        fetchPreviewData()
    }, [fetchPreviewData])

    // 手动调整图层
    const handleLayerAdjust = useCallback((layerIndex: number, newBounds: Partial<PreviewLayer['preview']>) => {
        setPreviewData(prev => {
            if (!prev) return prev

            return {
                ...prev,
                layers: prev.layers.map(layer =>
                    layer.index === layerIndex
                        ? {
                            ...layer,
                            preview: { ...layer.preview, ...newBounds },
                            isAdjusted: true
                        }
                        : layer
                )
            }
        })
    }, [])

    // 确认并应用
    const handleConfirm = () => {
        if (!previewData) return
        onConfirm(previewData.layers)
    }

    // 获取图层图标
    const getLayerIcon = (type: string) => {
        switch (type) {
            case 'text':
                return <Type className="h-4 w-4 text-blue-500" />
            case 'group':
                return <FolderOpen className="h-4 w-4 text-yellow-500" />
            default:
                return <ImageIcon className="h-4 w-4 text-green-500" />
        }
    }

    return (
        <Dialog open onOpenChange={onCancel}>
            <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>缩放预览</DialogTitle>
                    <DialogDescription>
                        预览 AI 生成的缩放效果，可手动调整图层位置
                    </DialogDescription>
                </DialogHeader>

                {error ? (
                    <div className="flex flex-col items-center justify-center h-96 text-center">
                        <div className="text-destructive mb-4">{error}</div>
                        <Button onClick={fetchPreviewData}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            重试
                        </Button>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center h-96">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                        <div className="text-sm text-muted-foreground">
                            正在调用 Gemini API 生成预览...
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
                        {/* 左侧：预览画布 */}
                        <div className="flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium">预览画布</h3>
                                <div className="text-xs text-muted-foreground">
                                    {previewData?.targetSize.width} × {previewData?.targetSize.height}
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                <PreviewCanvas
                                    previewData={previewData}
                                    selectedLayer={selectedPreviewLayer}
                                    onLayerSelect={setSelectedPreviewLayer}
                                    onLayerAdjust={handleLayerAdjust}
                                />
                            </div>
                        </div>

                        {/* 右侧：图层列表和调整面板 */}
                        <div className="flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium">图层列表</h3>
                                <Badge variant="secondary" className="text-xs">
                                    {previewData?.layers.length || 0} 个图层
                                </Badge>
                            </div>

                            <ScrollArea className="flex-1 border rounded-lg p-2">
                                <div className="space-y-1">
                                    {previewData?.layers.map(layer => (
                                        <PreviewLayerItem
                                            key={layer.index}
                                            layer={layer}
                                            isSelected={selectedPreviewLayer === layer.index}
                                            onClick={() => setSelectedPreviewLayer(layer.index)}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>

                            {/* 选中图层的详细调整 */}
                            {selectedPreviewLayer !== null && previewData && (
                                <div className="mt-4 p-3 border rounded-lg bg-muted/50">
                                    <h4 className="text-xs font-medium mb-3 flex items-center gap-2">
                                        <Eye className="w-3 h-3" />
                                        精确调整
                                    </h4>
                                    <AdjustmentPanel
                                        layer={previewData.layers.find(l => l.index === selectedPreviewLayer)}
                                        onAdjust={(bounds) => handleLayerAdjust(selectedPreviewLayer, bounds)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                        取消
                    </Button>
                    <Button
                        variant="outline"
                        onClick={fetchPreviewData}
                        disabled={isLoading}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        重新预览
                    </Button>
                    <Button onClick={handleConfirm} disabled={isLoading || !previewData}>
                        <Check className="w-4 h-4 mr-2" />
                        确认并应用
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// 预览图层项组件
function PreviewLayerItem({
    layer,
    isSelected,
    onClick
}: {
    layer: PreviewLayer
    isSelected: boolean
    onClick: () => void
}) {
    const getLayerIcon = (type: string) => {
        switch (type) {
            case 'text':
                return <Type className="h-3 w-3 text-blue-500" />
            case 'group':
                return <FolderOpen className="h-3 w-3 text-yellow-500" />
            default:
                return <ImageIcon className="h-3 w-3 text-green-500" />
        }
    }

    return (
        <div
            className={cn(
                "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
            onClick={onClick}
        >
            <div className="flex-shrink-0">
                <img
                    src={layer.thumbnailUrl}
                    alt={layer.name}
                    className="w-8 h-8 object-cover rounded border"
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                    {getLayerIcon(layer.type)}
                    <span className="text-xs font-medium truncate">{layer.name}</span>
                </div>
                <div className="text-xs opacity-70">
                    {Math.round(layer.preview.width)} × {Math.round(layer.preview.height)}
                </div>
            </div>
            {layer.isAdjusted && (
                <Badge variant="outline" className="text-xs">
                    已调整
                </Badge>
            )}
        </div>
    )
}

// 调整面板组件
function AdjustmentPanel({
    layer,
    onAdjust
}: {
    layer: PreviewLayer | undefined
    onAdjust: (bounds: Partial<PreviewLayer['preview']>) => void
}) {
    if (!layer) return null

    return (
        <div className="space-y-3">
            {/* 位置 */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs">X 位置</Label>
                    <Input
                        type="number"
                        value={Math.round(layer.preview.x)}
                        onChange={(e) => onAdjust({ x: Number(e.target.value) })}
                        className="h-7 text-xs"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Y 位置</Label>
                    <Input
                        type="number"
                        value={Math.round(layer.preview.y)}
                        onChange={(e) => onAdjust({ y: Number(e.target.value) })}
                        className="h-7 text-xs"
                    />
                </div>
            </div>

            {/* 尺寸 */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs">宽度</Label>
                    <Input
                        type="number"
                        value={Math.round(layer.preview.width)}
                        onChange={(e) => onAdjust({ width: Number(e.target.value) })}
                        className="h-7 text-xs"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">高度</Label>
                    <Input
                        type="number"
                        value={Math.round(layer.preview.height)}
                        onChange={(e) => onAdjust({ height: Number(e.target.value) })}
                        className="h-7 text-xs"
                    />
                </div>
            </div>

            {/* 不透明度 */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <Label className="text-xs">不透明度</Label>
                    <span className="text-xs text-muted-foreground">{layer.preview.opacity}%</span>
                </div>
                <Slider
                    value={[layer.preview.opacity]}
                    onValueChange={([value]) => onAdjust({ opacity: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                />
            </div>
        </div>
    )
}

