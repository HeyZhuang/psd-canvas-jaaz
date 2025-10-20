import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { uploadPSD, type PSDUploadResponse } from '@/api/upload'
import { useCanvas } from '@/contexts/canvas'
import { ExcalidrawImageElement } from '@excalidraw/excalidraw/element/types'
import { BinaryFileData } from '@excalidraw/excalidraw/types'

interface PSDCanvasUploaderProps {
    canvasId: string
    onPSDUploaded?: (psdData: PSDUploadResponse) => void
}

export function PSDCanvasUploader({ canvasId, onPSDUploaded }: PSDCanvasUploaderProps) {
    const { t } = useTranslation()
    const { excalidrawAPI } = useCanvas()
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 分析圖片可視性（平均亮度、透明度、對比），判定是否需要墊底矩形
    const analyzeVisibility = useCallback(async (dataURL: string) => {
        return new Promise<{ lowVisibility: boolean }>((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve({ lowVisibility: false })
                    return
                }
                const sampleMax = 256 // 降採樣上限，避免大圖耗時
                const ratio = Math.min(1, sampleMax / Math.max(img.width, img.height))
                canvas.width = Math.max(1, Math.floor(img.width * ratio))
                canvas.height = Math.max(1, Math.floor(img.height * ratio))
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
                let sumL = 0
                let sumL2 = 0
                let sumA = 0
                const n = data.length / 4
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i]
                    const g = data[i + 1]
                    const b = data[i + 2]
                    const a = data[i + 3] / 255
                    // sRGB 相對亮度簡化（避免昂貴 gamma 校正）
                    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
                    sumL += l
                    sumL2 += l * l
                    sumA += a
                }
                const avgL = sumL / n
                const varL = sumL2 / n - avgL * avgL
                const contrast = Math.sqrt(Math.max(0, varL)) // 0~1
                const avgA = sumA / n // 0~1

                // 低可視性判斷：平均透明或亮度接近白/黑且對比極低
                const nearWhite = avgL > 0.92
                const nearBlack = avgL < 0.08
                const veryTransparent = avgA < 0.25
                const veryLowContrast = contrast < 0.06
                const lowVisibility = veryTransparent || (veryLowContrast && (nearWhite || nearBlack))
                resolve({ lowVisibility })
            }
            img.onerror = () => resolve({ lowVisibility: false })
            img.src = dataURL
        })
    }, [])

    const addLayerToCanvas = useCallback(
        async (layer: any, psdFileId: string, offsetX: number = 0, offsetY: number = 0) => {
            if (!excalidrawAPI) {
                console.error('excalidrawAPI 不可用:', { excalidrawAPI, layer })
                return
            }

            // 如果沒有 image_url，嘗試生成一個占位符
            if (!layer.image_url) {
                console.warn(`圖層 "${layer.name}" 沒有 image_url，嘗試生成占位符`)

                // 創建一個簡單的矩形占位符
                const placeholderElement = {
                    type: 'rectangle' as const,
                    id: `psd_placeholder_${layer.index}_${Date.now()}`,
                    x: layer.left + offsetX,
                    y: layer.top + offsetY,
                    width: Math.max(layer.width || 100, 50),
                    height: Math.max(layer.height || 50, 30),
                    angle: 0,
                    strokeColor: '#666666',
                    backgroundColor: '#f0f0f0',
                    fillStyle: 'solid' as const,
                    strokeWidth: 2,
                    strokeStyle: 'solid' as const,
                    roundness: null,
                    roughness: 1,
                    opacity: 100,
                    seed: Math.random(),
                    version: 1,
                    versionNonce: Math.random(),
                    locked: false,
                    isDeleted: false,
                    groupIds: [],
                    boundElements: [],
                    updated: Date.now(),
                    frameId: null,
                    index: null,
                    customData: {
                        psdLayerIndex: layer.index,
                        psdFileId: psdFileId,
                        layerName: layer.name,
                        isPlaceholder: true,
                    },
                } as any

                const currentElements = excalidrawAPI.getSceneElements()
                excalidrawAPI.updateScene({
                    elements: [...currentElements, placeholderElement],
                })

                console.log(`成功添加占位符 "${layer.name}" 到畫布`, {
                    element: placeholderElement
                })
                return
            }

            try {
                const response = await fetch(layer.image_url)
                const blob = await response.blob()
                const file = new File([blob], `${layer.name}.png`, { type: 'image/png' })

                const dataURL = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })

                const imageElement: ExcalidrawImageElement = {
                    type: 'image',
                    id: `psd_layer_${layer.index}_${Date.now()}`,
                    x: layer.left + offsetX,
                    y: layer.top + offsetY,
                    width: layer.width,
                    height: layer.height,
                    angle: 0,
                    strokeColor: '#000000',
                    backgroundColor: 'transparent',
                    fillStyle: 'solid',
                    strokeWidth: 1,
                    strokeStyle: 'solid',
                    roundness: null,
                    roughness: 1,
                    opacity: 100, // 設置為 100% 完全不透明
                    seed: Math.random(),
                    version: 1,
                    versionNonce: Math.random(),
                    locked: false,
                    isDeleted: false,
                    groupIds: [],
                    boundElements: [],
                    updated: Date.now(),
                    frameId: null,
                    index: null,
                    customData: {
                        psdLayerIndex: layer.index,
                        psdFileId: psdFileId,
                        layerName: layer.name,
                    },
                    fileId: `psd_layer_${layer.index}` as any,
                    link: null,
                    status: 'saved' as const,
                    scale: [1, 1] as [number, number],
                    crop: null,
                }

                const binaryFileData: BinaryFileData = {
                    id: `psd_layer_${layer.index}` as any,
                    mimeType: 'image/png',
                    dataURL: dataURL as any,
                    created: Date.now(),
                }

                const { lowVisibility } = await analyzeVisibility(dataURL)

                const currentElements = excalidrawAPI.getSceneElements()
                const elementsToAdd: any[] = [imageElement]

                if (lowVisibility) {
                    // 在圖片下方添加淡灰底與細邊框，提升可視性
                    const padding = 8
                    const bgRect = {
                        type: 'rectangle',
                        id: `psd_bg_${layer.index}_${Date.now()}`,
                        x: imageElement.x - padding / 2,
                        y: imageElement.y - padding / 2,
                        width: imageElement.width + padding,
                        height: imageElement.height + padding,
                        angle: 0,
                        strokeColor: '#d0d0d0',
                        backgroundColor: '#f5f5f5',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roundness: null,
                        roughness: 0,
                        opacity: 100,
                        seed: Math.random(),
                        version: 1,
                        versionNonce: Math.random(),
                        locked: false,
                        isDeleted: false,
                        groupIds: [],
                        boundElements: [],
                        updated: Date.now(),
                        frameId: null,
                        index: null,
                    }
                    // 背景矩形放在前，圖片放在後，確保圖片顯示在上層
                    elementsToAdd.unshift(bgRect)
                }

                excalidrawAPI.addFiles([binaryFileData])
                excalidrawAPI.updateScene({
                    elements: [...currentElements, ...elementsToAdd],
                })

                console.log(`成功添加圖層 "${layer.name}" 到畫布`, {
                    element: imageElement,
                    fileData: binaryFileData
                })
            } catch (error) {
                console.error('添加圖層到畫布失敗:', error)
                const message = error instanceof Error ? error.message : 'Unknown error'
                toast.error(`添加圖層 "${layer.name}" 失敗: ${message}`)
            }
        },
        [excalidrawAPI]
    )

    // 自動添加所有圖層到畫布
    const handleAutoAddLayers = useCallback(
        async (psdData: PSDUploadResponse) => {
            if (!excalidrawAPI) {
                console.error('excalidrawAPI 不可用')
                return
            }

            console.log('開始處理 PSD 數據:', psdData)
            console.log('總圖層數量:', psdData.layers.length)

            // 詳細記錄每個圖層的狀態
            psdData.layers.forEach((layer, index) => {
                console.log(`圖層 ${index}:`, {
                    name: layer.name,
                    type: layer.type,
                    visible: layer.visible,
                    hasImageUrl: !!layer.image_url,
                    width: layer.width,
                    height: layer.height,
                    opacity: layer.opacity,
                    imageUrl: layer.image_url
                })
            })

            // 最寬鬆的過濾條件：包含所有有內容的圖層
            const imageLayers = psdData.layers.filter(layer => {
                const hasImageUrl = !!layer.image_url
                const hasValidSize = (layer.width && layer.width > 0) || (layer.height && layer.height > 0)
                const hasAnySize = layer.width || layer.height
                const isVisible = layer.visible !== false
                const hasName = layer.name && layer.name.trim() !== ''

                // 優先包含有 image_url 的圖層
                const priorityInclude = hasImageUrl && hasValidSize && isVisible
                // 次選包含有尺寸但沒有 image_url 的圖層（將生成占位符）
                const fallbackInclude = !hasImageUrl && hasAnySize && isVisible && hasName

                const willInclude = priorityInclude || fallbackInclude

                console.log(`圖層 "${layer.name}" 過濾結果:`, {
                    hasImageUrl,
                    hasValidSize,
                    hasAnySize,
                    isVisible,
                    hasName,
                    priorityInclude,
                    fallbackInclude,
                    willInclude
                })

                return willInclude
            })

            console.log('過濾後的可見圖層數量:', imageLayers.length)
            console.log('找到的可見圖層:', imageLayers)

            if (imageLayers.length === 0) {
                console.warn('沒有可添加的圖層，檢查所有圖層狀態:')
                psdData.layers.forEach(layer => {
                    console.warn(`- ${layer.name}: image_url=${!!layer.image_url}, size=${layer.width}x${layer.height}, visible=${layer.visible}`)
                })
                toast.info('沒有可添加的圖層')
                return
            }

            try {
                // 1) 計算 PSD 所有可用圖層的邊界框
                const minLeft = Math.min(...imageLayers.map(l => l.left || 0))
                const minTop = Math.min(...imageLayers.map(l => l.top || 0))
                const maxRight = Math.max(...imageLayers.map(l => (l.left || 0) + (l.width || 0)))
                const maxBottom = Math.max(...imageLayers.map(l => (l.top || 0) + (l.height || 0)))
                const psdWidth = Math.max(1, maxRight - minLeft)
                const psdHeight = Math.max(1, maxBottom - minTop)

                // 2) 取得目前視區中心座標（若不可用則用 0）
                const viewportCenter = excalidrawAPI.getAppState?.().scrollX !== undefined
                    ? {
                        x: excalidrawAPI.getAppState().scrollX * -1 + (excalidrawAPI.getAppState().width || 0) / 2,
                        y: excalidrawAPI.getAppState().scrollY * -1 + (excalidrawAPI.getAppState().height || 0) / 2,
                    }
                    : { x: 0, y: 0 }

                // 3) 計算把 PSD 整體置中的平移量
                const centerOffsetX = viewportCenter.x - (minLeft + psdWidth / 2)
                const centerOffsetY = viewportCenter.y - (minTop + psdHeight / 2)

                console.log(`PSD 邊界: (${minLeft}, ${minTop}) - (${maxRight}, ${maxBottom}), 尺寸: ${psdWidth}x${psdHeight}`)
                console.log(`置中偏移: (${centerOffsetX}, ${centerOffsetY})，開始添加 ${imageLayers.length} 個圖層`)

                // 保持PSD原始布局：所有图层按照PSD的原始位置排列
                console.log('使用PSD原始布局，保持图层相对位置关系')

                // 按照PSD的层级顺序添加图层（从底层到顶层）
                // 注意：PSD中索引小的图层在底层，索引大的图层在顶层
                const sortedLayers = [...imageLayers].sort((a, b) => a.index - b.index)
                console.log('图层排序（从底层到顶层）:', sortedLayers.map(l => ({ index: l.index, name: l.name })))

                for (let i = 0; i < sortedLayers.length; i++) {
                    const layer = sortedLayers[i]

                    // 使用PSD原始坐标 + 整体居中偏移
                    const finalOffsetX = centerOffsetX
                    const finalOffsetY = centerOffsetY

                    console.log(`添加圖層 ${i + 1}/${sortedLayers.length}: "${layer.name}" (索引: ${layer.index})`, {
                        layer,
                        originalPosition: { x: layer.left, y: layer.top },
                        finalPosition: { x: layer.left + finalOffsetX, y: layer.top + finalOffsetY },
                        size: { width: layer.width, height: layer.height },
                        layoutMode: 'original_psd',
                        layerOrder: i + 1
                    })

                    await addLayerToCanvas(layer, psdData.file_id, finalOffsetX, finalOffsetY)

                    // 添加小延遲避免過快請求
                    await new Promise(resolve => setTimeout(resolve, 50))
                }

                // 檢查畫布元素
                const finalElements = excalidrawAPI.getSceneElements()
                console.log('畫布最終元素:', finalElements)

                const imageLayersCount = sortedLayers.filter(l => l.image_url).length
                const placeholderLayersCount = sortedLayers.filter(l => !l.image_url).length

                let message = `已自動添加 ${sortedLayers.length} 個圖層到畫布（保持PSD原始布局）`
                if (placeholderLayersCount > 0) {
                    message += ` - ${imageLayersCount} 個圖像圖層，${placeholderLayersCount} 個占位符`
                }

                toast.success(message)
            } catch (error) {
                console.error('自動添加圖層失敗:', error)
                toast.error('自動添加圖層失敗')
            }
        },
        [excalidrawAPI, addLayerToCanvas]
    )

    const handleFileSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file) return

            if (!file.name.toLowerCase().endsWith('.psd')) {
                toast.error('請選擇 PSD 檔案')
                return
            }

            setUploading(true)
            try {
                const result = await uploadPSD(file)
                toast.success('PSD 檔案上傳成功！')
                onPSDUploaded?.(result)

                // 直接添加所有圖層到畫布，不打開編輯器
                await handleAutoAddLayers(result)
            } catch (error) {
                console.error('上傳失敗:', error)
                toast.error('上傳 PSD 檔案失敗')
            } finally {
                setUploading(false)
                // 清空文件輸入，允許重複選擇同一個文件
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
            }
        },
        [onPSDUploaded, handleAutoAddLayers]
    )

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".psd"
                onChange={handleFileSelect}
                className="hidden"
            />
            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                title="上傳 PSD 檔案"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
            >
                <Upload className="h-4 w-4" />
            </Button>
        </>
    )
}
