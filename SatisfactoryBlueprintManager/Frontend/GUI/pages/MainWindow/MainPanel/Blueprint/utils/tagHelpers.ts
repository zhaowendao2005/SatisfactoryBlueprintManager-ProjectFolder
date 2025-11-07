import type { ActiveBlueprintNode, ActiveBlueprintNodeWithTags, TagDefinition } from '../types'

/**
 * 提取目录路径（不含文件名）
 * @param fullPath 完整路径（含文件名）
 * @param levels 追踪级数
 * @returns 目录路径（不含文件名）
 */
export function extractDirectoryPath(fullPath: string, levels: number): string {
  if (!fullPath) {
    return ''
  }

  // 统一路径分隔符
  const normalized = fullPath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter((p) => p.length > 0)

  if (parts.length === 0) {
    return ''
  }

  // 去掉文件名（最后一段）
  const dirParts = parts.slice(0, -1)

  if (dirParts.length === 0) {
    return ''
  }

  // 如果目录级数少于等于 levels，直接返回
  if (dirParts.length <= levels) {
    return dirParts.join('/')
  }

  // 取最后 n 级目录
  const lastNLevels = dirParts.slice(-levels)

  // 溢出处理：如果超过 50 字符，前2段 + ... + 最后1段
  const joined = lastNLevels.join('/')
  if (joined.length <= 50) {
    return joined
  }

  if (lastNLevels.length >= 3) {
    return `${lastNLevels[0]}/${lastNLevels[1]}/.../${lastNLevels[lastNLevels.length - 1]}`
  }

  return joined
}

/**
 * 拍平树结构为一维蓝图数组
 * @param tree 激活蓝图树
 * @param pathTagLevels 路径追踪级数（用于动态计算 directoryPath）
 * @returns 仅包含蓝图节点的一维数组（不包含分组节点）
 */
export function flattenBlueprintTree(
  tree: ActiveBlueprintNode[],
  pathTagLevels: number
): ActiveBlueprintNodeWithTags[] {
  const result: ActiveBlueprintNodeWithTags[] = []

  const traverse = (nodes: ActiveBlueprintNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'blueprint') {
        // 动态计算 directoryPath（状态驱动）
        const blueprint = { ...node } as ActiveBlueprintNodeWithTags
        if (blueprint.path) {
          blueprint.directoryPath = extractDirectoryPath(blueprint.path, pathTagLevels)
        }
        result.push(blueprint)
      } else if (node.children) {
        traverse(node.children)
      }
    }
  }

  traverse(tree)
  return result
}

/**
 * 路径标签树节点
 */
export interface PathTagTreeNode {
  id: string           // 完整路径作为 ID
  name: string         // 当前层级名称
  fullPath: string     // 完整路径（用于筛选）
  level: number        // 层级深度
  children?: PathTagTreeNode[]
}

/**
 * 从蓝图列表中构建路径标签树
 * @param blueprints 蓝图列表
 * @returns 路径标签树（根节点数组）
 */
export function buildPathTagTree(blueprints: ActiveBlueprintNodeWithTags[]): PathTagTreeNode[] {
  const pathSet = new Set<string>()

  // 收集所有唯一路径
  for (const bp of blueprints) {
    if (bp.directoryPath) {
      pathSet.add(bp.directoryPath)
    }
  }

  const paths = Array.from(pathSet)
  const root: PathTagTreeNode[] = []

  // 构建树结构
  for (const path of paths) {
    const parts = path.split('/').filter(p => p.length > 0)
    let currentLevel = root
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!part) continue

      currentPath = currentPath ? `${currentPath}/${part}` : part

      // 在当前层级查找是否已存在
      let node = currentLevel.find(n => n.name === part)

      if (!node) {
        // 创建新节点
        node = {
          id: `path:${currentPath}`,
          name: part,
          fullPath: currentPath,
          level: i,
          children: [],
        }
        currentLevel.push(node)
      }

      // 移动到下一层级
      if (!node.children) {
        node.children = []
      }
      currentLevel = node.children
    }
  }

  return root
}

/**
 * 从蓝图列表中提取所有唯一的目录路径标签（平铺列表，用于兼容）
 * @param blueprints 蓝图列表
 * @returns 路径标签定义列表
 */
export function extractPathTags(blueprints: ActiveBlueprintNodeWithTags[]): TagDefinition[] {
  const pathSet = new Set<string>()

  for (const bp of blueprints) {
    if (bp.directoryPath) {
      pathSet.add(bp.directoryPath)
    }
  }

  return Array.from(pathSet).map((dirPath) => ({
    id: `path:${dirPath}`,
    name: dirPath,
    color: '#3B82F6', // 蓝色
  }))
}

/**
 * 统一筛选函数（路径标签和用户标签合并处理）
 * @param blueprints 蓝图列表
 * @param activeTags 激活的标签 ID 集合（包含路径标签和用户标签）
 * @param logicMode 统一的逻辑模式（与/或）
 * @returns 筛选后的蓝图列表
 */
export function filterBlueprintsByTags(
  blueprints: ActiveBlueprintNodeWithTags[],
  activeTags: Set<string>,
  logicMode: 'and' | 'or'
): ActiveBlueprintNodeWithTags[] {
  if (activeTags.size === 0) {
    return blueprints
  }

  return blueprints.filter((blueprint) => {
    // 合并路径标签和用户标签
    const pathTagId = blueprint.directoryPath ? `path:${blueprint.directoryPath}` : null
    const userTags = blueprint.tags || []
    const allTags = pathTagId ? [pathTagId, ...userTags] : userTags

    const tagArray = Array.from(activeTags)

    if (logicMode === 'and') {
      // 与逻辑：蓝图必须包含所有选中的标签（路径+用户）
      return tagArray.every((tagId) => allTags.includes(tagId))
    } else {
      // 或逻辑：蓝图只需包含至少一个选中的标签
      return tagArray.some((tagId) => allTags.includes(tagId))
    }
  })
}
