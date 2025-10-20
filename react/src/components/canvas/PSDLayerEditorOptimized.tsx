import React, { useState, useCallback, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Layers,
    Eye,
    EyeOff,
    Download,
    Image as ImageIcon,
    FolderOpen,
    Trash2,
    Copy,
    Move,
    GripVertical,
    Save,
    RotateCcw,
    Type,
    MoreHorizontal,
    ChevronDown,
    ChevronRight,
    Upload,
    X,
} from 'lucide-react'
import {
    updatePSDLayer,
    exportPSD,
    updateLayerOrder,
    duplicatePSDLayer,
    deletePSDLayer,
    updateLayerProperties,
    type PSDLayer
} from '@/api/upload'
import { useCanvas } from '@/contexts/canvas'
import { ExcalidrawImageElement } from '@excalidraw/excalidraw/element/types'
import { BinaryFileData } from '@excalidraw/excalidraw/types'
import { FontEditor } from './FontEditor'
import { LayerItem } from './LayerItem'
import { LayerToolbar } from './LayerToolbar'

interface PSDLayerEditorProps {
    psdData: {
        file_id: string
        layers: PSDLayer[]
        width: number
        height: number
    }
    isOpen: boolean
    onClose: () => void
    onUpdate: (updatedPsdData: any) => void
}

