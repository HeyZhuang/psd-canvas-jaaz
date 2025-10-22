import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Star,
    Bookmark,
    Layers,
    Image as ImageIcon,
    Type,
    FolderOpen,
    Palette,
    Plus,
    Download,
    Settings,
    Pin,
    PinOff,
    Maximize2,
    Minimize2,
} from 'lucide-react'
import { TemplateManager } from './TemplateManager'
import { TemplateToolbarManager } from './TemplateToolbarManager'
import { TemplateItem } from '@/types/types'
import { getTemplates, incrementTemplateUsage } from '@/api/template'
import { useCanvas } from '@/contexts/canvas'

interface TemplateButtonProps {
    onApplyTemplate?: (template: TemplateItem) => void
    className?: string
}

export function TemplateButton({ onApplyTemplate, className }: TemplateButtonProps) {
    const { t } = useTranslation()
    const { canvasId: currentCanvasId } = useCanvas()
    const [showTemplateManager, setShowTemplateManager] = useState(false)
    const [showToolbarManager, setShowToolbarManager] = useState(false)
    const [recentTemplates, setRecentTemplates] = useState<TemplateItem[]>([])

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

    // 加载最近使用的模板
    const loadRecentTemplates = async () => {
        try {
            const templates = await getTemplates({ is_favorite: true })
            setRecentTemplates(templates.slice(0, 5)) // 只显示前5个
        } catch (error) {
            console.error('Failed to load recent templates:', error)
        }
    }

    // 应用模板
    const handleApplyTemplate = async (template: TemplateItem) => {
        try {
            await incrementTemplateUsage(template.id)
            onApplyTemplate?.(template)
            toast.success(`模板 "${template.name}" 已应用`)
        } catch (error) {
            console.error('Failed to apply template:', error)
            toast.error('应用模板失败')
        }
    }

    // 初始化加载
    useEffect(() => {
        loadRecentTemplates()
    }, [])

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={className}>
                        <Star className="h-4 w-4 mr-2" />
                        模板
                        <Badge variant="secondary" className="ml-2 text-xs">
                            {recentTemplates.length}
                        </Badge>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem onClick={() => setShowTemplateManager(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        管理模板
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setShowToolbarManager(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        工具栏设置
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {recentTemplates.length > 0 ? (
                        recentTemplates.map((template) => (
                            <DropdownMenuItem
                                key={template.id}
                                onClick={() => handleApplyTemplate(template)}
                                className="flex items-center gap-2"
                            >
                                {getTypeIcon(template.type)}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{template.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {getTypeLabel(template.type)}
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    {template.usage_count}
                                </Badge>
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <DropdownMenuItem disabled>
                            <div className="text-center py-2">
                                <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">暂无收藏模板</p>
                                <p className="text-xs text-muted-foreground">点击"管理模板"开始创建</p>
                            </div>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* 模板管理器 */}
            <TemplateManager
                isOpen={showTemplateManager}
                onClose={() => setShowTemplateManager(false)}
                onApplyTemplate={handleApplyTemplate}
                currentCanvasId={currentCanvasId}
                onSuccess={() => {
                    loadRecentTemplates() // 刷新最近模板
                }}
            />

            {/* 工具栏管理器 */}
            {showToolbarManager && (
                <TemplateToolbarManager
                    currentCanvasId={currentCanvasId}
                    onApplyTemplate={handleApplyTemplate}
                />
            )}
        </>
    )
}
