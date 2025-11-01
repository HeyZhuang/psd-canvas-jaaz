import { saveCanvas } from '@/api/canvas'
import { useCanvas } from '@/contexts/canvas'
import useDebounce from '@/hooks/use-debounce'
import { useTheme } from '@/hooks/use-theme'
import { eventBus } from '@/lib/event'
import * as ISocket from '@/types/socket'
import { CanvasData } from '@/types/types'
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw'
import {
  ExcalidrawImageElement,
  ExcalidrawEmbeddableElement,
  OrderedExcalidrawElement,
  Theme,
  NonDeleted,
} from '@excalidraw/excalidraw/element/types'
import '@excalidraw/excalidraw/index.css'
import {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { VideoElement } from './VideoElement'

import '@/assets/style/canvas.css'

// 图片替换相关接口
interface DragImageData {
  type: string;
  image: {
    id: string;
    name: string;
    url: string;
    type?: string;
  };
}

// PSD图层拖拽数据接口
interface DragPsdLayerData {
  type: string;
  layer: {
    index: number;
    name: string;
    image_url: string;
    left: number;
    top: number;
    width: number;
    height: number;
    opacity?: number;
    visible?: boolean;
  };
  psdFileId: string;
}

type LastImagePosition = {
  x: number
  y: number
  width: number
  height: number
  col: number // col index
}

type CanvasExcaliProps = {
  canvasId: string
  initialData?: ExcalidrawInitialDataState
}

const CanvasExcali: React.FC<CanvasExcaliProps> = ({
  canvasId,
  initialData,
}) => {
  const { excalidrawAPI, setExcalidrawAPI } = useCanvas()

  const { i18n } = useTranslation()

  // Immediate handler for UI updates (no debounce)
  const handleSelectionChange = (
    elements: Readonly<OrderedExcalidrawElement[]>,
    appState: AppState
  ) => {
    if (!appState) return

    // Check if any selected element is embeddable type
    const selectedElements = elements.filter((element) =>
      appState.selectedElementIds[element.id]
    )
    const hasEmbeddableSelected = selectedElements.some(
      (element) => element.type === 'embeddable'
    )

    // Toggle CSS class to hide/show left panel immediately
    const excalidrawContainer = document.querySelector('.excalidraw')
    if (excalidrawContainer) {
      if (hasEmbeddableSelected) {
        excalidrawContainer.classList.add('hide-left-panel')
      } else {
        excalidrawContainer.classList.remove('hide-left-panel')
      }
    }
  }

  // 用于保存的去抖处理器（性能优化）
  const handleSave = useDebounce(
    (
      elements: Readonly<OrderedExcalidrawElement[]>,
      appState: AppState,
      files: BinaryFiles
    ) => {
      if (elements.length === 0 || !appState) {
        return
      }

      const data: CanvasData = {
        elements,
        appState: {
          ...appState,
          collaborators: undefined!,
        },
        files,
      }

      let thumbnail = ''
      const latestImage = elements
        .filter((element) => element.type === 'image')
        .sort((a, b) => b.updated - a.updated)[0]
      if (latestImage) {
        const file = files[latestImage.fileId!]
        if (file) {
          thumbnail = file.dataURL
        }
      }

      saveCanvas(canvasId, { data, thumbnail })
    },
    1000
  )

  // 同时调用立即函数和去抖函数的组合处理程序
  const handleChange = (
    elements: Readonly<OrderedExcalidrawElement[]>,
    appState: AppState,
    files: BinaryFiles
  ) => {
    // 即时用户界面更新
    handleSelectionChange(elements, appState)
    // 防抖保存操作
    handleSave(elements, appState, files)
  }

  const lastImagePosition = useRef<LastImagePosition | null>(
    localStorage.getItem('excalidraw-last-image-position')
      ? JSON.parse(localStorage.getItem('excalidraw-last-image-position')!)
      : null
  )
  const { theme } = useTheme()

  // 添加自定义类名以便应用我们的CSS修复
  const excalidrawClassName = `excalidraw-custom ${theme === 'dark' ? 'excalidraw-dark-fix' : ''}`

  // 处理拖拽悬停事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查是否是图片文件
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('application/json') || types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // 处理拖拽释放事件
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    // 立即阻止所有默认行为和事件传播
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    // 获取拖拽的数据
    const dragData = e.dataTransfer.getData('application/json');

    if (!excalidrawAPI) return;

    if (!dragData) {
      console.log('⚠️ 未检测到拖拽数据');
      return;
    }

    try {
      const parsedData = JSON.parse(dragData) as DragImageData | DragPsdLayerData;

      // 处理Library图片拖拽
      if (parsedData.type === 'library-image' && 'image' in parsedData && parsedData.image && parsedData.image.url) {
        console.log('🎨 从Library拖拽的图片:', parsedData.image);

        // 获取鼠标位置下的元素
        const { clientX, clientY } = e;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        // 获取画布容器
        const canvasContainer = document.querySelector('.excalidraw') as HTMLElement;
        if (!canvasContainer) {
          console.error('❌ 未找到画布容器');
          return;
        }

        const containerRect = canvasContainer.getBoundingClientRect();

        // 计算鼠标在画布中的场景坐标（考虑缩放和偏移）
        const sceneX = (clientX - containerRect.left - appState.offsetLeft) / appState.zoom.value - appState.scrollX;
        const sceneY = (clientY - containerRect.top - appState.offsetTop) / appState.zoom.value - appState.scrollY;

        console.log('🎯 鼠标场景坐标:', { sceneX, sceneY });
        console.log('📊 画布状态:', {
          zoom: appState.zoom.value,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          offsetLeft: appState.offsetLeft,
          offsetTop: appState.offsetTop,
          containerRect: { left: containerRect.left, top: containerRect.top }
        });

        // 找到鼠标位置下的图片元素 - 从后往前遍历（优先选择最上层的元素）
        let targetElement = null;
        for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];

          if (el.type !== 'image' || el.isDeleted) continue;

          // 计算元素的边界框
          const elementLeft = el.x;
          const elementTop = el.y;
          const elementRight = el.x + el.width;
          const elementBottom = el.y + el.height;

          console.log(`🔍 检查图片元素 ${el.id}:`, {
            bounds: { left: elementLeft, top: elementTop, right: elementRight, bottom: elementBottom },
            mouseIn: sceneX >= elementLeft && sceneX <= elementRight && sceneY >= elementTop && sceneY <= elementBottom
          });

          // 判断鼠标是否在图片元素范围内
          if (sceneX >= elementLeft &&
            sceneX <= elementRight &&
            sceneY >= elementTop &&
            sceneY <= elementBottom) {
            targetElement = el;
            break; // 找到最上层的元素后立即停止
          }
        }

        // 如果找到了目标图片元素，则替换它
        if (targetElement) {
          console.log('✅ 找到目标图片元素:', {
            id: targetElement.id,
            position: { x: targetElement.x, y: targetElement.y },
            size: { width: targetElement.width, height: targetElement.height }
          });

          // 创建新的图片文件
          try {
            console.log('🔄 开始替换图片...');

            // 获取新图片的数据
            let dataURL = parsedData.image.url;
            let mimeType = 'image/png';

            // 如果是相对路径，需要fetch获取blob
            if (!dataURL.startsWith('data:')) {
              const response = await fetch(parsedData.image.url);
              const blob = await response.blob();
              mimeType = blob.type;

              // 转换为DataURL
              dataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }

            // 获取新图片的实际尺寸
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = dataURL;
            });

            const newImageWidth = img.naturalWidth;
            const newImageHeight = img.naturalHeight;
            const newImageRatio = newImageWidth / newImageHeight;

            console.log('📐 新图片原始尺寸:', { width: newImageWidth, height: newImageHeight, ratio: newImageRatio });

            // 获取被替换图片的尺寸作为参考
            const targetWidth = targetElement.width;
            const targetHeight = targetElement.height;
            const targetRatio = targetWidth / targetHeight;

            console.log('📐 目标图片尺寸:', { width: targetWidth, height: targetHeight, ratio: targetRatio });

            // 计算保持宽高比的新尺寸
            let finalWidth: number;
            let finalHeight: number;

            if (newImageRatio > targetRatio) {
              // 新图片更宽，以宽度为基准
              finalWidth = targetWidth;
              finalHeight = targetWidth / newImageRatio;
            } else {
              // 新图片更高，以高度为基准
              finalHeight = targetHeight;
              finalWidth = targetHeight * newImageRatio;
            }

            console.log('📐 最终尺寸（保持宽高比）:', { width: finalWidth, height: finalHeight });

            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('📁 新文件ID:', fileId);

            // 添加新图片文件到Excalidraw
            excalidrawAPI.addFiles([{
              id: fileId as any,
              dataURL: dataURL as any,
              mimeType: mimeType as any,
              created: Date.now()
            }]);

            // 保留原图片的位置，使用计算后的尺寸
            const replacementElement: any = {
              ...targetElement,
              fileId: fileId as any,
              width: finalWidth,
              height: finalHeight,
              updated: Date.now(),
              version: (targetElement.version || 0) + 1,
              versionNonce: Math.floor(Math.random() * 1000000000)
            };

            // 更新场景
            const updatedElements = elements.map(el =>
              el.id === targetElement.id ? replacementElement : el
            );

            excalidrawAPI.updateScene({ elements: updatedElements as any });
            console.log('✅ 图片替换成功！');
          } catch (error) {
            console.error('❌ 图片替换失败:', error);
            alert('替换图片失败，请重试');
          }
        } else {
          // 如果没有找到目标图片元素，在鼠标位置添加新图片
          console.log('📍 鼠标位置下没有图片元素，将在此位置添加新图片');

          try {
            // 获取新图片的数据
            let dataURL = parsedData.image.url;
            let mimeType = 'image/png';

            // 如果是相对路径，需要fetch获取blob
            if (!dataURL.startsWith('data:')) {
              const response = await fetch(parsedData.image.url);
              const blob = await response.blob();
              mimeType = blob.type;

              // 转换为DataURL
              dataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }

            // 获取新图片的实际尺寸
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = dataURL;
            });

            const newImageWidth = img.naturalWidth;
            const newImageHeight = img.naturalHeight;
            const newImageRatio = newImageWidth / newImageHeight;

            console.log('📐 新图片原始尺寸:', { width: newImageWidth, height: newImageHeight, ratio: newImageRatio });

            // 计算保持宽高比的适当尺寸（默认最大宽度300）
            const maxWidth = 300;
            let finalWidth: number;
            let finalHeight: number;

            if (newImageWidth > maxWidth) {
              // 图片较大，需要缩放
              finalWidth = maxWidth;
              finalHeight = maxWidth / newImageRatio;
            } else {
              // 使用原始尺寸
              finalWidth = newImageWidth;
              finalHeight = newImageHeight;
            }

            console.log('📐 最终尺寸（保持宽高比）:', { width: finalWidth, height: finalHeight });

            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // 添加文件到Excalidraw
            excalidrawAPI.addFiles([{
              id: fileId as any,
              dataURL: dataURL as any,
              mimeType: mimeType as any,
              created: Date.now()
            }]);

            // 在鼠标位置创建新图片元素
            const newImageElement: any = {
              id: `image-${fileId}`,
              type: 'image' as const,
              x: sceneX - finalWidth / 2, // 图片中心对齐鼠标位置
              y: sceneY - finalHeight / 2,
              width: finalWidth,
              height: finalHeight,
              angle: 0,
              strokeColor: 'transparent',
              backgroundColor: 'transparent',
              fillStyle: 'solid' as const,
              strokeWidth: 1,
              strokeStyle: 'solid' as const,
              roughness: 0,
              opacity: 100,
              fileId: fileId as any,
              scale: [1, 1] as [number, number],
              status: 'saved' as const,
              locked: false,
              version: 1,
              versionNonce: Math.floor(Math.random() * 1000000000),
              isDeleted: false,
              groupIds: [],
              boundElements: null,
              updated: Date.now(),
              link: null,
              customData: {
                libraryImage: true,
                imageName: parsedData.image.name
              }
            };

            // 添加到画布
            excalidrawAPI.updateScene({
              elements: [...elements, newImageElement]
            });

            console.log('✅ 新图片已添加到画布');
          } catch (error) {
            console.error('❌ 添加图片失败:', error);
          }
        }
      }
      // 处理PSD图层拖拽
      else if (parsedData.type === 'psd-layer' && 'layer' in parsedData && parsedData.layer && parsedData.layer.image_url) {
        console.log('🎨 从PSD拖拽的图层:', parsedData.layer);

        // 获取鼠标位置下的元素
        const { clientX, clientY } = e;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        // 获取画布容器
        const canvasContainer = document.querySelector('.excalidraw') as HTMLElement;
        if (!canvasContainer) {
          console.error('❌ 未找到画布容器');
          return;
        }

        const containerRect = canvasContainer.getBoundingClientRect();

        // 计算鼠标在画布中的场景坐标（考虑缩放和偏移）
        const sceneX = (clientX - containerRect.left - appState.offsetLeft) / appState.zoom.value - appState.scrollX;
        const sceneY = (clientY - containerRect.top - appState.offsetTop) / appState.zoom.value - appState.scrollY;

        console.log('🎯 鼠标场景坐标:', { sceneX, sceneY });

        // 找到鼠标位置下的图片元素 - 从后往前遍历（优先选择最上层的元素）
        let targetElement = null;
        for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];

          if (el.type !== 'image' || el.isDeleted) continue;

          // 计算元素的边界框
          const elementLeft = el.x;
          const elementTop = el.y;
          const elementRight = el.x + el.width;
          const elementBottom = el.y + el.height;

          // 判断鼠标是否在图片元素范围内
          if (sceneX >= elementLeft &&
            sceneX <= elementRight &&
            sceneY >= elementTop &&
            sceneY <= elementBottom) {
            targetElement = el;
            break;
          }
        }

        // 如果找到了目标图片元素，则替换它
        if (targetElement) {
          console.log('✅ 找到目标图片元素，开始替换');

          try {
            // 获取PSD图层的数据
            const dataURL = parsedData.layer.image_url;
            const mimeType = 'image/png';

            // 获取图层的实际尺寸
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = dataURL;
            });

            const newImageWidth = img.naturalWidth;
            const newImageHeight = img.naturalHeight;
            const newImageRatio = newImageWidth / newImageHeight;

            console.log('📐 PSD图层原始尺寸:', { width: newImageWidth, height: newImageHeight, ratio: newImageRatio });

            // 获取被替换图片的尺寸作为参考
            const targetWidth = targetElement.width;
            const targetHeight = targetElement.height;
            const targetRatio = targetWidth / targetHeight;

            // 计算保持宽高比的新尺寸
            let finalWidth: number;
            let finalHeight: number;

            if (newImageRatio > targetRatio) {
              finalWidth = targetWidth;
              finalHeight = targetWidth / newImageRatio;
            } else {
              finalHeight = targetHeight;
              finalWidth = targetHeight * newImageRatio;
            }

            console.log('📐 最终尺寸（保持宽高比）:', { width: finalWidth, height: finalHeight });

            const fileId = `psd-layer-${parsedData.layer.index}-${Date.now()}`;

            // 添加新图片文件到Excalidraw
            excalidrawAPI.addFiles([{
              id: fileId as any,
              dataURL: dataURL as any,
              mimeType: mimeType as any,
              created: Date.now()
            }]);

            // 保留原图片的位置，使用计算后的尺寸
            const replacementElement: any = {
              ...targetElement,
              fileId: fileId as any,
              width: finalWidth,
              height: finalHeight,
              opacity: parsedData.layer.opacity ? Math.round(parsedData.layer.opacity / 255 * 100) : 100,
              updated: Date.now(),
              version: (targetElement.version || 0) + 1,
              versionNonce: Math.floor(Math.random() * 1000000000),
              customData: {
                ...targetElement.customData,
                psdLayerIndex: parsedData.layer.index,
                psdLayerName: parsedData.layer.name,
                psdFileId: parsedData.psdFileId
              }
            };

            // 更新场景
            const updatedElements = elements.map(el =>
              el.id === targetElement.id ? replacementElement : el
            );

            excalidrawAPI.updateScene({ elements: updatedElements as any });
            console.log('✅ PSD图层替换成功！');
          } catch (error) {
            console.error('❌ PSD图层替换失败:', error);
          }
        } else {
          // 如果没有找到目标图片元素，在鼠标位置添加新图层
          console.log('📍 鼠标位置下没有图片元素，将在此位置添加PSD图层');

          try {
            const dataURL = parsedData.layer.image_url;
            const mimeType = 'image/png';

            // 获取图层的实际尺寸
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = dataURL;
            });

            const newImageWidth = img.naturalWidth;
            const newImageHeight = img.naturalHeight;
            const newImageRatio = newImageWidth / newImageHeight;

            console.log('📐 PSD图层原始尺寸:', { width: newImageWidth, height: newImageHeight, ratio: newImageRatio });

            // 计算保持宽高比的适当尺寸（默认最大宽度300）
            const maxWidth = 300;
            let finalWidth: number;
            let finalHeight: number;

            if (newImageWidth > maxWidth) {
              finalWidth = maxWidth;
              finalHeight = maxWidth / newImageRatio;
            } else {
              finalWidth = newImageWidth;
              finalHeight = newImageHeight;
            }

            console.log('📐 最终尺寸（保持宽高比）:', { width: finalWidth, height: finalHeight });

            const fileId = `psd-layer-${parsedData.layer.index}-${Date.now()}`;

            // 添加文件到Excalidraw
            excalidrawAPI.addFiles([{
              id: fileId as any,
              dataURL: dataURL as any,
              mimeType: mimeType as any,
              created: Date.now()
            }]);

            // 在鼠标位置创建新图层元素
            const newImageElement: any = {
              id: `image-${fileId}`,
              type: 'image' as const,
              x: sceneX - finalWidth / 2,
              y: sceneY - finalHeight / 2,
              width: finalWidth,
              height: finalHeight,
              angle: 0,
              strokeColor: 'transparent',
              backgroundColor: 'transparent',
              fillStyle: 'solid' as const,
              strokeWidth: 1,
              strokeStyle: 'solid' as const,
              roughness: 0,
              opacity: parsedData.layer.opacity ? Math.round(parsedData.layer.opacity / 255 * 100) : 100,
              fileId: fileId as any,
              scale: [1, 1] as [number, number],
              status: 'saved' as const,
              locked: false,
              version: 1,
              versionNonce: Math.floor(Math.random() * 1000000000),
              isDeleted: false,
              groupIds: [],
              boundElements: null,
              updated: Date.now(),
              link: null,
              customData: {
                psdLayerIndex: parsedData.layer.index,
                psdLayerName: parsedData.layer.name,
                psdFileId: parsedData.psdFileId
              }
            };

            // 添加到画布
            excalidrawAPI.updateScene({
              elements: [...elements, newImageElement]
            });

            console.log('✅ PSD图层已添加到画布');
          } catch (error) {
            console.error('❌ 添加PSD图层失败:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ 处理拖拽数据失败:', error);
    }
  }, [excalidrawAPI]);

  // 在深色模式下使用自定义主题设置，避免使用默认的滤镜
  // 这样可以确保颜色在深色模式下正确显示
  const customTheme = theme === 'dark' ? 'light' : theme

  // 在组件挂载和主题变化时设置深色模式下的背景色
  useEffect(() => {
    if (excalidrawAPI && theme === 'dark') {
      // 设置深色背景，但保持light主题以避免颜色反转
      excalidrawAPI.updateScene({
        appState: {
          viewBackgroundColor: '#121212',
        }
      })
    } else if (excalidrawAPI && theme === 'light') {
      // 恢复浅色背景
      excalidrawAPI.updateScene({
        appState: {
          viewBackgroundColor: '#ffffff',
        }
      })
    }
  }, [excalidrawAPI, theme])

  const addImageToExcalidraw = useCallback(
    async (imageElement: ExcalidrawImageElement, file: BinaryFileData) => {
      if (!excalidrawAPI) return

      // 获取当前画布元素以便添加新元素
      const currentElements = excalidrawAPI.getSceneElements()

      excalidrawAPI.addFiles([file])
      console.log('👇 Adding new image element to canvas:', imageElement.id)
      console.log('👇 Image element properties:', {
        id: imageElement.id,
        type: imageElement.type,
        locked: imageElement.locked,
        groupIds: imageElement.groupIds,
        isDeleted: imageElement.isDeleted,
        x: imageElement.x,
        y: imageElement.y,
        width: imageElement.width,
        height: imageElement.height,
      })

      // Ensure image is not locked and can be manipulated
      const unlockedImageElement = {
        ...imageElement,
        locked: false,
        groupIds: [],
        isDeleted: false,
      }

      excalidrawAPI.updateScene({
        elements: [...(currentElements || []), unlockedImageElement],
      })

      localStorage.setItem(
        'excalidraw-last-image-position',
        JSON.stringify(lastImagePosition.current)
      )
    },
    [excalidrawAPI]
  )

  const addVideoEmbed = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (elementData: any, videoSrc: string) => {
      if (!excalidrawAPI) return

      // Function to create video element with given dimensions
      const createVideoElement = (finalWidth: number, finalHeight: number) => {
        console.log('👇 Video element properties:', {
          id: elementData.id,
          type: elementData.type,
          locked: elementData.locked,
          groupIds: elementData.groupIds,
          isDeleted: elementData.isDeleted,
          x: elementData.x,
          y: elementData.y,
          width: elementData.width,
          height: elementData.height,
        })

        const videoElements = convertToExcalidrawElements([
          {
            type: 'embeddable',
            id: elementData.id,
            x: elementData.x,
            y: elementData.y,
            width: elementData.width,
            height: elementData.height,
            link: videoSrc,
            // 添加必需的基本样式属性
            strokeColor: '#000000',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roundness: null,
            roughness: 1,
            opacity: 100,
            // 添加必需的变换属性
            angle: 0,
            seed: Math.random(),
            version: 1,
            versionNonce: Math.random(),
            // 添加必需的状态属性
            locked: false,
            isDeleted: false,
            groupIds: [],
            // 添加绑定框属性
            boundElements: [],
            updated: Date.now(),
            // 添加必需的索引和帧ID属性
            frameId: null,
            index: null, // 添加缺失的index属性
            // 添加自定义数据属性
            customData: {},
          },
        ])

        console.log('👇 Converted video elements:', videoElements)

        const currentElements = excalidrawAPI.getSceneElements()
        const newElements = [...currentElements, ...videoElements]

        console.log(
          '👇 Updating scene with elements count:',
          newElements.length
        )

        excalidrawAPI.updateScene({
          elements: newElements,
        })

        console.log(
          '👇 Added video embed element:',
          videoSrc,
          `${elementData.width}x${elementData.height}`
        )
      }

      // If dimensions are provided, use them directly
      if (elementData.width && elementData.height) {
        createVideoElement(elementData.width, elementData.height)
        return
      }

      // Otherwise, try to get video's natural dimensions
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'

      video.onloadedmetadata = () => {
        const videoWidth = video.videoWidth
        const videoHeight = video.videoHeight

        if (videoWidth && videoHeight) {
          // Scale down if video is too large (max 800px width)
          const maxWidth = 800
          let finalWidth = videoWidth
          let finalHeight = videoHeight

          if (videoWidth > maxWidth) {
            const scale = maxWidth / videoWidth
            finalWidth = maxWidth
            finalHeight = videoHeight * scale
          }

          createVideoElement(finalWidth, finalHeight)
        } else {
          // Fallback to default dimensions
          createVideoElement(320, 180)
        }
      }

      video.onerror = () => {
        console.warn('Could not load video metadata, using default dimensions')
        createVideoElement(320, 180)
      }

      video.src = videoSrc
    },
    [excalidrawAPI]
  )

  const renderEmbeddable = useCallback(
    (element: NonDeleted<ExcalidrawEmbeddableElement>, appState: AppState) => {
      const { link } = element

      // Check if this is a video URL
      if (
        link &&
        (link.includes('.mp4') ||
          link.includes('.webm') ||
          link.includes('.ogg') ||
          link.startsWith('blob:') ||
          link.includes('video'))
      ) {
        // Return the VideoPlayer component
        return (
          <VideoElement
            src={link}
            width={element.width}
            height={element.height}
          />
        )
      }

      console.log('👇 Not a video URL, returning null for:', link)
      // Return null for non-video embeds to use default rendering
      return null
    },
    []
  )

  const handleImageGenerated = useCallback(
    (imageData: ISocket.SessionImageGeneratedEvent) => {
      console.log('👇 CanvasExcali received image_generated:', imageData)

      // Only handle if it's for this canvas
      if (imageData.canvas_id !== canvasId) {
        console.log('👇 Image not for this canvas, ignoring')
        return
      }

      // Check if this is actually a video generation event that got mislabeled
      if (imageData.file?.mimeType?.startsWith('video/')) {
        console.log(
          '👇 This appears to be a video, not an image. Ignoring in image handler.'
        )
        return
      }

      addImageToExcalidraw(imageData.element, imageData.file)
    },
    [addImageToExcalidraw, canvasId]
  )

  const handleVideoGenerated = useCallback(
    (videoData: ISocket.SessionVideoGeneratedEvent) => {
      console.log('👇 CanvasExcali received video_generated:', videoData)

      // Only handle if it's for this canvas
      if (videoData.canvas_id !== canvasId) {
        console.log('👇 Video not for this canvas, ignoring')
        return
      }

      // Create video embed element using the video URL
      addVideoEmbed(videoData.element, videoData.video_url)
    },
    [addVideoEmbed, canvasId]
  )

  useEffect(() => {
    eventBus.on('Socket::Session::ImageGenerated', handleImageGenerated)
    eventBus.on('Socket::Session::VideoGenerated', handleVideoGenerated)
    return () => {
      eventBus.off('Socket::Session::ImageGenerated', handleImageGenerated)
      eventBus.off('Socket::Session::VideoGenerated', handleVideoGenerated)
    }
  }, [handleImageGenerated, handleVideoGenerated])

  return (
    <div
      className="excalidraw-wrapper"
      style={{ width: '100%', height: '100%' }}
      onDragOverCapture={handleDragOver}
      onDropCapture={handleDrop}
    >
      <Excalidraw
        theme={customTheme as Theme}
        langCode={i18n.language}
        excalidrawAPI={(api) => {
          setExcalidrawAPI(api)
        }}
        onChange={handleChange}
        initialData={() => {
          const data = initialData
          console.log('👇initialData', data)
          if (data?.appState) {
            data.appState = {
              ...data.appState,
              collaborators: undefined!,
            }
          }
          return data || null
        }}
        renderEmbeddable={renderEmbeddable}
        // Allow all URLs for embeddable content
        validateEmbeddable={(url: string) => {
          console.log('👇 Validating embeddable URL:', url)
          // Allow all URLs - return true for everything
          return true
        }}
        // Ensure interactive mode is enabled
        viewModeEnabled={false}
        zenModeEnabled={false}
        // Allow element manipulation
        onPointerUpdate={(payload) => {
          // Minimal logging - only log significant pointer events
          if (payload.button === 'down' && Math.random() < 0.05) {
            // console.log('👇 Pointer down on:', payload.pointer.x, payload.pointer.y)
          }
        }}
      />
    </div>
  )
}

export { CanvasExcali }
export default CanvasExcali
