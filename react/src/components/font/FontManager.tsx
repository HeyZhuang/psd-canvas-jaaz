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
    FileText,
    Zap,
} from 'lucide-react'
import {
    FontItem,
    FontCategory,
    FontCategoryCreate,
    FontItemCreate,
    getFontCategories,
    createFontCategory,
    updateFontCategory,
    deleteFontCategory,
    getFonts,
    uploadFont,
    updateFont,
    deleteFont,
    toggleFontFavorite,
    incrementFontUsage,
    searchFonts,
    getFontStats,
    importExistingFonts,
    formatFileSize,
} from '@/api/font'

interface FontManagerProps {
    isOpen: boolean
    onClose: () => void
    onSelectFont?: (font: FontItem) => void
    onSuccess?: () => void
}

export function FontManager({
    isOpen,
    onClose,
    onSelectFont,
    onSuccess
}: FontManagerProps) {
    const { t } = useTranslation()

    // 状态管理
    const [fonts, setFonts] = useState<FontItem[]>([])
    const [categories, setCategories] = useState<FontCategory[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedFonts, setSelectedFonts] = useState<Set<string>>(new Set())
    const [showUploadDialog, setShowUploadDialog] = useState(false)
    const [showCategoryManager, setShowCategoryManager] = useState(false)
    const [activeTab, setActiveTab] = useState<'fonts' | 'categories'>('fonts')
    const [stats, setStats] = useState<any>(null)

    // 加载数据
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [fontsData, categoriesData, statsData] = await Promise.all([
                getFonts(),
                getFontCategories(),
                getFontStats(),
            ])

            setFonts(fontsData)
            setCategories(categoriesData)
            setStats(statsData)
        } catch (error) {
            console.error('Failed to load font data:', error)
            toast.error('加载字体数据失败')
        } finally {
            setLoading(false)
        }
    }, [])

    // 搜索功能
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            loadData()
            return
        }

        setLoading(true)
        try {
            const results = await searchFonts(query)
            setFonts(results)
        } catch (error) {
            console.error('Search failed:', error)
            toast.error('搜索失败')
        } finally {
            setLoading(false)
        }
    }, [loadData])

    // 分类筛选
    const filteredFonts = useMemo(() => {
        if (selectedCategory === 'all') return fonts
        return fonts.filter(font => font.category_id === selectedCategory)
    }, [fonts, selectedCategory])

    // 字体操作
    const handleSelectFont = useCallback((font: FontItem) => {
        onSelectFont?.(font)
        incrementFontUsage(font.id)
        toast.success('字体已选择')
    }, [onSelectFont])

    const handleToggleFavorite = useCallback(async (fontId: string) => {
        try {
            await toggleFontFavorite(fontId)
            setFonts(prev => prev.map(f =>
                f.id === fontId ? { ...f, is_favorite: !f.is_favorite } : f
            ))
        } catch (error) {
            console.error('Failed to toggle favorite:', error)
            toast.error('操作失败')
        }
    }, [])

    const handleDeleteFont = useCallback(async (fontId: string) => {
        try {
            await deleteFont(fontId)
            setFonts(prev => prev.filter(f => f.id !== fontId))
            toast.success('字体已删除')
        } catch (error) {
            console.error('Failed to delete font:', error)
            toast.error('删除失败')
        }
    }, [])

    // 批量操作
    const handleBatchOperation = useCallback(async (operation: 'delete' | 'favorite' | 'unfavorite') => {
        if (selectedFonts.size === 0) {
            toast.error('请先选择字体')
            return
        }

        try {
            const promises = Array.from(selectedFonts).map(id => {
                switch (operation) {
                    case 'delete':
                        return deleteFont(id)
                    case 'favorite':
                        return toggleFontFavorite(id)
                    case 'unfavorite':
                        return toggleFontFavorite(id)
                    default:
                        return Promise.resolve()
                }
            })

            await Promise.all(promises)

            // 更新本地状态
            setFonts(prev => {
                switch (operation) {
                    case 'delete':
                        return prev.filter(f => !selectedFonts.has(f.id))
                    case 'favorite':
                    case 'unfavorite':
                        return prev.map(f =>
                            selectedFonts.has(f.id)
                                ? { ...f, is_favorite: operation === 'favorite' }
                                : f
                        )
                    default:
                        return prev
                }
            })

            setSelectedFonts(new Set())
            toast.success(`批量${operation === 'delete' ? '删除' : operation === 'favorite' ? '收藏' : '取消收藏'}成功`)

        } catch (error) {
            console.error('Batch operation failed:', error)
            toast.error('批量操作失败')
        }
    }, [selectedFonts])

    // 导入现有字体
    const handleImportExisting = useCallback(async () => {
        try {
            const result = await importExistingFonts()
            toast.success(result.message)
            if (result.errors.length > 0) {
                console.warn('Import errors:', result.errors)
            }
            loadData()
        } catch (error) {
            console.error('Failed to import existing fonts:', error)
            toast.error('导入现有字体失败')
        }
    }, [loadData])

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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 z-[9999]" style={{ zIndex: 9999 }}>
                <DialogHeader className="p-6 pb-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold">字体管理</DialogTitle>
                            <DialogDescription>
                                管理您的字体文件，支持TTF、OTF、WOFF、WOFF2格式
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleImportExisting}
                            >
                                <Zap className="h-4 w-4 mr-1" />
                                导入现有字体
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
                                        placeholder="搜索字体..."
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
                                                <span>总字体</span>
                                                <span className="font-medium">{stats.total_fonts}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>分类数</span>
                                                <span className="font-medium">{stats.total_categories}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>收藏数</span>
                                                <span className="font-medium">
                                                    {fonts.filter(f => f.is_favorite).length}
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
                                        上传字体
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowCategoryManager(true)}
                                    >
                                        <FolderPlus className="h-4 w-4 mr-1" />
                                        管理分类
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedFonts.size > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                已选择 {selectedFonts.size} 个
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

                        {/* 字体列表 */}
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
                                    {filteredFonts.map((font) => (
                                        <FontCard
                                            key={font.id}
                                            font={font}
                                            viewMode={viewMode}
                                            isSelected={selectedFonts.has(font.id)}
                                            onSelect={(selected) => {
                                                setSelectedFonts(prev => {
                                                    const newSet = new Set(prev)
                                                    if (selected) {
                                                        newSet.add(font.id)
                                                    } else {
                                                        newSet.delete(font.id)
                                                    }
                                                    return newSet
                                                })
                                            }}
                                            onSelectFont={() => handleSelectFont(font)}
                                            onToggleFavorite={() => handleToggleFavorite(font.id)}
                                            onDelete={() => handleDeleteFont(font.id)}
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
                                    {filteredFonts.length} / {fonts.length}
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
                                上传字体
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>

            {/* 子对话框 */}
            <FontUploadDialog
                isOpen={showUploadDialog}
                onClose={() => setShowUploadDialog(false)}
                onSuccess={() => {
                    setShowUploadDialog(false)
                    loadData()
                    onSuccess?.()
                }}
                categories={categories}
            />

            <FontCategoryManager
                categories={categories}
                onCategoriesChange={setCategories}
            />
        </Dialog>
    )
}

// 字体卡片组件
interface FontCardProps {
    font: FontItem
    viewMode: 'grid' | 'list'
    isSelected: boolean
    onSelect: (selected: boolean) => void
    onSelectFont: () => void
    onToggleFavorite: () => void
    onDelete: () => void
}

function FontCard({ font, viewMode, isSelected, onSelect, onSelectFont, onToggleFavorite, onDelete }: FontCardProps) {
    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onSelect}
                    className="flex-shrink-0"
                />
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Type className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{font.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{font.font_family}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                            {font.font_format.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {formatFileSize(font.file_size)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {font.is_favorite && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSelectFont}
                        className="h-8 px-2"
                    >
                        选择
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleFavorite}
                        className="h-8 w-8 p-0"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <Card className="group hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onSelect}
                            className="flex-shrink-0"
                        />
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Type className="h-6 w-6 text-muted-foreground" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {font.is_favorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleFavorite}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div>
                    <h3 className="font-medium text-sm truncate">{font.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{font.font_family}</p>
                </div>
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                        {font.font_format.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {formatFileSize(font.file_size)}
                    </span>
                </div>
                <Button
                    size="sm"
                    className="w-full"
                    onClick={onSelectFont}
                >
                    选择字体
                </Button>
            </CardContent>
        </Card>
    )
}

// 字体上传对话框
interface FontUploadDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    categories: FontCategory[]
}

function FontUploadDialog({ isOpen, onClose, onSuccess, categories }: FontUploadDialogProps) {
    const [fontFile, setFontFile] = useState<File | null>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [tags, setTags] = useState<string[]>([])
    const [isPublic, setIsPublic] = useState(false)
    const [uploading, setUploading] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFontFile(file)
            if (!name) {
                setName(file.name.replace(/\.[^/.]+$/, ""))
            }
        }
    }

    const handleSubmit = async () => {
        if (!fontFile) {
            toast.error('请选择字体文件')
            return
        }

        if (!name.trim()) {
            toast.error('请输入字体名称')
            return
        }

        setUploading(true)
        try {
            await uploadFont(fontFile, {
                name: name.trim(),
                description: description.trim(),
                category_id: categoryId || undefined,
                tags,
                is_public: isPublic,
            })
            toast.success('字体上传成功')
            onSuccess()
        } catch (error) {
            console.error('Upload failed:', error)
            toast.error('字体上传失败')
        } finally {
            setUploading(false)
        }
    }

    const handleClose = () => {
        setFontFile(null)
        setName('')
        setDescription('')
        setCategoryId('')
        setTags([])
        setIsPublic(false)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>上传字体</DialogTitle>
                    <DialogDescription>
                        支持TTF、OTF、WOFF、WOFF2格式的字体文件
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 文件选择 */}
                    <div className="space-y-2">
                        <Label htmlFor="font-file">字体文件</Label>
                        <Input
                            id="font-file"
                            type="file"
                            accept=".ttf,.otf,.woff,.woff2"
                            onChange={handleFileChange}
                        />
                        {fontFile && (
                            <div className="text-sm text-muted-foreground">
                                已选择: {fontFile.name} ({formatFileSize(fontFile.size)})
                            </div>
                        )}
                    </div>

                    {/* 字体名称 */}
                    <div className="space-y-2">
                        <Label htmlFor="font-name">字体名称</Label>
                        <Input
                            id="font-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="输入字体名称"
                        />
                    </div>

                    {/* 描述 */}
                    <div className="space-y-2">
                        <Label htmlFor="font-description">描述</Label>
                        <Textarea
                            id="font-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="输入字体描述（可选）"
                            rows={3}
                        />
                    </div>

                    {/* 分类 */}
                    <div className="space-y-2">
                        <Label htmlFor="font-category">分类</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger>
                                <SelectValue placeholder="选择分类（可选）" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">无分类</SelectItem>
                                {categories.map(category => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 公开设置 */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is-public"
                            checked={isPublic}
                            onCheckedChange={(checked) => setIsPublic(checked === true)}
                        />
                        <Label htmlFor="is-public">设为公开字体</Label>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={uploading || !fontFile}>
                        {uploading ? '上传中...' : '上传'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// 字体分类管理器
interface FontCategoryManagerProps {
    categories: FontCategory[]
    onCategoriesChange: (categories: FontCategory[]) => void
}

function FontCategoryManager({ categories, onCategoriesChange }: FontCategoryManagerProps) {
    // 这里可以实现分类管理功能
    return null
}

