import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Upload,
    Image as ImageIcon,
    Type,
    Layers,
    FolderOpen,
    Palette,
    X,
    Plus,
    Tag,
    Eye,
    EyeOff,
    FileImage,
    FileText,
    Folder,
    Brush,
} from 'lucide-react'
import { TemplateCategory, TemplateUploadData } from '@/types/types'
import { createTemplate, createTemplateFromPSDLayer } from '@/api/template'
import { useCanvas } from '@/contexts/canvas'

interface TemplateUploadDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    categories: TemplateCategory[]
    psdFileId?: string
    layerIndex?: number
}

export function TemplateUploadDialog({
    isOpen,
    onClose,
    onSuccess,
    categories,
    psdFileId,
    layerIndex,
}: TemplateUploadDialogProps) {
    const { t } = useTranslation()
    const { excalidrawAPI } = useCanvas()

    // 表单状态
    const [formData, setFormData] = useState<TemplateUploadData>({
        name: '',
        description: '',
        category_id: '',
        type: 'psd_layer',
        metadata: {},
        tags: [],
        is_public: false,
    })
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [previewFile, setPreviewFile] = useState<File | null>(null)
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
    const [previewPreview, setPreviewPreview] = useState<string | null>(null)
    const [newTag, setNewTag] = useState('')
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'basic' | 'metadata' | 'files'>('basic')

    // 重置表单
    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            description: '',
            category_id: '',
            type: 'psd_layer',
            metadata: {},
            tags: [],
            is_public: false,
        })
        setThumbnailFile(null)
        setPreviewFile(null)
        setThumbnailPreview(null)
        setPreviewPreview(null)
        setNewTag('')
    }, [])

    // 处理文件上传
    const handleFileUpload = useCallback((file: File, type: 'thumbnail' | 'preview') => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const result = e.target?.result as string
            if (type === 'thumbnail') {
                setThumbnailPreview(result)
            } else {
                setPreviewPreview(result)
            }
        }
        reader.readAsDataURL(file)

        if (type === 'thumbnail') {
            setThumbnailFile(file)
        } else {
            setPreviewFile(file)
        }
    }, [])

    // 添加标签
    const handleAddTag = useCallback(() => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }))
            setNewTag('')
        }
    }, [newTag, formData.tags])

    // 删除标签
    const handleRemoveTag = useCallback((tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }))
    }, [])

    // 更新元数据
    const updateMetadata = useCallback((key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            metadata: {
                ...prev.metadata,
                [key]: value
            }
        }))
    }, [])

    // 提交表单
    const handleSubmit = useCallback(async () => {
        if (!formData.name.trim()) {
            toast.error('请输入模板名称')
            return
        }

        if (!formData.category_id) {
            toast.error('请选择分类')
            return
        }

        setLoading(true)
        try {
            const uploadData: TemplateUploadData = {
                ...formData,
                thumbnail_file: thumbnailFile || undefined,
                preview_file: previewFile || undefined,
            }

            let result
            if (psdFileId && layerIndex !== undefined) {
                // 从PSD图层创建模板
                result = await createTemplateFromPSDLayer(psdFileId, layerIndex, uploadData)
            } else {
                // 创建普通模板
                result = await createTemplate(uploadData)
            }

            toast.success('模板创建成功')
            resetForm()
            onSuccess()
        } catch (error) {
            console.error('Failed to create template:', error)
            toast.error('创建模板失败')
        } finally {
            setLoading(false)
        }
    }, [formData, thumbnailFile, previewFile, psdFileId, layerIndex, resetForm, onSuccess])

    // 关闭对话框
    const handleClose = useCallback(() => {
        resetForm()
        onClose()
    }, [resetForm, onClose])

    // 获取模板类型图标
    const getTypeIcon = (type: TemplateUploadData['type']) => {
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

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        {psdFileId ? '从PSD图层创建模板' : '创建新模板'}
                    </DialogTitle>
                    <DialogDescription>
                        {psdFileId
                            ? '将当前PSD图层保存为可重复使用的模板'
                            : '上传图片或创建设计模板'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">基本信息</TabsTrigger>
                            <TabsTrigger value="metadata">元数据</TabsTrigger>
                            <TabsTrigger value="files">文件</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto">
                            <TabsContent value="basic" className="space-y-4 mt-4">
                                {/* 模板名称 */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">模板名称 *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="输入模板名称"
                                    />
                                </div>

                                {/* 描述 */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">描述</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="输入模板描述"
                                        rows={3}
                                    />
                                </div>

                                {/* 分类 */}
                                <div className="space-y-2">
                                    <Label htmlFor="category">分类 *</Label>
                                    <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择分类" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(category => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 模板类型 */}
                                <div className="space-y-2">
                                    <Label htmlFor="type">模板类型</Label>
                                    <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择类型" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="psd_file">
                                                <div className="flex items-center gap-2">
                                                    <Layers className="h-4 w-4" />
                                                    PSD文件
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="psd_layer">
                                                <div className="flex items-center gap-2">
                                                    <Layers className="h-4 w-4" />
                                                    PSD图层
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="image">
                                                <div className="flex items-center gap-2">
                                                    <ImageIcon className="h-4 w-4" />
                                                    图片
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="text_style">
                                                <div className="flex items-center gap-2">
                                                    <Type className="h-4 w-4" />
                                                    文字样式
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="layer_group">
                                                <div className="flex items-center gap-2">
                                                    <FolderOpen className="h-4 w-4" />
                                                    图层组
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="canvas_element">
                                                <div className="flex items-center gap-2">
                                                    <Palette className="h-4 w-4" />
                                                    画布元素
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 标签 */}
                                <div className="space-y-2">
                                    <Label>标签</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            placeholder="输入标签"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleAddTag()
                                                }
                                            }}
                                        />
                                        <Button type="button" variant="outline" onClick={handleAddTag}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {formData.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {formData.tags.map((tag, index) => (
                                                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                    {tag}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer"
                                                        onClick={() => handleRemoveTag(tag)}
                                                    />
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 公开设置 */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_public"
                                        checked={formData.is_public}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: !!checked }))}
                                    />
                                    <Label htmlFor="is_public" className="flex items-center gap-2">
                                        {formData.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        公开模板（其他用户可以使用）
                                    </Label>
                                </div>
                            </TabsContent>

                            <TabsContent value="metadata" className="space-y-4 mt-4">
                                {/* 根据模板类型显示不同的元数据字段 */}
                                {formData.type === 'text_style' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="font_family">字体</Label>
                                            <Input
                                                id="font_family"
                                                value={formData.metadata.font_family || ''}
                                                onChange={(e) => updateMetadata('font_family', e.target.value)}
                                                placeholder="输入字体名称"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="font_size">字体大小</Label>
                                                <Input
                                                    id="font_size"
                                                    type="number"
                                                    value={formData.metadata.font_size || ''}
                                                    onChange={(e) => updateMetadata('font_size', parseInt(e.target.value) || 0)}
                                                    placeholder="字体大小"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="font_weight">字体粗细</Label>
                                                <Select
                                                    value={formData.metadata.font_weight || 'normal'}
                                                    onValueChange={(value) => updateMetadata('font_weight', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="normal">正常</SelectItem>
                                                        <SelectItem value="bold">粗体</SelectItem>
                                                        <SelectItem value="lighter">细体</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="text_color">文字颜色</Label>
                                            <Input
                                                id="text_color"
                                                type="color"
                                                value={formData.metadata.text_color || '#000000'}
                                                onChange={(e) => updateMetadata('text_color', e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}

                                {formData.type === 'image' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="image_width">宽度</Label>
                                                <Input
                                                    id="image_width"
                                                    type="number"
                                                    value={formData.metadata.image_width || ''}
                                                    onChange={(e) => updateMetadata('image_width', parseInt(e.target.value) || 0)}
                                                    placeholder="图片宽度"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="image_height">高度</Label>
                                                <Input
                                                    id="image_height"
                                                    type="number"
                                                    value={formData.metadata.image_height || ''}
                                                    onChange={(e) => updateMetadata('image_height', parseInt(e.target.value) || 0)}
                                                    placeholder="图片高度"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* 通用元数据 */}
                                <div className="space-y-2">
                                    <Label>自定义元数据</Label>
                                    <Textarea
                                        placeholder="输入JSON格式的自定义元数据"
                                        rows={4}
                                        value={JSON.stringify(formData.metadata, null, 2)}
                                        onChange={(e) => {
                                            try {
                                                const parsed = JSON.parse(e.target.value)
                                                setFormData(prev => ({ ...prev, metadata: parsed }))
                                            } catch {
                                                // 忽略JSON解析错误
                                            }
                                        }}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="files" className="space-y-4 mt-4">
                                {/* 缩略图上传 */}
                                <div className="space-y-2">
                                    <Label>缩略图</Label>
                                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                                        {thumbnailPreview ? (
                                            <div className="space-y-2">
                                                <img
                                                    src={thumbnailPreview}
                                                    alt="缩略图预览"
                                                    className="w-32 h-32 object-cover mx-auto rounded"
                                                />
                                                <p className="text-sm text-muted-foreground">缩略图预览</p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setThumbnailFile(null)
                                                        setThumbnailPreview(null)
                                                    }}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    移除
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <FileImage className="h-8 w-8 mx-auto text-muted-foreground" />
                                                <div>
                                                    <Label htmlFor="thumbnail" className="cursor-pointer">
                                                        <span className="text-sm font-medium">点击上传缩略图</span>
                                                    </Label>
                                                    <Input
                                                        id="thumbnail"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) handleFileUpload(file, 'thumbnail')
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    建议尺寸: 200x200px
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 预览图上传 */}
                                <div className="space-y-2">
                                    <Label>预览图</Label>
                                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                                        {previewPreview ? (
                                            <div className="space-y-2">
                                                <img
                                                    src={previewPreview}
                                                    alt="预览图预览"
                                                    className="w-48 h-32 object-cover mx-auto rounded"
                                                />
                                                <p className="text-sm text-muted-foreground">预览图预览</p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setPreviewFile(null)
                                                        setPreviewPreview(null)
                                                    }}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    移除
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <FileImage className="h-8 w-8 mx-auto text-muted-foreground" />
                                                <div>
                                                    <Label htmlFor="preview" className="cursor-pointer">
                                                        <span className="text-sm font-medium">点击上传预览图</span>
                                                    </Label>
                                                    <Input
                                                        id="preview"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) handleFileUpload(file, 'preview')
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    建议尺寸: 400x300px
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <Separator />

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? '创建中...' : '创建模板'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
