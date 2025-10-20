import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Eye,
    EyeOff,
    Image as ImageIcon,
    FolderOpen,
    Type,
    GripVertical,
    ChevronDown,
    ChevronRight,
    Move,
    MoreHorizontal,
} from 'lucide-react'
import { PSDLayer } from '@/api/upload'

interface LayerItemProps {
    layer: PSDLayer
    isSelected: boolean
    isExpanded: boolean
    onSelect: (checked: boolean) => void
    onExpand: () => void
    onVisibilityToggle: () => void
    onOpacityChange: (opacity: number) => void
    onAddToCanvas: () => void
    onSelectLayer: () => void
    onDragStart: () => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
    isDragging: boolean
}

export function LayerItem({
    layer,
    isSelected,
    isExpanded,
    onSelect,
    onExpand,
    onVisibilityToggle,
    onOpacityChange,
    onAddToCanvas,
    onSelectLayer,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging,
}: LayerItemProps) {
    const getLayerIcon = () => {
        switch (layer.type) {
            case 'group':
                return <FolderOpen className="h-4 w-4 text-muted-foreground" />
            case 'text':
                return <Type className="h-4 w-4 text-muted-foreground" />
            default:
                return <ImageIcon className="h-4 w-4 text-muted-foreground" />
        }
    }

    const getLayerTypeLabel = () => {
        switch (layer.type) {
            case 'group':
                return '群組'
            case 'text':
                return '文字'
            default:
                return '圖層'
        }
    }

    return (
        <Card
            className={`cursor-pointer transition-all duration-200 ${isSelected
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
                } ${isDragging ? 'opacity-50' : ''}`}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
        >
            <CardContent className="p-3">
                <div className="flex items-center gap-2">
                    {/* 選擇框 */}
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onSelect}
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* 拖拽手柄 */}
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                    {/* 展開/收縮按鈕（僅群組） */}
                    {layer.type === 'group' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={(e) => {
                                e.stopPropagation()
                                onExpand()
                            }}
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                            ) : (
                                <ChevronRight className="h-3 w-3" />
                            )}
                        </Button>
                    )}

                    {/* 圖層圖標和名稱 */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getLayerIcon()}
                        <span className="text-sm font-medium truncate">
                            {layer.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                            {getLayerTypeLabel()}
                        </Badge>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex items-center gap-1">
                        {/* 可見性切換 */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                                e.stopPropagation()
                                onVisibilityToggle()
                            }}
                        >
                            {layer.visible ? (
                                <Eye className="h-3 w-3" />
                            ) : (
                                <EyeOff className="h-3 w-3" />
                            )}
                        </Button>

                        {/* 添加到畫布 */}
                        {layer.type === 'layer' && layer.image_url && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onAddToCanvas()
                                }}
                                title="添加到畫布"
                            >
                                <Move className="h-3 w-3" />
                            </Button>
                        )}

                        {/* 更多操作 */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                                e.stopPropagation()
                                onSelectLayer()
                            }}
                            title="查看詳情"
                        >
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* 透明度滑塊 */}
                {layer.type !== 'group' && (
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">
                            透明度: {layer.opacity}%
                        </span>
                        <Slider
                            value={[layer.opacity]}
                            onValueChange={([value]) => onOpacityChange(value)}
                            max={100}
                            min={0}
                            step={1}
                            className="flex-1"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
