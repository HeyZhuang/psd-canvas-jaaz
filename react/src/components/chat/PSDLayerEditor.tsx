import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    updatePSDLayer,
    exportPSD,
    type PSDUploadResponse,
    type PSDLayer,
} from '@/api/upload'
import { toast } from 'sonner'
import {
    Eye,
    EyeOff,
    Layers,
    FolderOpen,
    Image as ImageIcon,
    Download,
    Upload,
    X,
} from 'lucide-react'
import { useCanvas } from '@/contexts/canvas'

interface PSDLayerEditorProps {
    psdData: PSDUploadResponse
    isOpen: boolean
    onClose: () => void
    onUpdate: (updatedPsd: PSDUploadResponse) => void
}

export function PSDLayerEditor({ psdData, isOpen, onClose, onUpdate }: PSDLayerEditorProps) {
    const { excalidrawAPI } = useCanvas()
    const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
    const [exporting, setExporting] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const layerFileInputRef = useRef<HTMLInputElement>(null)

    const handleLayerUpdate = useCallback(
        async (layerIndex: number, updates: Partial<PSDLayer>) => {
            if (!psdData) return

            setUpdating(true)
            try {
                // 这里应该调用更新图层的API
                // const updatedPsd = await updatePSDLayer(psdData.file_id, layerIndex, updates)
                // onUpdate(updatedPsd)
                toast.success('图层更新成功')
            } catch (error) {
                console.error('更新图层失败:', error)
                toast.error('更新图层失败')
            } finally {
                setUpdating(false)
            }
        },
        [psdData, onUpdate]
    )

    const handleLayerVisibilityToggle = useCallback(
        (layerIndex: number, visible: boolean) => {
            if (!psdData) return

            const updatedLayers = psdData.layers.map((layer, index) =>
                index === layerIndex ? { ...layer, visible } : layer
            )

            onUpdate({
                ...psdData,
                layers: updatedLayers,
            })

            handleLayerUpdate(layerIndex, { visible })
        },
        [psdData, onUpdate, handleLayerUpdate]
    )

    const handleOpacityChange = useCallback(
        (layerIndex: number, opacity: number) => {
            if (!psdData) return

            const updatedLayers = psdData.layers.map((layer, index) =>
                index === layerIndex ? { ...layer, opacity } : layer
            )

            onUpdate({
                ...psdData,
                layers: updatedLayers,
            })

            handleLayerUpdate(layerIndex, { opacity })
        },
        [psdData, onUpdate, handleLayerUpdate]
    )

    const handleLayerImageUpload = useCallback(
        async (layerIndex: number, file: File) => {
            if (!psdData) return

            setUpdating(true)
            try {
                console.log('🔄 开始上传图层图片...', { layerIndex, fileName: file.name })

                // 1. 上传图片到服务器
                await updatePSDLayer(psdData.file_id, layerIndex, file)

                // 2. 如果有 excalidrawAPI，更新画布上对应的图片
                if (excalidrawAPI) {
                    console.log('🎨 开始更新画布上的图片...')

                    // 将文件转换为 DataURL
                    const dataURL = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve(reader.result as string)
                        reader.onerror = reject
                        reader.readAsDataURL(file)
                    })

                    // 生成新的文件ID
                    const newFileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    console.log('📁 新文件ID:', newFileId)

                    // 添加新图片文件到 Excalidraw
                    excalidrawAPI.addFiles([{
                        id: newFileId,
                        dataURL: dataURL,
                        mimeType: file.type,
                        created: Date.now()
                    }])

                    // 获取当前画布元素
                    const currentElements = excalidrawAPI.getSceneElements()
                    console.log('📋 当前画布元素数量:', currentElements.length)

                    // 打印所有图片元素的信息，用于调试
                    const imageElements = currentElements.filter(el => el.type === 'image')
                    console.log('🖼️ 画布上的图片元素:', imageElements.map(el => ({
                        id: el.id,
                        fileId: el.fileId,
                        customData: el.customData,
                        psdLayerIndex: el.customData?.psdLayerIndex,
                        layerName: el.customData?.layerName
                    })))

                    console.log('🔍 正在查找的图层索引:', layerIndex)

                    // 找到对应图层的图片元素
                    const targetElement = currentElements.find(element =>
                        element.type === 'image' &&
                        element.customData?.psdLayerIndex === layerIndex
                    )

                    if (targetElement) {
                        console.log('🎯 找到目标图片元素:', {
                            id: targetElement.id,
                            fileId: targetElement.fileId,
                            customData: targetElement.customData
                        })

                        // 创建更新后的元素（保持位置、大小等属性，只更新图片）
                        const updatedElement = {
                            ...targetElement,
                            fileId: newFileId,
                            updated: Date.now(),
                            version: (targetElement.version || 0) + 1
                        }

                        // 更新场景
                        const updatedElements = currentElements.map(el =>
                            el.id === targetElement.id ? updatedElement : el
                        )

                        excalidrawAPI.updateScene({
                            elements: updatedElements
                        })

                        console.log('✅ 画布图片已成功更新')
                        toast.success('图层图片已更新到画布')
                    } else {
                        console.warn('⚠️ 未在画布上找到对应的图层元素')
                        toast.success('图层图片更新成功（画布上无对应元素）')
                    }
                } else {
                    console.warn('⚠️ excalidrawAPI 不可用')
                    toast.success('图层图片更新成功')
                }

            } catch (error) {
                console.error('❌ 更新图层图片失败:', error)
                toast.error('更新图层图片失败')
            } finally {
                setUpdating(false)
            }
        },
        [psdData, excalidrawAPI]
    )

    // 处理拖拽进入
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('🎯 拖拽进入')
        setIsDragging(true)
    }, [])

    // 处理拖拽经过（必须阻止默认行为以允许 drop）
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    // 处理拖拽离开（检查是否真的离开容器）
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        // 检查是否离开了拖放容器（而不是移动到子元素）
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX
        const y = e.clientY

        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            console.log('👋 拖拽离开')
            setIsDragging(false)
        }
    }, [])

    // 处理文件拖放
    const handleDrop = useCallback(
        async (e: React.DragEvent, layerIndex: number) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('📦 文件拖放，图层索引:', layerIndex)
            setIsDragging(false)

            // 获取拖放的文件
            const files = e.dataTransfer.files
            console.log('📁 拖放文件数量:', files.length)

            if (files.length === 0) {
                toast.error('未检测到文件')
                return
            }

            const imageFile = files[0]
            console.log('📷 文件信息:', {
                name: imageFile.name,
                type: imageFile.type,
                size: imageFile.size
            })

            // 验证文件类型
            if (!imageFile.type.startsWith('image/')) {
                console.error('❌ 文件类型不是图片:', imageFile.type)
                toast.error('请拖放图片文件')
                return
            }

            // 验证文件大小（限制为10MB）
            const maxSize = 10 * 1024 * 1024
            if (imageFile.size > maxSize) {
                console.error('❌ 文件过大:', imageFile.size)
                toast.error('图片文件不能超过10MB')
                return
            }

            console.log('✅ 开始上传图层图片')
            // 调用上传处理函数
            await handleLayerImageUpload(layerIndex, imageFile)
        },
        [handleLayerImageUpload]
    )

    const handleExport = useCallback(
        async (format: 'png' | 'jpg') => {
            if (!psdData) return

            setExporting(true)
            try {
                const result = await exportPSD(psdData.file_id, format)
                // 创建下载链接
                const link = document.createElement('a')
                link.href = result.url
                link.download = `exported.${format}`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                toast.success(`导出为 ${format.toUpperCase()} 成功`)
            } catch (error) {
                console.error('导出失败:', error)
                toast.error('导出失败')
            } finally {
                setExporting(false)
            }
        },
        [psdData]
    )

    const renderLayerItem = (layer: PSDLayer, index: number) => {
        const isGroup = layer.type === 'group'
        const isSelected = selectedLayer?.index === layer.index

        return (
            <Card
                key={layer.index}
                className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    }`}
                onClick={() => setSelectedLayer(layer)}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {isGroup ? (
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium truncate">{layer.name}</span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {!isGroup && (
                            <Switch
                                checked={layer.visible}
                                onCheckedChange={(checked) => handleLayerVisibilityToggle(index, checked)}
                                size="sm"
                            />
                        )}
                        {layer.visible ? (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                </div>

                {!isGroup && (
                    <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">不透明度</Label>
                            <span className="text-xs text-muted-foreground">{Math.round(layer.opacity * 100)}%</span>
                        </div>
                        <Slider
                            value={[layer.opacity * 100]}
                            onValueChange={([value]) => handleOpacityChange(index, value / 100)}
                            max={100}
                            step={1}
                            className="w-full"
                        />
                    </div>
                )}
            </Card>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        PSD图层编辑器
                    </DialogTitle>
                    <DialogDescription>
                        编辑 {psdData?.width} × {psdData?.height} 像素的PSD文件图层
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* 图层列表 */}
                    <div className="w-80 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">图层列表</h3>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExport('png')}
                                    disabled={exporting}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    导出PNG
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExport('jpg')}
                                    disabled={exporting}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    导出JPG
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="space-y-2">
                                {psdData?.layers.map((layer, index) => renderLayerItem(layer, index))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* 图层详情 */}
                    <div className="flex-1 flex flex-col gap-4">
                        {selectedLayer ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium">图层详情</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedLayer(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <Card className="p-4">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium">图层名称</Label>
                                            <Input value={selectedLayer.name} readOnly className="mt-1" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium">位置</Label>
                                                <div className="flex gap-2 mt-1">
                                                    <Input
                                                        value={selectedLayer.left}
                                                        readOnly
                                                        className="text-xs"
                                                        placeholder="X"
                                                    />
                                                    <Input
                                                        value={selectedLayer.top}
                                                        readOnly
                                                        className="text-xs"
                                                        placeholder="Y"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">尺寸</Label>
                                                <div className="flex gap-2 mt-1">
                                                    <Input
                                                        value={selectedLayer.width}
                                                        readOnly
                                                        className="text-xs"
                                                        placeholder="宽"
                                                    />
                                                    <Input
                                                        value={selectedLayer.height}
                                                        readOnly
                                                        className="text-xs"
                                                        placeholder="高"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-sm font-medium">混合模式</Label>
                                            <Input value={selectedLayer.blend_mode} readOnly className="mt-1" />
                                        </div>

                                        {selectedLayer.image_url && (
                                            <div>
                                                <Label className="text-sm font-medium">图层预览</Label>
                                                <div
                                                    className={`mt-2 border-2 rounded-md p-4 transition-all ${
                                                        isDragging
                                                            ? 'border-primary border-dashed bg-primary/5'
                                                            : 'border-border'
                                                    }`}
                                                    onDragEnter={handleDragEnter}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, selectedLayer.index)}
                                                >
                                                    {isDragging ? (
                                                        <div className="flex flex-col items-center justify-center py-8 text-primary">
                                                            <Upload className="h-8 w-8 mb-2" />
                                                            <p className="text-sm font-medium">拖放图片到此处替换</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <img
                                                                src={selectedLayer.image_url}
                                                                alt={selectedLayer.name}
                                                                className="max-w-full max-h-32 object-contain mx-auto"
                                                            />
                                                            <p className="text-xs text-muted-foreground text-center mt-2">
                                                                拖放图片到此处或点击下方按钮更新
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-2">
                                                    <input
                                                        ref={layerFileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) {
                                                                handleLayerImageUpload(selectedLayer.index, file)
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => layerFileInputRef.current?.click()}
                                                        disabled={updating}
                                                    >
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        更新图层图片
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                选择一个图层来查看详情
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

