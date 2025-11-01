import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Search, Grid3X3, List, Eye, EyeOff, X, Save, RotateCcw, Layers } from 'lucide-react'
import { PSDLayer } from '@/api/upload'

interface LayerToolbarProps {
    searchTerm: string
    onSearchChange: (term: string) => void
    filterType: 'all' | 'text' | 'layer' | 'group'
    onFilterChange: (type: 'all' | 'text' | 'layer' | 'group') => void
    viewMode: 'list' | 'grid'
    onViewModeChange: (mode: 'list' | 'grid') => void
    selectedCount: number
    onBatchVisibilityToggle: (visible: boolean) => void
    onClearSelection: () => void
    onExport: (format: 'png' | 'jpg') => void
    onSaveOrder: () => void
    onResetOrder: () => void
    onAddAllLayers: () => void
    updating: boolean
}

export function LayerToolbar({
    searchTerm,
    onSearchChange,
    filterType,
    onFilterChange,
    viewMode,
    onViewModeChange,
    selectedCount,
    onBatchVisibilityToggle,
    onClearSelection,
    onExport,
    onSaveOrder,
    onResetOrder,
    onAddAllLayers,
    updating,
}: LayerToolbarProps) {
    return (
        <div className="space-y-3">
            {/* 主要工具欄 */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">圖層列表</h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onAddAllLayers}
                        disabled={updating}
                    >
                        <Layers className="h-4 w-4 mr-1" />
                        添加所有圖層
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExport('png')}
                        disabled={updating}
                    >
                        <Save className="h-4 w-4 mr-1" />
                        導出 PNG
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExport('jpg')}
                        disabled={updating}
                    >
                        <Save className="h-4 w-4 mr-1" />
                        導出 JPG
                    </Button>
                </div>
            </div>

            {/* 搜索和過濾 */}
            <div className="space-y-2">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索圖層..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="flex gap-2">
                    <Select value={filterType} onValueChange={onFilterChange}>
                        <SelectTrigger className="flex-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">所有圖層</SelectItem>
                            <SelectItem value="text">文字圖層</SelectItem>
                            <SelectItem value="layer">圖像圖層</SelectItem>
                            <SelectItem value="group">群組</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewModeChange(viewMode === 'list' ? 'grid' : 'list')}
                        title={viewMode === 'list' ? '切換到網格視圖' : '切換到列表視圖'}
                    >
                        {viewMode === 'list' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* 批量操作 */}
            {selectedCount > 0 && (
                <Card className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                            已選擇 {selectedCount} 個圖層
                        </span>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onBatchVisibilityToggle(true)}
                                title="顯示選中的圖層"
                            >
                                <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onBatchVisibilityToggle(false)}
                                title="隱藏選中的圖層"
                            >
                                <EyeOff className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onClearSelection}
                                title="清除選擇"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* 圖層順序操作 */}
            <div className="flex gap-2">
                <Button
                    onClick={onSaveOrder}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                >
                    <Save className="h-4 w-4 mr-1" />
                    保存順序
                </Button>
                <Button
                    onClick={onResetOrder}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    重置順序
                </Button>
            </div>
        </div>
    )
}
