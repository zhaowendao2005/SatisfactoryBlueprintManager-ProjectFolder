/**
 * 蓝图信息格式化工具
 * 从库解析的完整 blueprint 对象中提取和格式化关键信息
 */
import type { BlueprintInfo } from 'blueprint-info'

/**
 * 格式化后的蓝图信息（用于展示）
 */
export interface FormattedBlueprintInfo {
  // 作者信息（从 description 提取）
  author: string | null        // 作者标识，如 "云景设计"，null 表示无作者信息
  
  // 基本信息
  name: string                 // 蓝图名称（blueprint.name）
  description: string          // 完整描述（blueprint.config.description）
  color: string                // CSS rgba 格式颜色
  iconID: number               // 图标 ID
  
  // 技术信息
  buildVersion: number         // 游戏版本
  saveVersion: number          // 存档版本
  designerDimension: string    // 设计尺寸，格式化为 "6m × 6m × 6m"
  objectCount: number          // 对象数量
  recipeCount: number          // 配方数量
  
  // 成本信息
  itemCosts: Array<{           // 建造成本列表
    itemName: string           // 物品名称（从 pathName 提取）
    itemClass: string          // 完整类路径
    amount: number             // 数量
  }>
  
  // 文件信息
  fileSize: {
    sbp: number
    sbpcfg: number
    total: number              // 总大小
  }
  parsedAt: number             // 解析时间
}

/**
 * 蓝图信息格式化器
 */
export class BlueprintInfoFormatter {
  /**
   * 格式化完整的蓝图信息
   */
  format(blueprintInfo: BlueprintInfo): FormattedBlueprintInfo {
    const blueprint = blueprintInfo.blueprint as {
      name?: string
      header?: {
        buildVersion?: number
        saveVersion?: number
        designerDimension?: {
          x?: number
          y?: number
          z?: number
        }
        recipeReferences?: Array<unknown>
        itemCosts?: Array<[{ pathName?: string }, number]>
      }
      config?: {
        description?: string
        color?: {
          r?: number
          g?: number
          b?: number
          a?: number
        }
        iconID?: number
      }
      objects?: unknown[]
    }

    const header = blueprint.header || {}
    const config = blueprint.config || {}
    const description = config.description || ''

    // 提取颜色（带默认值）
    const color = config.color || { r: 1, g: 1, b: 1, a: 1 }
    const colorWithDefaults = {
      r: color.r ?? 1,
      g: color.g ?? 1,
      b: color.b ?? 1,
      a: color.a ?? 1,
    }

    // 提取尺寸（带默认值）
    const dimension = header.designerDimension || { x: 0, y: 0, z: 0 }
    const dimensionWithDefaults = {
      x: dimension.x ?? 0,
      y: dimension.y ?? 0,
      z: dimension.z ?? 0,
    }

    return {
      author: this.extractAuthor(description),
      name: blueprint.name || 'Unknown',
      description,
      color: this.formatColor(colorWithDefaults),
      iconID: config.iconID || 0,
      buildVersion: header.buildVersion || 0,
      saveVersion: header.saveVersion || 0,
      designerDimension: this.formatDimension(dimensionWithDefaults),
      objectCount: blueprint.objects?.length || 0,
      recipeCount: header.recipeReferences?.length || 0,
      itemCosts: this.formatItemCosts(header.itemCosts || []),
      fileSize: {
        sbp: blueprintInfo.fileSize.sbp,
        sbpcfg: blueprintInfo.fileSize.sbpcfg,
        total: blueprintInfo.fileSize.sbp + blueprintInfo.fileSize.sbpcfg,
      },
      parsedAt: blueprintInfo.parsedAt,
    }
  }

  /**
   * 从描述中提取作者信息
   * @注意事项 优先提取中文作者信息，支持多种格式：
   * - [云景设计] [CLOUD SCENERY DESIGN] → 提取 "云景设计"
   * - [云景设计] → 提取 "云景设计"
   * - [CLOUD SCENERY DESIGN] → 提取 "CLOUD SCENERY DESIGN"
   * - [xxx设计] → 提取 "xxx设计"
   */
  extractAuthor(description: string): string | null {
    if (!description || !description.trim()) return null

    // 匹配模式（按优先级排序）
    const patterns = [
      /\[([^\]]*设计[^\]]*)\]/u,                    // 优先：匹配包含"设计"的中文作者，如 [云景设计]
      /\[([A-Z\s]+DESIGN[^\]]*)\]/i,                // 其次：匹配英文 DESIGN，如 [CLOUD SCENERY DESIGN]
      /^\[([^\]]+)\]/u,                              // 最后：匹配开头的第一个方括号内容
    ]

    // 尝试所有模式，找到第一个匹配的
    for (const pattern of patterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        const author = match[1].trim()
        // 确保提取到的内容不为空
        if (author.length > 0) {
          return author
        }
      }
    }

    return null
  }

  /**
   * 格式化物品成本列表
   */
  formatItemCosts(
    itemCosts: Array<[{ pathName?: string }, number]>
  ): Array<{ itemName: string; itemClass: string; amount: number }> {
    return itemCosts.map(([itemRef, amount]) => {
      const pathName = itemRef.pathName || ''
      return {
        itemName: this.extractItemName(pathName),
        itemClass: pathName,
        amount: amount || 0,
      }
    })
  }

  /**
   * 从 pathName 提取物品名称
   */
  private extractItemName(pathName: string): string {
    if (!pathName) return 'Unknown'

    // 提取最后一段：Desc_ItemName.Desc_ItemName_C
    const lastSegment = pathName.split('/').pop() || pathName

    // 提取 Desc_ 后面的部分
    const match = lastSegment.match(/Desc_([^.]+)/)
    if (match && match[1]) {
      return match[1]
    }

    // 兜底：返回最后一段去掉后缀
    return lastSegment.replace(/\..*$/, '')
  }

  /**
   * 格式化尺寸信息
   */
  formatDimension(dimension: { x: number; y: number; z: number }): string {
    const { x, y, z } = dimension
    return `${x}m × ${y}m × ${z}m`
  }

  /**
   * 格式化颜色为 CSS rgba
   */
  formatColor(color: { r: number; g: number; b: number; a: number }): string {
    const { r, g, b, a } = color
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`
  }
}

export const blueprintInfoFormatter = new BlueprintInfoFormatter()

