import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { TemplateItem } from '@/types/types'
import { getPSDTemplateLayers, applyPSDTemplate } from '@/api/upload'

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
        psdData.layers.forEach((layer: any, index: number) => {
            if (!layer.visible || !layer.image_url) return

            const elementId = `psd-template-${template.id}-layer-${layer.index}-${Date.now()}`

            // 计算图层位置（相对于PSD文件的位置）
            const layerX = position.x + (layer.left || 0)
            const layerY = position.y + (layer.top || 0)

            // 创建图片元素
            const imageElement = {
                id: elementId,
                type: 'image' as const,
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
                opacity: Math.round((layer.opacity || 255) / 255 * 100),
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
                    psdLayerIndex: layer.index,
                    psdLayerName: layer.name,
                    psdLayerType: layer.type
                },
                fileId: null,
                status: 'saved' as const,
                scale: [1, 1] as [number, number],
                // 图片相关属性
                src: layer.image_url,
                alt: layer.name,
                // 添加缺失的属性
                version: 1,
                index: `a${Date.now()}` as any
            }

            newElements.push(imageElement)
        })

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

            console.log(`PSD模板 "${template.name}" 已应用到画布`, {
                templateId: template.id,
                layersCount: newElements.length,
                position: position
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
export function applyTemplateToExcalidraw(
    excalidrawAPI: ExcalidrawImperativeAPI,
    template: TemplateItem,
    position?: { x: number; y: number }
): void {
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
            if (template.preview_url) {
                newElements = [{
                    id: `template-${template.id}-${Date.now()}`,
                    type: 'image',
                    x: defaultPosition.x,
                    y: defaultPosition.y,
                    width: 200,
                    height: 150,
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
                    // 图片相关属性
                    src: template.preview_url,
                    alt: template.name
                }]
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
                originalText: template.name
            }]
            break

        case 'psd_layer':
            // 创建PSD图层元素
            newElements = [{
                id: `template-${template.id}-${Date.now()}`,
                type: 'rectangle',
                x: defaultPosition.x,
                y: defaultPosition.y,
                width: 200,
                height: 150,
                angle: 0,
                strokeColor: '#000000',
                backgroundColor: '#f0f0f0',
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
                    psdLayerData: template.metadata
                },
                fileId: null,
                status: 'saved',
                scale: [1, 1]
            }]
            break

        case 'canvas_element':
            // 创建画布元素
            newElements = [{
                id: `template-${template.id}-${Date.now()}`,
                type: 'rectangle',
                x: defaultPosition.x,
                y: defaultPosition.y,
                width: 200,
                height: 150,
                angle: 0,
                strokeColor: '#000000',
                backgroundColor: '#e0e0e0',
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
                    canvasElementData: template.metadata
                },
                fileId: null,
                status: 'saved',
                scale: [1, 1]
            }]
            break

        default:
            // 默认创建矩形元素
            newElements = [{
                id: `template-${template.id}-${Date.now()}`,
                type: 'rectangle',
                x: defaultPosition.x,
                y: defaultPosition.y,
                width: 200,
                height: 150,
                angle: 0,
                strokeColor: '#000000',
                backgroundColor: '#f5f5f5',
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
                    isTemplate: true
                },
                fileId: null,
                status: 'saved',
                scale: [1, 1]
            }]
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

