<template>
  <div class="path-tag-tree">
    <PathTagTreeNode
      v-for="node in tree"
      :key="node.id"
      :node="node"
      :active-tags="activeTags"
      :expanded-keys="expandedKeys"
      :parent-path="''"
      @toggle-tag="handleToggleTag"
      @change-logic="handleChangeLogic"
      @toggle-expand="handleToggleExpand"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PathTagTreeNode from './PathTagTreeNode.vue'
import type { PathTagTreeNode as PathTagTreeNodeType } from '../../../utils/tagHelpers'
import type { ActiveTagsMap } from '../../../types'

interface Props {
  tree: PathTagTreeNodeType[]
  activeTags: ActiveTagsMap
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-tag', tagId: string): void
  (e: 'change-logic', tagId: string, logic: 'and' | 'or' | 'not'): void
}>()

// 展开的节点 ID 集合
const expandedKeys = ref<Set<string>>(new Set<string>())

const handleToggleTag = (tagId: string): void => {
  emit('toggle-tag', tagId)
}

const handleChangeLogic = (tagId: string, logic: 'and' | 'or' | 'not'): void => {
  emit('change-logic', tagId, logic)
}

// 手风琴模式：展开/折叠节点
const handleToggleExpand = (nodeId: string, parentPath: string): void => {
  const newExpandedKeys = new Set(expandedKeys.value)
  
  if (newExpandedKeys.has(nodeId)) {
    // 折叠：移除该节点及其所有子节点
    const removeNodeAndChildren = (id: string, nodes: PathTagTreeNodeType[]): void => {
      newExpandedKeys.delete(id)
      const node = findNodeById(id, nodes)
      if (node?.children) {
        for (const child of node.children) {
          removeNodeAndChildren(child.id, nodes)
        }
      }
    }
    removeNodeAndChildren(nodeId, props.tree)
  } else {
    // 展开：先移除同级的其他节点（手风琴模式）
    const findSiblings = (nodes: PathTagTreeNodeType[], parent: string): string[] => {
      if (parent === parentPath) {
        return nodes.map(n => n.id)
      }
      
      for (const node of nodes) {
        if (node.children) {
          const siblings = findSiblings(node.children, node.fullPath)
          if (siblings.length > 0) {
            return siblings
          }
        }
      }
      
      return []
    }
    
    const siblings = findSiblings(props.tree, parentPath)
    
    // 移除同级的其他展开节点
    siblings.forEach(siblingId => {
      if (siblingId !== nodeId) {
        newExpandedKeys.delete(siblingId)
      }
    })
    
    // 添加当前节点
    newExpandedKeys.add(nodeId)
  }
  
  expandedKeys.value = newExpandedKeys
}

// 辅助函数：根据 ID 查找节点
const findNodeById = (id: string, nodes: PathTagTreeNodeType[]): PathTagTreeNodeType | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (node.children) {
      const found = findNodeById(id, node.children)
      if (found) {
        return found
      }
    }
  }
  return null
}
</script>

<style scoped lang="scss">
.path-tag-tree {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>

