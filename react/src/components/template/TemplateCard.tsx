import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
    Star,
    StarOff,
    MoreHorizontal,
    Download,
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
} from 'lucide-react'
import { TemplateItem } from '@/types/types'
import { toast } from 'sonner'

interface TemplateCardProps {
    template: TemplateItem
    viewMode: 'grid' | 'list'
    isSelected: boolean
    onSelect: (selected: boolean) => void
    onToggleFavorite: () => void
    onDelete: () => void
    onApply: () => void
    onEdit: () => void
}

export function TemplateCard({
    template,
    viewMode,
    isSelected,
    onSelect,
    onToggleFavorite,
    onDelete,
    onApply,
    onEdit,
}: TemplateCardProps) {
    const [imageError, setImageError] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)

    // 获取模板类型图标
    const getTypeIcon = (type: TemplateItem['type']) => {
        switch (type) {
            case 'psd_file':
                return <Layers className="h-4 w-4" />
            case 'psd_layer':
                return <Layers className="h-4 w-4" />
            case 'image':
                return <ImageIcon className="h-4 w-4" />
            case 'text_style':
                return <Type className="h-4 w-4" />
            case 'layer_group':
                return <FolderOpen className="h-4 w-4" />
            case 'canvas_element':
                return <Palette className="h-4 w-4" />
            default:
                return <Layers className="h-4 w-4" />
        }
    }

    // 获取模板类型标签
    const getTypeLabel = (type: TemplateItem['type']) => {
        switch (type) {
            case 'psd_file':
                return 'PSD文件'
            case 'psd_layer':
                return 'PSD图层'
            case 'image':
                return '图片'
            case 'text_style':
                return '文字样式'
            case 'layer_group':
                return '图层组'
            case 'canvas_element':
                return '画布元素'
            default:
                return '模板'
        }
    }

    // 格式化日期
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    // 复制模板信息
    const handleCopyInfo = () => {
        let info = `模板名称: ${template.name}\n描述: ${template.description || '无'}\n类型: ${getTypeLabel(template.type)}\n标签: ${template.tags.join(', ')}\n使用次数: ${template.usage_count}`

        // 为PSD文件添加额外信息
        if (template.type === 'psd_file' && template.metadata) {
            const metadata = template.metadata
            info += `\n原始文件名: ${metadata.original_filename || '未知'}\n尺寸: ${metadata.width || 0}x${metadata.height || 0}\n图层数量: ${metadata.layers_count || 0}`
        }

        navigator.clipboard.writeText(info)
        toast.success('模板信息已复制到剪贴板')
    }

    // 获取PSD文件信息
    const getPSDFileInfo = () => {
        if (template.type !== 'psd_file' || !template.metadata) return null

        const metadata = template.metadata
        return {
            originalFilename: metadata.original_filename,
            dimensions: `${metadata.width || 0} × ${metadata.height || 0}`,
            layersCount: metadata.layers_count || 0
        }
    }

    if (viewMode === 'list') {
        return (
            <Card className={`transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        {/* 选择框 */}
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onSelect}
                        />

                        {/* 缩略图 */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                            {template.thumbnail_url && !imageError ? (
                                <>
                                    {imageLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                        </div>
                                    )}
                                    <img
                                        src={template.thumbnail_url}
                                        alt={template.name}
                                        className={`w-full h-full object-contain transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'
                                            }`}
                                        onLoad={() => setImageLoading(false)}
                                        onError={() => {
                                            setImageError(true)
                                            setImageLoading(false)
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        {getTypeIcon(template.type)}
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {template.type === 'psd_file' ? 'PSD文件' :
                                                template.type === 'psd_layer' ? 'PSD图层' :
                                                    template.type === 'image' ? 'IMG' :
                                                        template.type === 'text_style' ? 'TXT' : 'TPL'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 模板信息 */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium truncate">{template.name}</h3>
                                {template.is_favorite && (
                                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                )}
                                <Badge variant="secondary" className="text-xs">
                                    {getTypeLabel(template.type)}
                                </Badge>
                                {template.is_public && (
                                    <Badge variant="outline" className="text-xs">
                                        公开
                                    </Badge>
                                )}
                            </div>

                            {template.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                    {template.description}
                                </p>
                            )}

                            {/* PSD文件特殊信息 */}
                            {template.type === 'psd_file' && (() => {
                                const psdInfo = getPSDFileInfo()
                                return psdInfo ? (
                                    <div className="text-xs text-muted-foreground mb-2 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">原始文件:</span>
                                            <span>{psdInfo.originalFilename}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">尺寸:</span>
                                            <span>{psdInfo.dimensions}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">图层:</span>
                                            <span>{psdInfo.layersCount} 个</span>
                                        </div>
                                    </div>
                                ) : null
                            })()}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    {template.usage_count}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(template.created_at)}
                                </div>
                                {template.tags.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        {template.tags.slice(0, 2).join(', ')}
                                        {template.tags.length > 2 && ` +${template.tags.length - 2}`}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onApply}
                                className="text-green-600 hover:text-green-700"
                            >
                                <Download className="h-4 w-4" />
                                应用
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleFavorite}
                                className={template.is_favorite ? 'text-yellow-500' : ''}
                            >
                                {template.is_favorite ? (
                                    <Star className="h-4 w-4 fill-current" />
                                ) : (
                                    <StarOff className="h-4 w-4" />
                                )}
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={onEdit}>
                                        <Edit3 className="h-4 w-4 mr-2" />
                                        编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleCopyInfo}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        复制信息
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast.info('预览功能开发中')}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        预览
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={onDelete}
                                        className="text-red-600 focus:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        删除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // 网格视图
    return (
        <Card className={`transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-0">
                {/* 缩略图区域 */}
                <div className="relative">
                    <div className="aspect-square rounded-t-lg overflow-hidden bg-muted">
                        {template.thumbnail_url && !imageError ? (
                            <>
                                {imageLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                )}
                                <img
                                    src={template.thumbnail_url}
                                    alt={template.name}
                                    className={`w-full h-full object-contain transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'
                                        }`}
                                    onLoad={() => setImageLoading(false)}
                                    onError={() => {
                                        setImageError(true)
                                        setImageLoading(false)
                                    }}
                                />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                    {getTypeIcon(template.type)}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {template.type === 'psd_file' ? 'PSD文件' :
                                            template.type === 'psd_layer' ? 'PSD图层' :
                                                template.type === 'image' ? '图片' :
                                                    template.type === 'text_style' ? '文字' : '模板'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 选择框 */}
                    <div className="absolute top-2 left-2">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onSelect}
                            className="bg-background/80 backdrop-blur-sm"
                        />
                    </div>

                    {/* 收藏按钮 */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                        onClick={onToggleFavorite}
                    >
                        {template.is_favorite ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        ) : (
                            <StarOff className="h-4 w-4" />
                        )}
                    </Button>

                    {/* 类型标签 */}
                    <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
                            {getTypeLabel(template.type)}
                        </Badge>
                    </div>

                    {/* 使用次数 */}
                    <div className="absolute bottom-2 right-2">
                        <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
                            <Heart className="h-3 w-3 mr-1" />
                            {template.usage_count}
                        </Badge>
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm line-clamp-2 flex-1">{template.name}</h3>
                        {template.is_public && (
                            <Badge variant="outline" className="text-xs ml-2">
                                公开
                            </Badge>
                        )}
                    </div>

                    {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {template.description}
                        </p>
                    )}

                    {/* PSD文件特殊信息 */}
                    {template.type === 'psd_file' && (() => {
                        const psdInfo = getPSDFileInfo()
                        return psdInfo ? (
                            <div className="text-xs text-muted-foreground mb-3 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">尺寸:</span>
                                    <span>{psdInfo.dimensions}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">图层:</span>
                                    <span>{psdInfo.layersCount} 个</span>
                                </div>
                            </div>
                        ) : null
                    })()}

                    {/* 标签 */}
                    {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {template.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {template.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{template.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onApply}
                            className="flex-1 text-xs h-7 text-green-600 hover:text-green-700"
                        >
                            <Download className="h-3 w-3 mr-1" />
                            应用
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleCopyInfo}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    复制信息
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast.info('预览功能开发中')}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    预览
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={onDelete}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* 创建时间 */}
                    <div className="text-xs text-muted-foreground mt-2">
                        {formatDate(template.created_at)}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
