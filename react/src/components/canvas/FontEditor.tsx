import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Save, Upload } from 'lucide-react'
import { updateLayerProperties, type PSDLayer } from '@/api/upload'
import { FontManager } from '@/components/font/FontManager'
import { getFonts, type FontItem } from '@/api/font'

interface FontEditorProps {
    layer: PSDLayer
    onUpdate: (layerIndex: number, properties: Record<string, any>) => void
}

export function FontEditor({ layer, onUpdate }: FontEditorProps) {
    const { t } = useTranslation()
    const [fontFamily, setFontFamily] = useState(layer.font_family || 'Arial')
    const [fontSize, setFontSize] = useState(layer.font_size || 16)
    const [fontWeight, setFontWeight] = useState(layer.font_weight || 'normal')
    const [fontStyle, setFontStyle] = useState(layer.font_style || 'normal')
    const [textAlign, setTextAlign] = useState(layer.text_align || 'left')
    const [textColor, setTextColor] = useState(layer.text_color || '#000000')
    const [textContent, setTextContent] = useState(layer.text_content || '')
    const [lineHeight, setLineHeight] = useState(layer.line_height || 1.2)
    const [letterSpacing, setLetterSpacing] = useState(layer.letter_spacing || 0)
    const [customFonts, setCustomFonts] = useState<FontItem[]>([])
    const [showFontManager, setShowFontManager] = useState(false)
    const [selectedCustomFont, setSelectedCustomFont] = useState<FontItem | null>(null)

    const commonFonts = [
        'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
        'Tahoma', 'Trebuchet MS', 'Arial Black', 'Impact', 'Comic Sans MS',
        'Courier New', 'Lucida Console', 'Palatino', 'Garamond', 'Bookman',
        'Avant Garde', 'Helvetica Neue', 'Futura', 'Gill Sans', 'Optima'
    ]

    // 加载自定义字体
    useEffect(() => {
        const loadCustomFonts = async () => {
            try {
                const fonts = await getFonts()
                setCustomFonts(fonts)
            } catch (error) {
                console.error('Failed to load custom fonts:', error)
            }
        }
        loadCustomFonts()
    }, [])

    // 处理自定义字体选择
    const handleCustomFontSelect = useCallback((font: FontItem) => {
        setSelectedCustomFont(font)
        setFontFamily(font.font_family)

        // 动态加载字体
        const fontFace = new FontFace(font.font_family, `url(${font.font_file_url})`)
        fontFace.load().then(() => {
            document.fonts.add(fontFace)
            toast.success(`字体 ${font.name} 已加载`)
        }).catch((error) => {
            console.error('Failed to load font:', error)
            toast.error('字体加载失败')
        })

        setShowFontManager(false)
    }, [])

    const handleUpdate = useCallback(() => {
        const properties = {
            font_family: fontFamily,
            font_size: fontSize,
            font_weight: fontWeight,
            font_style: fontStyle,
            text_align: textAlign,
            text_color: textColor,
            text_content: textContent,
            line_height: lineHeight,
            letter_spacing: letterSpacing,
        }

        onUpdate(layer.index, properties)
        toast.success('字體屬性已更新')
    }, [layer.index, fontFamily, fontSize, fontWeight, fontStyle, textAlign, textColor, textContent, lineHeight, letterSpacing, onUpdate])

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        字體編輯
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 文字內容 */}
                    <div className="space-y-2">
                        <Label htmlFor="text-content">文字內容</Label>
                        <Input
                            id="text-content"
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder="輸入文字內容..."
                        />
                    </div>

                    {/* 字體選擇 */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="font-family">字體</Label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFontManager(true)}
                            >
                                <Upload className="h-4 w-4 mr-1" />
                                管理字體
                            </Button>
                        </div>
                        <Select value={fontFamily} onValueChange={setFontFamily}>
                            <SelectTrigger>
                                <SelectValue placeholder="選擇字體" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* 系統字體 */}
                                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">系統字體</div>
                                {commonFonts.map((font) => (
                                    <SelectItem key={font} value={font}>
                                        <span style={{ fontFamily: font }}>{font}</span>
                                    </SelectItem>
                                ))}

                                {/* 自定義字體 */}
                                {customFonts.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">自定義字體</div>
                                        {customFonts.map((font) => (
                                            <SelectItem key={font.id} value={font.font_family}>
                                                <div className="flex items-center gap-2">
                                                    <span style={{ fontFamily: font.font_family }}>{font.name}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {font.font_format.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>

                        {/* 當前選中的自定義字體信息 */}
                        {selectedCustomFont && (
                            <div className="p-2 bg-muted/50 rounded text-sm">
                                <div className="flex items-center gap-2">
                                    <Type className="h-4 w-4" />
                                    <span className="font-medium">{selectedCustomFont.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                        {selectedCustomFont.font_format.toUpperCase()}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {selectedCustomFont.description || '無描述'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 字體大小 */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="font-size">字體大小</Label>
                            <span className="text-sm text-muted-foreground">{fontSize}px</span>
                        </div>
                        <Slider
                            value={[fontSize]}
                            onValueChange={([value]) => setFontSize(value)}
                            min={8}
                            max={200}
                            step={1}
                            className="w-full"
                        />
                    </div>

                    {/* 字體樣式 */}
                    <div className="space-y-2">
                        <Label>字體樣式</Label>
                        <div className="flex gap-2">
                            <Button
                                variant={fontWeight === 'bold' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                            >
                                <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={fontStyle === 'italic' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                            >
                                <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={layer.text_decoration === 'underline' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onUpdate(layer.index, {
                                    text_decoration: layer.text_decoration === 'underline' ? 'none' : 'underline'
                                })}
                            >
                                <Underline className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* 文字對齊 */}
                    <div className="space-y-2">
                        <Label>文字對齊</Label>
                        <div className="flex gap-2">
                            <Button
                                variant={textAlign === 'left' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTextAlign('left')}
                            >
                                <AlignLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={textAlign === 'center' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTextAlign('center')}
                            >
                                <AlignCenter className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={textAlign === 'right' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTextAlign('right')}
                            >
                                <AlignRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* 文字顏色 */}
                    <div className="space-y-2">
                        <Label htmlFor="text-color">文字顏色</Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={textColor}
                                onChange={(e) => setTextColor(e.target.value)}
                                className="w-8 h-8 rounded border"
                            />
                            <Input
                                value={textColor}
                                onChange={(e) => setTextColor(e.target.value)}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    {/* 行高 */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="line-height">行高</Label>
                            <span className="text-sm text-muted-foreground">{lineHeight}</span>
                        </div>
                        <Slider
                            value={[lineHeight]}
                            onValueChange={([value]) => setLineHeight(value)}
                            min={0.5}
                            max={3}
                            step={0.1}
                            className="w-full"
                        />
                    </div>

                    {/* 字間距 */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="letter-spacing">字間距</Label>
                            <span className="text-sm text-muted-foreground">{letterSpacing}px</span>
                        </div>
                        <Slider
                            value={[letterSpacing]}
                            onValueChange={([value]) => setLetterSpacing(value)}
                            min={-2}
                            max={10}
                            step={0.1}
                            className="w-full"
                        />
                    </div>

                    <Separator />

                    {/* 預覽 */}
                    <div className="space-y-2">
                        <Label>預覽</Label>
                        <div className="p-4 border rounded-lg bg-muted/20">
                            <div
                                style={{
                                    fontFamily: fontFamily,
                                    fontSize: `${fontSize}px`,
                                    fontWeight: fontWeight,
                                    fontStyle: fontStyle,
                                    textAlign: textAlign as any,
                                    color: textColor,
                                    lineHeight: lineHeight,
                                    letterSpacing: `${letterSpacing}px`,
                                    textDecoration: layer.text_decoration || 'none',
                                }}
                            >
                                {textContent || '預覽文字'}
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleUpdate} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        更新字體屬性
                    </Button>
                </CardContent>
            </Card>

            {/* 字體管理器對話框 */}
            <FontManager
                isOpen={showFontManager}
                onClose={() => setShowFontManager(false)}
                onSelectFont={handleCustomFontSelect}
                onSuccess={() => {
                    // 重新加載自定義字體
                    const loadCustomFonts = async () => {
                        try {
                            const fonts = await getFonts()
                            setCustomFonts(fonts)
                        } catch (error) {
                            console.error('Failed to load custom fonts:', error)
                        }
                    }
                    loadCustomFonts()
                }}
            />
        </>
    )
}
