import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import {
    FontCategory,
    FontItemCreate,
    uploadFont,
    formatFileSize,
} from '@/api/font'

interface FontUploadDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    categories: FontCategory[]
}

export function FontUploadDialog({ isOpen, onClose, onSuccess, categories }: FontUploadDialogProps) {
    const [fontFile, setFontFile] = useState<File | null>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [categoryId, setCategoryId] = useState('none')
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
                category_id: categoryId === 'none' ? undefined : categoryId,
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
        setCategoryId('none')
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
                                <SelectItem value="none">无分类</SelectItem>
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

