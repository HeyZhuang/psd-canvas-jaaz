import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Layers,
    Image as ImageIcon,
    Type,
    FolderOpen,
    Star,
    Plus,
    Bookmark,
    Settings,
    Pin,
    PinOff,
    ChevronUp,
    ChevronDown,
    GripVertical,
    Move,
    Maximize2,
    Minimize2,
    X,
    RefreshCw,
} from 'lucide-react'
import { TemplateItem, TemplateCategory } from '@/types/types'
import { getTemplates, getTemplateCategories, applyTemplateToCanvas } from '@/api/template'
import { applyTemplateToExcalidraw } from '@/utils/templateCanvas'
import { useCanvas } from '@/contexts/canvas'

interface FloatingTemplateToolbarProps {
    isVisible: boolean
    onToggleVisibility: () => void
}

export function FloatingTemplateToolbar({
    isVisible,
    onToggleVisibility
}: FloatingTemplateToolbarProps) {
    const { t } = useTranslation()
    const { canvasId: currentCanvasId, excalidrawAPI } = useCanvas()

    // 状态管理
    const [templates, setTemplates] = useState<TemplateItem[]>([])
    const [categories, setCategories] = useState<TemplateCategory[]>([])
    const [loading, setLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isPinned, setIsPinned] = useState(false)
    const [position, setPosition] = useState({ x: 20, y: 100 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    // 加载数据
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [templatesData, categoriesData] = await Promise.all([
                getTemplates({ is_favorite: true }),
                getTemplateCategories(),
            ])
            setTemplates(templatesData.slice(0, 5)) // 只显示前5个收藏的模板
            setCategories(categoriesData)
        } catch (error) {
            console.error('Failed to load template data:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    // 应用模板
    const handleApplyTemplate = useCallback(async (template: TemplateItem) => {
        if (!currentCanvasId) {
            toast.error('请先选择一个画布')
            return
        }

        try {
            // 调用后端API应用模板
            const result = await applyTemplateToCanvas(template.id, currentCanvasId)

            // 在Excalidraw画布上显示模板
            if (excalidrawAPI) {
                applyTemplateToExcalidraw(excalidrawAPI, result)
            }

            toast.success('模板已应用到画布')
        } catch (error) {
            console.error('Failed to apply template:', error)
            toast.error('应用模板失败')
        }
    }, [currentCanvasId, excalidrawAPI])

    // 拖拽功能
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true)
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        })
    }, [position])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }, [isDragging, dragStart])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    // 初始化加载
    useEffect(() => {
        if (isVisible) {
            loadData()
        }
    }, [isVisible, loadData])

    if (!isVisible) return null

    return (
        <div
            className={`fixed z-50 transition-all duration-200 ${isExpanded ? 'w-80' : 'w-12'
                }`}
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            <Card className="shadow-lg border-2">
                {/* 工具栏头部 */}
                <div
                    className="flex items-center justify-between p-2 cursor-move bg-muted/50"
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {isExpanded && (
                            <>
                                <Layers className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">模板工具</span>
                                <Badge variant="secondary" className="text-xs">
                                    {templates.length}
                                </Badge>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {isExpanded && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                >
                                    {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsPinned(!isPinned)}
                                >
                                    {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleVisibility}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* 折叠状态 */}
                {!isExpanded && (
                    <div className="p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8"
                            onClick={() => setIsExpanded(true)}
                        >
                            <Layers className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* 展开状态 */}
                {isExpanded && (
                    <CardContent className="p-3 space-y-3">
                        {/* 快速操作 */}
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Button size="sm" className="flex-1">
                                    <Plus className="h-3 w-3 mr-1" />
                                    新建
                                </Button>
                                <Button size="sm" variant="outline">
                                    <FolderOpen className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {/* 收藏模板 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">收藏模板</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={loadData}
                                    disabled={loading}
                                >
                                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>

                            <div className="space-y-1">
                                {loading ? (
                                    <div className="flex items-center justify-center py-4">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    </div>
                                ) : templates.length > 0 ? (
                                    templates.map((template) => (
                                        <div
                                            key={template.id}
                                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                                            onClick={() => handleApplyTemplate(template)}
                                        >
                                            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center overflow-hidden">
                                                {template.thumbnail_url ? (
                                                    <img
                                                        src={template.thumbnail_url}
                                                        alt={template.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none'
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`w-full h-full flex items-center justify-center ${template.thumbnail_url ? 'hidden' : ''}`}>
                                                    {template.type === 'psd_layer' ? (
                                                        <Layers className="h-3 w-3" />
                                                    ) : template.type === 'image' ? (
                                                        <ImageIcon className="h-3 w-3" />
                                                    ) : (
                                                        <Type className="h-3 w-3" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">{template.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {categories.find(c => c.id === template.category_id)?.name}
                                                </p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-xs text-muted-foreground">
                                        暂无收藏模板
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* 底部操作 */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="outline" className="text-xs">
                                    <Bookmark className="h-3 w-3 mr-1" />
                                    收藏
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                    <Settings className="h-3 w-3 mr-1" />
                                    设置
                                </Button>
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={() => {
                                    // TODO: 打开完整模板管理器
                                    toast.info('打开完整模板管理器')
                                }}
                            >
                                <Move className="h-3 w-3 mr-1" />
                                完整管理
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
