import type { ActiveBlueprintNode, ActiveBlueprintNodeWithTags, TagDefinition, ActiveTagsMap } from '../types'

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
 * 统一筛选函数（支持与、或、非三种逻辑）
 * @param blueprints 蓝图列表
 * @param activeTags 激活的标签映射（key: 标签ID, value: 逻辑模式 'and' | 'or' | 'not'）
 * @returns 筛选后的蓝图列表
 * 
 * @逻辑说明：
 * 1. 非(NOT)逻辑：蓝图不能匹配任何"非"标签（优先级最高）
 * 2. 与(AND)逻辑：蓝图必须匹配所有"与"标签
 * 3. 或(OR)逻辑：蓝图需要匹配至少一个"或"标签（如果有"或"标签）
 * 
 * 优先级：非 > 与 > 或
 */
export function filterBlueprintsByTags(
  blueprints: ActiveBlueprintNodeWithTags[],
  activeTags: ActiveTagsMap
): ActiveBlueprintNodeWithTags[] {
  if (activeTags.size === 0) {
    return blueprints
  }

  return blueprints.filter((blueprint) => {
    const blueprintPath = blueprint.directoryPath || ''
    const userTags = blueprint.tags || []

    // 辅助函数：检查标签是否匹配
    const matchesTag = (tagId: string): boolean => {
      // 路径标签：使用前缀匹配（支持层级筛选）
      if (tagId.startsWith('path:')) {
        const tagPath = tagId.substring(5) // 去掉 "path:" 前缀
        // 检查蓝图路径是否以该路径开头
        return blueprintPath.startsWith(tagPath)
      }
      
      // 用户标签：精确匹配
      return userTags.includes(tagId)
    }

    // 分组：与、或、非
    const andTags: string[] = []
    const orTags: string[] = []
    const notTags: string[] = []

    activeTags.forEach((logic, tagId) => {
      if (logic === 'and') {
        andTags.push(tagId)
      } else if (logic === 'or') {
        orTags.push(tagId)
      } else if (logic === 'not') {
        notTags.push(tagId)
      }
    })

    // 1. 非(NOT)逻辑：蓝图不能匹配任何"非"标签（优先级最高）
    if (notTags.length > 0) {
      const matchesAnyNot = notTags.some(matchesTag)
      if (matchesAnyNot) {
        return false // 匹配了"非"标签，排除
      }
    }

    // 2. 与(AND)逻辑：蓝图必须匹配所有"与"标签
    if (andTags.length > 0) {
      const matchesAllAnd = andTags.every(matchesTag)
      if (!matchesAllAnd) {
        return false // 没有匹配所有"与"标签，排除
      }
    }

    // 3. 或(OR)逻辑：蓝图需要匹配至少一个"或"标签（如果有"或"标签）
    if (orTags.length > 0) {
      const matchesAnyOr = orTags.some(matchesTag)
      if (!matchesAnyOr) {
        return false // 没有匹配任何"或"标签，排除
      }
    }

    // 如果只有"与"标签，已经在上面的逻辑中处理了
    // 如果只有"或"标签，已经在上面的逻辑中处理了
    // 如果只有"非"标签，已经在上面的逻辑中处理了
    // 如果混合使用，按照优先级处理

    return true
  })
}
