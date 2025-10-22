import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Layers,
    Settings,
    Eye,
    EyeOff,
    Pin,
    PinOff,
    Maximize2,
    Minimize2,
    X,
    RefreshCw,
    Save,
    RotateCcw,
    HelpCircle,
    Info,
} from 'lucide-react'
import { FloatingTemplateToolbar } from './FloatingTemplateToolbar'
import { BottomTemplateToolbar } from './BottomTemplateToolbar'
import { TemplateManager } from './TemplateManager'

interface TemplateToolbarManagerProps {
    currentCanvasId?: string
    onApplyTemplate?: (template: any) => void
}

export function TemplateToolbarManager({
    currentCanvasId,
    onApplyTemplate
}: TemplateToolbarManagerProps) {
    const { t } = useTranslation()

    // 状态管理
    const [showFloatingToolbar, setShowFloatingToolbar] = useState(false)
    const [showBottomToolbar, setShowBottomToolbar] = useState(false)
    const [showTemplateManager, setShowTemplateManager] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

    // 设置状态
    const [settings, setSettings] = useState({
        autoShowFloating: false,
        autoShowBottom: false,
        rememberPosition: true,
        showTooltips: true,
        compactMode: false,
        defaultTab: 'recent' as 'recent' | 'favorites' | 'categories',
    })

    // 加载设置
    useEffect(() => {
        const savedSettings = localStorage.getItem('template-toolbar-settings')
        if (savedSettings) {
            try {
                setSettings(JSON.parse(savedSettings))
            } catch (error) {
                console.error('Failed to load settings:', error)
            }
        }
    }, [])

    // 保存设置
    const saveSettings = useCallback((newSettings: typeof settings) => {
        setSettings(newSettings)
        localStorage.setItem('template-toolbar-settings', JSON.stringify(newSettings))
        toast.success('设置已保存')
    }, [])

    // 重置设置
    const resetSettings = useCallback(() => {
        const defaultSettings = {
            autoShowFloating: false,
            autoShowBottom: false,
            rememberPosition: true,
            showTooltips: true,
            compactMode: false,
            defaultTab: 'recent' as 'recent' | 'favorites' | 'categories',
        }
        setSettings(defaultSettings)
        localStorage.setItem('template-toolbar-settings', JSON.stringify(defaultSettings))
        toast.success('设置已重置')
    }, [])

    // 自动显示工具栏
    useEffect(() => {
        if (settings.autoShowFloating && currentCanvasId) {
            setShowFloatingToolbar(true)
        }
        if (settings.autoShowBottom && currentCanvasId) {
            setShowBottomToolbar(true)
        }
    }, [currentCanvasId, settings.autoShowFloating, settings.autoShowBottom])

    return (
        <>
            {/* 主工具栏按钮 */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
                <Card className="shadow-lg">
                    <CardContent className="p-2">
                        <div className="flex items-center gap-2">
                            <Button
                                variant={showFloatingToolbar ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowFloatingToolbar(!showFloatingToolbar)}
                            >
                                <Layers className="h-4 w-4 mr-1" />
                                浮动
                            </Button>

                            <Button
                                variant={showBottomToolbar ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowBottomToolbar(!showBottomToolbar)}
                            >
                                <Layers className="h-4 w-4 mr-1" />
                                左侧
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTemplateManager(true)}
                            >
                                <Maximize2 className="h-4 w-4 mr-1" />
                                管理
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSettings(true)}
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 浮动工具栏 */}
            <FloatingTemplateToolbar
                isVisible={showFloatingToolbar}
                onToggleVisibility={() => setShowFloatingToolbar(false)}
            />

            {/* 底部工具栏 */}
            <BottomTemplateToolbar
                isVisible={showBottomToolbar}
                onToggleVisibility={() => setShowBottomToolbar(false)}
                onOpenTemplateManager={() => setShowTemplateManager(true)}
            />

            {/* 模板管理器 */}
            <TemplateManager
                isOpen={showTemplateManager}
                onClose={() => setShowTemplateManager(false)}
                onApplyTemplate={onApplyTemplate}
                currentCanvasId={currentCanvasId}
                onSuccess={() => {
                    // 刷新工具栏数据
                    toast.success('模板操作成功')
                }}
            />

            {/* 设置对话框 */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <Card className="w-96 max-h-[80vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    模板工具栏设置
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowSettings(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* 显示设置 */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">显示设置</h3>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="auto-show-floating" className="text-sm">
                                        自动显示浮动工具栏
                                    </Label>
                                    <Switch
                                        id="auto-show-floating"
                                        checked={settings.autoShowFloating}
                                        onCheckedChange={(checked) =>
                                            saveSettings({ ...settings, autoShowFloating: checked })
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="auto-show-bottom" className="text-sm">
                                        自动显示左侧工具栏
                                    </Label>
                                    <Switch
                                        id="auto-show-bottom"
                                        checked={settings.autoShowBottom}
                                        onCheckedChange={(checked) =>
                                            saveSettings({ ...settings, autoShowBottom: checked })
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show-tooltips" className="text-sm">
                                        显示工具提示
                                    </Label>
                                    <Switch
                                        id="show-tooltips"
                                        checked={settings.showTooltips}
                                        onCheckedChange={(checked) =>
                                            saveSettings({ ...settings, showTooltips: checked })
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="compact-mode" className="text-sm">
                                        紧凑模式
                                    </Label>
                                    <Switch
                                        id="compact-mode"
                                        checked={settings.compactMode}
                                        onCheckedChange={(checked) =>
                                            saveSettings({ ...settings, compactMode: checked })
                                        }
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* 行为设置 */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">行为设置</h3>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="remember-position" className="text-sm">
                                        记住位置
                                    </Label>
                                    <Switch
                                        id="remember-position"
                                        checked={settings.rememberPosition}
                                        onCheckedChange={(checked) =>
                                            saveSettings({ ...settings, rememberPosition: checked })
                                        }
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* 操作按钮 */}
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={resetSettings}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    重置
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            toast.info('帮助文档开发中')
                                        }}
                                    >
                                        <HelpCircle className="h-4 w-4 mr-1" />
                                        帮助
                                    </Button>

                                    <Button
                                        size="sm"
                                        onClick={() => setShowSettings(false)}
                                    >
                                        <Save className="h-4 w-4 mr-1" />
                                        保存
                                    </Button>
                                </div>
                            </div>

                            {/* 信息 */}
                            <div className="bg-muted/50 p-3 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div className="text-xs text-muted-foreground">
                                        <p>• 浮动工具栏可以拖拽移动位置</p>
                                        <p>• 底部工具栏固定在屏幕底部</p>
                                        <p>• 设置会自动保存到本地存储</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    )
}

