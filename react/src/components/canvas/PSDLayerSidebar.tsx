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
    ChevronDown,
    ChevronRight,
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

    if (!isVisible || !psdData) {
        console.log('PSDLayerSidebar 不顯示:', { isVisible, hasPsdData: !!psdData })
        return null
    }

    return (
        <div className="fixed left-0 top-0 h-full w-80 bg-background border-r shadow-lg z-30 flex flex-col">
            {/* 头部 */}
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Layers className="h-5 w-5" />
                        PSD 图层列表
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                {/* 搜索和过滤 */}
                <div className="space-y-3">
                    <div className="relative">
                        <Input
                            placeholder="搜索图层..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-8"
                        />
                    </div>

                    <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                        <SelectTrigger>
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

                <Separator />

                {/* 图层列表 */}
                <ScrollArea className="flex-1">
                    <div className="space-y-2">
                        {(() => {
                            console.log('渲染圖層列表:', { filteredLayersCount: filteredLayers.length, filteredLayers })
                            return null
                        })()}
                        {filteredLayers.map((layer) => (
                            <Card key={layer.index} className="p-3">
                                <div className="space-y-3">
                                    {/* 图层头部 */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {getLayerIcon(layer)}
                                            <span className="text-sm font-medium truncate">
                                                {layer.name}
                                            </span>
                                            <Badge variant="secondary" className="text-xs">
                                                {getLayerTypeLabel(layer)}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* 可见性切换 */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => handleLayerVisibilityToggle(layer.index)}
                                            >
                                                {layer.visible ? (
                                                    <Eye className="h-3 w-3" />
                                                ) : (
                                                    <EyeOff className="h-3 w-3" />
                                                )}
                                            </Button>

                                            {/* 编辑按钮 */}
                                            {layer.type === 'text' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => setSelectedLayer(selectedLayer?.index === layer.index ? null : layer)}
                                                >
                                                    <Edit3 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 透明度控制 */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">透明度</Label>
                                            <span className="text-xs text-muted-foreground">
                                                {Math.round((layer.opacity || 255) / 255 * 100)}%
                                            </span>
                                        </div>
                                        <Slider
                                            value={[Math.round((layer.opacity || 255) / 255 * 100)]}
                                            onValueChange={([value]) => handleOpacityChange(layer.index, Math.round(value * 255 / 100))}
                                            max={100}
                                            min={0}
                                            step={1}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* 文字图层编辑 */}
                                    {layer.type === 'text' && selectedLayer?.index === layer.index && (
                                        <div className="space-y-3 pt-2 border-t">
                                            <div className="text-xs font-medium text-blue-600">文字编辑</div>

                                            {/* 文字内容 */}
                                            <div className="space-y-1">
                                                <Label className="text-xs">文字内容</Label>
                                                <Input
                                                    value={layer.text_content || layer.name || ''}
                                                    onChange={(e) => handleTextPropertyUpdate(layer.index, 'text_content', e.target.value)}
                                                    placeholder="输入文字内容"
                                                    className="text-xs"
                                                />
                                            </div>

                                            {/* 字体大小 */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs">字体大小</Label>
                                                    <span className="text-xs text-muted-foreground">
                                                        {layer.font_size || 16}px
                                                    </span>
                                                </div>
                                                <Slider
                                                    value={[layer.font_size || 16]}
                                                    onValueChange={([value]) => handleTextPropertyUpdate(layer.index, 'font_size', value)}
                                                    max={200}
                                                    min={8}
                                                    step={1}
                                                    className="w-full"
                                                />
                                            </div>

                                            {/* 字体颜色 */}
                                            <div className="space-y-1">
                                                <Label className="text-xs">字体颜色</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="color"
                                                        value={layer.text_color || '#000000'}
                                                        onChange={(e) => handleTextPropertyUpdate(layer.index, 'text_color', e.target.value)}
                                                        className="w-8 h-6 p-0 border-0"
                                                    />
                                                    <Input
                                                        value={layer.text_color || '#000000'}
                                                        onChange={(e) => handleTextPropertyUpdate(layer.index, 'text_color', e.target.value)}
                                                        placeholder="#000000"
                                                        className="text-xs flex-1"
                                                    />
                                                </div>
                                            </div>

                                            {/* 字体样式 */}
                                            <div className="space-y-2">
                                                <Label className="text-xs">字体样式</Label>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant={layer.font_weight === 'bold' ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => handleTextPropertyUpdate(layer.index, 'font_weight',
                                                            layer.font_weight === 'bold' ? 'normal' : 'bold'
                                                        )}
                                                    >
                                                        <Bold className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant={layer.font_style === 'italic' ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => handleTextPropertyUpdate(layer.index, 'font_style',
                                                            layer.font_style === 'italic' ? 'normal' : 'italic'
                                                        )}
                                                    >
                                                        <Italic className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant={layer.text_decoration === 'underline' ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => handleTextPropertyUpdate(layer.index, 'text_decoration',
                                                            layer.text_decoration === 'underline' ? 'none' : 'underline'
                                                        )}
                                                    >
                                                        <Underline className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* 文字对齐 */}
                                            <div className="space-y-2">
                                                <Label className="text-xs">文字对齐</Label>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant={layer.text_align === 'left' ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => handleTextPropertyUpdate(layer.index, 'text_align', 'left')}
                                                    >
                                                        <AlignLeft className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant={layer.text_align === 'center' ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => handleTextPropertyUpdate(layer.index, 'text_align', 'center')}
                                                    >
                                                        <AlignCenter className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant={layer.text_align === 'right' ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => handleTextPropertyUpdate(layer.index, 'text_align', 'right')}
                                                    >
                                                        <AlignRight className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* 字体族 */}
                                            <div className="space-y-1">
                                                <Label className="text-xs">字体族</Label>
                                                <Select
                                                    value={layer.font_family || 'Arial'}
                                                    onValueChange={(value) => handleTextPropertyUpdate(layer.index, 'font_family', value)}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Arial">Arial</SelectItem>
                                                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                                                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                                        <SelectItem value="Georgia">Georgia</SelectItem>
                                                        <SelectItem value="Verdana">Verdana</SelectItem>
                                                        <SelectItem value="Courier New">Courier New</SelectItem>
                                                        <SelectItem value="微软雅黑">微软雅黑</SelectItem>
                                                        <SelectItem value="宋体">宋体</SelectItem>
                                                        <SelectItem value="黑体">黑体</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>

                {/* 底部信息 */}
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                    共 {filteredLayers.length} 个图层
                </div>
            </CardContent>
        </div>
    )
}

