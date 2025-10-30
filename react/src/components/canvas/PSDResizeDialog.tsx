import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, Eye, Settings, AlertCircle } from 'lucide-react'
import { PSDUploadResponse } from '@/api/upload'
import { useCanvas } from '@/contexts/canvas'
import { toast } from 'sonner'
import { collectCanvasImageData, validateCanvasData } from '@/utils/canvasToPSD'

interface PSDResizeDialogProps {
    psdData: PSDUploadResponse | null
    isOpen: boolean
    onClose: () => void
}

export function PSDResizeDialog({ psdData, isOpen, onClose }: PSDResizeDialogProps) {
    const { excalidrawAPI } = useCanvas()
    const [resizeMode, setResizeMode] = useState<'psd' | 'canvas'>('psd') // 新增：缩放模式
    const [outputFormat, setOutputFormat] = useState<'png' | 'psd'>('png') // 新增：输出格式
    const [layeredMode, setLayeredMode] = useState<boolean>(false) // 新增：分层模式
    const [targetWidth, setTargetWidth] = useState<number>(800)
    const [targetHeight, setTargetHeight] = useState<number>(600)
    const [apiKey, setApiKey] = useState<string>('')
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const [currentStep, setCurrentStep] = useState<string>('')
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string>('')

    // 添加缩放后的图片到画布
    const addResizedImageToCanvas = useCallback(async (imageUrl: string, width: number, height: number) => {
        if (!excalidrawAPI) {
            console.error('excalidrawAPI 不可用')
            toast.error('画布API不可用')
            return
        }

        try {
            console.log('正在添加缩放后的图片到画布:', imageUrl)

            // 获取图片
            const response = await fetch(imageUrl)
            if (!response.ok) {
                throw new Error(`获取图片失败: ${response.status}`)
            }

            const blob = await response.blob()
            const file = new File([blob], `resized_${Date.now()}.png`, { type: 'image/png' })

            // 转换为 Base64
            const dataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(file)
            })

            // 生成唯一的文件ID
            const fileId = `resized-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

            // 创建 Excalidraw 文件数据
            const fileData = {
                mimeType: 'image/png' as const,
                id: fileId as any,
                dataURL: dataURL as any,
                created: Date.now()
            }

            // 添加到 Excalidraw 文件系统
            excalidrawAPI.addFiles([fileData])
            console.log('文件已添加到 Excalidraw:', fileId)

            // 等待文件完全加载
            await new Promise(resolve => setTimeout(resolve, 200))

            // 获取当前画布元素
            const currentElements = excalidrawAPI.getSceneElements()

            // 计算画布中心位置
            const appState = excalidrawAPI.getAppState()
            const canvasWidth = appState.width || 800
            const canvasHeight = appState.height || 600
            const centerX = (canvasWidth - width) / 2
            const centerY = (canvasHeight - height) / 2

            // 创建图片元素
            const imageElement = {
                type: 'image' as const,
                id: `resized-${Date.now()}`,
                x: centerX > 0 ? centerX : 100,
                y: centerY > 0 ? centerY : 100,
                width: width,
                height: height,
                angle: 0,
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'solid' as const,
                strokeWidth: 0,
                strokeStyle: 'solid' as const,
                roughness: 1,
                opacity: 100,
                groupIds: [],
                frameId: null,
                roundness: null,
                seed: Math.floor(Math.random() * 1000000),
                version: 1,
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                boundElements: null,
                updated: Date.now(),
                link: null,
                locked: false,
                fileId: fileId as any,
                scale: [1, 1] as [number, number],
                status: 'saved' as const,
                index: null,
                crop: null,
                customData: {
                    isResizedPSD: true,
                    originalPSDFileId: psdData?.file_id,
                    resizedAt: Date.now()
                }
            } as any

            // 更新场景，添加新图片元素
            excalidrawAPI.updateScene({
                elements: [...currentElements, imageElement],
            })

            console.log('缩放后的图片已添加到画布')
            toast.success('缩放后的图片已添加到画布')

        } catch (error) {
            console.error('添加图片到画布失败:', error)
            toast.error('添加图片到画布失败: ' + (error instanceof Error ? error.message : '未知错误'))
        }
    }, [excalidrawAPI, psdData])

    // 添加多个图层到画布
    const addLayeredImagesToCanvas = useCallback(async (layers: any[]) => {
        if (!excalidrawAPI) {
            console.error('excalidrawAPI 不可用')
            toast.error('画布API不可用')
            return
        }

        try {
            console.log(`正在添加 ${layers.length} 个图层到画布`)

            const elements: any[] = []
            const files: any[] = []

            for (const layer of layers) {
                try {
                    // 获取图层图像
                    const response = await fetch(layer.image_url)
                    if (!response.ok) {
                        throw new Error(`获取图层 ${layer.name} 失败: ${response.status}`)
                    }

                    const blob = await response.blob()
                    const file = new File([blob], `${layer.name}.png`, { type: 'image/png' })

                    // 转换为 Base64
                    const dataURL = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve(reader.result as string)
                        reader.onerror = reject
                        reader.readAsDataURL(file)
                    })

                    // 生成唯一的文件ID
                    const fileId = `layer-${layer.index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

                    // 创建 Excalidraw 文件数据
                    const fileData = {
                        mimeType: 'image/png' as const,
                        id: fileId as any,
                        dataURL: dataURL as any,
                        created: Date.now()
                    }

                    files.push(fileData)

                    // 创建图片元素
                    const imageElement = {
                        type: 'image' as const,
                        id: `resized-layer-${layer.index}-${Date.now()}`,
                        x: layer.left,
                        y: layer.top,
                        width: layer.width,
                        height: layer.height,
                        angle: 0,
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid' as const,
                        strokeWidth: 0,
                        strokeStyle: 'solid' as const,
                        roughness: 1,
                        opacity: layer.opacity,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        version: 1,
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        fileId: fileId as any,
                        scale: [1, 1] as [number, number],
                        status: 'saved' as const,
                        index: null,
                        crop: null,
                        customData: {
                            isResizedLayer: true,
                            layerIndex: layer.index,
                            layerName: layer.name,
                            resizedAt: Date.now()
                        }
                    } as any

                    elements.push(imageElement)

                    console.log(`✓ 已准备图层 ${layer.index}: ${layer.name}`)

                } catch (error) {
                    console.error(`处理图层 ${layer.name} 失败:`, error)
                    toast.error(`添加图层 ${layer.name} 失败`)
                }
            }

            // 批量添加文件
            excalidrawAPI.addFiles(files)
            console.log(`已添加 ${files.length} 个文件到 Excalidraw`)

            // 等待文件加载
            await new Promise(resolve => setTimeout(resolve, 300))

            // 获取当前画布元素
            const currentElements = excalidrawAPI.getSceneElements()

            // 批量添加图片元素
            excalidrawAPI.updateScene({
                elements: [...currentElements, ...elements],
            })

            console.log(`✓ 成功添加 ${elements.length} 个图层到画布`)
            toast.success(`已添加 ${elements.length} 个可移动图层到画布！`)

        } catch (error) {
            console.error('添加分层图片失败:', error)
            toast.error('添加分层图片失败: ' + (error instanceof Error ? error.message : '未知错误'))
        }
    }, [excalidrawAPI])

    // 缩放整个画布
    const handleCanvasResize = async () => {
        if (!excalidrawAPI) {
            setError('画布API不可用')
            return
        }

        setIsProcessing(true)
        setProgress(0)
        setCurrentStep('正在收集画布数据...')
        setError('')
        setResult(null)

        try {
            // 1. 收集画布数据
            const canvasData = collectCanvasImageData(excalidrawAPI)

            if (!canvasData || !validateCanvasData(canvasData)) {
                throw new Error('画布上没有可缩放的图片元素')
            }

            console.log('收集到的画布数据:', canvasData)

            setProgress(10)
            setCurrentStep('正在创建临时PSD...')

            // 2. 发送画布数据到后端创建PSD并缩放
            const formData = new FormData()
            formData.append('canvas_data', JSON.stringify(canvasData))
            formData.append('target_width', targetWidth.toString())
            formData.append('target_height', targetHeight.toString())
            if (!layeredMode) {
                formData.append('output_format', outputFormat)
            }
            if (apiKey) {
                formData.append('api_key', apiKey)
            }

            setProgress(30)
            setCurrentStep('正在调用Gemini API分析图层（这可能需要1-2分钟）...')

            console.log('开始画布智能缩放:', {
                原始尺寸: `${canvasData.width} × ${canvasData.height}`,
                目标尺寸: `${targetWidth} × ${targetHeight}`,
                图层数: canvasData.layers.length,
                模式: layeredMode ? '分层' : '合成',
                格式: outputFormat
            })

            // 使用AbortController设置超时（180秒）
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 180000)

            try {
                // 根据模式选择不同的API端点
                const apiEndpoint = layeredMode ? '/api/canvas/resize-layered' : '/api/canvas/resize'

                const resizeResponse = await fetch(apiEndpoint, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                })

                clearTimeout(timeoutId)

                if (!resizeResponse.ok) {
                    let errorMessage = '画布缩放失败'
                    try {
                        const errorData = await resizeResponse.json()
                        errorMessage = errorData.detail || errorMessage
                    } catch {
                        errorMessage = `HTTP ${resizeResponse.status}: ${resizeResponse.statusText}`
                    }
                    throw new Error(errorMessage)
                }

                setProgress(90)
                setCurrentStep('正在处理结果...')

                const resultData = await resizeResponse.json()

                setProgress(95)
                setCurrentStep('正在添加图片到画布...')

                // 根据模式选择不同的添加方式
                if (layeredMode && resultData.layers) {
                    // 分层模式：添加多个可移动图层
                    await addLayeredImagesToCanvas(resultData.layers)
                } else if (resultData.output_url) {
                    // 合成模式：添加单张图片
                    await addResizedImageToCanvas(
                        resultData.output_url,
                        resultData.target_size.width,
                        resultData.target_size.height
                    )
                }

                setProgress(100)
                setCurrentStep(layeredMode ? '分层缩放完成' : '画布缩放完成')
                setResult(resultData)

                console.log('画布缩放完成:', resultData)

                if (layeredMode) {
                    toast.success(`已添加 ${resultData.layers?.length || 0} 个可移动图层到画布！`)
                } else {
                    toast.success('画布智能缩放完成！图片已添加到画布')
                }

            } catch (fetchError: any) {
                clearTimeout(timeoutId)

                if (fetchError.name === 'AbortError') {
                    throw new Error('处理超时（超过3分钟）。可能原因：\n1. Gemini API回应慢\n2. 图层数量过多\n3. 网络连接问题\n\n请稍后重试或减少图层数量。')
                }
                throw fetchError
            }

        } catch (err) {
            console.error('画布缩放错误:', err)

            let errorMessage = err instanceof Error ? err.message : '画布缩放失败'

            setError(errorMessage)
            toast.error('画布缩放失败')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleResize = async () => {
        if (!psdData) {
            setError('沒有可用的PSD數據')
            return
        }

        setIsProcessing(true)
        setProgress(0)
        setCurrentStep('正在處理PSD文件...')
        setError('')

        try {
            setProgress(10)
            setCurrentStep('正在準備縮放請求...')

            // 使用新的服務端處理API，直接傳遞file_id，無需下載大文件
            const formData = new FormData()
            formData.append('file_id', psdData.file_id)
            formData.append('target_width', targetWidth.toString())
            formData.append('target_height', targetHeight.toString())
            if (apiKey) {
                formData.append('api_key', apiKey)
            }

            setProgress(30)
            setCurrentStep('正在調用Gemini API分析圖層（這可能需要1-2分鐘）...')

            console.log('開始智能縮放:', {
                file_id: psdData.file_id,
                target_width: targetWidth,
                target_height: targetHeight,
                original_size: { width: psdData.width, height: psdData.height },
                模式: layeredMode ? '分层' : '合成'
            })

            // 使用AbortController設置超時（180秒，因為Gemini API可能需要較長時間）
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 180000) // 180秒超時

            try {
                // 根据模式选择不同的API端点
                const apiEndpoint = layeredMode
                    ? '/api/psd/resize/resize-by-id-layered'
                    : '/api/psd/resize/resize-by-id'

                const resizeResponse = await fetch(apiEndpoint, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                })

                clearTimeout(timeoutId)

                if (!resizeResponse.ok) {
                    let errorMessage = '縮放失敗'
                    try {
                        const errorData = await resizeResponse.json()
                        errorMessage = errorData.detail || errorMessage
                    } catch {
                        errorMessage = `HTTP ${resizeResponse.status}: ${resizeResponse.statusText}`
                    }
                    throw new Error(errorMessage)
                }

                setProgress(90)
                setCurrentStep('正在處理結果...')

                const resultData = await resizeResponse.json()

                setProgress(95)
                setCurrentStep('正在添加图片到画布...')

                // 根据模式选择不同的添加方式
                if (layeredMode && resultData.layers) {
                    // 分层模式：添加多个可移动图层
                    await addLayeredImagesToCanvas(resultData.layers)
                } else if (resultData.output_url) {
                    // 合成模式：添加单张图片
                    await addResizedImageToCanvas(
                        resultData.output_url,
                        resultData.target_size.width,
                        resultData.target_size.height
                    )
                }

                setProgress(100)
                setCurrentStep(layeredMode ? '分层缩放完成' : '縮放完成')
                setResult(resultData)

                console.log('縮放完成:', resultData)

            } catch (fetchError: any) {
                clearTimeout(timeoutId)

                if (fetchError.name === 'AbortError') {
                    throw new Error('處理超時（超過3分鐘）。可能原因：\n1. Gemini API回應慢\n2. 圖層數量過多\n3. 網路連接問題\n\n請稍後重試或減少圖層數量。')
                }
                throw fetchError
            }

        } catch (err) {
            console.error('PSD縮放錯誤:', err)

            let errorMessage = err instanceof Error ? err.message : '縮放失敗'

            setError(errorMessage)
        } finally {
            setIsProcessing(false)
        }
    }

    const downloadResult = () => {
        if (result?.output_url) {
            window.open(result.output_url, '_blank')
        }
    }

    // 如果对话框未打开，不渲染任何内容
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-lg shadow-lg max-w-2xl max-h-[80vh] overflow-auto">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">PSD智能縮放工具</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        ×
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 缩放模式选择 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">缩放模式</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Button
                                    variant={resizeMode === 'psd' ? 'default' : 'outline'}
                                    onClick={() => setResizeMode('psd')}
                                    disabled={isProcessing}
                                    className="flex-1"
                                >
                                    缩放单个PSD文件
                                    {psdData && <span className="text-xs ml-2">({psdData.layers?.length || 0}层)</span>}
                                </Button>
                                <Button
                                    variant={resizeMode === 'canvas' ? 'default' : 'outline'}
                                    onClick={() => setResizeMode('canvas')}
                                    disabled={isProcessing}
                                    className="flex-1"
                                >
                                    缩放整个画布
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PSD文件信息 - 仅在PSD模式下显示 */}
                    {resizeMode === 'psd' && psdData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">當前PSD文件</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <div className="text-sm">
                                            <strong>文件ID:</strong> {psdData.file_id}
                                        </div>
                                        <div className="text-sm">
                                            <strong>原始尺寸:</strong> {psdData.width} × {psdData.height}
                                        </div>
                                        <div className="text-sm">
                                            <strong>圖層數量:</strong> {psdData.layers?.length || 0}
                                        </div>
                                    </div>

                                    {/* 输出模式选择 */}
                                    <div className="space-y-2 pt-2 border-t">
                                        <Label className="text-sm font-medium">输出模式</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={!layeredMode ? 'default' : 'outline'}
                                                onClick={() => setLayeredMode(false)}
                                                disabled={isProcessing}
                                            >
                                                合成模式
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={layeredMode ? 'default' : 'outline'}
                                                onClick={() => setLayeredMode(true)}
                                                disabled={isProcessing}
                                            >
                                                分层模式 ✨
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground mt-2">
                                        💡 提示：
                                        {layeredMode ? (
                                            <span className="text-green-600 font-medium">
                                                {' '}分层模式会在画布上生成 {psdData.layers?.length || 0} 个可独立移动的图层
                                            </span>
                                        ) :
                                            ' 合成模式会将所有图层合成为一张图片'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 画布信息 - 仅在画布模式下显示 */}
                    {resizeMode === 'canvas' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">画布信息</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="text-sm text-muted-foreground">
                                        将缩放画布上的所有图片元素
                                    </div>

                                    {/* 输出模式选择 */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">输出模式</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={!layeredMode ? 'default' : 'outline'}
                                                onClick={() => setLayeredMode(false)}
                                                disabled={isProcessing}
                                            >
                                                合成模式
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={layeredMode ? 'default' : 'outline'}
                                                onClick={() => setLayeredMode(true)}
                                                disabled={isProcessing}
                                            >
                                                分层模式 ✨
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 输出格式选择 - 仅合成模式显示 */}
                                    {!layeredMode && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">输出格式</Label>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={outputFormat === 'png' ? 'default' : 'outline'}
                                                    onClick={() => setOutputFormat('png')}
                                                    disabled={isProcessing}
                                                >
                                                    PNG（图片）
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={outputFormat === 'psd' ? 'default' : 'outline'}
                                                    onClick={() => setOutputFormat('psd')}
                                                    disabled={isProcessing}
                                                >
                                                    PSD（分层）
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-xs text-muted-foreground mt-2">
                                        💡 提示：
                                        {layeredMode ? (
                                            <span className="text-green-600 font-medium">
                                                {' '}分层模式会在画布上生成多个可独立移动的图层，每个图层保存为PNG文件，元数据以JSON格式存储
                                            </span>
                                        ) : outputFormat === 'png' ?
                                            ' PNG模式会将所有图层合成为一张图片' :
                                            ' PSD模式会保留图层结构（实验性功能）'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 目標尺寸設置 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">目標尺寸設置</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="target-width">目標寬度</Label>
                                    <Input
                                        id="target-width"
                                        type="number"
                                        value={targetWidth}
                                        onChange={(e) => setTargetWidth(Number(e.target.value))}
                                        disabled={isProcessing}
                                        min="1"
                                        max="4000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="target-height">目標高度</Label>
                                    <Input
                                        id="target-height"
                                        type="number"
                                        value={targetHeight}
                                        onChange={(e) => setTargetHeight(Number(e.target.value))}
                                        disabled={isProcessing}
                                        min="1"
                                        max="4000"
                                    />
                                </div>
                            </div>

                            {/* API密鑰設置 */}
                            <div className="space-y-2">
                                <Label htmlFor="api-key">Gemini API密鑰 (可選)</Label>
                                <Input
                                    id="api-key"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    disabled={isProcessing}
                                    placeholder="如果不提供，將使用環境變量中的密鑰"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 錯誤提示 */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* 進度條 */}
                    {isProcessing && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{currentStep}</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="w-full" />
                        </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="flex gap-2">
                        <Button
                            onClick={resizeMode === 'canvas' ? handleCanvasResize : handleResize}
                            disabled={resizeMode === 'psd' && !psdData || isProcessing}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Settings className="h-4 w-4 mr-2" />
                            )}
                            {resizeMode === 'canvas' ? '縮放整個畫布' : '開始智能縮放'}
                        </Button>
                    </div>

                    {/* 縮放結果 */}
                    {result && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">縮放完成</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>原始尺寸</Label>
                                        <div className="text-lg font-semibold">
                                            {result.original_size.width} × {result.original_size.height}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>目標尺寸</Label>
                                        <div className="text-lg font-semibold">
                                            {result.target_size.width} × {result.target_size.height}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button onClick={downloadResult}>
                                        <Download className="h-4 w-4 mr-2" />
                                        下載縮放結果
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (result?.output_url) {
                                                addResizedImageToCanvas(
                                                    result.output_url,
                                                    result.target_size.width,
                                                    result.target_size.height
                                                )
                                            }
                                        }}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        添加到画布
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
