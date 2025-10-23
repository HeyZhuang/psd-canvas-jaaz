import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Bookmark,
    BookmarkCheck,
    Search,
    Filter,
    Grid3X3,
    List,
    Plus,
    FolderPlus,
    Star,
    StarOff,
    MoreHorizontal,
    Download,
    Upload,
    Trash2,
    Edit3,
    Copy,
    Eye,
    Heart,
    Tag,
    Calendar,
    User,
    Image as ImageIcon,
    Type,
    Layers,
    FolderOpen,
    Palette,
    Settings,
    RefreshCw,
    X,
    ChevronDown,
    ChevronRight,
    Pin,
    PinOff,
    Maximize2,
    Minimize2,
    Move,
    GripVertical,
} from 'lucide-react'
import {
    TemplateItem,
    TemplateCategory,
    TemplateCollection,
    TemplateSearchFilters,
} from '@/types/types'
import {
    getTemplates,
    getTemplateCategories,
    getTemplateCollections,
    createTemplateCategory,
    deleteTemplate,
    toggleTemplateFavorite,
    incrementTemplateUsage,
    searchTemplates,
    getTemplateStats,
} from '@/api/template'
import { applyTemplateToExcalidraw } from '@/utils/templateCanvas'
import { useCanvas } from '@/contexts/canvas'
import { FontManager } from '@/components/font/FontManager'
import { TemplateCard } from './TemplateCard'
import { TemplateUploadDialog } from './TemplateUploadDialog'
import { TemplateCategoryManager } from './TemplateCategoryManager'
import TemplateSearchFiltersComponent from './TemplateSearchFilters'

interface TemplateManagerProps {
    isOpen: boolean
    onClose: () => void
    onApplyTemplate?: (template: TemplateItem) => void
    currentCanvasId?: string
    onSuccess?: () => void
}

