import React, { useState, useCallback, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Layers,
    Eye,
    EyeOff,
    Settings,
    Download,
    Image as ImageIcon,
    FolderOpen,
    Edit3,
    Trash2,
    Copy,
    Move,
    GripVertical,
    Save,
    RotateCcw,
    Type,
    Search,
    Filter,
    MoreHorizontal,
    Lock,
    Unlock,
    ChevronDown,
    ChevronRight,
    Plus,
    Minus,
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

interface PSDLayerEditorProps {
    psdData: {
        file_id: string
        layers: PSDLayer[]
    }
    isOpen: boolean
    onClose: () => void
    onUpdate: (updatedPsdData: any) => void
}

export function PSDLayerEditor({ psdData, isOpen, onClose, onUpdate }: PSDLayerEditorProps) {
    const { t } = useTranslation()
    const { excalidrawAPI } = useCanvas()
    const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
    const [updating, setUpdating] = useState(false)
    const [draggedLayer, setDraggedLayer] = useState<PSDLayer | null>(null)
    const [layerOrder, setLayerOrder] = useState<number[]>(psdData.layers.map(l => l.index))
    const layerFileInputRef = useRef<HTMLInputElement>(null)

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

    const handleLayerImageUpload = useCallback(
        async (layerIndex: number, file: File) => {
            setUpdating(true)
            try {
                await updatePSDLayer(psdData.file_id, layerIndex, file)
                toast.success('圖層圖片更新成功')
                // 重新獲取PSD數據
                // const updatedPsd = await getPSDMetadata(psdData.file_id)
                // onUpdate(updatedPsd)
            } catch (error) {
                console.error('更新圖層圖片失敗:', error)
                toast.error('更新圖層圖片失敗')
            } finally {
                setUpdating(false)
            }
        },
        [psdData, onUpdate]
    )

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

    const addLayerToCanvas = useCallback(
        async (layer: PSDLayer) => {
            if (!excalidrawAPI || !layer.image_url) return

            try {
                // 載入圖層圖像
                const response = await fetch(layer.image_url)
                const blob = await response.blob()
                const file = new File([blob], `${layer.name}.png`, { type: 'image/png' })

                // 轉換為 Base64
                const reader = new FileReader()
                reader.onload = () => {
                    const dataURL = reader.result as string

                    // 創建 Excalidraw 圖像元素
                    const imageElement: ExcalidrawImageElement = {
                        type: 'image',
                        id: `psd_layer_${layer.index}_${Date.now()}`,
                        x: layer.left,
                        y: layer.top,
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

                    // 創建二進制檔案資料
                    const binaryFileData: BinaryFileData = {
                        id: `psd_layer_${layer.index}` as any,
                        mimeType: 'image/png',
                        dataURL: dataURL as any,
                        created: Date.now(),
                    }

                    // 添加到畫布
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

    const resetLayerOrder = () => {
        setLayerOrder(psdData.layers.map(l => l.index))
    }

    const saveLayerOrder = async () => {
        try {
            await updateLayerOrder(psdData.file_id, layerOrder)
            toast.success('圖層順序已保存')
        } catch (error) {
            console.error('保存圖層順序失敗:', error)
            toast.error('保存圖層順序失敗')
        }
    }

    const handleFontUpdate = useCallback(
        async (layerIndex: number, properties: Record<string, any>) => {
            try {
                await updateLayerProperties(psdData.file_id, layerIndex, properties)

                // 更新本地狀態
                const updatedLayers = psdData.layers.map((layer) =>
                    layer.index === layerIndex ? { ...layer, ...properties } : layer
                )
                onUpdate({
                    ...psdData,
                    layers: updatedLayers,
                })

                // 如果當前選中的圖層被更新，也要更新選中狀態
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        PSD 圖層編輯器
                    </DialogTitle>
                    <DialogDescription>
                        管理和編輯 PSD 文件的圖層、透明度和其他屬性
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* 左側：圖層列表 */}
                    <div className="w-1/2 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <Button
                                onClick={saveLayerOrder}
                                variant="outline"
                                size="sm"
                            >
                                <Save className="h-4 w-4 mr-1" />
                                保存順序
                            </Button>
                            <Button
                                onClick={resetLayerOrder}
                                variant="outline"
                                size="sm"
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                重置順序
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="space-y-2">
                                {layerOrder.map((layerIndex) => {
                                    const layer = psdData.layers.find(l => l.index === layerIndex)
                                    if (!layer) return null

                                    return (
                                        <Card
                                            key={layer.index}
                                            className={`cursor-pointer transition-colors ${selectedLayer?.index === layer.index
                                                ? 'ring-2 ring-primary'
                                                : 'hover:bg-muted/50'
                                                } ${draggedLayer?.index === layer.index ? 'opacity-50' : ''}`}
                                            onClick={() => setSelectedLayer(layer)}
                                            draggable
                                            onDragStart={() => handleDragStart(layer)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, layer)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                                        <div className="flex items-center gap-1">
                                                            {layer.type === 'group' ? (
                                                                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                                            ) : layer.type === 'text' ? (
                                                                <Type className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                            <span className="text-sm font-medium truncate">
                                                                {layer.name}
                                                            </span>
                                                        </div>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {layer.type === 'group' ? '群組' : layer.type === 'text' ? '文字' : '圖層'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleLayerVisibilityToggle(layer.index)
                                                            }}
                                                        >
                                                            {layer.visible ? (
                                                                <Eye className="h-4 w-4" />
                                                            ) : (
                                                                <EyeOff className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        {layer.type === 'layer' && layer.image_url && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    addLayerToCanvas(layer)
                                                                }}
                                                            >
                                                                <Move className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                duplicateLayer(layer)
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteLayer(layer.index)
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                {layer.type === 'layer' && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">
                                                                透明度: {layer.opacity}%
                                                            </span>
                                                            <Slider
                                                                value={[layer.opacity]}
                                                                onValueChange={([value]) =>
                                                                    handleOpacityChange(layer.index, value)
                                                                }
                                                                max={100}
                                                                min={0}
                                                                step={1}
                                                                className="flex-1"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* 右側：圖層預覽和編輯 */}
                    <div className="w-1/2 flex flex-col">
                        {selectedLayer ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">
                                        {selectedLayer.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleExport('png')}
                                        >
                                            <Download className="h-4 w-4 mr-1" />
                                            PNG
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleExport('jpg')}
                                        >
                                            <Download className="h-4 w-4 mr-1" />
                                            JPG
                                        </Button>
                                    </div>
                                </div>

                                {selectedLayer.type === 'text' ? (
                                    <div className="flex-1 flex flex-col">
                                        <FontEditor
                                            layer={selectedLayer}
                                            onUpdate={handleFontUpdate}
                                        />
                                    </div>
                                ) : selectedLayer.type === 'layer' && selectedLayer.image_url ? (
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex-1 bg-muted/20 rounded-lg p-4 mb-4 flex items-center justify-center">
                                            <img
                                                src={selectedLayer.image_url}
                                                alt={selectedLayer.name}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Settings className="h-4 w-4" />
                                                    圖層屬性
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="layer-name">圖層名稱</Label>
                                                    <Input
                                                        id="layer-name"
                                                        value={selectedLayer.name}
                                                        onChange={(e) => {
                                                            const updatedLayers = psdData.layers.map((layer) =>
                                                                layer.index === selectedLayer.index
                                                                    ? { ...layer, name: e.target.value }
                                                                    : layer
                                                            )
                                                            onUpdate({
                                                                ...psdData,
                                                                layers: updatedLayers,
                                                            })
                                                            setSelectedLayer({ ...selectedLayer, name: e.target.value })
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">可見性</span>
                                                    <Switch
                                                        checked={selectedLayer.visible}
                                                        onCheckedChange={() =>
                                                            handleLayerVisibilityToggle(selectedLayer.index)
                                                        }
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm">透明度</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {selectedLayer.opacity}%
                                                        </span>
                                                    </div>
                                                    <Slider
                                                        value={[selectedLayer.opacity]}
                                                        onValueChange={([value]) =>
                                                            handleOpacityChange(selectedLayer.index, value)
                                                        }
                                                        max={100}
                                                        min={0}
                                                        step={1}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">位置:</span>
                                                        <div>X: {selectedLayer.left}</div>
                                                        <div>Y: {selectedLayer.top}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">尺寸:</span>
                                                        <div>寬: {selectedLayer.width}</div>
                                                        <div>高: {selectedLayer.height}</div>
                                                    </div>
                                                </div>

                                                <Separator />

                                                <div className="space-y-2">
                                                    <span className="text-sm font-medium">替換圖層</span>
                                                    <input
                                                        ref={layerFileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) {
                                                                handleLayerImageUpload(selectedLayer.index, file)
                                                            }
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => layerFileInputRef.current?.click()}
                                                        className="w-full"
                                                        disabled={updating}
                                                    >
                                                        <Edit3 className="h-4 w-4 mr-2" />
                                                        {updating ? '更新中...' : '選擇新圖像'}
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-sm font-medium">添加到畫布</span>
                                                    <Button
                                                        onClick={() => addLayerToCanvas(selectedLayer)}
                                                        className="w-full"
                                                    >
                                                        <Move className="h-4 w-4 mr-2" />
                                                        添加到當前畫布
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                        {selectedLayer.type === 'group' ? '這是一個圖層群組' : '此圖層沒有圖像內容'}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                請選擇一個圖層來查看詳細資訊
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
