import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
    Bookmark,
    Star,
} from 'lucide-react'
import {
    updateLayerProperties,
    type PSDLayer
} from '@/api/upload'
import { useCanvas } from '@/contexts/canvas'
import { TemplateManager } from '@/components/template/TemplateManager'
import { createTemplateFromPSDLayer } from '@/api/template'

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
    const [canvasElements, setCanvasElements] = useState<any[]>([])
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
    const [showTemplateManager, setShowTemplateManager] = useState(false)

    // 监听画布变化，实时同步图层状态
    useEffect(() => {
        if (!excalidrawAPI || !isVisible) return

        const updateCanvasElements = () => {
            const elements = excalidrawAPI.getSceneElements()
            const psdElements = elements.filter(element => element.customData?.psdFileId)

            setCanvasElements(psdElements)
            setLastUpdateTime(Date.now())

            console.log('图层列表同步更新:', {
                totalElements: elements.length,
                psdElements: psdElements.length,
                timestamp: new Date().toLocaleTimeString()
            })
        }

        // 初始更新
        updateCanvasElements()

        // 监听画布变化事件
        const unsubscribe = (excalidrawAPI as any).on?.('change', updateCanvasElements) || null

        // 定期检查更新（作为备用机制）
        const interval = setInterval(updateCanvasElements, 1000)

        return () => {
            unsubscribe?.()
            clearInterval(interval)
        }
    }, [excalidrawAPI, isVisible])

    // 获取画布中图层的实时状态
    const getLayerCanvasState = useCallback((layerIndex: number) => {
        const canvasElement = canvasElements.find(element =>
            element.customData?.psdLayerIndex === layerIndex
        )

        if (!canvasElement) {
            return {
                exists: false,
                visible: false,
                opacity: 100,
                element: null
            }
        }

        // 检查可见性：主要基于opacity，同时检查customData中的visible状态
        const opacityVisible = canvasElement.opacity > 0
        const customDataVisible = canvasElement.customData?.visible !== false
        const isVisible = opacityVisible && customDataVisible

        return {
            exists: true,
            visible: isVisible,
            opacity: canvasElement.opacity || 100,
            element: canvasElement
        }
    }, [canvasElements])

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

    // 图层可见性切换（与画布同步）
    const handleLayerVisibilityToggle = useCallback(
        async (layerIndex: number) => {
            if (!psdData || !excalidrawAPI) return

            try {
                const canvasState = getLayerCanvasState(layerIndex)
                const newVisible = !canvasState.visible

                if (canvasState.exists) {
                    // 如果图层在画布中存在，直接切换可见性
                    const currentElements = excalidrawAPI.getSceneElements()
                    const updatedElements = currentElements.map(element => {
                        if (element.customData?.psdLayerIndex === layerIndex) {
                            // 保存原始透明度
                            const originalOpacity = element.customData?.originalOpacity || 100

                            return {
                                ...element,
                                // 使用原始透明度或默认100
                                opacity: newVisible ? originalOpacity : 0,
                                // 不使用isDeleted，只使用opacity控制
                                isDeleted: false,
                                // 更新customData中的可见性状态
                                customData: {
                                    ...element.customData,
                                    visible: newVisible
                                }
                            }
                        }
                        return element
                    })

                    // 强制更新场景
                    excalidrawAPI.updateScene({
                        elements: updatedElements,
                        appState: excalidrawAPI.getAppState()
                    })

                    // 触发重绘
                    excalidrawAPI.history.clear()

                    // 强制刷新画布状态
                    setTimeout(() => {
                        const refreshedElements = excalidrawAPI.getSceneElements()
                        const refreshedPsdElements = refreshedElements.filter(element => element.customData?.psdFileId)
                        setCanvasElements(refreshedPsdElements)
                        setLastUpdateTime(Date.now())

                        // 验证更新是否成功
                        const targetElement = refreshedElements.find(el => el.customData?.psdLayerIndex === layerIndex)
                        if (targetElement) {
                            console.log('图层状态验证:', {
                                layerIndex,
                                layerName: targetElement.customData?.layerName,
                                isDeleted: targetElement.isDeleted,
                                opacity: targetElement.opacity,
                                customDataVisible: targetElement.customData?.visible,
                                expectedVisible: newVisible,
                                actualVisible: targetElement.opacity > 0
                            })

                            // 如果更新失败，尝试再次更新
                            if (targetElement.opacity === 0 && newVisible) {
                                console.warn('图层显示失败，尝试强制显示')
                                const forceUpdatedElements = refreshedElements.map(el => {
                                    if (el.customData?.psdLayerIndex === layerIndex) {
                                        return {
                                            ...el,
                                            opacity: el.customData?.originalOpacity || 100,
                                            isDeleted: false,
                                            customData: {
                                                ...el.customData,
                                                visible: true
                                            }
                                        }
                                    }
                                    return el
                                })

                                excalidrawAPI.updateScene({
                                    elements: forceUpdatedElements
                                })
                            }
                        }
                    }, 50)

                    console.log(`图层 ${layerIndex} 可见性切换为: ${newVisible}`, {
                        element: canvasState.element,
                        originalOpacity: canvasState.element?.customData?.originalOpacity || 100,
                        newOpacity: newVisible ? (canvasState.element?.customData?.originalOpacity || 100) : 0,
                        isDeleted: false
                    })
                } else {
                    // 如果图层不在画布中，更新PSD数据
                    const updatedLayers = psdData.layers.map((layer) =>
                        layer.index === layerIndex ? { ...layer, visible: newVisible } : layer
                    )

                    await updateLayerProperties(psdData.file_id, layerIndex, {
                        visible: newVisible
                    })

                    onUpdate({
                        ...psdData,
                        layers: updatedLayers,
                    })
                }

                toast.success(`图层可见性已切换为: ${newVisible ? '可见' : '隐藏'}`)
            } catch (error) {
                console.error('更新图层可见性失败:', error)
                toast.error('更新图层可见性失败')
            }
        },
        [psdData, excalidrawAPI, getLayerCanvasState, onUpdate]
    )

    // 图层透明度调整（与画布同步）
    const handleOpacityChange = useCallback(
        async (layerIndex: number, opacity: number) => {
            if (!psdData || !excalidrawAPI) return

            try {
                const canvasState = getLayerCanvasState(layerIndex)

                if (canvasState.exists) {
                    // 如果图层在画布中存在，直接更新透明度
                    const updatedElements = excalidrawAPI.getSceneElements().map(element => {
                        if (element.customData?.psdLayerIndex === layerIndex) {
                            return { ...element, opacity }
                        }
                        return element
                    })

                    excalidrawAPI.updateScene({
                        elements: updatedElements
                    })

                    console.log(`图层 ${layerIndex} 透明度更新为: ${opacity}%`)
                } else {
                    // 如果图层不在画布中，更新PSD数据
                    const updatedLayers = psdData.layers.map((layer) =>
                        layer.index === layerIndex ? { ...layer, opacity } : layer
                    )

                    await updateLayerProperties(psdData.file_id, layerIndex, { opacity })

                    onUpdate({
                        ...psdData,
                        layers: updatedLayers,
                    })
                }

                toast.success(`图层透明度已更新为: ${opacity}%`)
            } catch (error) {
                console.error('更新图层透明度失败:', error)
                toast.error('更新图层透明度失败')
            }
        },
        [psdData, excalidrawAPI, getLayerCanvasState, onUpdate]
    )

    // 文字图层属性更新（与画布同步）
    const handleTextPropertyUpdate = useCallback(
        async (layerIndex: number, property: string, value: any) => {
            if (!psdData || !excalidrawAPI) return

            try {
                const canvasState = getLayerCanvasState(layerIndex)

                if (canvasState.exists) {
                    // 如果图层在画布中存在，直接更新画布中的文字元素
                    const currentElements = excalidrawAPI.getSceneElements()
                    const updatedElements = currentElements.map(element => {
                        if (element.customData?.psdLayerIndex === layerIndex) {
                            // 更新文字元素的属性
                            const updatedElement = { ...element }

                            if (property === 'text_content') {
                                // 更新文字内容
                                if (updatedElement.type === 'text') {
                                    (updatedElement as any).text = value
                                }
                            } else if (property === 'font_weight') {
                                // 更新字体粗细
                                if (updatedElement.type === 'text') {
                                    (updatedElement as any).fontWeight = value === 'bold' ? 600 : 400
                                }
                            } else if (property === 'font_style') {
                                // 更新字体样式
                                if (updatedElement.type === 'text') {
                                    (updatedElement as any).fontStyle = value === 'italic' ? 'italic' : 'normal'
                                }
                            }

                            // 更新customData
                            updatedElement.customData = {
                                ...updatedElement.customData,
                                [property]: value
                            }

                            return updatedElement
                        }
                        return element
                    })

                    // 强制更新场景
                    excalidrawAPI.updateScene({
                        elements: updatedElements,
                        appState: excalidrawAPI.getAppState()
                    })

                    console.log(`文字图层 ${layerIndex} ${property} 更新为: ${value}`)
                } else {
                    // 如果图层不在画布中，更新PSD数据
                    const updatedLayers = psdData.layers.map((layer) =>
                        layer.index === layerIndex ? { ...layer, [property]: value } : layer
                    )

                    await updateLayerProperties(psdData.file_id, layerIndex, { [property]: value })

                    onUpdate({
                        ...psdData,
                        layers: updatedLayers,
                    })
                }

                toast.success('文字属性已更新')
            } catch (error) {
                console.error('更新文字属性失败:', error)
                toast.error('更新文字属性失败')
            }
        },
        [psdData, excalidrawAPI, getLayerCanvasState, onUpdate]
    )

    // 保存图层为模板
    const handleSaveLayerAsTemplate = useCallback(async (layer: PSDLayer) => {
        try {
            const templateData = {
                name: `${layer.name} - 模板`,
                description: `从PSD图层 "${layer.name}" 创建的模板`,
                category_id: 'default', // 默认分类，实际应用中应该让用户选择
                tags: ['psd', 'layer', layer.type],
                is_public: false,
            }

            await createTemplateFromPSDLayer(psdData!.file_id, layer.index, templateData)
            toast.success(`图层 "${layer.name}" 已保存为模板`)
        } catch (error) {
            console.error('保存模板失败:', error)
            toast.error('保存模板失败')
        }
    }, [psdData])

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

    // 如果不可见，直接返回null
    if (!isVisible) {
        return null
    }

    if (!psdData) {
        console.log('PSDLayerSidebar 沒有 PSD 數據')
        return null
    }

    return (
        <div
            className="fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg cursor-move"
            style={{
                width: '360px',
                maxHeight: '80vh'
            }}
        >
            {/* 浮动面板头部 - 可拖拽 */}
            <div
                className="flex items-center justify-between p-2 border-b cursor-move min-w-0"
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
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                    <Layers className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium whitespace-nowrap">图层列表</span>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {filteredLayers.length}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-green-600 flex-shrink-0">
                        实时同步
                    </Badge>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {/* 模板管理按钮 */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-xs"
                        onClick={() => setShowTemplateManager(true)}
                        title="模板管理"
                    >
                        <Star className="h-3 w-3" />
                    </Button>
                    {/* 刷新按钮 */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                            const elements = excalidrawAPI?.getSceneElements() || []
                            const psdElements = elements.filter(element => element.customData?.psdFileId)
                            setCanvasElements(psdElements)
                            setLastUpdateTime(Date.now())

                            // 调试信息
                            console.log('刷新图层状态:', {
                                totalElements: elements.length,
                                psdElements: psdElements.length,
                                psdElementsDetails: psdElements.map(el => ({
                                    id: el.id,
                                    layerIndex: el.customData?.psdLayerIndex,
                                    layerName: el.customData?.layerName,
                                    isDeleted: el.isDeleted,
                                    opacity: el.opacity,
                                    originalOpacity: el.customData?.originalOpacity,
                                    customDataVisible: el.customData?.visible,
                                    visible: !el.isDeleted && el.opacity > 0
                                }))
                            })

                            toast.success('图层列表已刷新')
                        }}
                        title="刷新图层状态"
                    >
                        <div className="h-3 w-3 border border-current rounded-full animate-spin"></div>
                    </Button>

                    {/* 画布切换 */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 text-xs"
                            onClick={() => setCurrentCanvas(Math.max(0, currentCanvas - 1))}
                            disabled={currentCanvas === 0}
                        >
                            ←
                        </Button>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            画布 {currentCanvas + 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 text-xs"
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
                            {filteredLayers.map((layer) => {
                                const canvasState = getLayerCanvasState(layer.index)
                                const isVisible = canvasState.exists ? canvasState.visible : layer.visible
                                const currentOpacity = canvasState.exists ? canvasState.opacity : Math.round((layer.opacity || 255) / 255 * 100)

                                return (
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
                                                {canvasState.exists && (
                                                    <Badge variant="outline" className="text-xs px-1 py-0 text-green-600">
                                                        画布中
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {currentOpacity}%
                                                {canvasState.exists && (
                                                    <span className="ml-1 text-green-600">• 实时</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 控制按钮 */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => handleLayerVisibilityToggle(layer.index)}
                                                title={isVisible ? '隐藏图层' : '显示图层'}
                                            >
                                                {isVisible ? (
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

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => handleSaveLayerAsTemplate(layer)}
                                                title="保存为模板"
                                            >
                                                <Bookmark className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* 滚动条指示器和状态 */}
                        {filteredLayers.length > 8 && (
                            <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground border shadow-sm">
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                                    <span>实时同步</span>
                                    <span className="text-xs">
                                        {new Date(lastUpdateTime).toLocaleTimeString()}
                                    </span>
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
                                value={(() => {
                                    const canvasState = getLayerCanvasState(selectedLayer.index)
                                    if (canvasState.exists && canvasState.element) {
                                        // 从画布元素获取最新文字内容
                                        return (canvasState.element as any).text || selectedLayer.text_content || selectedLayer.name || ''
                                    }
                                    // 从PSD数据获取文字内容
                                    return selectedLayer.text_content || selectedLayer.name || ''
                                })()}
                                onChange={(e) => handleTextPropertyUpdate(selectedLayer.index, 'text_content', e.target.value)}
                                placeholder="输入文字内容"
                                className="text-xs h-7"
                            />
                            <div className="flex gap-1">
                                <Button
                                    variant={(() => {
                                        const canvasState = getLayerCanvasState(selectedLayer.index)
                                        const fontWeight = canvasState.exists && canvasState.element
                                            ? ((canvasState.element as any).fontWeight >= 600 ? 'bold' : 'normal')
                                            : selectedLayer.font_weight
                                        return fontWeight === 'bold' ? 'default' : 'outline'
                                    })()}
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => handleTextPropertyUpdate(selectedLayer.index, 'font_weight',
                                        (() => {
                                            const canvasState = getLayerCanvasState(selectedLayer.index)
                                            const currentWeight = canvasState.exists && canvasState.element
                                                ? ((canvasState.element as any).fontWeight >= 600 ? 'bold' : 'normal')
                                                : selectedLayer.font_weight
                                            return currentWeight === 'bold' ? 'normal' : 'bold'
                                        })()
                                    )}
                                >
                                    <Bold className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant={(() => {
                                        const canvasState = getLayerCanvasState(selectedLayer.index)
                                        const fontStyle = canvasState.exists && canvasState.element
                                            ? (canvasState.element as any).fontStyle
                                            : selectedLayer.font_style
                                        return fontStyle === 'italic' ? 'default' : 'outline'
                                    })()}
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => handleTextPropertyUpdate(selectedLayer.index, 'font_style',
                                        (() => {
                                            const canvasState = getLayerCanvasState(selectedLayer.index)
                                            const currentStyle = canvasState.exists && canvasState.element
                                                ? (canvasState.element as any).fontStyle
                                                : selectedLayer.font_style
                                            return currentStyle === 'italic' ? 'normal' : 'italic'
                                        })()
                                    )}
                                >
                                    <Italic className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 模板管理器 */}
            <TemplateManager
                isOpen={showTemplateManager}
                onClose={() => setShowTemplateManager(false)}
                onApplyTemplate={(template) => {
                    console.log('应用模板:', template)
                    toast.success(`模板 "${template.name}" 已应用到画布`)
                }}
            />
        </div>
    )
}
