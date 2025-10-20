import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    uploadPSD,
    updatePSDLayer,
    exportPSD,
    type PSDUploadResponse,
    type PSDLayer,
} from '@/api/upload'
import { toast } from 'sonner'
import {
    Upload,
    Download,
    Eye,
    EyeOff,
    Layers,
    FolderOpen,
    Image as ImageIcon,
} from 'lucide-react'

export function PSDEditor() {
    const [psdData, setPsdData] = useState<PSDUploadResponse | null>(null)
    const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
    const [uploading, setUploading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const layerFileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file) return

            if (!file.name.toLowerCase().endsWith('.psd')) {
                toast.error('请选择 PSD 文件')
                return
            }

            setUploading(true)
            try {
                const result = await uploadPSD(file)
                setPsdData(result)
                toast.success('PSD 文件上传成功！')
            } catch (error) {
                console.error('上传失败:', error)
                toast.error('上传 PSD 文件失败')
            } finally {
                setUploading(false)
            }
        },
        []
    )

    const handleLayerUpdate = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!psdData || !selectedLayer) return

            const file = e.target.files?.[0]
            if (!file) return

            try {
                await updatePSDLayer(psdData.file_id, selectedLayer.index, file)
                toast.success('图层已更新')
                // 重新加载图层图像
                const newImageUrl = `/api/psd/layer/${psdData.file_id}/${selectedLayer.index}?t=${Date.now()}`
                const updatedLayers = psdData.layers.map((layer) =>
                    layer.index === selectedLayer.index
                        ? { ...layer, image_url: newImageUrl }
                        : layer
                )
                setPsdData({ ...psdData, layers: updatedLayers })
            } catch (error) {
                console.error('更新图层失败:', error)
                toast.error('更新图层失败')
            }
        },
        [psdData, selectedLayer]
    )

    const handleExport = useCallback(
        async (format: 'png' | 'jpg') => {
            if (!psdData) return

            setExporting(true)
            try {
                const result = await exportPSD(psdData.file_id, format)
                // 触发下载
                window.open(result.url, '_blank')
                toast.success(`导出为 ${format.toUpperCase()} 成功！`)
            } catch (error) {
                console.error('导出失败:', error)
                toast.error('导出失败')
            } finally {
                setExporting(false)
            }
        },
        [psdData]
    )

    const toggleLayerVisibility = (layerIndex: number) => {
        if (!psdData) return
        const updatedLayers = psdData.layers.map((layer) =>
            layer.index === layerIndex ? { ...layer, visible: !layer.visible } : layer
        )
        setPsdData({ ...psdData, layers: updatedLayers })
    }

    const updateLayerOpacity = (layerIndex: number, opacity: number) => {
        if (!psdData) return
        const updatedLayers = psdData.layers.map((layer) =>
            layer.index === layerIndex ? { ...layer, opacity } : layer
        )
        setPsdData({ ...psdData, layers: updatedLayers })
    }

    return (
        <div className="flex h-screen bg-background">
            {/* 左侧工具栏 */}
            <div className="w-64 border-r p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".psd"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? '上传中...' : '上传 PSD'}
                    </Button>

                    {psdData && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => handleExport('png')}
                                disabled={exporting}
                                className="w-full"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                导出为 PNG
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleExport('jpg')}
                                disabled={exporting}
                                className="w-full"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                导出为 JPG
                            </Button>
                        </>
                    )}
                </div>

                {psdData && (
                    <div className="flex-1 flex flex-col">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            图层列表
                        </h3>
                        <ScrollArea className="flex-1">
                            <div className="space-y-1">
                                {psdData.layers.map((layer) => (
                                    <LayerItem
                                        key={layer.index}
                                        layer={layer}
                                        selected={selectedLayer?.index === layer.index}
                                        onSelect={setSelectedLayer}
                                        onToggleVisibility={toggleLayerVisibility}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* 中间画布区域 */}
            <div className="flex-1 flex flex-col">
                <div className="border-b p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        {psdData ? `${psdData.width} × ${psdData.height}` : '未加载文件'}
                    </h2>
                </div>
                <div className="flex-1 overflow-auto bg-muted/20 p-8">
                    {psdData ? (
                        <div className="relative mx-auto" style={{ maxWidth: '100%' }}>
                            <div
                                className="relative border bg-white shadow-lg"
                                style={{
                                    width: psdData.width,
                                    height: psdData.height,
                                }}
                            >
                                {psdData.layers
                                    .filter((layer) => layer.visible && layer.image_url)
                                    .map((layer) => (
                                        <img
                                            key={layer.index}
                                            src={layer.image_url}
                                            alt={layer.name}
                                            className="absolute"
                                            style={{
                                                left: layer.left,
                                                top: layer.top,
                                                width: layer.width,
                                                height: layer.height,
                                                opacity: layer.opacity / 255,
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-muted-foreground">
                                <FolderOpen className="h-24 w-24 mx-auto mb-4 opacity-20" />
                                <p>请上传 PSD 文件开始编辑</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 右侧属性面板 */}
            <div className="w-80 border-l p-4">
                {selectedLayer ? (
                    <Card className="p-4">
                        <h3 className="font-semibold mb-4">图层属性</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">图层名称</label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {selectedLayer.name}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    不透明度: {Math.round((selectedLayer.opacity / 255) * 100)}%
                                </label>
                                <Slider
                                    value={[selectedLayer.opacity]}
                                    min={0}
                                    max={255}
                                    step={1}
                                    onValueChange={([value]) =>
                                        updateLayerOpacity(selectedLayer.index, value)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">可见性</label>
                                <Switch
                                    checked={selectedLayer.visible}
                                    onCheckedChange={() =>
                                        toggleLayerVisibility(selectedLayer.index)
                                    }
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium">混合模式</label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {selectedLayer.blend_mode}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium">位置</label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    X: {selectedLayer.left}, Y: {selectedLayer.top}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium">尺寸</label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {selectedLayer.width} × {selectedLayer.height}
                                </p>
                            </div>

                            {selectedLayer.type === 'layer' && (
                                <>
                                    <input
                                        ref={layerFileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLayerUpdate}
                                    />
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => layerFileInputRef.current?.click()}
                                    >
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        替换图层图像
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>请选择一个图层</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function LayerItem({
    layer,
    selected,
    onSelect,
    onToggleVisibility,
}: {
    layer: PSDLayer
    selected: boolean
    onSelect: (layer: PSDLayer) => void
    onToggleVisibility: (layerIndex: number) => void
}) {
    return (
        <div
            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent ${selected ? 'bg-accent' : ''
                }`}
            onClick={() => onSelect(layer)}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onToggleVisibility(layer.index)
                }}
                className="shrink-0"
            >
                {layer.visible ? (
                    <Eye className="h-4 w-4" />
                ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
            </button>
            {layer.type === 'group' ? (
                <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
                <Layers className="h-4 w-4 shrink-0" />
            )}
            <span className="text-sm truncate flex-1">{layer.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
                {Math.round((layer.opacity / 255) * 100)}%
            </span>
        </div>
    )
}
