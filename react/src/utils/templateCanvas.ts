import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { TemplateItem } from '@/types/types'
import { getPSDTemplateLayers, applyPSDTemplate } from '@/api/upload'

/**
 * 将图片URL转换为Base64数据URL（带重试机制）
 */
async function convertImageUrlToDataURL(imageUrl: string, retries: number = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`正在加載圖片 (嘗試 ${attempt}/${retries}):`, imageUrl)

            const response = await fetch(imageUrl, {
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-cache'
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const blob = await response.blob()
            console.log('圖片加載成功，大小:', blob.size, 'bytes')

            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                    console.log('圖片轉換為Base64成功')
                    resolve(reader.result as string)
                }
                reader.onerror = (error) => {
                    console.error('FileReader錯誤:', error)
                    reject(error)
                }
                reader.readAsDataURL(blob)
            })
        } catch (error) {
            console.error(`圖片加載失敗 (嘗試 ${attempt}/${retries}):`, error)

            if (attempt === retries) {
                console.error('所有重試嘗試都失敗了')
                console.error('圖片URL:', imageUrl)
                throw error
            }

            // 等待一段時間後重試
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
    }

    throw new Error('Unexpected error in convertImageUrlToDataURL')
}

/**
 * 创建Excalidraw图片元素（使用Excalidraw內建方法）
 */
