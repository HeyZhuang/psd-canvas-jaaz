import { useState, useRef, useEffect } from 'react'
import { useCanvas } from '@/contexts/canvas'
import { sceneCoordsToViewportCoords } from '@excalidraw/excalidraw'
import type { NormalizedZoomValue } from '@excalidraw/excalidraw/types'

// 裁剪覆盖层组件的属性接口定义
interface CropOverlayProps {
  // 图片元素的坐标和尺寸信息
  imageElement: {
    x: number      // 图片在画布场景中的X坐标
    y: number      // 图片在画布场景中的Y坐标
    width: number  // 图片的宽度
    height: number // 图片的高度
  }
  // 裁剪区域的坐标和尺寸信息
  cropRect: {
    x: number      // 裁剪区域相对于图片的X坐标
    y: number      // 裁剪区域相对于图片的Y坐标
    width: number  // 裁剪区域的宽度
    height: number // 裁剪区域的高度
  }
  // 裁剪区域变化时的回调函数
  onCropChange: (rect: { x: number; y: number; width: number; height: number }) => void
  // 是否锁定宽高比
  aspectRatioLocked: boolean
  // 当前的宽高比
  aspectRatio: number
}

// 调整手柄类型定义
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'move' | null

// 裁剪覆盖层组件
export function CropOverlay({ imageElement, cropRect, onCropChange, aspectRatioLocked, aspectRatio }: CropOverlayProps) {
  // 是否正在拖拽调整裁剪区域
  const [isDragging, setIsDragging] = useState(false)
  // 当前激活的调整手柄
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null)
  // 记录拖拽开始时的位置和裁剪区域信息
  const startPosRef = useRef({
    x: 0,           // 鼠标起始X坐标
    y: 0,           // 鼠标起始Y坐标
    rectX: 0,       // 裁剪区域起始X坐标
    rectY: 0,       // 裁剪区域起始Y坐标
    rectWidth: 0,   // 裁剪区域起始宽度
    rectHeight: 0   // 裁剪区域起始高度
  })
  const { excalidrawAPI } = useCanvas()

  // 获取画布的滚动和缩放信息
  const appState = excalidrawAPI?.getAppState()
  const zoom = appState?.zoom?.value || 1        // 当前画布缩放比例
  const scrollX = appState?.scrollX || 0         // 画布水平滚动偏移量
  const scrollY = appState?.scrollY || 0         // 画布垂直滚动偏移量

  // 获取画布容器的偏移量
  const excalidrawContainer = document.querySelector('.excalidraw') as HTMLElement
  const offsetLeft = excalidrawContainer?.getBoundingClientRect().left || 0  // 画布容器距离页面左边的距离
  const offsetTop = excalidrawContainer?.getBoundingClientRect().top || 0    // 画布容器距离页面顶部的距离

  // 创建zoom对象以匹配Excalidraw期望的格式
  const zoomObj = { value: zoom as NormalizedZoomValue }

  // 计算图片在屏幕上的绝对位置（使用Excalidraw提供的转换函数）
  const imgTopLeft = sceneCoordsToViewportCoords(
    { sceneX: imageElement.x, sceneY: imageElement.y },
    { zoom: zoomObj, offsetLeft, offsetTop, scrollX, scrollY }
  )

  const imgBottomRight = sceneCoordsToViewportCoords(
    { sceneX: imageElement.x + imageElement.width, sceneY: imageElement.y + imageElement.height },
    { zoom: zoomObj, offsetLeft, offsetTop, scrollX, scrollY }
  )

  // 图片在屏幕上的宽度和高度
  const imgScreenWidth = imgBottomRight.x - imgTopLeft.x
  const imgScreenHeight = imgBottomRight.y - imgTopLeft.y

  // 计算裁剪框在屏幕上的绝对位置
  const cropTopLeft = sceneCoordsToViewportCoords(
    { sceneX: imageElement.x + cropRect.x, sceneY: imageElement.y + cropRect.y },
    { zoom: zoomObj, offsetLeft, offsetTop, scrollX, scrollY }
  )

  const cropBottomRight = sceneCoordsToViewportCoords(
    { sceneX: imageElement.x + cropRect.x + cropRect.width, sceneY: imageElement.y + cropRect.y + cropRect.height },
    { zoom: zoomObj, offsetLeft, offsetTop, scrollX, scrollY }
  )

  // 裁剪框在屏幕上的位置和尺寸
  const cropLeft = cropTopLeft.x      // 裁剪框左边距
  const cropTop = cropTopLeft.y       // 裁剪框上边距
  const cropWidth = cropBottomRight.x - cropTopLeft.x   // 裁剪框宽度
  const cropHeight = cropBottomRight.y - cropTopLeft.y  // 裁剪框高度

  // 处理鼠标按下事件，开始拖拽调整裁剪区域
  const handleMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(true)
    setActiveHandle(handle)

    // 记录拖拽开始时的位置和裁剪区域信息
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      rectX: cropRect.x,
      rectY: cropRect.y,
      rectWidth: cropRect.width,
      rectHeight: cropRect.height
    }
  }

  // 处理拖拽过程中的鼠标移动事件
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      console.log(e.clientX, e.clientY, startPosRef.current.x, startPosRef.current.y)


      console.log(imgBottomRight.x, imgBottomRight.y, imgTopLeft.x, imgTopLeft.y)
      // 计算鼠标移动的距离（考虑缩放比例）
      const deltaX = (e.clientX - startPosRef.current.x) / zoom
      const deltaY = (e.clientY - startPosRef.current.y) / zoom

      // 初始化新的裁剪区域参数
      let newX = startPosRef.current.rectX      // 新的裁剪区域X坐标
      let newY = startPosRef.current.rectY      // 新的裁剪区域Y坐标
      let newWidth = startPosRef.current.rectWidth   // 新的裁剪区域宽度
      let newHeight = startPosRef.current.rectHeight // 新的裁剪区域高度

      // 根据不同的调整手柄类型计算新的裁剪区域参数
      switch (activeHandle) {
        case 'move':
          // 移动整个裁剪框
          newX = Math.max(0, Math.min(startPosRef.current.rectX + deltaX, Math.abs(imageElement.width) - startPosRef.current.rectWidth))
          newY = Math.max(0, Math.min(startPosRef.current.rectY + deltaY, Math.abs(imageElement.height) - startPosRef.current.rectHeight))
          break

        case 'nw':
          // 西北角手柄（左上角）
          newX = Math.max(0, startPosRef.current.rectX + deltaX)
          newY = Math.max(0, startPosRef.current.rectY + deltaY)
          newWidth = startPosRef.current.rectWidth - (newX - startPosRef.current.rectX)
          newHeight = startPosRef.current.rectHeight - (newY - startPosRef.current.rectY)

          if (aspectRatioLocked) {
            const avgDelta = (deltaX + deltaY) / 2
            newWidth = Math.max(10, startPosRef.current.rectWidth - avgDelta)
            newHeight = newWidth / aspectRatio
            newX = startPosRef.current.rectX + startPosRef.current.rectWidth - newWidth
            newY = startPosRef.current.rectY + startPosRef.current.rectHeight - newHeight
          }
          break

        case 'ne':
          // 东北角手柄（右上角）
          newY = Math.max(0, startPosRef.current.rectY + deltaY)
          newWidth = Math.max(10, startPosRef.current.rectWidth + deltaX)
          newHeight = startPosRef.current.rectHeight - (newY - startPosRef.current.rectY)

          if (aspectRatioLocked) {
            newWidth = Math.max(10, startPosRef.current.rectWidth + deltaX)
            newHeight = newWidth / aspectRatio
            newY = startPosRef.current.rectY + startPosRef.current.rectHeight - newHeight
          }
          break

        case 'sw':
          // 西南角手柄（左下角）
          newX = Math.max(0, startPosRef.current.rectX + deltaX)
          newWidth = startPosRef.current.rectWidth - (newX - startPosRef.current.rectX)
          newHeight = Math.max(10, startPosRef.current.rectHeight + deltaY)

          if (aspectRatioLocked) {
            newHeight = Math.max(10, startPosRef.current.rectHeight + deltaY)
            newWidth = newHeight * aspectRatio
            newX = startPosRef.current.rectX + startPosRef.current.rectWidth - newWidth
          }
          break

        case 'se':
          // 东南角手柄（右下角）
          newWidth = Math.max(10, startPosRef.current.rectWidth + deltaX)
          newHeight = Math.max(10, startPosRef.current.rectHeight + deltaY)

          if (aspectRatioLocked) {
            newWidth = Math.max(10, startPosRef.current.rectWidth + deltaX)
            newHeight = newWidth / aspectRatio
          }
          break

        case 'n':
          // 北边手柄（上边中点）
          newY = Math.max(0, startPosRef.current.rectY + deltaY)
          newHeight = startPosRef.current.rectHeight - (newY - startPosRef.current.rectY)

          if (aspectRatioLocked) {
            newWidth = newHeight * aspectRatio
          }
          break

        case 's':
          // 南边手柄（下边中点）
          newHeight = Math.max(10, startPosRef.current.rectHeight + deltaY)

          if (aspectRatioLocked) {
            newWidth = newHeight * aspectRatio
          }
          break

        case 'e':
          // 东边手柄（右边中点）
          newWidth = Math.max(10, startPosRef.current.rectWidth + deltaX)

          if (aspectRatioLocked) {
            newHeight = newWidth / aspectRatio
          }
          break

        case 'w':
          // 西边手柄（左边中点）
          newX = Math.max(0, startPosRef.current.rectX + deltaX)
          newWidth = startPosRef.current.rectWidth - (newX - startPosRef.current.rectX)

          if (aspectRatioLocked) {
            newHeight = newWidth / aspectRatio
          }
          break
      }

      // 确保裁剪框不超出图片边界
      if (newX + newWidth > Math.abs(imageElement.width)) {
        newWidth = Math.abs(imageElement.width) - newX
        if (aspectRatioLocked) {
          newHeight = newWidth / aspectRatio
        }
      }
      if (newY + newHeight > Math.abs(imageElement.height)) {
        newHeight = Math.abs(imageElement.height) - newY
        if (aspectRatioLocked) {
          newWidth = newHeight * aspectRatio
        }
      }

      // 确保最小尺寸
      if (newWidth < 10) newWidth = 10
      if (newHeight < 10) newHeight = 10

      // 调用回调函数更新裁剪区域
      onCropChange({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      })
    }

    // 处理鼠标释放事件，结束拖拽
    const handleMouseUp = () => {
      setIsDragging(false)
      setActiveHandle(null)
    }

    // 添加事件监听器
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // 清理事件监听器
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, activeHandle, cropRect, imageElement.width, imageElement.height, aspectRatioLocked, aspectRatio, onCropChange, zoom])

  // 调整手柄的样式类
  const handleStyle = "absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-pointer hover:scale-125 transition-transform"

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 30 }}
    >
      {/* 遮罩层 - 四个半透明区域 */}
      {/* 上方遮罩 */}
      <div className="absolute pointer-events-auto" style={{
        left: imgTopLeft.x,
        top: imgTopLeft.y,
        width: imgScreenWidth,
        height: cropTopLeft.y - imgTopLeft.y,
        background: 'rgba(0, 0, 0, 0.5)'
      }} />
      {/* 下方遮罩 */}
      <div className="absolute pointer-events-auto" style={{
        left: imgTopLeft.x,
        top: cropBottomRight.y,
        width: imgScreenWidth,
        height: imgBottomRight.y - cropBottomRight.y,
        background: 'rgba(0, 0, 0, 0.5)'
      }} />
      {/* 左侧遮罩 */}
      <div className="absolute pointer-events-auto" style={{
        left: imgTopLeft.x,
        top: cropTopLeft.y,
        width: cropTopLeft.x - imgTopLeft.x,
        height: cropHeight,
        background: 'rgba(0, 0, 0, 0.5)'
      }} />
      {/* 右侧遮罩 */}
      <div className="absolute pointer-events-auto" style={{
        left: cropBottomRight.x,
        top: cropTopLeft.y,
        width: imgBottomRight.x - cropBottomRight.x,
        height: cropHeight,
        background: 'rgba(0, 0, 0, 0.5)'
      }} />

      {/* 裁剪框 */}
      <div
        className="absolute border-2 border-blue-500 cursor-move pointer-events-auto"
        style={{
          // left: cropLeft,
          // top: cropTop,
          width: cropWidth,
          height: cropHeight,
          left: 0,
          top: 0,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* 网格线 */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="border border-white/30" />
          ))}
        </div>

        {/* 8个调整手柄 */}
        {/* 四角手柄 */}
        <div
          className={handleStyle}
          style={{ left: -6, top: -6 }}
          onMouseDown={(e) => handleMouseDown(e, 'nw')}
        />
        <div
          className={handleStyle}
          style={{ right: -6, top: -6 }}
          onMouseDown={(e) => handleMouseDown(e, 'ne')}
        />
        <div
          className={handleStyle}
          style={{ left: -6, bottom: -6 }}
          onMouseDown={(e) => handleMouseDown(e, 'sw')}
        />
        <div
          className={handleStyle}
          style={{ right: -6, bottom: -6 }}
          onMouseDown={(e) => handleMouseDown(e, 'se')}
        />

        {/* 四边中点手柄 */}
        <div
          className={handleStyle}
          style={{ left: '50%', top: -6, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'n')}
        />
        <div
          className={handleStyle}
          style={{ left: '50%', bottom: -6, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 's')}
        />
        <div
          className={handleStyle}
          style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'e')}
        />
        <div
          className={handleStyle}
          style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'w')}
        />
      </div>

      {/* 尺寸提示 */}
      <div
        className="absolute bg-blue-500 text-white text-xs px-2 py-1 rounded pointer-events-none"
        style={{
          left: cropLeft + cropWidth / 2,
          top: cropTop - 30,
          transform: 'translateX(-50%)'
        }}
      >
        {Math.round(cropRect.width)} × {Math.round(cropRect.height)}
      </div>
    </div>
  )
}