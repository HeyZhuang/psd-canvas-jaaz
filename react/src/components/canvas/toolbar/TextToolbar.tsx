import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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

interface TextToolbarProps {
  selectedElement: ExcalidrawTextElement
}

export function TextToolbar({ selectedElement }: TextToolbarProps) {
  const { excalidrawAPI } = useCanvas()
  const [selectedFont, setSelectedFont] = useState('Virgil')
  const [fontSize, setFontSize] = useState(20)
  const [textColor, setTextColor] = useState('#000000')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')
  const [opacity, setOpacity] = useState(100)
  
  // 使用 ref 存储当前选中元素的 ID，避免依赖整个对象
  const selectedElementIdRef = useRef<string>(selectedElement.id)

  const fonts = [
    { name: 'Virgil', value: 1 },
    { name: 'Helvetica', value: 2 },
    { name: 'Cascadia', value: 3 }
  ]

  // 系统字体列表（映射到 Excalidraw 支持的字体）
  const systemFonts = [
    { name: 'Virgil', excalidrawValue: 1, displayName: 'Virgil (手写风格)' },
    { name: 'Helvetica', excalidrawValue: 2, displayName: 'Helvetica (无衬线)' },
    { name: 'Cascadia', excalidrawValue: 3, displayName: 'Cascadia (等宽)' },
    // 以下字体映射到最接近的 Excalidraw 字体
    { name: 'Arial', excalidrawValue: 2, displayName: 'Arial' },
    { name: 'Inter', excalidrawValue: 2, displayName: 'Inter' },
    { name: 'Times New Roman', excalidrawValue: 1, displayName: 'Times New Roman' },
    { name: 'Georgia', excalidrawValue: 1, displayName: 'Georgia' },
    { name: 'Courier New', excalidrawValue: 3, displayName: 'Courier New' },
    { name: 'Verdana', excalidrawValue: 2, displayName: 'Verdana' },
  ]

  const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96]
  const [fontMenuOpen, setFontMenuOpen] = useState(false)

  // 从选中元素同步状态 - 监听元素的所有属性变化
  useEffect(() => {
    if (selectedElement) {
      selectedElementIdRef.current = selectedElement.id
      setFontSize(Math.round(selectedElement.fontSize || 20))
      // 根据 Excalidraw 字体值找到对应的字体名
      const fontFamilyNames: Record<number, string> = {
        1: 'Virgil',
        2: 'Helvetica',
        3: 'Cascadia'
      }
      const fontName = fontFamilyNames[selectedElement.fontFamily] || 'Virgil'
      setSelectedFont(fontName)
      setTextColor(selectedElement.strokeColor || '#000000')
      const align = selectedElement.textAlign as 'left' | 'center' | 'right'
      setTextAlign(align || 'left')
      setOpacity(selectedElement.opacity || 100)
    }
  }, [
    selectedElement?.fontSize,
    selectedElement?.fontFamily,
    selectedElement?.strokeColor,
    selectedElement?.textAlign,
    selectedElement?.opacity
  ])

  // 更新文字属性 - 只依赖 excalidrawAPI，使用 ref 获取元素 ID
  const updateTextElement = useCallback((updates: Partial<ExcalidrawTextElement>) => {
    if (!excalidrawAPI) return

    const elements = excalidrawAPI.getSceneElements()
    const elementIndex = elements.findIndex(el => el.id === selectedElementIdRef.current)
    
    if (elementIndex === -1) return
    
    // 只更新目标元素，避免遍历整个数组
    const updatedElement = {
      ...elements[elementIndex],
      ...updates,
      versionNonce: elements[elementIndex].versionNonce + 1
    }
    
    const updatedElements = [
      ...elements.slice(0, elementIndex),
      updatedElement,
      ...elements.slice(elementIndex + 1)
    ]
    
    excalidrawAPI.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: updatedElements as any
    })
  }, [excalidrawAPI])

  const handleFontChange = (fontName: string, fontValue: number) => {
    setSelectedFont(fontName)
    updateTextElement({ fontFamily: fontValue })
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

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    updateTextElement({ opacity: value })
  }

  return (
    <div className="flex items-center gap-1 bg-[#1e1e1e] text-white px-2 py-1.5 rounded-lg shadow-lg border border-gray-700">
      {/* 字体选择 */}
      <DropdownMenu open={fontMenuOpen} onOpenChange={setFontMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs hover:bg-white/10"
          >
            {selectedFont}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="bg-[#2a2a2a] text-white border-gray-700 w-[400px] p-0"
          align="start"
        >
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-[#1e1e1e]">
              <TabsTrigger 
                value="system" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
              >
                System Fonts
              </TabsTrigger>
              <TabsTrigger 
                value="upload" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
              >
                Upload Font
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="system" className="m-0">
              <ScrollArea className="h-[300px]">
                <div className="p-2">
                  {systemFonts.map((font) => {
                    return (
                      <div
                        key={font.name}
                        onClick={() => {
                          handleFontChange(font.name, font.excalidrawValue)
                          setFontMenuOpen(false)
                        }}
                        className={
                          `px-3 py-2.5 rounded cursor-pointer transition-colors ${
                            selectedFont === font.name
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-white/10 text-white'
                          }`
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span>{font.displayName}</span>
                          {font.excalidrawValue === 1 && (
                            <span className="text-xs text-gray-400 ml-2">手写</span>
                          )}
                          {font.excalidrawValue === 2 && (
                            <span className="text-xs text-gray-400 ml-2">无衬线</span>
                          )}
                          {font.excalidrawValue === 3 && (
                            <span className="text-xs text-gray-400 ml-2">等宽</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="upload" className="m-0">
              <div className="p-6 text-center text-gray-400">
                <p className="text-sm mb-4">字体上传功能</p>
                <Button variant="outline" className="border-gray-600 text-gray-300" disabled>
                  选择字体文件
                </Button>
                <p className="text-xs text-gray-500 mt-2">支持 .ttf, .otf, .woff 格式</p>
              </div>
            </TabsContent>
          </Tabs>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 字号选择 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs hover:bg-white/10"
          >
            {fontSize}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#2a2a2a] text-white border-gray-700 max-h-60 overflow-y-auto">
          {fontSizes.map((size) => (
            <DropdownMenuItem
              key={size}
              onClick={() => handleSizeChange(size)}
              className="hover:bg-white/10 text-white"
            >
              {size}px
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 对齐方式 */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-white/10 ${
          textAlign === 'left' ? 'bg-blue-600' : ''
        }`}
        onClick={() => handleAlignChange('left')}
        title="左对齐"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-white/10 ${
          textAlign === 'center' ? 'bg-blue-600' : ''
        }`}
        onClick={() => handleAlignChange('center')}
        title="居中对齐"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-white/10 ${
          textAlign === 'right' ? 'bg-blue-600' : ''
        }`}
        onClick={() => handleAlignChange('right')}
        title="右对齐"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 透明度 */}
      <div className="flex items-center gap-2">
        <span className="text-xs">透明度</span>
        <div className="w-20">
          <Slider
            value={[opacity]}
            onValueChange={([value]) => handleOpacityChange(value)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        <span className="text-xs w-8">{Math.round(opacity)}%</span>
      </div>

      <Separator orientation="vertical" className="h-5 bg-gray-600" />

      {/* 文字颜色 */}
      <div className="relative group">
        <input
          type="color"
          value={textColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          title="选择文字颜色"
        />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors">
          <div className="relative pointer-events-none">
            <Palette className="h-4 w-4" />
            <div 
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-gray-700"
              style={{ backgroundColor: textColor }}
            />
          </div>
          <div 
            className="w-6 h-6 rounded border border-gray-600 shadow-inner pointer-events-none"
            style={{ backgroundColor: textColor }}
          />
        </div>
      </div>
    </div>
  )
}