export function TemplateManager({
    isOpen,
    onClose,
    onApplyTemplate,
    currentCanvasId,
    onSuccess
}: TemplateManagerProps) {
    const { t } = useTranslation()
    const { excalidrawAPI } = useCanvas()

    // 状态管理
    const [templates, setTemplates] = useState<TemplateItem[]>([])
    const [categories, setCategories] = useState<TemplateCategory[]>([])
    const [collections, setCollections] = useState<TemplateCollection[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
    const [filters, setFilters] = useState<TemplateSearchFilters>({})
    const [showUploadDialog, setShowUploadDialog] = useState(false)
    const [showCategoryManager, setShowCategoryManager] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [activeTab, setActiveTab] = useState<'templates' | 'collections' | 'categories'>('templates')
    const [stats, setStats] = useState<any>(null)
    const [showFontManager, setShowFontManager] = useState(false)

    // 新增状态：浮动栏和底部工具栏
    const [isFloating, setIsFloating] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [floatingPosition, setFloatingPosition] = useState(() => {
        // 从localStorage恢复位置
        const saved = localStorage.getItem('template-manager-floating-position')
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch {
                return { x: 100, y: 100 }
            }
        }
        return { x: 100, y: 100 }
    })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    // 加载数据
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [templatesData, categoriesData, collectionsData, statsData] = await Promise.all([
                getTemplates(filters),
                getTemplateCategories(),
                getTemplateCollections(),
                getTemplateStats(),
            ])

            setTemplates(templatesData)
            setCategories(categoriesData)
            setCollections(collectionsData)
            setStats(statsData)
        } catch (error) {
            console.error('Failed to load template data:', error)
            toast.error('加载模板数据失败')
        } finally {
            setLoading(false)
        }
    }, [filters])

    // 搜索功能
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            loadData()
            return
        }

        setLoading(true)
        try {
            const results = await searchTemplates(query, filters)
            setTemplates(results)
        } catch (error) {
            console.error('Search failed:', error)
            toast.error('搜索失败')
        } finally {
            setLoading(false)
        }
    }, [filters, loadData])

    // 分类筛选
    const filteredTemplates = useMemo(() => {
        if (selectedCategory === 'all') return templates
        return templates.filter(template => template.category_id === selectedCategory)
    }, [templates, selectedCategory])

    // 模板操作
    const handleApplyTemplate = useCallback(async (template: TemplateItem) => {
        try {
            // 直接在Excalidraw画布上显示模板
            if (excalidrawAPI) {
                await applyTemplateToExcalidraw(excalidrawAPI, template)
            } else {
                toast.error('画布未初始化，请刷新页面重试')
                return
            }

            // 更新使用次数
            await incrementTemplateUsage(template.id)

            onApplyTemplate?.(template)
            toast.success('模板已应用到画布')
        } catch (error) {
            console.error('Failed to apply template:', error)
            toast.error('应用模板失败')
        }
    }, [onApplyTemplate, excalidrawAPI])

    const handleToggleFavorite = useCallback(async (templateId: string) => {
        try {
            await toggleTemplateFavorite(templateId)
            setTemplates(prev => prev.map(t =>
                t.id === templateId ? { ...t, is_favorite: !t.is_favorite } : t
            ))
        } catch (error) {
            console.error('Failed to toggle favorite:', error)
            toast.error('操作失败')
        }
    }, [])

    const handleDeleteTemplate = useCallback(async (templateId: string) => {
        try {
            await deleteTemplate(templateId)
            setTemplates(prev => prev.filter(t => t.id !== templateId))
            toast.success('模板已删除')
        } catch (error) {
            console.error('Failed to delete template:', error)
            toast.error('删除失败')
        }
    }, [])

    // 批量操作
    const handleBatchOperation = useCallback(async (operation: 'delete' | 'favorite' | 'unfavorite') => {
        if (selectedTemplates.size === 0) {
            toast.error('请先选择模板')
            return
        }

        try {
            const promises = Array.from(selectedTemplates).map(id => {
                switch (operation) {
                    case 'delete':
                        return deleteTemplate(id)
                    case 'favorite':
                        return toggleTemplateFavorite(id)
                    case 'unfavorite':
                        return toggleTemplateFavorite(id)
                    default:
                        return Promise.resolve()
                }
            })

            await Promise.all(promises)

            // 更新本地状态
            setTemplates(prev => {
                switch (operation) {
                    case 'delete':
                        return prev.filter(t => !selectedTemplates.has(t.id))
                    case 'favorite':
                    case 'unfavorite':
                        return prev.map(t =>
                            selectedTemplates.has(t.id)
                                ? { ...t, is_favorite: operation === 'favorite' }
                                : t
                        )
                    default:
                        return prev
                }
            })

            setSelectedTemplates(new Set())
            toast.success(`批量${operation === 'delete' ? '删除' : operation === 'favorite' ? '收藏' : '取消收藏'}成功`)

        } catch (error) {
            console.error('Batch operation failed:', error)
            toast.error('批量操作失败')
        }
    }, [selectedTemplates])

    // 浮动栏拖拽功能
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isFloating) return
        setIsDragging(true)
        setDragStart({
            x: e.clientX - floatingPosition.x,
            y: e.clientY - floatingPosition.y
        })
    }, [isFloating, floatingPosition])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !isFloating) return

        const newX = e.clientX - dragStart.x
        const newY = e.clientY - dragStart.y

        // 获取窗口尺寸
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight

        // 浮动窗口尺寸
        const floatingWidth = isMinimized ? 320 : 384 // w-80 = 320px, w-96 = 384px
        const floatingHeight = isMinimized ? 48 : 600

        // 边界检测
        const boundedX = Math.max(0, Math.min(newX, windowWidth - floatingWidth))
        const boundedY = Math.max(0, Math.min(newY, windowHeight - floatingHeight))

        setFloatingPosition({
            x: boundedX,
            y: boundedY
        })
    }, [isDragging, isFloating, dragStart, isMinimized])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
        // 保存位置到localStorage
        localStorage.setItem('template-manager-floating-position', JSON.stringify(floatingPosition))
    }, [floatingPosition])

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
        if (isOpen) {
            loadData()
        }
    }, [isOpen, loadData])

    // 搜索防抖
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, handleSearch])

    if (!isOpen) return null

    // 浮动栏模式
    if (isFloating) {
        return (
            <div
                className={`fixed template-floating bg-background border rounded-lg shadow-lg transition-all duration-300 ease-in-out ${isMinimized ? 'w-80 h-12' : 'w-96 h-[600px]'
                    } hover:shadow-xl`}
                style={{
                    left: floatingPosition.x,
                    top: floatingPosition.y,
                    zIndex: 999999,
                }}
            >
                {/* 浮动栏头部 */}
                <div
                    className="flex items-center justify-between p-3 border-b cursor-move bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/60 hover:to-muted/40 transition-all duration-200"
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        <h3 className="font-semibold text-sm">模板管理</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="hover:bg-background/50"
                        >
                            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsFloating(false)}
                            className="hover:bg-background/50"
                        >
                            <PinOff className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {!isMinimized && (
                    <div className="flex flex-col h-full">
                        {/* 搜索栏 */}
                        <div className="p-3 border-b bg-muted/20">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="搜索模板..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-background/50 border-muted-foreground/20 focus:bg-background transition-colors"
                                />
                            </div>
                        </div>

                        {/* 快速操作 */}
                        <div className="p-3 border-b bg-muted/10">
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setShowUploadDialog(true)}
                                    className="flex-1 hover:scale-105 transition-transform"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    新建
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowCategoryManager(true)}
                                    className="hover:scale-105 transition-transform"
                                >
                                    <FolderPlus className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowFontManager(true)}
                                    className="hover:scale-105 transition-transform"
                                >
                                    <Type className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* 模板列表 */}
                        <ScrollArea className="flex-1 p-3" style={{ maxHeight: 'calc(100% - 120px)' }}>
                            <div className="space-y-2">
                                {filteredTemplates.slice(0, 20).map((template) => (
                                    <div
                                        key={template.id}
                                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer transition-colors"
                                        onClick={() => handleApplyTemplate(template)}
                                    >
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {template.thumbnail_url ? (
                                                <img
                                                    src={template.thumbnail_url}
                                                    alt={template.name}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-full h-full flex items-center justify-center ${template.thumbnail_url ? 'hidden' : ''}`}>
                                                {template.type === 'psd_layer' ? (
                                                    <Layers className="h-4 w-4" />
                                                ) : template.type === 'image' ? (
                                                    <ImageIcon className="h-4 w-4" />
                                                ) : (
                                                    <Type className="h-4 w-4" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{template.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {categories.find(c => c.id === template.category_id)?.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {template.is_favorite && (
                                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleToggleFavorite(template.id)
                                                }}
                                            >
                                                <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {filteredTemplates.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">暂无模板</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>
        )
    }

    // 全屏模式
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 z-[9999]" style={{ zIndex: 9999 }}>
                <DialogHeader className="p-6 pb-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold">模板管理</DialogTitle>
                            <DialogDescription>
                                管理您的PSD图层、图片和设计模板
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsFloating(true)}
                            >
                                <Pin className="h-4 w-4 mr-1" />
                                浮动模式
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* 左侧边栏 */}
                    <div className="w-80 border-r bg-muted/20">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {/* 搜索栏 */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="搜索模板..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                {/* 分类筛选 */}
                                <div>
                                    <Label className="text-sm font-medium mb-2 block">分类</Label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">全部</SelectItem>
                                            {categories.map(category => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 视图模式 */}
                                <div>
                                    <Label className="text-sm font-medium mb-2 block">视图模式</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setViewMode('grid')}
                                        >
                                            <Grid3X3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={viewMode === 'list' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setViewMode('list')}
                                        >
                                            <List className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* 统计信息 */}
                                {stats && (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">统计信息</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>总模板</span>
                                                <span className="font-medium">{stats.total_templates}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>分类数</span>
                                                <span className="font-medium">{stats.total_categories}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>收藏数</span>
                                                <span className="font-medium">
                                                    {templates.filter(t => t.is_favorite).length}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* 主内容区 */}
                    <div className="flex-1 flex flex-col">
                        {/* 工具栏 */}
                        <div className="p-4 border-b bg-background">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => setShowUploadDialog(true)}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        新建模板
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowCategoryManager(true)}
                                    >
                                        <FolderPlus className="h-4 w-4 mr-1" />
                                        管理分类
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowFontManager(true)}
                                    >
                                        <Type className="h-4 w-4 mr-1" />
                                        字体管理
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowFilters(!showFilters)}
                                    >
                                        <Filter className="h-4 w-4 mr-1" />
                                        筛选
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedTemplates.size > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                已选择 {selectedTemplates.size} 个
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleBatchOperation('favorite')}
                                            >
                                                <Star className="h-4 w-4 mr-1" />
                                                收藏
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleBatchOperation('delete')}
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                删除
                                            </Button>
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadData}
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* 筛选器 */}
                        {showFilters && (
                            <div className="p-4 border-b bg-muted/20">
                                <TemplateSearchFiltersComponent
                                    filters={filters}
                                    onFiltersChange={setFilters}
                                    categories={categories}
                                />
                            </div>
                        )}

                        {/* 模板列表 */}
                        <ScrollArea className="flex-1 p-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                            {loading ? (
                                <div className="flex items-center justify-center h-32">
                                    <RefreshCw className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className={
                                    viewMode === 'grid'
                                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                                        : 'space-y-2'
                                }>
                                    {filteredTemplates.map((template) => (
                                        <TemplateCard
                                            key={template.id}
                                            template={template}
                                            viewMode={viewMode}
                                            isSelected={selectedTemplates.has(template.id)}
                                            onSelect={(selected: boolean) => {
                                                setSelectedTemplates(prev => {
                                                    const newSet = new Set(prev)
                                                    if (selected) {
                                                        newSet.add(template.id)
                                                    } else {
                                                        newSet.delete(template.id)
                                                    }
                                                    return newSet
                                                })
                                            }}
                                            onApply={() => handleApplyTemplate(template)}
                                            onToggleFavorite={() => handleToggleFavorite(template.id)}
                                            onDelete={() => handleDeleteTemplate(template.id)}
                                            onEdit={() => {
                                                // TODO: 实现编辑功能
                                                toast.info('编辑功能开发中')
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                {/* 底部功能栏 */}
                <div className="border-t bg-background p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">显示:</span>
                                <Badge variant="secondary">
                                    {filteredTemplates.length} / {templates.length}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">分类:</span>
                                <Badge variant="outline">
                                    {selectedCategory === 'all' ? '全部' : categories.find(c => c.id === selectedCategory)?.name}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowUploadDialog(true)}
                            >
                                <Upload className="h-4 w-4 mr-1" />
                                导入模板
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // TODO: 实现导出功能
                                    toast.info('导出功能开发中')
                                }}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                导出模板
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // TODO: 实现设置功能
                                    toast.info('设置功能开发中')
                                }}
                            >
                                <Settings className="h-4 w-4 mr-1" />
                                设置
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>

            {/* 子对话框 */}
            <TemplateUploadDialog
                isOpen={showUploadDialog}
                onClose={() => setShowUploadDialog(false)}
                onSuccess={() => {
                    setShowUploadDialog(false)
                    loadData()
                    onSuccess?.()
                }}
                categories={categories}
            />

            <TemplateCategoryManager
                categories={categories}
                onCategoriesChange={setCategories}
            />

            <FontManager
                isOpen={showFontManager}
                onClose={() => setShowFontManager(false)}
                onSuccess={() => {
                    setShowFontManager(false)
                    loadData()
                    onSuccess?.()
                }}
            />
        </Dialog>
    )
}