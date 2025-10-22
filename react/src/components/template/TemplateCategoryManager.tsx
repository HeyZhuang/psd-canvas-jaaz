import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    FolderOpen,
    Plus,
    Edit3,
    Trash2,
    MoreHorizontal,
    Palette,
    Calendar,
} from 'lucide-react'
import { TemplateCategory } from '@/types/types'
import { createTemplateCategory, updateTemplateCategory, deleteTemplateCategory } from '@/api/template'

interface TemplateCategoryManagerProps {
    categories: TemplateCategory[]
    onCategoriesChange: (categories: TemplateCategory[]) => void
}

export function TemplateCategoryManager({
    categories,
    onCategoriesChange,
}: TemplateCategoryManagerProps) {
    const { t } = useTranslation()
    const [editingCategory, setEditingCategory] = useState<TemplateCategory | null>(null)
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: '',
        icon: '',
        color: '#3b82f6',
    })
    const [loading, setLoading] = useState(false)

    // 创建新分类
    const handleCreateCategory = async () => {
        if (!newCategory.name.trim()) {
            toast.error('请输入分类名称')
            return
        }

        setLoading(true)
        try {
            const category = await createTemplateCategory({
                name: newCategory.name,
                description: newCategory.description,
                icon: newCategory.icon,
                color: newCategory.color,
            })

            onCategoriesChange([...categories, category])
            setNewCategory({ name: '', description: '', icon: '', color: '#3b82f6' })
            toast.success('分类创建成功')
        } catch (error) {
            console.error('Failed to create category:', error)
            toast.error('创建分类失败')
        } finally {
            setLoading(false)
        }
    }

    // 更新分类
    const handleUpdateCategory = async (category: TemplateCategory) => {
        setLoading(true)
        try {
            const updatedCategory = await updateTemplateCategory(category.id, {
                name: category.name,
                description: category.description,
                icon: category.icon,
                color: category.color,
            })

            onCategoriesChange(
                categories.map(c => c.id === category.id ? updatedCategory : c)
            )
            setEditingCategory(null)
            toast.success('分类更新成功')
        } catch (error) {
            console.error('Failed to update category:', error)
            toast.error('更新分类失败')
        } finally {
            setLoading(false)
        }
    }

    // 删除分类
    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm('确定要删除这个分类吗？删除后无法恢复。')) {
            return
        }

        setLoading(true)
        try {
            await deleteTemplateCategory(categoryId)
            onCategoriesChange(categories.filter(c => c.id !== categoryId))
            toast.success('分类删除成功')
        } catch (error) {
            console.error('Failed to delete category:', error)
            toast.error('删除分类失败')
        } finally {
            setLoading(false)
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

    return (
        <div className="space-y-6">
            {/* 创建新分类 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        创建新分类
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">分类名称 *</Label>
                            <Input
                                id="category-name"
                                value={newCategory.name}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="输入分类名称"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category-color">颜色</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="category-color"
                                    type="color"
                                    value={newCategory.color}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                                    className="w-16 h-10"
                                />
                                <Input
                                    value={newCategory.color}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                                    placeholder="#3b82f6"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category-description">描述</Label>
                        <Textarea
                            id="category-description"
                            value={newCategory.description}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="输入分类描述"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category-icon">图标</Label>
                        <Input
                            id="category-icon"
                            value={newCategory.icon}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                            placeholder="输入图标名称或emoji"
                        />
                    </div>

                    <Button
                        onClick={handleCreateCategory}
                        disabled={loading || !newCategory.name.trim()}
                        className="w-full"
                    >
                        {loading ? '创建中...' : '创建分类'}
                    </Button>
                </CardContent>
            </Card>

            {/* 分类列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        分类列表 ({categories.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {categories.length === 0 ? (
                        <div className="text-center py-8">
                            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium">暂无分类</p>
                            <p className="text-muted-foreground">创建您的第一个分类</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {categories.map((category) => (
                                <div key={category.id}>
                                    {editingCategory?.id === category.id ? (
                                        // 编辑模式
                                        <Card className="border-primary">
                                            <CardContent className="p-4">
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">分类名称</Label>
                                                            <Input
                                                                value={editingCategory.name}
                                                                onChange={(e) => setEditingCategory(prev =>
                                                                    prev ? { ...prev, name: e.target.value } : null
                                                                )}
                                                                placeholder="输入分类名称"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">颜色</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="color"
                                                                    value={editingCategory.color || '#3b82f6'}
                                                                    onChange={(e) => setEditingCategory(prev =>
                                                                        prev ? { ...prev, color: e.target.value } : null
                                                                    )}
                                                                    className="w-12 h-8"
                                                                />
                                                                <Input
                                                                    value={editingCategory.color || '#3b82f6'}
                                                                    onChange={(e) => setEditingCategory(prev =>
                                                                        prev ? { ...prev, color: e.target.value } : null
                                                                    )}
                                                                    placeholder="#3b82f6"
                                                                    className="flex-1"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">描述</Label>
                                                        <Textarea
                                                            value={editingCategory.description || ''}
                                                            onChange={(e) => setEditingCategory(prev =>
                                                                prev ? { ...prev, description: e.target.value } : null
                                                            )}
                                                            placeholder="输入分类描述"
                                                            rows={2}
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">图标</Label>
                                                        <Input
                                                            value={editingCategory.icon || ''}
                                                            onChange={(e) => setEditingCategory(prev =>
                                                                prev ? { ...prev, icon: e.target.value } : null
                                                            )}
                                                            placeholder="输入图标名称或emoji"
                                                        />
                                                    </div>

                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setEditingCategory(null)}
                                                        >
                                                            取消
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => editingCategory && handleUpdateCategory(editingCategory)}
                                                            disabled={loading || !editingCategory?.name.trim()}
                                                        >
                                                            {loading ? '保存中...' : '保存'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        // 显示模式
                                        <Card className="hover:shadow-sm transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: category.color || '#3b82f6' }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-medium truncate">{category.name}</h3>
                                                                {category.icon && (
                                                                    <span className="text-lg">{category.icon}</span>
                                                                )}
                                                            </div>
                                                            {category.description && (
                                                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                                    {category.description}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {formatDate(category.created_at)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                                                                <Edit3 className="h-4 w-4 mr-2" />
                                                                编辑
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteCategory(category.id)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                删除
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
