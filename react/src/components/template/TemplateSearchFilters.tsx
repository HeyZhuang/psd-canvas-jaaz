import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
    Filter,
    X,
    Calendar,
    Tag,
    User,
    Star,
    Eye,
    EyeOff,
} from 'lucide-react'
import { TemplateSearchFilters, TemplateCategory } from '@/types/types'

interface TemplateSearchFiltersProps {
    filters: TemplateSearchFilters
    onFiltersChange: (filters: TemplateSearchFilters) => void
    categories: TemplateCategory[]
}

export function TemplateSearchFiltersComponent({
    filters,
    onFiltersChange,
    categories,
}: TemplateSearchFiltersProps) {
    const [tempFilters, setTempFilters] = useState<TemplateSearchFilters>(filters)

    const updateFilter = (key: keyof TemplateSearchFilters, value: any) => {
        const newFilters = { ...tempFilters, [key]: value }
        setTempFilters(newFilters)
        onFiltersChange(newFilters)
    }

    const clearFilters = () => {
        const clearedFilters: TemplateSearchFilters = {}
        setTempFilters(clearedFilters)
        onFiltersChange(clearedFilters)
    }

    const hasActiveFilters = Object.keys(filters).length > 0

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">筛选条件</h3>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        清除筛选
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 分类筛选 */}
                <div className="space-y-2">
                    <Label className="text-xs">分类</Label>
                    <Select
                        value={tempFilters.category_id || 'all'}
                        onValueChange={(value) => updateFilter('category_id', value === 'all' ? undefined : value)}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="选择分类" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">所有分类</SelectItem>
                            {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 类型筛选 */}
                <div className="space-y-2">
                    <Label className="text-xs">类型</Label>
                    <Select
                        value={tempFilters.type || 'all'}
                        onValueChange={(value) => updateFilter('type', value === 'all' ? undefined : value as any)}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">所有类型</SelectItem>
                            <SelectItem value="psd_file">PSD文件</SelectItem>
                            <SelectItem value="psd_layer">PSD图层</SelectItem>
                            <SelectItem value="image">图片</SelectItem>
                            <SelectItem value="text_style">文字样式</SelectItem>
                            <SelectItem value="layer_group">图层组</SelectItem>
                            <SelectItem value="canvas_element">画布元素</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 可见性筛选 */}
                <div className="space-y-2">
                    <Label className="text-xs">可见性</Label>
                    <Select
                        value={tempFilters.is_public === undefined ? 'all' : tempFilters.is_public ? 'public' : 'private'}
                        onValueChange={(value) => {
                            if (value === 'all') {
                                updateFilter('is_public', undefined)
                            } else {
                                updateFilter('is_public', value === 'public')
                            }
                        }}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="选择可见性" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">所有</SelectItem>
                            <SelectItem value="public">公开</SelectItem>
                            <SelectItem value="private">私有</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 快速筛选选项 */}
            <div className="space-y-2">
                <Label className="text-xs">快速筛选</Label>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={tempFilters.is_favorite ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('is_favorite', tempFilters.is_favorite ? undefined : true)}
                        className="h-7"
                    >
                        <Star className="h-3 w-3 mr-1" />
                        收藏
                    </Button>

                    <Button
                        variant={tempFilters.is_public === true ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('is_public', tempFilters.is_public === true ? undefined : true)}
                        className="h-7"
                    >
                        <Eye className="h-3 w-3 mr-1" />
                        公开
                    </Button>

                    <Button
                        variant={tempFilters.is_public === false ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('is_public', tempFilters.is_public === false ? undefined : false)}
                        className="h-7"
                    >
                        <EyeOff className="h-3 w-3 mr-1" />
                        私有
                    </Button>
                </div>
            </div>

            {/* 活跃的筛选条件 */}
            {hasActiveFilters && (
                <div className="space-y-2">
                    <Label className="text-xs">当前筛选条件</Label>
                    <div className="flex flex-wrap gap-1">
                        {tempFilters.category_id && (
                            <Badge variant="secondary" className="text-xs">
                                分类: {categories.find(c => c.id === tempFilters.category_id)?.name}
                                <X
                                    className="h-3 w-3 ml-1 cursor-pointer"
                                    onClick={() => updateFilter('category_id', undefined)}
                                />
                            </Badge>
                        )}
                        {tempFilters.type && (
                            <Badge variant="secondary" className="text-xs">
                                类型: {tempFilters.type}
                                <X
                                    className="h-3 w-3 ml-1 cursor-pointer"
                                    onClick={() => updateFilter('type', undefined)}
                                />
                            </Badge>
                        )}
                        {tempFilters.is_favorite && (
                            <Badge variant="secondary" className="text-xs">
                                收藏
                                <X
                                    className="h-3 w-3 ml-1 cursor-pointer"
                                    onClick={() => updateFilter('is_favorite', undefined)}
                                />
                            </Badge>
                        )}
                        {tempFilters.is_public !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                                {tempFilters.is_public ? '公开' : '私有'}
                                <X
                                    className="h-3 w-3 ml-1 cursor-pointer"
                                    onClick={() => updateFilter('is_public', undefined)}
                                />
                            </Badge>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default TemplateSearchFiltersComponent