import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
    Type,
    Search,
    Upload,
    Star,
    StarOff,
    MoreHorizontal,
    ChevronDown,
    Grid3X3,
    List,
    RefreshCw,
    Zap,
} from 'lucide-react'
import {
    FontItem,
    FontCategory,
    getFonts,
    getFontCategories,
    uploadFont,
    toggleFontFavorite,
    importExistingFonts,
    formatFileSize,
} from '@/api/font'
import { FontUploadDialog } from '@/components/font/FontUploadDialog'

interface FontSelectorProps {
    currentFont?: string
    onFontSelect: (font: FontItem | string) => void
    onClose?: () => void
    isOpen?: boolean
}

export function FontSelector({ currentFont, onFontSelect, onClose, isOpen = false }: FontSelectorProps) {
    const [fonts, setFonts] = useState<FontItem[]>([])
    const [categories, setCategories] = useState<FontCategory[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [showUploadDialog, setShowUploadDialog] = useState(false)

    // 常用字体列表
    const commonFonts = [
        'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
        'Tahoma', 'Trebuchet MS', 'Arial Black', 'Impact', 'Comic Sans MS',
        'Courier New', 'Lucida Console', 'Palatino', 'Garamond', 'Bookman',
        'Avant Garde', 'Helvetica Neue', 'Futura', 'Gill Sans', 'Optima'
    ]

    // 加载数据
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [fontsData, categoriesData] = await Promise.all([
                getFonts(),
                getFontCategories(),
            ])
            setFonts(fontsData)
            setCategories(categoriesData)
        } catch (error) {
            console.error('Failed to load font data:', error)
            toast.error('加载字体数据失败')
        } finally {
            setLoading(false)
        }
    }, [])

    // 处理字体选择
    const handleFontSelect = useCallback((font: FontItem | string) => {
        if (typeof font === 'string') {
            // 系统字体
            onFontSelect(font)
            toast.success(`已选择字体: ${font}`)
        } else {
            // 自定义字体
            onFontSelect(font)

            // 动态加载字体
            const fontFace = new FontFace(font.font_family, `url(${font.font_file_url})`)
            fontFace.load().then(() => {
                document.fonts.add(fontFace)
                toast.success(`字体 ${font.name} 已加载`)
            }).catch((error) => {
                console.error('Failed to load font:', error)
                toast.error('字体加载失败')
            })
        }
        onClose?.()
    }, [onFontSelect, onClose])

    // 切换收藏状态
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

    // 筛选字体
    const filteredFonts = fonts.filter(font => {
        const matchesCategory = selectedCategory === 'all' || font.category_id === selectedCategory
        const matchesSearch = !searchQuery ||
            font.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            font.font_family.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    // 初始化加载
    useEffect(() => {
        if (isOpen) {
            loadData()
        }
    }, [isOpen, loadData])

    // 搜索防抖
    useEffect(() => {
        const timer = setTimeout(() => {
            // 搜索逻辑已在 filteredFonts 中处理
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] p-0">
                <DialogHeader className="p-6 pb-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold">选择字体</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                选择系统字体或上传自定义字体
                            </p>
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
                            </div>
                        </ScrollArea>
                    </div>

                    {/* 主内容区 */}
                    <div className="flex-1 flex flex-col">
                        {/* 工具栏 */}
                        <div className="p-4 border-b bg-background">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadData}
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {filteredFonts.length} 个字体
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* 字体列表 */}
                        <ScrollArea className="flex-1 p-4 font-selector-scrollbar" style={{ maxHeight: 'calc(80vh - 200px)' }}>
                            {loading ? (
                                <div className="flex items-center justify-center h-32">
                                    <RefreshCw className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-6 pr-2">
                                    {/* 系统字体 */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">系统字体</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {commonFonts.map((fontName) => (
                                                <Card
                                                    key={fontName}
                                                    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-primary/5"
                                                    onClick={() => handleFontSelect(fontName)}
                                                >
                                                    <CardContent className="p-3">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Type className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-sm font-medium truncate">
                                                                {fontName}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            系统字体
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 自定义字体 */}
                                    {filteredFonts.length > 0 && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h3 className="text-lg font-semibold mb-3">自定义字体</h3>
                                                <div className={
                                                    viewMode === 'grid'
                                                        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
                                                        : 'space-y-2'
                                                }>
                                                    {filteredFonts.map((font) => (
                                                        <FontCard
                                                            key={font.id}
                                                            font={font}
                                                            viewMode={viewMode}
                                                            onSelectFont={() => handleFontSelect(font)}
                                                            onToggleFavorite={() => handleToggleFavorite(font.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {filteredFonts.length === 0 && searchQuery && (
                                        <div className="text-center text-muted-foreground py-8">
                                            没有找到匹配的字体
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>

            {/* 字体上传对话框 */}
            <FontUploadDialog
                isOpen={showUploadDialog}
                onClose={() => setShowUploadDialog(false)}
                onSuccess={() => {
                    setShowUploadDialog(false)
                    loadData()
                }}
                categories={categories}
            />
        </Dialog>
    )
}

// 字体卡片组件
interface FontCardProps {
    font: FontItem
    viewMode: 'grid' | 'list'
    onSelectFont: () => void
    onToggleFavorite: () => void
}

function FontCard({ font, viewMode, onSelectFont, onToggleFavorite }: FontCardProps) {
    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Type className="h-5 w-5 text-muted-foreground" />
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
        <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-primary/5">
            <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Type className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-1">
                        {font.is_favorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleFavorite}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
                <div className="mb-2">
                    <h3 className="font-medium text-sm truncate">{font.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{font.font_family}</p>
                </div>
                <div className="flex items-center justify-between mb-2">
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

