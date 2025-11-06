/**
 * 重复蓝图检测器和颜色分配器
 * 职责：检测已激活蓝图中的重复项，并分配唯一颜色
 */
import type { ActiveBlueprintNode } from '../../types'
import type { DuplicateMap, ColorMap } from './types'

/**
 * 预设色板（10个颜色）
 * @注意事项 
 * - 颜色选择基于色彩学原理，区分度高
 * - 在深色和浅色主题下均可见
 */
const PRESET_COLORS: readonly string[] = [
  '#FF6B6B', // 珊瑚红
  '#4ECDC4', // 青绿色
  '#45B7D1', // 天蓝色
  '#FFA07A', // 浅鲑鱼色
  '#98D8C8', // 薄荷绿
  '#F7DC6F', // 金黄色
  '#BB8FCE', // 淡紫色
  '#85C1E2', // 天空蓝
  '#F8B739', // 橙黄色
  '#52B788', // 森林绿
] as const

/**
 * 检测重复蓝图
 * @param treeData 已激活蓝图树
 * @returns DuplicateMap 重复映射表
 */
export function detectDuplicates(treeData: ActiveBlueprintNode[]): DuplicateMap {
  const duplicateMap = new Map<string, string[]>()

  /**
   * 递归遍历树，收集所有蓝图节点
   */
  const collectBlueprints = (nodes: ActiveBlueprintNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'blueprint') {
        const sourcePath = node.sourcePath || node.path
        if (sourcePath) {
          const existing = duplicateMap.get(sourcePath) || []
          existing.push(node.id)
          duplicateMap.set(sourcePath, existing)
        }
      } else if (node.type === 'group' && node.children) {
        collectBlueprints(node.children)
      }
    }
  }

  collectBlueprints(treeData)

  // 过滤：仅保留真正重复的（length > 1）
  const filteredMap = new Map<string, string[]>()
  for (const [sourcePath, nodeIds] of duplicateMap.entries()) {
    if (nodeIds.length > 1) {
      filteredMap.set(sourcePath, nodeIds)
    }
  }

  return filteredMap
}

/**
 * 分配颜色
 * @param duplicateMap 重复映射表
 * @returns ColorMap 颜色映射表
 */
export function allocateColors(duplicateMap: DuplicateMap): ColorMap {
  const colorMap = new Map<string, string>()

  // 对 sourcePath 排序，保证一致性
  const sortedPaths = Array.from(duplicateMap.keys()).sort()

  sortedPaths.forEach((path, index) => {
    if (index < PRESET_COLORS.length) {
      // 使用预设色板
      const color = PRESET_COLORS[index]
      if (color) {
        colorMap.set(path, color)
      }
    } else {
      // HSL 动态生成
      const totalCount = sortedPaths.length
      const hue = ((index - PRESET_COLORS.length) * 360) / (totalCount - PRESET_COLORS.length)
      const saturation = 70
      const lightness = 60
      const hslColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      colorMap.set(path, hslColor)
    }
  })

  return colorMap
}

