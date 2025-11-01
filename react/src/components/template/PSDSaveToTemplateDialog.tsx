import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Save,
    Image as ImageIcon,
    Layers,
    Tag,
    FolderOpen,
    Star,
    Eye,
    X,
    Download,
    Upload,
} from 'lucide-react'
import { TemplateCategory, TemplateUploadData } from '@/types/types'
import { createTemplate } from '@/api/template'
import type { PSDUploadResponse } from '@/api/upload'

interface PSDSaveToTemplateDialogProps {
    isOpen: boolean
    onClose: () => void
    psdData: PSDUploadResponse | null
    categories: TemplateCategory[]
    onSuccess?: () => void
}

export function PSDSaveToTemplateDialog({
    isOpen,
    onClose,
    psdData,
    categories,
    onSuccess
}: PSDSaveToTemplateDialogProps) {
    const { t } = useTranslation()

    // 表单状态
    const [templateName, setTemplateName] = useState('')
    const [templateDescription, setTemplateDescription] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [tags, setTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState('')
    const [isPublic, setIsPublic] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const [saving, setSaving] = useState(false)

    // 初始化表单数据
    React.useEffect(() => {
        if (psdData && isOpen) {
            // 使用PSD文件名作为默认模板名
            const defaultName = psdData.original_filename?.replace('.psd', '') || 'PSD模板'
            setTemplateName(defaultName)
            setTemplateDescription(`包含 ${psdData.layers?.length || 0} 个图层的PSD模板`)

            // 设置默认分类
            if (categories.length > 0 && !selectedCategory) {
                setSelectedCategory(categories[0].id)
            }
        }
    }, [psdData, isOpen, categories, selectedCategory])

    // 添加标签
    const handleAddTag = useCallback(() => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags(prev => [...prev, newTag.trim()])
            setNewTag('')
        }
    }, [newTag, tags])

    // 删除标签
    const handleRemoveTag = useCallback((tagToRemove: string) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove))
    }, [])

    // 保存模板
    const handleSaveTemplate = useCallback(async () => {
        if (!psdData || !templateName.trim()) {
            toast.error('请填写模板名称')
            return
        }

        if (!selectedCategory) {
            toast.error('请选择模板分类')
            return
        }

        setSaving(true)
        try {
            const templateData: TemplateUploadData = {
                name: templateName.trim(),
                description: templateDescription.trim(),
                type: 'psd_file',
                category_id: selectedCategory,
                tags: tags,
                is_public: isPublic,
                metadata: {
                    psd_file_id: psdData.file_id,
                    width: psdData.width,
                    height: psdData.height,
                    layers_count: psdData.layers?.length || 0,
                    original_filename: psdData.original_filename,
                    layers_info: psdData.layers,
                    created_from: 'psd_upload'
                }
            }

            await createTemplate(templateData)
            toast.success('PSD模板保存成功！')
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error('保存模板失败:', error)
            toast.error('保存模板失败，请重试')
        } finally {
            setSaving(false)
        }
    }, [psdData, templateName, templateDescription, selectedCategory, tags, isPublic, isFavorite, onSuccess, onClose])

    // 重置表单
    const handleClose = useCallback(() => {
        setTemplateName('')
        setTemplateDescription('')
        setSelectedCategory('')
        setTags([])
        setNewTag('')
        setIsPublic(false)
        setIsFavorite(false)
        onClose()
    }, [onClose])

    if (!psdData) return null

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl h-[80vh] p-0">
                <DialogHeader className="p-6 pb-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <Save className="h-6 w-6" />
                                保存PSD为模板
                            </DialogTitle>
                            <DialogDescription>
                                将PSD文件保存为可重复使用的设计模板
                            </DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* 左侧：预览区域 */}
                    <div className="w-1/2 border-r bg-muted/20 p-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <Eye className="h-5 w-5" />
                                    预览
                                </h3>

                                {/* PSD合成图预览 */}
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3">
                                            {psdData.thumbnail_url ? (
                                                <img
                                                    src={psdData.thumbnail_url}
                                                    alt="PSD预览"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <ImageIcon className="h-12 w-12" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            <div className="flex justify-between">
                                                <span>尺寸:</span>
                                                <span>{psdData.width} × {psdData.height}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>图层数:</span>
                                                <span>{psdData.layers?.length || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>文件名:</span>
                                                <span className="truncate max-w-32">{psdData.original_filename}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* 图层信息 */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Layers className="h-4 w-4" />
                                            图层信息
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {psdData.layers?.slice(0, 5).map((layer, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <span className="truncate">{layer.name || `图层 ${layer.index}`}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {layer.visible ? '可见' : '隐藏'}
                                                </Badge>
                                            </div>
                                        ))}
                                        {psdData.layers && psdData.layers.length > 5 && (
                                            <div className="text-xs text-muted-foreground">
                                                还有 {psdData.layers.length - 5} 个图层...
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* 右侧：表单区域 */}
                    <div className="w-1/2 p-6">
                        <div className="space-y-6">
                            {/* 基本信息 */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">基本信息</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="template-name">模板名称 *</Label>
                                    <Input
                                        id="template-name"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="请输入模板名称"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="template-description">描述</Label>
                                    <Textarea
                                        id="template-description"
                                        value={templateDescription}
                                        onChange={(e) => setTemplateDescription(e.target.value)}
                                        placeholder="请输入模板描述"
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="template-category">分类 *</Label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择分类" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(category => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    <div className="flex items-center gap-2">
                                                        <FolderOpen className="h-4 w-4" />
                                                        {category.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            {/* 标签 */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">标签</h3>

                                <div className="flex gap-2">
                                    <Input
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="添加标签"
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                    />
                                    <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                                        <Tag className="h-4 w-4" />
                                    </Button>
                                </div>

                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="ml-1 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* 选项 */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">选项</h3>

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="is-public"
                                            checked={isPublic}
                                            onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                                        />
                                        <Label htmlFor="is-public">设为公开模板</Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="is-favorite"
                                            checked={isFavorite}
                                            onCheckedChange={(checked) => setIsFavorite(checked as boolean)}
                                        />
                                        <Label htmlFor="is-favorite">添加到收藏夹</Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 底部操作栏 */}
                <div className="border-t bg-background p-6">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            保存后可在模板管理中查看和使用此模板
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={handleClose}>
                                取消
                            </Button>
                            <Button onClick={handleSaveTemplate} disabled={saving}>
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                        保存中...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-1" />
                                        保存模板
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}