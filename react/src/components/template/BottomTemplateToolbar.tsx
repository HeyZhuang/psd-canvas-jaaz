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
    Upload,
    Download,
    Search,
    Filter,
    Grid3X3,
    List,
    Eye,
    EyeOff,
    Trash2,
    Edit3,
    Copy,
    Heart,
    Tag,
    Calendar,
    User,
    Palette,
} from 'lucide-react'
import { TemplateItem, TemplateCategory } from '@/types/types'
import { getTemplates, getTemplateCategories } from '@/api/template'
import { applyTemplateToExcalidraw } from '@/utils/templateCanvas'
import { useCanvas } from '@/contexts/canvas'

interface BottomTemplateToolbarProps {
    isVisible: boolean
    onToggleVisibility: () => void
    onOpenTemplateManager: () => void
}

export function BottomTemplateToolbar({
    isVisible,
    onToggleVisibility,
    onOpenTemplateManager
}: BottomTemplateToolbarProps) {
    const { t } = useTranslation()
    const { canvasId: currentCanvasId, excalidrawAPI } = useCanvas()

    // 状态管理
    const [templates, setTemplates] = useState<TemplateItem[]>([])
    const [categories, setCategories] = useState<TemplateCategory[]>([])
    const [loading, setLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [activeTab, setActiveTab] = useState<'recent' | 'favorites' | 'categories'>('recent')

    // 加载数据
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [templatesData, categoriesData] = await Promise.all([
                getTemplates({}),
                getTemplateCategories(),
            ])
            setTemplates(templatesData)
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
            // 直接在Excalidraw画布上显示模板
            if (excalidrawAPI) {
                await applyTemplateToExcalidraw(excalidrawAPI, template)
            }

            toast.success('模板已应用到画布')
        } catch (error) {
            console.error('Failed to apply template:', error)
            toast.error('应用模板失败')
        }
    }, [currentCanvasId, excalidrawAPI])

    // 获取显示的模板
    const getDisplayTemplates = useCallback(() => {
        switch (activeTab) {
            case 'recent':
                return templates.slice(0, 8).sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
            case 'favorites':
                return templates.filter(t => t.is_favorite).slice(0, 8)
            case 'categories':
                return templates.slice(0, 8)
            default:
                return templates.slice(0, 8)
        }
    }, [templates, activeTab])

    // 初始化加载
    useEffect(() => {
        if (isVisible) {
            loadData()
        }
    }, [isVisible, loadData])

    if (!isVisible) return null

    return (
        <div className="fixed left-0 top-0 bottom-0 z-[9999] bg-background border-r shadow-lg w-80 flex flex-col" style={{ zIndex: 9999 }}>
            {/* 工具栏头部 */}
            <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">模板工具</span>
                    <Badge variant="secondary" className="text-xs">
                        {templates.length}
                    </Badge>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleVisibility}
                    >
                        <EyeOff className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* 展开内容 */}
            {isExpanded && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-3 space-y-4 flex-shrink-0">
                        {/* 标签页 */}
                        <div className="flex flex-col gap-2">
                            <Button
                                variant={activeTab === 'recent' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveTab('recent')}
                                className="justify-start"
                            >
                                <Calendar className="h-3 w-3 mr-2" />
                                最近
                            </Button>
                            <Button
                                variant={activeTab === 'favorites' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveTab('favorites')}
                                className="justify-start"
                            >
                                <Star className="h-3 w-3 mr-2" />
                                收藏
                            </Button>
                            <Button
                                variant={activeTab === 'categories' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveTab('categories')}
                                className="justify-start"
                            >
                                <FolderOpen className="h-3 w-3 mr-2" />
                                分类
                            </Button>
                        </div>

                        {/* 快速操作 */}
                        <div className="space-y-2">
                            <Button
                                size="sm"
                                className="w-full justify-start"
                                onClick={onOpenTemplateManager}
                            >
                                <Plus className="h-3 w-3 mr-2" />
                                管理模板
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={loadData}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                刷新
                            </Button>
                        </div>

                        <Separator />

                        {/* 模板列表 */}
                        <div className="flex-1 overflow-y-auto p-3">
                            <div className="space-y-2">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <RefreshCw className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : getDisplayTemplates().length > 0 ? (
                                    getDisplayTemplates().map((template) => (
                                        <div
                                            key={template.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer group"
                                            onClick={() => handleApplyTemplate(template)}
                                        >
                                            {/* 缩略图 */}
                                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
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
                                                    {template.type === 'psd_file' ? (
                                                        <Layers className="h-4 w-4" />
                                                    ) : template.type === 'psd_layer' ? (
                                                        <Layers className="h-4 w-4" />
                                                    ) : template.type === 'image' ? (
                                                        <ImageIcon className="h-4 w-4" />
                                                    ) : (
                                                        <Type className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* 模板信息 */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{template.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {categories.find(c => c.id === template.category_id)?.name}
                                                </p>
                                            </div>

                                            {/* 操作按钮 */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                {template.is_favorite && (
                                                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                                )}
                                                <Badge variant="outline" className="text-xs">
                                                    {template.usage_count}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>暂无模板</p>
                                        <p className="text-xs">点击"管理模板"开始创建</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
