import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, Eye, Settings, AlertCircle } from 'lucide-react'
import { PSDUploadResponse } from '@/api/upload'

interface PSDResizeDialogProps {
    psdData: PSDUploadResponse | null
    isOpen: boolean
    onClose: () => void
}

export function PSDResizeDialog({ psdData, isOpen, onClose }: PSDResizeDialogProps) {
    const [targetWidth, setTargetWidth] = useState<number>(800)
    const [targetHeight, setTargetHeight] = useState<number>(600)
    const [apiKey, setApiKey] = useState<string>('')
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const [currentStep, setCurrentStep] = useState<string>('')
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string>('')

    if (!isOpen || !psdData) return null

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
            // 從PSD URL獲取文件數據
            const response = await fetch(psdData.url)
            const blob = await response.blob()
            const psdFile = new File([blob], `psd_${psdData.file_id}.psd`, { type: 'application/octet-stream' })

            const formData = new FormData()
            formData.append('psd_file', psdFile)
            formData.append('target_width', targetWidth.toString())
            formData.append('target_height', targetHeight.toString())
            if (apiKey) {
                formData.append('api_key', apiKey)
            }

            setProgress(50)
            setCurrentStep('正在調用Gemini API...')

            const resizeResponse = await fetch('/api/psd/resize/auto-resize', {
                method: 'POST',
                body: formData,
            })

            if (!resizeResponse.ok) {
                const errorData = await resizeResponse.json()
                throw new Error(errorData.detail || '縮放失敗')
            }

            setProgress(100)
            setCurrentStep('縮放完成')

            const resultData = await resizeResponse.json()
            setResult(resultData)

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
                    {/* PSD文件信息 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">當前PSD文件</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>

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
                            onClick={handleResize}
                            disabled={!psdData || isProcessing}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Settings className="h-4 w-4 mr-2" />
                            )}
                            開始智能縮放
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
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