async function createImageElement(
    excalidrawAPI: ExcalidrawImperativeAPI,
    imageUrl: string,
    elementData: any
): Promise<any> {
    try {
        console.log('正在創建圖片元素:', imageUrl)

        // 直接使用fetch獲取圖片
        const response = await fetch(imageUrl, {
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-cache'
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const blob = await response.blob()
        console.log('圖片加載成功，大小:', blob.size, 'bytes')

        // 創建File對象
        const file = new File([blob], `template-${Date.now()}.png`, { type: 'image/png' })

        // 轉換為Base64
        const dataURL = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })

        // 生成唯一的文件ID
        const fileId = `template-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as any

        // 创建Excalidraw文件数据
        const fileData = {
            mimeType: 'image/png' as const,
            id: fileId,
            dataURL: dataURL as any,
            created: Date.now()
        }

        // 添加到Excalidraw文件系统
        excalidrawAPI.addFiles([fileData])
        console.log('文件已添加到Excalidraw:', fileId)

        // 等待文件完全加載
        await new Promise(resolve => setTimeout(resolve, 200))

        // 创建图片元素
        const imageElement = {
            ...elementData,
            type: 'image' as const,
            fileId: fileId,
            // 移除src属性，使用fileId
            src: undefined,
            alt: undefined,
            // 添加圖片元素必需的屬性
            crop: null
        }

        console.log('圖片元素創建成功:', imageElement.id, 'fileId:', fileId)
        return imageElement
    } catch (error) {
        console.error('Failed to create image element:', error)
        console.error('圖片URL:', imageUrl)
        throw error
    }
}

/**
 * 处理PSD文件模板
 */
async function handlePSDFileTemplate(
    template: TemplateItem,
    position: { x: number; y: number },
    excalidrawAPI: ExcalidrawImperativeAPI
): Promise<void> {
    try {
        // 获取PSD模板的图层信息
        const psdData = await getPSDTemplateLayers(template.id)

        if (!psdData.layers || psdData.layers.length === 0) {
            console.warn('PSD模板没有图层数据')
            return
        }

        const elements = excalidrawAPI.getSceneElements()
        const newElements: any[] = []

        // 为每个图层创建Excalidraw元素
        for (const layer of psdData.layers) {
            if (!layer.visible || !layer.image_url) {
                console.log(`跳过图层 ${layer.name}: visible=${layer.visible}, image_url=${layer.image_url}`)
                continue
            }

            const elementId = `psd-template-${template.id}-layer-${layer.index}-${Date.now()}`

            // 计算图层位置（相对于PSD文件的位置）
            const layerX = position.x + (layer.left || 0)
            const layerY = position.y + (layer.top || 0)

            console.log(`创建PSD图层元素: ${layer.name}`, {
                image_url: layer.image_url,
                position: { x: layerX, y: layerY },
                size: { width: layer.width, height: layer.height }
            })

            try {
                // 创建图片元素数据
                const elementData = {
                    id: elementId,
                    x: layerX,
                    y: layerY,
                    width: layer.width || 100,
                    height: layer.height || 100,
                    angle: 0,
                    strokeColor: '#000000',
                    backgroundColor: 'transparent',
                    fillStyle: 'solid' as const,
                    strokeWidth: 0,
                    strokeStyle: 'solid' as const,
                    roughness: 1,
                    opacity: layer.opacity || 255,
                    groupIds: [],
                    frameId: null,
                    roundness: null,
                    seed: Math.random(),
                    versionNonce: Math.random(),
                    isDeleted: false,
                    boundElements: [],
                    updated: Date.now(),
                    link: null,
                    locked: false,
                    customData: {
                        templateId: template.id,
                        templateName: template.name,
                        templateType: template.type,
                        isTemplate: true,
                        psdLayerIndex: layer.index,
                        psdLayerName: layer.name,
                        psdLayerType: layer.type
                    },
                    status: 'saved' as const,
                    scale: [1, 1] as [number, number],
                    // Excalidraw图片元素必需属性
                    version: 1,
                    index: null
                }

                // 使用新的图片创建方法
                const imageElement = await createImageElement(excalidrawAPI, layer.image_url, elementData)
                newElements.push(imageElement)
            } catch (error) {
                console.error(`创建图层 ${layer.name} 失败:`, error)

                // 創建占位符元素作為降級處理
                const placeholderElement = {
                    id: elementId,
                    type: 'rectangle' as const,
                    x: layerX,
                    y: layerY,
                    width: layer.width || 100,
                    height: layer.height || 100,
                    angle: 0,
                    strokeColor: '#3b82f6',
                    backgroundColor: '#f0f9ff',
                    fillStyle: 'solid' as const,
                    strokeWidth: 2,
                    strokeStyle: 'solid' as const,
                    roughness: 1,
                    opacity: layer.opacity || 255,
                    groupIds: [],
                    frameId: null,
                    roundness: null,
                    seed: Math.random(),
                    versionNonce: Math.random(),
                    isDeleted: false,
                    boundElements: [],
                    updated: Date.now(),
                    link: null,
                    locked: false,
                    customData: {
                        templateId: template.id,
                        templateName: template.name,
                        templateType: template.type,
                        isTemplate: true,
                        isPlaceholder: true,
                        psdLayerIndex: layer.index,
                        psdLayerName: layer.name,
                        psdLayerType: layer.type,
                        originalImageUrl: layer.image_url,
                        errorMessage: error instanceof Error ? error.message : String(error)
                    },
                    status: 'saved' as const,
                    scale: [1, 1] as [number, number],
                    version: 1,
                    index: `a${Date.now()}` as any
                }

                newElements.push(placeholderElement)
                console.log(`已為圖層 ${layer.name} 創建占位符`)
            }
        }

        // 将新元素添加到画布
        if (newElements.length > 0) {
            console.log('正在添加', newElements.length, '個元素到畫布')

            // 獲取當前畫布元素
            const currentElements = excalidrawAPI.getSceneElements()
            console.log('當前畫布元素數量:', currentElements.length)

            // 添加新元素到畫布
            excalidrawAPI.updateScene({
                elements: [...currentElements, ...newElements]
            })

            // 选中新创建的元素
            excalidrawAPI.updateScene({
                appState: {
                    selectedElementIds: newElements.reduce((acc, element) => {
                        acc[element.id] = true
                        return acc
                    }, {} as Record<string, boolean>)
                }
            })

            console.log(`PSD模板 "${template.name}" 已应用到画布`, {
                templateId: template.id,
                layersCount: newElements.length,
                position: position,
                newElements: newElements.map(el => ({
                    id: el.id,
                    type: el.type,
                    fileId: el.fileId,
                    customData: el.customData
                }))
            })
        }

    } catch (error) {
        console.error('应用PSD模板失败:', error)
        // 如果PSD模板应用失败，创建一个占位符元素
        createPSDTemplatePlaceholder(template, position, excalidrawAPI)
    }
}

/**
 * 创建PSD模板占位符
 */
function createPSDTemplatePlaceholder(
    template: TemplateItem,
    position: { x: number; y: number },
    excalidrawAPI: ExcalidrawImperativeAPI
): void {
    const elements = excalidrawAPI.getSceneElements()
    const appState = excalidrawAPI.getAppState()

    const placeholderElement = {
        id: `psd-template-placeholder-${template.id}-${Date.now()}`,
        type: 'rectangle' as const,
        x: position.x,
        y: position.y,
        width: 300,
        height: 200,
        angle: 0,
        strokeColor: '#3b82f6',
        backgroundColor: '#f0f9ff',
        fillStyle: 'solid' as const,
        strokeWidth: 2,
        strokeStyle: 'solid' as const,
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1000000),
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        customData: {
            templateId: template.id,
            templateName: template.name,
            templateType: template.type,
            isTemplate: true,
            isPlaceholder: true
        },
        fileId: null,
        status: 'saved' as const,
        scale: [1, 1] as [number, number],
        // 添加缺失的属性
        version: 1,
        index: `a${Date.now()}` as any
    }

    excalidrawAPI.updateScene({
        elements: [...elements, placeholderElement]
    })

    excalidrawAPI.updateScene({
        appState: {
            selectedElementIds: { [placeholderElement.id]: true }
        }
    })

    console.log(`PSD模板占位符已创建: ${template.name}`)
}

/**
 * 将模板应用到Excalidraw画布
 */
export async function applyTemplateToExcalidraw(
    excalidrawAPI: ExcalidrawImperativeAPI,
    template: TemplateItem,
    position?: { x: number; y: number }
): Promise<void> {
    if (!excalidrawAPI) {
        console.error('Excalidraw API not available')
        return
    }

    const elements = excalidrawAPI.getSceneElements()
    const appState = excalidrawAPI.getAppState()

    // 计算默认位置（如果没有指定）
    const defaultPosition = position || {
        x: appState.scrollX + appState.width / 2 - 100,
        y: appState.scrollY + appState.height / 2 - 100
    }

    // 根据模板类型创建不同的元素
    let newElements: any[] = []

    switch (template.type) {
        case 'psd_file':
            // PSD文件模板 - 异步处理
            handlePSDFileTemplate(template, defaultPosition, excalidrawAPI)
            return

        case 'image':
            // 创建图片元素
            if (template.preview_url || template.thumbnail_url) {
                try {
                    const elementData = {
                        id: `template-${template.id}-${Date.now()}`,
                        x: defaultPosition.x,
                        y: defaultPosition.y,
                        width: 200,
                        height: 150,
                        angle: 0,
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 0,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        customData: {
                            templateId: template.id,
                            templateName: template.name,
                            templateType: template.type,
                            isTemplate: true
                        },
                        status: 'saved',
                        scale: [1, 1],
                        version: 1,
                        index: `a${Date.now()}` as any
                    }

                    const imageElement = await createImageElement(excalidrawAPI, template.preview_url || template.thumbnail_url!, elementData)
                    newElements = [imageElement]
                } catch (error) {
                    console.error('创建图片模板失败:', error)
                    // 创建占位符
                    newElements = [{
                        id: `template-${template.id}-${Date.now()}`,
                        type: 'rectangle',
                        x: defaultPosition.x,
                        y: defaultPosition.y,
                        width: 200,
                        height: 150,
                        angle: 0,
                        strokeColor: '#6b7280',
                        backgroundColor: '#f9fafb',
                        fillStyle: 'solid',
                        strokeWidth: 2,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        customData: {
                            templateId: template.id,
                            templateName: template.name,
                            templateType: template.type,
                            isTemplate: true,
                            isPlaceholder: true
                        },
                        fileId: null,
                        status: 'saved',
                        scale: [1, 1],
                        version: 1,
                        index: `a${Date.now()}` as any
                    }]
                }
            }
            break

        case 'text_style':
            // 创建文本元素
            newElements = [{
                id: `template-${template.id}-${Date.now()}`,
                type: 'text',
                x: defaultPosition.x,
                y: defaultPosition.y,
                width: 200,
                height: 50,
                angle: 0,
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'solid',
                strokeWidth: 1,
                strokeStyle: 'solid',
                roughness: 1,
                opacity: 100,
                groupIds: [],
                frameId: null,
                roundness: null,
                seed: Math.floor(Math.random() * 1000000),
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                boundElements: null,
                updated: Date.now(),
                link: null,
                locked: false,
                customData: {
                    templateId: template.id,
                    templateName: template.name,
                    templateType: template.type,
                    isTemplate: true
                },
                fileId: null,
                status: 'saved',
                scale: [1, 1],
                // 文本相关属性
                text: template.name,
                fontSize: 20,
                fontFamily: 1,
                textAlign: 'left',
                verticalAlign: 'top',
                containerId: null,
                originalText: template.name,
                // 添加缺失的属性
                version: 1,
                index: `a${Date.now()}` as any
            }]
            break

        case 'psd_layer':
            // 创建PSD图层元素 - 如果有预览图则创建图片元素，否则创建占位符
            if (template.preview_url || template.thumbnail_url) {
                try {
                    const elementData = {
                        id: `template-${template.id}-${Date.now()}`,
                        x: defaultPosition.x,
                        y: defaultPosition.y,
                        width: 200,
                        height: 150,
                        angle: 0,
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 0,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        customData: {
                            templateId: template.id,
                            templateName: template.name,
                            templateType: template.type,
                            isTemplate: true,
                            psdLayerData: template.metadata
                        },
                        status: 'saved',
                        scale: [1, 1],
                        version: 1,
                        index: `a${Date.now()}` as any
                    }

                    const imageElement = await createImageElement(excalidrawAPI, template.preview_url || template.thumbnail_url!, elementData)
                    newElements = [imageElement]
                } catch (error) {
                    console.error('创建PSD图层模板失败:', error)
                    // 创建占位符
                    newElements = [{
                        id: `template-${template.id}-${Date.now()}`,
                        type: 'rectangle',
                        x: defaultPosition.x,
                        y: defaultPosition.y,
                        width: 200,
                        height: 150,
                        angle: 0,
                        strokeColor: '#3b82f6',
                        backgroundColor: '#f0f9ff',
                        fillStyle: 'solid',
                        strokeWidth: 2,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        customData: {
                            templateId: template.id,
                            templateName: template.name,
                            templateType: template.type,
                            isTemplate: true,
                            isPlaceholder: true,
                            psdLayerData: template.metadata
                        },
                        fileId: null,
                        status: 'saved',
                        scale: [1, 1],
                        version: 1,
                        index: `a${Date.now()}` as any
                    }]
                }
            } else {
                // 没有预览图时创建占位符
                newElements = [{
                    id: `template-${template.id}-${Date.now()}`,
                    type: 'rectangle',
                    x: defaultPosition.x,
                    y: defaultPosition.y,
                    width: 200,
                    height: 150,
                    angle: 0,
                    strokeColor: '#3b82f6',
                    backgroundColor: '#f0f9ff',
                    fillStyle: 'solid',
                    strokeWidth: 2,
                    strokeStyle: 'solid',
                    roughness: 1,
                    opacity: 100,
                    groupIds: [],
                    frameId: null,
                    roundness: null,
                    seed: Math.random(),
                    versionNonce: Math.random(),
                    isDeleted: false,
                    boundElements: [],
                    updated: Date.now(),
                    link: null,
                    locked: false,
                    customData: {
                        templateId: template.id,
                        templateName: template.name,
                        templateType: template.type,
                        isTemplate: true,
                        isPlaceholder: true,
                        psdLayerData: template.metadata
                    },
                    fileId: null,
                    status: 'saved',
                    scale: [1, 1],
                    version: 1,
                    index: `a${Date.now()}` as any
                }]
            }
            break

        case 'canvas_element':
            // 创建画布元素 - 如果有预览图则创建图片元素，否则创建占位符
            if (template.preview_url || template.thumbnail_url) {
                try {
                    const elementData = {
                        id: `template-${template.id}-${Date.now()}`,
                        x: defaultPosition.x,
                        y: defaultPosition.y,
                        width: 200,
                        height: 150,
                        angle: 0,
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 0,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        customData: {
                            templateId: template.id,
                            templateName: template.name,
                            templateType: template.type,
                            isTemplate: true,
                            canvasElementData: template.metadata
                        },
                        status: 'saved',
                        scale: [1, 1],
                        version: 1,
                        index: `a${Date.now()}` as any
                    }

                    const imageElement = await createImageElement(excalidrawAPI, template.preview_url || template.thumbnail_url!, elementData)
                    newElements = [imageElement]
                } catch (error) {
                    console.error('创建画布元素模板失败:', error)
                    // 创建占位符
                    newElements = [{
                        id: `template-${template.id}-${Date.now()}`,
                        type: 'rectangle',
                        x: defaultPosition.x,
                        y: defaultPosition.y,
                        width: 200,
                        height: 150,
                        angle: 0,
                        strokeColor: '#10b981',
                        backgroundColor: '#ecfdf5',
                        fillStyle: 'solid',
                        strokeWidth: 2,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        customData: {
                            templateId: template.id,
                            templateName: template.name,
                            templateType: template.type,
                            isTemplate: true,
                            isPlaceholder: true,
                            canvasElementData: template.metadata
                        },
                        fileId: null,
                        status: 'saved',
                        scale: [1, 1],
                        version: 1,
                        index: `a${Date.now()}` as any
                    }]
                }
            } else {
                // 没有预览图时创建占位符
                newElements = [{
                    id: `template-${template.id}-${Date.now()}`,
                    type: 'rectangle',
                    x: defaultPosition.x,
                    y: defaultPosition.y,
                    width: 200,
                    height: 150,
                    angle: 0,
                    strokeColor: '#10b981',
                    backgroundColor: '#ecfdf5',
                    fillStyle: 'solid',
                    strokeWidth: 2,
                    strokeStyle: 'solid',
                    roughness: 1,
                    opacity: 100,
                    groupIds: [],
                    frameId: null,
                    roundness: null,
                    seed: Math.random(),
                    versionNonce: Math.random(),
                    isDeleted: false,
                    boundElements: [],
                    updated: Date.now(),
                    link: null,
                    locked: false,
                    customData: {
                        templateId: template.id,
                        templateName: template.name,
                        templateType: template.type,
                        isTemplate: true,
                        isPlaceholder: true,
                        canvasElementData: template.metadata
                    },
                    fileId: null,
                    status: 'saved',
                    scale: [1, 1],
                    version: 1,
                    index: `a${Date.now()}` as any
                }]
            }
            break

        default:
            // 默认创建矩形元素 - 如果有预览图则创建图片元素，否则创建占位符
            if (template.preview_url || template.thumbnail_url) {
                try {
                    const elementData = {
                        id: `template-${template.id}-${Date.now()}`,
                        x: defaultPosition.x,
                        y: defaultPosition.y,
                        width: 200,
                        height: 150,
                        angle: 0,
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 0,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        customData: {
                            templateId: template.id,
                            templateName: template.name,
                            templateType: template.type,
                            isTemplate: true
                        },
                        status: 'saved',
                        scale: [1, 1],
                        version: 1,
                        index: `a${Date.now()}` as any
                    }

                    const imageElement = await createImageElement(excalidrawAPI, template.preview_url || template.thumbnail_url!, elementData)
                    newElements = [imageElement]
                } catch (error) {
                    console.error('创建默认模板失败:', error)
                    // 创建占位符
                    newElements = [{
                        id: `template-${template.id}-${Date.now()}`,
                        type: 'rectangle',
                        x: defaultPosition.x,
                        y: defaultPosition.y,
                        width: 200,
                        height: 150,
                        angle: 0,
                        strokeColor: '#6b7280',
                        backgroundColor: '#f9fafb',
                        fillStyle: 'solid',
                        strokeWidth: 2,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        frameId: null,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                        customData: {
                            templateId: template.id,
                            templateName: template.name,
                            templateType: template.type,
                            isTemplate: true,
                            isPlaceholder: true
                        },
                        fileId: null,
                        status: 'saved',
                        scale: [1, 1],
                        version: 1,
                        index: `a${Date.now()}` as any
                    }]
                }
            } else {
                // 没有预览图时创建占位符
                newElements = [{
                    id: `template-${template.id}-${Date.now()}`,
                    type: 'rectangle',
                    x: defaultPosition.x,
                    y: defaultPosition.y,
                    width: 200,
                    height: 150,
                    angle: 0,
                    strokeColor: '#6b7280',
                    backgroundColor: '#f9fafb',
                    fillStyle: 'solid',
                    strokeWidth: 2,
                    strokeStyle: 'solid',
                    roughness: 1,
                    opacity: 100,
                    groupIds: [],
                    frameId: null,
                    roundness: null,
                    seed: Math.random(),
                    versionNonce: Math.random(),
                    isDeleted: false,
                    boundElements: [],
                    updated: Date.now(),
                    link: null,
                    locked: false,
                    customData: {
                        templateId: template.id,
                        templateName: template.name,
                        templateType: template.type,
                        isTemplate: true,
                        isPlaceholder: true
                    },
                    fileId: null,
                    status: 'saved',
                    scale: [1, 1],
                    version: 1,
                    index: `a${Date.now()}` as any
                }]
            }
            break
    }

    // 将新元素添加到画布
    if (newElements.length > 0) {
        excalidrawAPI.updateScene({
            elements: [...elements, ...newElements]
        })

        // 选中新创建的元素
        excalidrawAPI.updateScene({
            appState: {
                selectedElementIds: newElements.reduce((acc, element) => {
                    acc[element.id] = true
                    return acc
                }, {} as Record<string, boolean>)
            }
        })

        console.log(`模板 "${template.name}" 已应用到画布`, {
            templateId: template.id,
            templateType: template.type,
            elementsCount: newElements.length,
            position: defaultPosition
        })
    }
}

/**
 * 从画布中移除模板元素
 */
export function removeTemplateFromExcalidraw(
    excalidrawAPI: ExcalidrawImperativeAPI,
    templateId: string
): void {
    if (!excalidrawAPI) {
        console.error('Excalidraw API not available')
        return
    }

    const elements = excalidrawAPI.getSceneElements()
    const filteredElements = elements.filter(element =>
        !element.customData?.templateId || element.customData.templateId !== templateId
    )

    excalidrawAPI.updateScene({
        elements: filteredElements
    })

    console.log(`模板 ${templateId} 已从画布中移除`)
}

/**
 * 获取画布中的所有模板元素
 */
export function getTemplateElementsFromExcalidraw(
    excalidrawAPI: ExcalidrawImperativeAPI
): any[] {
    if (!excalidrawAPI) {
        return []
    }

    const elements = excalidrawAPI.getSceneElements()
    return elements.filter(element => element.customData?.isTemplate === true)
}