export function PSDLayerEditor({ psdData, isOpen, onClose, onUpdate }: PSDLayerEditorProps) {
    const { t } = useTranslation()
    const { excalidrawAPI } = useCanvas()

    // 狀態管理
    const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
    const [selectedLayers, setSelectedLayers] = useState<Set<number>>(new Set())
    const [updating, setUpdating] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'text' | 'layer' | 'group'>('all')
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
    const [draggedLayer, setDraggedLayer] = useState<PSDLayer | null>(null)
    const [layerOrder, setLayerOrder] = useState<number[]>(psdData.layers.map(l => l.index))
    const [zoomLevel, setZoomLevel] = useState(1)

    const layerFileInputRef = useRef<HTMLInputElement>(null)

    // 過濾和搜索圖層
    const filteredLayers = useMemo(() => {
        let filtered = psdData.layers.filter(layer => {
            const matchesSearch = layer.name.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesFilter = filterType === 'all' || layer.type === filterType
            return matchesSearch && matchesFilter
        })

        // 按圖層順序排序
        return filtered.sort((a, b) => layerOrder.indexOf(a.index) - layerOrder.indexOf(b.index))
    }, [psdData.layers, searchTerm, filterType, layerOrder])

    // 圖層可見性切換
    const handleLayerVisibilityToggle = useCallback(
        (layerIndex: number) => {
            const updatedLayers = psdData.layers.map((layer) =>
                layer.index === layerIndex ? { ...layer, visible: !layer.visible } : layer
            )
            onUpdate({
                ...psdData,
                layers: updatedLayers,
            })
        },
        [psdData, onUpdate]
    )

    // 批量可見性切換
    const handleBatchVisibilityToggle = useCallback(
        (visible: boolean) => {
            const updatedLayers = psdData.layers.map((layer) =>
                selectedLayers.has(layer.index) ? { ...layer, visible } : layer
            )
            onUpdate({
                ...psdData,
                layers: updatedLayers,
            })
            setSelectedLayers(new Set())
        },
        [psdData, onUpdate, selectedLayers]
    )

    // 透明度調整
    const handleOpacityChange = useCallback(
        (layerIndex: number, opacity: number) => {
            const updatedLayers = psdData.layers.map((layer) =>
                layer.index === layerIndex ? { ...layer, opacity } : layer
            )
            onUpdate({
                ...psdData,
                layers: updatedLayers,
            })
        },
        [psdData, onUpdate]
    )

    // 圖層圖片上傳
    const handleLayerImageUpload = useCallback(
        async (layerIndex: number, file: File) => {
            setUpdating(true)
            try {
                await updatePSDLayer(psdData.file_id, layerIndex, file)
                toast.success('圖層圖片更新成功')
            } catch (error) {
                console.error('更新圖層圖片失敗:', error)
                toast.error('更新圖層圖片失敗')
            } finally {
                setUpdating(false)
            }
        },
        [psdData.file_id]
    )

    // 導出功能
    const handleExport = useCallback(
        async (format: 'png' | 'jpg') => {
            try {
                const result = await exportPSD(psdData.file_id, format)
                window.open(result.url, '_blank')
                toast.success(`匯出為 ${format.toUpperCase()} 成功！`)
            } catch (error) {
                console.error('匯出失敗:', error)
                toast.error('匯出失敗')
            }
        },
        [psdData.file_id]
    )

    // 添加到畫布
    const addLayerToCanvas = useCallback(
        async (layer: PSDLayer, offsetX: number = 0, offsetY: number = 0) => {
            if (!excalidrawAPI || !layer.image_url) return

            try {
                const response = await fetch(layer.image_url)
                const blob = await response.blob()
                const file = new File([blob], `${layer.name}.png`, { type: 'image/png' })

                const reader = new FileReader()
                reader.onload = () => {
                    const dataURL = reader.result as string

                    const imageElement: ExcalidrawImageElement = {
                        type: 'image',
                        id: `psd_layer_${layer.index}_${Date.now()}`,
                        x: layer.left + offsetX,
                        y: layer.top + offsetY,
                        width: layer.width,
                        height: layer.height,
                        angle: 0,
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roundness: null,
                        roughness: 1,
                        opacity: layer.opacity,
                        seed: Math.random(),
                        version: 1,
                        versionNonce: Math.random(),
                        locked: false,
                        isDeleted: false,
                        groupIds: [],
                        boundElements: [],
                        updated: Date.now(),
                        frameId: null,
                        index: null,
                        customData: {
                            psdLayerIndex: layer.index,
                            psdFileId: psdData.file_id,
                            layerName: layer.name,
                        },
                        fileId: `psd_layer_${layer.index}` as any,
                        link: null,
                        status: 'saved' as const,
                        scale: [1, 1] as [number, number],
                        crop: null,
                    }

                    const binaryFileData: BinaryFileData = {
                        id: `psd_layer_${layer.index}` as any,
                        mimeType: 'image/png',
                        dataURL: dataURL as any,
                        created: Date.now(),
                    }

                    const currentElements = excalidrawAPI.getSceneElements()
                    excalidrawAPI.addFiles([binaryFileData])
                    excalidrawAPI.updateScene({
                        elements: [...currentElements, imageElement],
                    })

                    toast.success(`圖層 "${layer.name}" 已添加到畫布`)
                }
                reader.readAsDataURL(file)
            } catch (error) {
                console.error('添加圖層到畫布失敗:', error)
                toast.error('添加圖層到畫布失敗')
            }
        },
        [excalidrawAPI, psdData.file_id]
    )

    // 自動添加所有圖層到畫布
    const addAllLayersToCanvas = useCallback(
        async () => {
            if (!excalidrawAPI) return

            const imageLayers = psdData.layers.filter(layer =>
                layer.type === 'layer' && layer.image_url && layer.visible
            )

            if (imageLayers.length === 0) {
                toast.info('沒有可添加的圖層')
                return
            }

            try {
                // 計算佈局參數
                const cols = Math.ceil(Math.sqrt(imageLayers.length))
                const cellWidth = 300
                const cellHeight = 200
                const spacing = 50

                for (let i = 0; i < imageLayers.length; i++) {
                    const layer = imageLayers[i]
                    const row = Math.floor(i / cols)
                    const col = i % cols

                    const offsetX = col * (cellWidth + spacing)
                    const offsetY = row * (cellHeight + spacing)

                    await addLayerToCanvas(layer, offsetX, offsetY)

                    // 添加小延遲避免過快請求
                    await new Promise(resolve => setTimeout(resolve, 100))
                }

                toast.success(`已添加 ${imageLayers.length} 個圖層到畫布`)
            } catch (error) {
                console.error('批量添加圖層失敗:', error)
                toast.error('批量添加圖層失敗')
            }
        },
        [excalidrawAPI, psdData.layers, addLayerToCanvas]
    )

    // 複製圖層
    const duplicateLayer = useCallback(
        async (layer: PSDLayer) => {
            try {
                const result = await duplicatePSDLayer(psdData.file_id, layer.index)
                const updatedLayers = [...psdData.layers, result.new_layer]
                onUpdate({
                    ...psdData,
                    layers: updatedLayers,
                })
                toast.success('圖層已複製')
            } catch (error) {
                console.error('複製圖層失敗:', error)
                toast.error('複製圖層失敗')
            }
        },
        [psdData, onUpdate]
    )

    // 刪除圖層
    const deleteLayer = useCallback(
        async (layerIndex: number) => {
            try {
                await deletePSDLayer(psdData.file_id, layerIndex)
                const updatedLayers = psdData.layers.filter(layer => layer.index !== layerIndex)
                onUpdate({
                    ...psdData,
                    layers: updatedLayers,
                })
                if (selectedLayer?.index === layerIndex) {
                    setSelectedLayer(null)
                }
                toast.success('圖層已刪除')
            } catch (error) {
                console.error('刪除圖層失敗:', error)
                toast.error('刪除圖層失敗')
            }
        },
        [psdData, onUpdate, selectedLayer]
    )

    // 字體更新處理
    const handleFontUpdate = useCallback(
        async (layerIndex: number, properties: Record<string, any>) => {
            try {
                await updateLayerProperties(psdData.file_id, layerIndex, properties)

                const updatedLayers = psdData.layers.map((layer) =>
                    layer.index === layerIndex ? { ...layer, ...properties } : layer
                )
                onUpdate({
                    ...psdData,
                    layers: updatedLayers,
                })

                if (selectedLayer?.index === layerIndex) {
                    setSelectedLayer({ ...selectedLayer, ...properties })
                }
            } catch (error) {
                console.error('更新字體屬性失敗:', error)
                toast.error('更新字體屬性失敗')
            }
        },
        [psdData, onUpdate, selectedLayer]
    )

    // 拖拽處理
    const handleDragStart = (layer: PSDLayer) => {
        setDraggedLayer(layer)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = (e: React.DragEvent, targetLayer: PSDLayer) => {
        e.preventDefault()
        if (!draggedLayer || draggedLayer.index === targetLayer.index) return

        const draggedIndex = layerOrder.indexOf(draggedLayer.index)
        const targetIndex = layerOrder.indexOf(targetLayer.index)

        const newOrder = [...layerOrder]
        newOrder.splice(draggedIndex, 1)
        newOrder.splice(targetIndex, 0, draggedLayer.index)

        setLayerOrder(newOrder)
        setDraggedLayer(null)
    }

    const handleDragEnd = () => {
        setDraggedLayer(null)
    }

    // 保存圖層順序
    const saveLayerOrder = async () => {
        try {
            await updateLayerOrder(psdData.file_id, layerOrder)
            toast.success('圖層順序已保存')
        } catch (error) {
            console.error('保存圖層順序失敗:', error)
            toast.error('保存圖層順序失敗')
        }
    }

    // 重置圖層順序
    const resetLayerOrder = () => {
        setLayerOrder(psdData.layers.map(l => l.index))
    }


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        PSD 圖層編輯器
                    </DialogTitle>
                    <DialogDescription>
                        編輯 {psdData?.width} × {psdData?.height} 像素的 PSD 文件圖層
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* 左側：圖層列表 */}
                    <div className="w-80 flex flex-col gap-4">
                        <LayerToolbar
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            filterType={filterType}
                            onFilterChange={setFilterType}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            selectedCount={selectedLayers.size}
                            onBatchVisibilityToggle={handleBatchVisibilityToggle}
                            onClearSelection={() => setSelectedLayers(new Set())}
                            onExport={handleExport}
                            onSaveOrder={saveLayerOrder}
                            onResetOrder={resetLayerOrder}
                            onAddAllLayers={addAllLayersToCanvas}
                            updating={updating}
                        />

                        {/* 圖層列表 */}
                        <ScrollArea className="flex-1">
                            <div className="space-y-2">
                                {filteredLayers.map((layer, index) => (
                                    <LayerItem
                                        key={layer.index}
                                        layer={layer}
                                        isSelected={selectedLayers.has(layer.index)}
                                        isExpanded={expandedGroups.has(layer.index)}
                                        onSelect={(checked) => {
                                            const newSelected = new Set(selectedLayers)
                                            if (checked) {
                                                newSelected.add(layer.index)
                                            } else {
                                                newSelected.delete(layer.index)
                                            }
                                            setSelectedLayers(newSelected)
                                        }}
                                        onExpand={() => {
                                            const newExpanded = new Set(expandedGroups)
                                            if (expandedGroups.has(layer.index)) {
                                                newExpanded.delete(layer.index)
                                            } else {
                                                newExpanded.add(layer.index)
                                            }
                                            setExpandedGroups(newExpanded)
                                        }}
                                        onVisibilityToggle={() => handleLayerVisibilityToggle(layer.index)}
                                        onOpacityChange={(opacity) => handleOpacityChange(layer.index, opacity)}
                                        onAddToCanvas={() => addLayerToCanvas(layer)}
                                        onSelectLayer={() => setSelectedLayer(layer)}
                                        onDragStart={() => handleDragStart(layer)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, layer)}
                                        onDragEnd={handleDragEnd}
                                        isDragging={draggedLayer?.index === layer.index}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* 右側：圖層詳情 */}
                    <div className="flex-1 flex flex-col gap-4">
                        {selectedLayer ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium">圖層詳情</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedLayer(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <Tabs defaultValue="properties" className="flex-1">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="properties">屬性</TabsTrigger>
                                        <TabsTrigger value="font">字體</TabsTrigger>
                                        <TabsTrigger value="actions">操作</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="properties" className="flex-1">
                                        <Card className="p-4">
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="text-sm font-medium">圖層名稱</Label>
                                                    <Input value={selectedLayer.name} readOnly className="mt-1" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-sm font-medium">位置</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <Input
                                                                value={selectedLayer.left}
                                                                readOnly
                                                                className="text-xs"
                                                                placeholder="X"
                                                            />
                                                            <Input
                                                                value={selectedLayer.top}
                                                                readOnly
                                                                className="text-xs"
                                                                placeholder="Y"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium">尺寸</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <Input
                                                                value={selectedLayer.width}
                                                                readOnly
                                                                className="text-xs"
                                                                placeholder="寬"
                                                            />
                                                            <Input
                                                                value={selectedLayer.height}
                                                                readOnly
                                                                className="text-xs"
                                                                placeholder="高"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label className="text-sm font-medium">混合模式</Label>
                                                    <Input value={selectedLayer.blend_mode} readOnly className="mt-1" />
                                                </div>

                                                {selectedLayer.image_url && (
                                                    <div>
                                                        <Label className="text-sm font-medium">圖層預覽</Label>
                                                        <div className="mt-2 border rounded-md p-2">
                                                            <img
                                                                src={selectedLayer.image_url}
                                                                alt={selectedLayer.name}
                                                                className="max-w-full max-h-32 object-contain"
                                                            />
                                                        </div>
                                                        <div className="mt-2">
                                                            <input
                                                                ref={layerFileInputRef}
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0]
                                                                    if (file) {
                                                                        handleLayerImageUpload(selectedLayer.index, file)
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => layerFileInputRef.current?.click()}
                                                                disabled={updating}
                                                            >
                                                                <Upload className="h-4 w-4 mr-2" />
                                                                更新圖層圖片
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="font" className="flex-1">
                                        {selectedLayer.type === 'text' ? (
                                            <FontEditor
                                                layer={selectedLayer}
                                                onUpdate={handleFontUpdate}
                                            />
                                        ) : (
                                            <Card className="p-4">
                                                <div className="text-center text-muted-foreground">
                                                    此圖層不是文字圖層
                                                </div>
                                            </Card>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="actions" className="flex-1">
                                        <Card className="p-4">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => duplicateLayer(selectedLayer)}
                                                    >
                                                        <Copy className="h-4 w-4 mr-2" />
                                                        複製圖層
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => addLayerToCanvas(selectedLayer)}
                                                        disabled={!selectedLayer.image_url}
                                                    >
                                                        <Move className="h-4 w-4 mr-2" />
                                                        添加到畫布
                                                    </Button>
                                                </div>

                                                <Separator />

                                                <Button
                                                    variant="destructive"
                                                    onClick={() => deleteLayer(selectedLayer.index)}
                                                    className="w-full"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    刪除圖層
                                                </Button>
                                            </div>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                選擇一個圖層來查看詳情
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
