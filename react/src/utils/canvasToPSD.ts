/**
 * 画布转PSD工具函数
 */

export interface CanvasLayer {
    id: number
    name: string
    x: number
    y: number
    width: number
    height: number
    opacity: number
    fileId: string
    dataURL: string
    zIndex: number | string
}

export interface CanvasData {
    width: number
    height: number
    layers: CanvasLayer[]
}

/**
 * 计算画布边界
 */
function calculateCanvasBounds(elements: any[]) {
    if (elements.length === 0) {
        return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 }
    }

    const bounds = elements.reduce(
        (acc, el) => ({
            minX: Math.min(acc.minX, el.x),
            minY: Math.min(acc.minY, el.y),
            maxX: Math.max(acc.maxX, el.x + el.width),
            maxY: Math.max(acc.maxY, el.y + el.height),
        }),
        {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity,
        }
    )

    return {
        ...bounds,
        width: Math.ceil(bounds.maxX - bounds.minX),
        height: Math.ceil(bounds.maxY - bounds.minY),
    }
}

/**
 * 从Excalidraw画布收集所有图片元素数据
 */
export function collectCanvasImageData(
    excalidrawAPI: any
): CanvasData | null {
    try {
        // 1. 获取画布所有元素和文件
        const elements = excalidrawAPI.getSceneElements()
        const files = excalidrawAPI.getFiles()

        // 2. 筛选有效的图片元素
        const imageElements = elements.filter(
            (el: any) => el.type === 'image' && !el.isDeleted && el.fileId && files[el.fileId]
        )

        if (imageElements.length === 0) {
            console.warn('画布上没有图片元素')
            return null
        }

        console.log(`找到 ${imageElements.length} 个图片元素`)

        // 3. 计算画布边界
        const bounds = calculateCanvasBounds(imageElements)

        // 4. 构建图层数据
        const layersData: CanvasLayer[] = imageElements.map((el: any, index: number) => {
            const file = files[el.fileId!]

            return {
                id: index,
                name: el.customData?.layerName || el.customData?.psdLayerIndex !== undefined
                    ? `PSD_Layer_${el.customData.psdLayerIndex}`
                    : `Layer_${index}`,
                x: Math.round(el.x - bounds.minX),
                y: Math.round(el.y - bounds.minY),
                width: Math.round(el.width),
                height: Math.round(el.height),
                opacity: el.opacity,
                fileId: el.fileId as string,
                dataURL: file.dataURL as string,
                zIndex: el.index || index,
            }
        })

        // 5. 按 zIndex 排序（确保图层顺序正确）
        layersData.sort((a, b) => {
            const aIndex = typeof a.zIndex === 'string' ? parseInt(a.zIndex) : a.zIndex
            const bIndex = typeof b.zIndex === 'string' ? parseInt(b.zIndex) : b.zIndex
            return aIndex - bIndex
        })

        const canvasData: CanvasData = {
            width: bounds.width,
            height: bounds.height,
            layers: layersData,
        }

        console.log('画布数据收集完成:', {
            尺寸: `${canvasData.width} × ${canvasData.height}`,
            图层数: canvasData.layers.length,
            边界: bounds,
        })

        return canvasData
    } catch (error) {
        console.error('收集画布数据失败:', error)
        return null
    }
}

/**
 * 验证画布数据
 */
export function validateCanvasData(canvasData: CanvasData | null): boolean {
    if (!canvasData) {
        return false
    }

    if (canvasData.width <= 0 || canvasData.height <= 0) {
        console.error('画布尺寸无效')
        return false
    }

    if (canvasData.layers.length === 0) {
        console.error('没有图层数据')
        return false
    }

    // 验证每个图层
    for (const layer of canvasData.layers) {
        if (!layer.dataURL) {
            console.error(`图层 ${layer.name} 缺少图片数据`)
            return false
        }

        if (layer.width <= 0 || layer.height <= 0) {
            console.error(`图层 ${layer.name} 尺寸无效`)
            return false
        }
    }

    return true
}




