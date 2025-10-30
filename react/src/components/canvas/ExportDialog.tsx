import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
    Loader2,
    Download,
    FileImage,
    FileType,
    Layers,
    FileCode,
    Check
} from 'lucide-react'
import { PSDUploadResponse } from '@/api/upload'
import { cn } from '@/lib/utils'

interface ExportOptions {
    format: 'png' | 'psd' | 'layered-png' | 'svg'
    quality: 'low' | 'medium' | 'high' | 'original'
    includeHiddenLayers: boolean
    mergeGroups: boolean
    pngOptions?: {
        compression: number
        background: 'transparent' | 'white' | 'custom'
        customBackground?: string
    }
    psdOptions?: {
        compatibility: 'latest' | 'cs6'
        preserveEditability: boolean
    }
    layeredPngOptions?: {
        format: 'zip' | 'folder'
        namingPattern: string
    }
}

interface ExportDialogProps {
    isOpen: boolean
    onClose: () => void
    resizeResult: any
    psdData: PSDUploadResponse
}

export function ExportDialog({
    isOpen,
    onClose,
    resizeResult,
    psdData
}: ExportDialogProps) {
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        format: 'png',
        quality: 'high',
        includeHiddenLayers: false,
        mergeGroups: true,
        pngOptions: {
            compression: 6,
            background: 'transparent'
        },
        psdOptions: {
            compatibility: 'latest',
            preserveEditability: true
        },
        layeredPngOptions: {
            format: 'zip',
            namingPattern: '{layer_name}_{index}.png'
        }
    })

    const [isExporting, setIsExporting] = useState(false)
    const [exportProgress, setExportProgress] = useState(0)

    // 执行导出
    const handleExport = async () => {
        setIsExporting(true)
        setExportProgress(0)

        try {
            const formData = new FormData()
            formData.append('file_id', psdData.file_id)
            formData.append('export_options', JSON.stringify(exportOptions))

            if (resizeResult?.layers) {
                formData.append('resized_layers', JSON.stringify(resizeResult.layers))
            }

            // 模拟进度（实际应使用 XMLHttpRequest）
            const progressInterval = setInterval(() => {
                setExportProgress(prev => Math.min(prev + 10, 90))
            }, 200)

            const response = await fetch('/api/psd/export', {
                method: 'POST',
                body: formData
            })

            clearInterval(progressInterval)

            if (!response.ok) {
                const errorData = await response.json().catch(() => null)
                throw new Error(errorData?.detail || `导出失败: ${response.status}`)
            }

            const result = await response.json()
            setExportProgress(100)

            // 下载文件
            if (result.download_url) {
                window.open(result.download_url, '_blank')
                toast.success('导出成功！文件已开始下载')
                onClose()
            }
        } catch (error: any) {
            console.error('导出失败:', error)
            toast.error('导出失败: ' + (error.message || '未知错误'))
        } finally {
            setIsExporting(false)
            setExportProgress(0)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>导出选项</DialogTitle>
                    <DialogDescription>
                        选择导出格式和相关设置
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 格式选择 */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">导出格式</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <ExportFormatCard
                                value="png"
                                icon={<FileImage className="w-6 h-6" />}
                                title="单张 PNG"
                                description="合并所有图层为一张图片"
                                selected={exportOptions.format === 'png'}
                                onClick={() => setExportOptions(prev => ({ ...prev, format: 'png' }))}
                            />
                            <ExportFormatCard
                                value="psd"
                                icon={<FileType className="w-6 h-6" />}
                                title="PSD 文件"
                                description="保留图层结构和可编辑性"
                                selected={exportOptions.format === 'psd'}
                                onClick={() => setExportOptions(prev => ({ ...prev, format: 'psd' }))}
                            />
                            <ExportFormatCard
                                value="layered-png"
                                icon={<Layers className="w-6 h-6" />}
                                title="分层 PNG"
                                description="每个图层导出为独立 PNG"
                                selected={exportOptions.format === 'layered-png'}
                                onClick={() => setExportOptions(prev => ({ ...prev, format: 'layered-png' }))}
                            />
                            <ExportFormatCard
                                value="svg"
                                icon={<FileCode className="w-6 h-6" />}
                                title="SVG 矢量"
                                description="可缩放的矢量图形"
                                selected={exportOptions.format === 'svg'}
                                disabled
                                onClick={() => { }}
                            />
                        </div>
                    </div>

                    {/* 质量选择 */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">导出质量</Label>
                        <Select
                            value={exportOptions.quality}
                            onValueChange={(value) =>
                                setExportOptions(prev => ({ ...prev, quality: value as any }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">低质量 (快速, 小文件)</SelectItem>
                                <SelectItem value="medium">中等质量</SelectItem>
                                <SelectItem value="high">高质量 (推荐)</SelectItem>
                                <SelectItem value="original">原始质量 (最佳, 大文件)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* PNG 特定选项 */}
                    {exportOptions.format === 'png' && (
                        <PNGExportOptions
                            options={exportOptions.pngOptions}
                            onChange={(pngOptions) =>
                                setExportOptions(prev => ({
                                    ...prev,
                                    pngOptions
                                }))
                            }
                        />
                    )}

                    {/* PSD 特定选项 */}
                    {exportOptions.format === 'psd' && (
                        <PSDExportOptions
                            options={exportOptions.psdOptions}
                            onChange={(psdOptions) =>
                                setExportOptions(prev => ({
                                    ...prev,
                                    psdOptions
                                }))
                            }
                        />
                    )}

                    {/* 分层 PNG 特定选项 */}
                    {exportOptions.format === 'layered-png' && (
                        <LayeredPNGExportOptions
                            options={exportOptions.layeredPngOptions}
                            onChange={(layeredOptions) =>
                                setExportOptions(prev => ({
                                    ...prev,
                                    layeredPngOptions: layeredOptions
                                }))
                            }
                        />
                    )}

                    {/* 通用选项 */}
                    <div className="space-y-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm">包含隐藏图层</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    导出时包含所有隐藏的图层
                                </p>
                            </div>
                            <Switch
                                checked={exportOptions.includeHiddenLayers}
                                onCheckedChange={(checked) =>
                                    setExportOptions(prev => ({ ...prev, includeHiddenLayers: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm">合并图层组</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    将图层组合并为单个图层
                                </p>
                            </div>
                            <Switch
                                checked={exportOptions.mergeGroups}
                                onCheckedChange={(checked) =>
                                    setExportOptions(prev => ({ ...prev, mergeGroups: checked }))
                                }
                            />
                        </div>
                    </div>

                    {/* 导出进度 */}
                    {isExporting && (
                        <div className="space-y-2 pt-3 border-t">
                            <div className="flex justify-between text-sm">
                                <span>导出进度</span>
                                <span>{exportProgress}%</span>
                            </div>
                            <Progress value={exportProgress} />
                            <p className="text-xs text-muted-foreground text-center">
                                {exportProgress < 50
                                    ? '正在准备文件...'
                                    : exportProgress < 90
                                        ? '正在处理图层...'
                                        : '即将完成...'}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isExporting}>
                        取消
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                导出中...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                开始导出
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// 格式卡片组件
function ExportFormatCard({
    value,
    icon,
    title,
    description,
    selected,
    disabled,
    onClick
}: {
    value: string
    icon: React.ReactNode
    title: string
    description: string
    selected?: boolean
    disabled?: boolean
    onClick: () => void
}) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={cn(
                "relative flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all",
                "hover:bg-muted/50",
                selected && "border-primary bg-primary/5",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className={selected ? "text-primary" : "text-muted-foreground"}>
                {icon}
            </div>
            <div className="text-center">
                <div className="font-medium text-sm">{title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
            </div>
            {disabled && (
                <Badge variant="secondary" className="text-xs mt-1">
                    即将推出
                </Badge>
            )}
            {selected && (
                <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
            )}
        </div>
    )
}

// PNG 导出选项
function PNGExportOptions({
    options,
    onChange
}: {
    options?: any
    onChange: (options: any) => void
}) {
    const opts = options || { compression: 6, background: 'transparent' }

    return (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <h4 className="text-sm font-medium">PNG 设置</h4>

            <div className="space-y-2">
                <Label className="text-xs">背景</Label>
                <Select
                    value={opts.background}
                    onValueChange={(value) =>
                        onChange({ ...opts, background: value })
                    }
                >
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="transparent">透明背景</SelectItem>
                        <SelectItem value="white">白色背景</SelectItem>
                        <SelectItem value="custom">自定义颜色</SelectItem>
                    </SelectContent>
                </Select>

                {opts.background === 'custom' && (
                    <Input
                        type="color"
                        value={opts.customBackground || '#FFFFFF'}
                        onChange={(e) =>
                            onChange({ ...opts, customBackground: e.target.value })
                        }
                        className="h-8"
                    />
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-xs">压缩级别</Label>
                    <span className="text-xs text-muted-foreground">{opts.compression}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="9"
                    value={opts.compression}
                    onChange={(e) =>
                        onChange({ ...opts, compression: Number(e.target.value) })
                    }
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>快速</span>
                    <span>高压缩</span>
                </div>
            </div>
        </div>
    )
}

// PSD 导出选项
function PSDExportOptions({
    options,
    onChange
}: {
    options?: any
    onChange: (options: any) => void
}) {
    const opts = options || { compatibility: 'latest', preserveEditability: true }

    return (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <h4 className="text-sm font-medium">PSD 设置</h4>

            <div className="space-y-2">
                <Label className="text-xs">兼容性</Label>
                <Select
                    value={opts.compatibility}
                    onValueChange={(value) =>
                        onChange({ ...opts, compatibility: value })
                    }
                >
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="latest">最新版本 (Photoshop 2023+)</SelectItem>
                        <SelectItem value="cs6">CS6 兼容</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-xs">保留可编辑性</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        保留文字和形状的可编辑能力
                    </p>
                </div>
                <Switch
                    checked={opts.preserveEditability}
                    onCheckedChange={(checked) =>
                        onChange({ ...opts, preserveEditability: checked })
                    }
                />
            </div>
        </div>
    )
}

// 分层 PNG 导出选项
function LayeredPNGExportOptions({
    options,
    onChange
}: {
    options?: any
    onChange: (options: any) => void
}) {
    const opts = options || { format: 'zip', namingPattern: '{layer_name}_{index}.png' }

    return (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <h4 className="text-sm font-medium">分层 PNG 设置</h4>

            <div className="space-y-2">
                <Label className="text-xs">打包方式</Label>
                <Select
                    value={opts.format}
                    onValueChange={(value) =>
                        onChange({ ...opts, format: value })
                    }
                >
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="zip">ZIP 压缩包</SelectItem>
                        <SelectItem value="folder">文件夹</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-xs">文件名格式</Label>
                <Input
                    value={opts.namingPattern}
                    onChange={(e) =>
                        onChange({ ...opts, namingPattern: e.target.value })
                    }
                    placeholder="{layer_name}_{index}.png"
                    className="h-8 text-xs"
                />
                <p className="text-xs text-muted-foreground">
                    可用变量: {'{layer_name}'}, {'{index}'}, {'{type}'}
                </p>
            </div>
        </div>
    )
}

