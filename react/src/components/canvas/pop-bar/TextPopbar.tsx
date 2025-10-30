import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCanvas } from '@/contexts/canvas'
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  ChevronDown,
  Palette
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ExcalidrawTextElement } from '@excalidraw/excalidraw/element/types'

interface TextPopbarProps {
  selectedElement: ExcalidrawTextElement
}

export function TextPopbar({ selectedElement }: TextPopbarProps) {
  const { excalidrawAPI } = useCanvas()
  const [selectedFont, setSelectedFont] = useState('Arial')
  const [fontSize, setFontSize] = useState(20)
  const [textColor, setTextColor] = useState('#000000')
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')

  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Courier New', 'Comic Sans MS', 'Impact', 'Cascadia', 'Virgil'
  ]

  const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96]

  // 从选中元素同步状态
  useEffect(() => {
    if (selectedElement) {
      setFontSize(selectedElement.fontSize || 20)
      // 映射字体族索引到名称
      const fontFamilyNames: Record<number, string> = {
        1: 'Virgil',
        2: 'Helvetica',
        3: 'Cascadia'
      }
      setSelectedFont(fontFamilyNames[selectedElement.fontFamily] || 'Virgil')
      setTextColor(selectedElement.strokeColor || '#000000')
      const align = selectedElement.textAlign as 'left' | 'center' | 'right'
      setTextAlign(align || 'left')
    }
  }, [selectedElement])

  // 更新文字属性
  const updateTextElement = useCallback((updates: Partial<ExcalidrawTextElement>) => {
    if (!excalidrawAPI || !selectedElement) return

    const elements = excalidrawAPI.getSceneElements()
    const updatedElements = elements.map(el => {
      if (el.id === selectedElement.id && el.type === 'text') {
        return { ...el, ...updates } as ExcalidrawTextElement
      }
      return el
    })
    
    excalidrawAPI.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: updatedElements as any
    })
  }, [excalidrawAPI, selectedElement])

  const handleFontChange = (font: string) => {
    setSelectedFont(font)
    // Excalidraw 使用字体族索引：1=Virgil, 2=Helvetica, 3=Cascadia
    const fontFamilyMap: Record<string, number> = {
      'Virgil': 1,
      'Helvetica': 2,
      'Cascadia': 3
    }
    updateTextElement({ fontFamily: fontFamilyMap[font] || 1 })
  }

  const handleSizeChange = (size: number) => {
    setFontSize(size)
    updateTextElement({ fontSize: size })
  }

  const handleColorChange = (color: string) => {
    setTextColor(color)
    updateTextElement({ strokeColor: color })
  }

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align)
    updateTextElement({ textAlign: align })
  }

  return (
    <div className="flex items-center gap-1 bg-primary-foreground/90 backdrop-blur-lg text-foreground px-2 py-1.5 rounded-lg shadow-lg border border-primary/20">
      {/* 字体选择 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-primary/10">
            {selectedFont}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-background border-border">
          {fonts.map((font) => (
            <DropdownMenuItem
              key={font}
              onClick={() => handleFontChange(font)}
              className="hover:bg-primary/10"
              style={{ fontFamily: font }}
            >
              {font}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5" />

      {/* 字号选择 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-primary/10">
            {fontSize}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-background border-border max-h-60 overflow-y-auto">
          {fontSizes.map((size) => (
            <DropdownMenuItem
              key={size}
              onClick={() => handleSizeChange(size)}
              className="hover:bg-primary/10"
            >
              {size}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5" />

      {/* 左对齐 */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-primary/10 ${textAlign === 'left' ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => handleAlignChange('left')}
        title="左对齐"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      {/* 居中对齐 */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-primary/10 ${textAlign === 'center' ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => handleAlignChange('center')}
        title="居中对齐"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      {/* 右对齐 */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-primary/10 ${textAlign === 'right' ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => handleAlignChange('right')}
        title="右对齐"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-5" />

      {/* 文字颜色 */}
      <div className="relative">
        <input
          type="color"
          value={textColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-7 h-7 cursor-pointer"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-primary/10 relative"
          title="文字颜色"
        >
          <Palette className="h-4 w-4" />
          <div 
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
            style={{ backgroundColor: textColor }}
          />
        </Button>
      </div>
    </div>
  )
}
