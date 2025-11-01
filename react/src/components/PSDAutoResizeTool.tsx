import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Upload, Download, Eye, Settings, CheckCircle, AlertCircle } from 'lucide-react'

interface ResizeResult {
    success: boolean
    file_id: string
    original_size: { width: number; height: number }
    target_size: { width: number; height: number }
    layers_count: number
    output_url: string
    metadata_url: string
    new_positions: Array<{
        id: number
        name: string
        type: string
        level: number
        visible: boolean
        original_coords: { left: number; top: number; right: number; bottom: number }
        new_coords: { left: number; top: number; right: number; bottom: number }
        scale_factor?: number
        adjustment_reason?: string
        quality_check?: string
        warnings?: string[]
    }>
}

interface PreviewResult {
    success: boolean
    preview: {
        original_size: { width: number; height: number }
        target_size: { width: number; height: number }
        layers_count: number
        adjustments: Array<any>
        summary: {
            total_layers: number
            adjusted_layers: number
            scale_ratio: number
        }
    }
}

export function PSDAutoResizeTool() {
    const [file, setFile] = useState<File | null>(null)
    const [targetWidth, setTargetWidth] = useState<number>(800)
    const [targetHeight, setTargetHeight] = useState<number>(600)
    const [apiKey, setApiKey] = useState<string>('')
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const [currentStep, setCurrentStep] = useState<string>('')
    const [result, setResult] = useState<ResizeResult | null>(null)
    const [preview, setPreview] = useState<PreviewResult | null>(null)
    const [error, setError] = useState<string>('')
    const [showPreview, setShowPreview] = useState<boolean>(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0]
        if (selectedFile && selectedFile.name.toLowerCase().endsWith('.psd')) {
            setFile(selectedFile)
            setError('')
        } else {
            setError('請選擇有效的PSD文件')
        }
    }

    const handlePreview = async () => {
        if (!file) {
            setError('請先選擇PSD文件')
            return
        }

        setIsProcessing(true)
        setProgress(0)
        setCurrentStep('正在分析PSD文件...')
        setError('')

        try {
            const formData = new FormData()
            formData.append('psd_file', file)
            formData.append('target_width', targetWidth.toString())
            formData.append('target_height', targetHeight.toString())
            if (apiKey) {
                formData.append('api_key', apiKey)
            }

            setProgress(30)
            setCurrentStep('正在調用Gemini API生成縮放方案...')

            const response = await fetch('/api/psd/resize/preview-resize', {
                method: 'POST',
                body: formData,
            })

            setProgress(80)
            setCurrentStep('正在處理響應...')

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || '預覽失敗')
            }

            const previewData: PreviewResult = await response.json()
            setPreview(previewData)
            setShowPreview(true)
            setProgress(100)
            setCurrentStep('預覽完成')

        } catch (err) {
            setError(err instanceof Error ? err.message : '預覽失敗')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleResize = async () => {
        if (!file) {
            setError('請先選擇PSD文件')
            return
        }

        setIsProcessing(true)
        setProgress(0)
        setCurrentStep('正在上傳PSD文件...')
        setError('')

        try {
            const formData = new FormData()
            formData.append('psd_file', file)
            formData.append('target_width', targetWidth.toString())
            formData.append('target_height', targetHeight.toString())
            if (apiKey) {
                formData.append('api_key', apiKey)
            }

            setProgress(20)
            setCurrentStep('正在提取圖層信息...')

            const response = await fetch('/api/psd/resize/auto-resize', {
                method: 'POST',
                body: formData,
            })

            setProgress(50)
            setCurrentStep('正在調用Gemini API生成縮放方案...')

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || '縮放失敗')
            }

            setProgress(80)
            setCurrentStep('正在重建PSD並渲染...')

            const resultData: ResizeResult = await response.json()
            setResult(resultData)
            setProgress(100)
            setCurrentStep('縮放完成')

        } catch (err) {
            setError(err instanceof Error ? err.message : '縮放失敗')
        } finally {
            setIsProcessing(false)
        }
    }

    const downloadResult = () => {
        if (result?.output_url) {
            window.open(result.output_url, '_blank')
        }
    }

    const downloadMetadata = () => {
        if (result?.metadata_url) {
            window.open(result.metadata_url, '_blank')
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        PSD智能縮放工具
                    </CardTitle>
                    <CardDescription>
                        使用Gemini AI自動分析PSD文件並智能縮放圖層，保持設計美觀和專業性
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 文件上傳 */}
                    <div className="space-y-2">
                        <Label htmlFor="psd-file">選擇PSD文件</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                ref={fileInputRef}
                                id="psd-file"
                                type="file"
                                accept=".psd"
                                onChange={handleFileChange}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                瀏覽
                            </Button>
                        </div>
                        {file && (
                            <div className="text-sm text-muted-foreground">
                                已選擇: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}
                    </div>

                    {/* 目標尺寸設置 */}
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
                            onClick={handlePreview}
                            disabled={!file || isProcessing}
                            variant="outline"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            預覽縮放方案
                        </Button>
                        <Button
                            onClick={handleResize}
                            disabled={!file || isProcessing}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Settings className="h-4 w-4 mr-2" />
                            )}
                            開始智能縮放
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 預覽結果 */}
            {preview && showPreview && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            縮放預覽
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>原始尺寸</Label>
                                <div className="text-lg font-semibold">
                                    {preview.preview.original_size.width} × {preview.preview.original_size.height}
                                </div>
                            </div>
                            <div>
                                <Label>目標尺寸</Label>
                                <div className="text-lg font-semibold">
                                    {preview.preview.target_size.width} × {preview.preview.target_size.height}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold">{preview.preview.summary.total_layers}</div>
                                <div className="text-sm text-muted-foreground">總圖層數</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{preview.preview.summary.adjusted_layers}</div>
                                <div className="text-sm text-muted-foreground">調整圖層數</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">
                                    {(preview.preview.summary.scale_ratio * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-muted-foreground">縮放比例</div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={() => setShowPreview(false)} variant="outline">
                                關閉預覽
                            </Button>
                            <Button onClick={handleResize} disabled={isProcessing}>
                                確認並執行縮放
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 縮放結果 */}
            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            縮放完成
                        </CardTitle>
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

                        <div className="text-center">
                            <div className="text-2xl font-bold">{result.layers_count}</div>
                            <div className="text-sm text-muted-foreground">處理圖層數</div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label>圖層調整詳情</Label>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {result.new_positions.map((layer) => (
                                    <div key={layer.id} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium">{layer.name}</div>
                                            <Badge variant="secondary">{layer.type}</Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <div>原始位置: ({layer.original_coords.left}, {layer.original_coords.top}) - ({layer.original_coords.right}, {layer.original_coords.bottom})</div>
                                            <div>新位置: ({layer.new_coords.left}, {layer.new_coords.top}) - ({layer.new_coords.right}, {layer.new_coords.bottom})</div>
                                            {layer.scale_factor && (
                                                <div>縮放比例: {(layer.scale_factor * 100).toFixed(1)}%</div>
                                            )}
                                            {layer.adjustment_reason && (
                                                <div>調整原因: {layer.adjustment_reason}</div>
                                            )}
                                            {layer.warnings && layer.warnings.length > 0 && (
                                                <div className="text-orange-600">
                                                    警告: {layer.warnings.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={downloadResult}>
                                <Download className="h-4 w-4 mr-2" />
                                下載縮放結果
                            </Button>
                            <Button onClick={downloadMetadata} variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                下載元數據
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

