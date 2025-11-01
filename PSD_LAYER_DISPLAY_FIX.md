# PSD 圖層顯示問題修復報告

## 🐛 問題描述

用戶報告：上傳 PSD 文件後，雖然顯示"已自動添加 3 個圖層到畫布"的成功消息，但自由畫布中沒有任何組件顯示。

## 🔍 問題分析

經過代碼檢查，發現了以下幾個關鍵問題：

### 1. **透明度設置錯誤**
```typescript
// 問題代碼
opacity: layer.opacity, // 使用 PSD 圖層的原始透明度

// 修復後
opacity: 100, // 設置為 100% 完全不透明
```

### 2. **異步處理問題**
```typescript
// 問題代碼 - FileReader 是異步的，但沒有等待完成
const reader = new FileReader()
reader.onload = () => {
    // 處理邏輯
}
reader.readAsDataURL(file)

// 修復後 - 使用 Promise 等待完成
const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
})
```

### 3. **類型定義問題**
```typescript
// 問題代碼 - 缺少正確的類型定義
const imageElement = {
    type: 'image',
    // ... 其他屬性
}

// 修復後 - 使用正確的 Excalidraw 類型
const imageElement: ExcalidrawImageElement = {
    type: 'image',
    // ... 其他屬性
}
```

### 4. **調試信息不足**
- 缺少詳細的調試日誌
- 無法追蹤圖層添加過程
- 錯誤處理不夠詳細

## ✅ 修復方案

### 1. **修復透明度設置**
```typescript
const imageElement: ExcalidrawImageElement = {
    // ... 其他屬性
    opacity: 100, // 設置為 100% 完全不透明，確保用戶能看到
    // ... 其他屬性
}
```

### 2. **修復異步處理**
```typescript
const addLayerToCanvas = useCallback(
    async (layer: any, psdFileId: string, offsetX: number = 0, offsetY: number = 0) => {
        if (!excalidrawAPI || !layer.image_url) {
            console.error('excalidrawAPI 或 layer.image_url 不可用:', { excalidrawAPI, layer })
            return
        }

        try {
            const response = await fetch(layer.image_url)
            const blob = await response.blob()
            const file = new File([blob], `${layer.name}.png`, { type: 'image/png' })

            // 使用 Promise 等待 FileReader 完成
            const dataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(file)
            })

            // 創建圖層元素
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
                opacity: 100, // 100% 完全不透明
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

            // 添加到畫布
            const currentElements = excalidrawAPI.getSceneElements()
            excalidrawAPI.addFiles([binaryFileData])
            excalidrawAPI.updateScene({
                elements: [...currentElements, imageElement],
            })

            console.log(`成功添加圖層 "${layer.name}" 到畫布`, {
                element: imageElement,
                fileData: binaryFileData
            })
        } catch (error) {
            console.error('添加圖層到畫布失敗:', error)
            toast.error(`添加圖層 "${layer.name}" 失敗: ${error.message}`)
        }
    },
    [excalidrawAPI]
)
```

### 3. **增強調試信息**
```typescript
const handleAutoAddLayers = useCallback(
    async (psdData: PSDUploadResponse) => {
        if (!excalidrawAPI) {
            console.error('excalidrawAPI 不可用')
            return
        }

        console.log('開始處理 PSD 數據:', psdData)
        
        const imageLayers = psdData.layers.filter(layer =>
            layer.type === 'layer' && layer.image_url && layer.visible
        )

        console.log('找到的可見圖層:', imageLayers)

        if (imageLayers.length === 0) {
            toast.info('沒有可添加的圖層')
            return
        }

        try {
            // 計算佈局參數
            const cols = Math.ceil(Math.sqrt(imageLayers.length))
            const cellWidth = 300
            const cellHeight = 200
            const spacing = 50

            console.log(`開始添加 ${imageLayers.length} 個圖層，佈局: ${cols} 列`)

            for (let i = 0; i < imageLayers.length; i++) {
                const layer = imageLayers[i]
                const row = Math.floor(i / cols)
                const col = i % cols

                const offsetX = col * (cellWidth + spacing)
                const offsetY = row * (cellHeight + spacing)

                console.log(`添加圖層 ${i + 1}/${imageLayers.length}: "${layer.name}"`, {
                    layer,
                    position: { x: layer.left + offsetX, y: layer.top + offsetY },
                    size: { width: layer.width, height: layer.height }
                })

                await addLayerToCanvas(layer, psdData.file_id, offsetX, offsetY)

                // 添加小延遲避免過快請求
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            // 檢查畫布元素
            const finalElements = excalidrawAPI.getSceneElements()
            console.log('畫布最終元素:', finalElements)

            toast.success(`已自動添加 ${imageLayers.length} 個圖層到畫布`)
        } catch (error) {
            console.error('自動添加圖層失敗:', error)
            toast.error('自動添加圖層失敗')
        }
    },
    [excalidrawAPI, addLayerToCanvas]
)
```

## 🔧 技術細節

### 1. **Excalidraw API 使用**
- 確保 `excalidrawAPI` 在調用時可用
- 正確使用 `addFiles` 和 `updateScene` 方法
- 使用正確的 `ExcalidrawImageElement` 類型

### 2. **文件處理**
- 使用 `fetch` 獲取圖層圖片
- 使用 `FileReader` 轉換為 Data URL
- 使用 Promise 確保異步操作完成

### 3. **佈局算法**
- 網格佈局：`Math.ceil(Math.sqrt(imageLayers.length))`
- 單元格大小：300x200px
- 間距：50px
- 位置計算：`offsetX = col * (cellWidth + spacing)`

## 🎯 預期結果

修復後，用戶上傳 PSD 文件時應該：

1. ✅ **成功上傳**：顯示"PSD 檔案上傳成功！"
2. ✅ **自動添加**：顯示"已自動添加 X 個圖層到畫布"
3. ✅ **可見圖層**：所有圖層在畫布上清晰可見（100% 不透明）
4. ✅ **正確佈局**：圖層按網格整齊排列
5. ✅ **調試信息**：控制台顯示詳細的處理過程

## 🚀 測試建議

1. **上傳測試**：上傳一個包含多個圖層的 PSD 文件
2. **可見性測試**：確認所有圖層都清晰可見
3. **佈局測試**：確認圖層按網格正確排列
4. **控制台檢查**：查看調試信息確認處理過程
5. **錯誤處理測試**：測試各種錯誤情況的處理

## 📝 總結

通過修復透明度設置、異步處理、類型定義和調試信息，PSD 圖層現在應該能夠正確顯示在自由畫布上。主要改進包括：

- **透明度**：設置為 100% 確保圖層完全可見
- **異步處理**：使用 Promise 確保文件讀取完成
- **類型安全**：使用正確的 Excalidraw 類型
- **調試支持**：添加詳細的日誌信息
- **錯誤處理**：提供更好的錯誤反饋

現在用戶應該能夠看到上傳的 PSD 圖層正確顯示在畫布上！

