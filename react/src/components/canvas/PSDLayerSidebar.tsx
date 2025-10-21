import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Layers,
    Eye,
    EyeOff,
    Type,
    Image as ImageIcon,
    FolderOpen,
    Edit3,
    Move,
    X,
    Palette,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Bold,
    Italic,
    Underline,
} from 'lucide-react'
import {
    updateLayerProperties,
    type PSDLayer
} from '@/api/upload'
import { useCanvas } from '@/contexts/canvas'

interface PSDLayerSidebarProps {
    psdData: {
        file_id: string
        layers: PSDLayer[]
        width: number
        height: number
    } | null
    isVisible: boolean
    onClose: () => void
    onUpdate: (updatedPsdData: any) => void
}

export function PSDLayerSidebar({ psdData, isVisible, onClose, onUpdate }: PSDLayerSidebarProps) {
    const { t } = useTranslation()
    const { excalidrawAPI } = useCanvas()

    // 状态管理
    const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'text' | 'layer' | 'group'>('all')
    const [currentCanvas, setCurrentCanvas] = useState(0)

    // 过滤和搜索图层
    const filteredLayers = useMemo(() => {
        if (!psdData) return []

        let filtered = psdData.layers.filter(layer => {
            const matchesSearch = layer.name.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesFilter = filterType === 'all' || layer.type === filterType
            return matchesSearch && matchesFilter
        })

        // 按图层顺序排序（从底层到顶层）
        return filtered.sort((a, b) => a.index - b.index)
    }, [psdData?.layers, searchTerm, filterType])

    // 图层可见性切换
    const handleLayerVisibilityToggle = useCallback(
        async (layerIndex: number) => {
            if (!psdData) return

            try {
                const updatedLayers = psdData.layers.map((layer) =>
                    layer.index === layerIndex ? { ...layer, visible: !layer.visible } : layer
                )

                await updateLayerProperties(psdData.file_id, layerIndex, {
                    visible: !psdData.layers.find(l => l.index === layerIndex)?.visible
                })

                onUpdate({
                    ...psdData,
                    layers: updatedLayers,
                })
            } catch (error) {
                console.error('更新图层可见性失败:', error)
                toast.error('更新图层可见性失败')
            }
        },
        [psdData, onUpdate]
    )

    // 图层透明度调整
    const handleOpacityChange = useCallback(
        async (layerIndex: number, opacity: number) => {
            if (!psdData) return

            try {
                const updatedLayers = psdData.layers.map((layer) =>
                    layer.index === layerIndex ? { ...layer, opacity } : layer
                )

                await updateLayerProperties(psdData.file_id, layerIndex, { opacity })

                onUpdate({
                    ...psdData,
                    layers: updatedLayers,
                })
            } catch (error) {
                console.error('更新图层透明度失败:', error)
                toast.error('更新图层透明度失败')
            }
        },
        [psdData, onUpdate]
    )

    // 文字图层属性更新
    const handleTextPropertyUpdate = useCallback(
        async (layerIndex: number, property: string, value: any) => {
            if (!psdData) return

            try {
                const updatedLayers = psdData.layers.map((layer) =>
                    layer.index === layerIndex ? { ...layer, [property]: value } : layer
                )

                await updateLayerProperties(psdData.file_id, layerIndex, { [property]: value })

                onUpdate({
                    ...psdData,
                    layers: updatedLayers,
                })

                toast.success('文字属性已更新')
            } catch (error) {
                console.error('更新文字属性失败:', error)
                toast.error('更新文字属性失败')
            }
        },
        [psdData, onUpdate]
    )

    // 获取图层图标
    const getLayerIcon = (layer: PSDLayer) => {
        switch (layer.type) {
            case 'text':
                return <Type className="h-4 w-4 text-blue-500" />
            case 'group':
                return <FolderOpen className="h-4 w-4 text-yellow-500" />
            default:
                return <ImageIcon className="h-4 w-4 text-green-500" />
        }
    }

    // 获取图层类型标签
    const getLayerTypeLabel = (layer: PSDLayer) => {
        switch (layer.type) {
            case 'text':
                return '文字'
            case 'group':
                return '群组'
            default:
                return '图层'
        }
    }

    console.log('PSDLayerSidebar 渲染狀態:', { isVisible, psdData: !!psdData, layersCount: psdData?.layers?.length })

    if (!psdData) {
        console.log('PSDLayerSidebar 沒有 PSD 數據')
        return (
            <div className="h-full w-full bg-background flex flex-col items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">沒有 PSD 文件</p>
                    <p className="text-sm">請先上傳 PSD 文件</p>
                </div>
            </div>
        )
    }

    return (
        <div
            className="fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg cursor-move"
            style={{
                width: '320px',
                maxHeight: '80vh'
            }}
        >
            {/* 浮动面板头部 - 可拖拽 */}
            <div
                className="flex items-center justify-between p-2 border-b cursor-move"
                onMouseDown={(e) => {
                    // 简单的拖拽实现
                    const startX = e.clientX
                    const startY = e.clientY
                    const element = e.currentTarget.parentElement
                    if (!element) return

                    const startLeft = element.offsetLeft
                    const startTop = element.offsetTop

                    const handleMouseMove = (e: MouseEvent) => {
                        const deltaX = e.clientX - startX
                        const deltaY = e.clientY - startY
                        element.style.left = `${startLeft + deltaX}px`
                        element.style.top = `${startTop + deltaY}px`
                        element.style.right = 'auto'
                    }

                    const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove)
                        document.removeEventListener('mouseup', handleMouseUp)
                    }

                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                }}
            >
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span className="text-sm font-medium">图层列表</span>
                    <Badge variant="secondary" className="text-xs">
                        {filteredLayers.length}
                    </Badge>
                </div>
                <div className="flex items-center gap-1">
                    {/* 画布切换 */}
                    <div className="flex items-center gap-1 mr-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setCurrentCanvas(Math.max(0, currentCanvas - 1))}
                            disabled={currentCanvas === 0}
                        >
                            ←
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            画布 {currentCanvas + 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setCurrentCanvas(currentCanvas + 1)}
                        >
                            →
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-6 w-6 p-0"
                        title="关闭"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col">
                {/* 搜索和过滤 */}
                <div className="p-2 space-y-2 border-b">
                    <Input
                        placeholder="搜索图层..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-7 text-xs"
                    />
                    <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                        <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="过滤类型" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">所有图层</SelectItem>
                            <SelectItem value="text">文字图层</SelectItem>
                            <SelectItem value="layer">图像图层</SelectItem>
                            <SelectItem value="group">群组图层</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 图层列表 - 紧凑版本 */}
                <div className="relative">
                    <div
                        className="flex-1 overflow-y-auto pr-2"
                        style={{
                            maxHeight: '300px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#3b82f6 #f1f5f9'
                        }}
                    >
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                    .layer-scroll::-webkit-scrollbar {
                                        width: 10px;
                                    }
                                    .layer-scroll::-webkit-scrollbar-track {
                                        background: #f1f5f9;
                                        border-radius: 5px;
                                        border: 1px solid #e2e8f0;
                                    }
                                    .layer-scroll::-webkit-scrollbar-thumb {
                                        background: #3b82f6;
                                        border-radius: 5px;
                                        border: 1px solid #2563eb;
                                    }
                                    .layer-scroll::-webkit-scrollbar-thumb:hover {
                                        background: #2563eb;
                                    }
                                    .layer-scroll::-webkit-scrollbar-corner {
                                        background: #f1f5f9;
                                    }
                                `
                        }} />
                        <div className="p-2 space-y-1 layer-scroll">
                            {filteredLayers.map((layer) => (
                                <div key={layer.index} className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded">
                                    {/* 图层图标 */}
                                    <div className="flex-shrink-0">
                                        {getLayerIcon(layer)}
                                    </div>

                                    {/* 图层信息 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-medium truncate">
                                                {layer.name}
                                            </span>
                                            <Badge variant="secondary" className="text-xs px-1 py-0">
                                                {getLayerTypeLabel(layer)}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {Math.round((layer.opacity || 255) / 255 * 100)}%
                                        </div>
                                    </div>

                                    {/* 控制按钮 */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleLayerVisibilityToggle(layer.index)}
                                            title={layer.visible ? '隐藏图层' : '显示图层'}
                                        >
                                            {layer.visible ? (
                                                <Eye className="h-3 w-3" />
                                            ) : (
                                                <EyeOff className="h-3 w-3 opacity-50" />
                                            )}
                                        </Button>

                                        {layer.type === 'text' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => setSelectedLayer(selectedLayer?.index === layer.index ? null : layer)}
                                                title="编辑文字"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 滚动条指示器和状态 */}
                        {filteredLayers.length > 8 && (
                            <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground border shadow-sm">
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>

                                </div>
                            </div>
                        )}


                    </div>
                </div>

                {/* 文字编辑浮动面板 */}
                {selectedLayer && selectedLayer.type === 'text' && (
                    <div className="p-2 border-t bg-muted/30">
                        <div className="text-xs font-medium text-blue-600 mb-2">文字编辑</div>
                        <div className="space-y-2">
                            <Input
                                value={selectedLayer.text_content || selectedLayer.name || ''}
                                onChange={(e) => handleTextPropertyUpdate(selectedLayer.index, 'text_content', e.target.value)}
                                placeholder="输入文字内容"
                                className="text-xs h-7"
                            />
                            <div className="flex gap-1">
                                <Button
                                    variant={selectedLayer.font_weight === 'bold' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => handleTextPropertyUpdate(selectedLayer.index, 'font_weight',
                                        selectedLayer.font_weight === 'bold' ? 'normal' : 'bold'
                                    )}
                                >
                                    <Bold className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant={selectedLayer.font_style === 'italic' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => handleTextPropertyUpdate(selectedLayer.index, 'font_style',
                                        selectedLayer.font_style === 'italic' ? 'normal' : 'italic'
                                    )}
                                >
                                    <Italic className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
