import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Star,
    Layers,
    Image as ImageIcon,
    Type,
    FolderOpen,
    Palette,
    Plus,
    TrendingUp,
    Clock,
    Heart,
} from 'lucide-react'
import { TemplateManager } from './TemplateManager'
import { TemplateItem } from '@/types/types'
import { getTemplateStats } from '@/api/template'

interface TemplateDashboardProps {
    onApplyTemplate?: (template: TemplateItem) => void
}

export function TemplateDashboard({ onApplyTemplate }: TemplateDashboardProps) {
    const { t } = useTranslation()
    const [showTemplateManager, setShowTemplateManager] = useState(false)
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // 加载统计数据
    React.useEffect(() => {
        const loadStats = async () => {
            try {
                const statsData = await getTemplateStats()
                setStats(statsData)
            } catch (error) {
                console.error('Failed to load template stats:', error)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [])

    // 获取模板类型图标
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'psd_file':
                return <Layers className="h-4 w-4 text-blue-500" />
            case 'psd_layer':
                return <Layers className="h-4 w-4 text-blue-500" />
            case 'image':
                return <ImageIcon className="h-4 w-4 text-green-500" />
            case 'text_style':
                return <Type className="h-4 w-4 text-purple-500" />
            case 'layer_group':
                return <FolderOpen className="h-4 w-4 text-yellow-500" />
            case 'canvas_element':
                return <Palette className="h-4 w-4 text-pink-500" />
            default:
                return <Layers className="h-4 w-4 text-gray-500" />
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2">加载中...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Layers className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats?.total_templates || 0}</div>
                                <div className="text-sm text-muted-foreground">总模板数</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FolderOpen className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats?.total_categories || 0}</div>
                                <div className="text-sm text-muted-foreground">分类数</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Star className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats?.total_collections || 0}</div>
                                <div className="text-sm text-muted-foreground">集合数</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Heart className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {stats?.most_used_templates?.reduce((sum: number, t: any) => sum + t.usage_count, 0) || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">使用次数</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 快速操作 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        模板管理
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2"
                            onClick={() => setShowTemplateManager(true)}
                        >
                            <Plus className="h-6 w-6" />
                            <span>管理模板</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2"
                            onClick={() => {
                                // TODO: 实现快速创建模板功能
                                toast.info('快速创建功能开发中')
                            }}
                        >
                            <Layers className="h-6 w-6" />
                            <span>快速创建</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2"
                            onClick={() => {
                                // TODO: 实现模板导入功能
                                toast.info('导入功能开发中')
                            }}
                        >
                            <ImageIcon className="h-6 w-6" />
                            <span>导入模板</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 热门模板 */}
            {stats?.most_used_templates && stats.most_used_templates.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            热门模板
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.most_used_templates.map((template: any, index: number) => (
                                <div key={template.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                                    <div className="flex-shrink-0">
                                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                                            {index + 1}
                                        </Badge>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{template.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            使用 {template.usage_count} 次
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onApplyTemplate?.(template)}
                                    >
                                        应用
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 最近模板 */}
            {stats?.recent_templates && stats.recent_templates.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            最近创建
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.recent_templates.map((template: any) => (
                                <div key={template.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                                    <div className="flex-shrink-0">
                                        {getTypeIcon('psd_layer')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{template.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {new Date(template.created_at).toLocaleDateString('zh-CN')}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onApplyTemplate?.(template)}
                                    >
                                        应用
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 模板管理器 */}
            <TemplateManager
                isOpen={showTemplateManager}
                onClose={() => setShowTemplateManager(false)}
                onApplyTemplate={onApplyTemplate}
                onSuccess={() => {
                    // 重新加载统计数据
                    const reloadStats = async () => {
                        try {
                            const statsData = await getTemplateStats()
                            setStats(statsData)
                        } catch (error) {
                            console.error('Failed to reload template stats:', error)
                        }
                    }
                    reloadStats()
                }}
            />
        </div>
    )
}
