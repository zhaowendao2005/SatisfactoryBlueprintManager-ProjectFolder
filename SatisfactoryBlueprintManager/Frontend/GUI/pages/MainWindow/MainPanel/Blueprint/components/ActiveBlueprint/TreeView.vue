<template>
  <div class="active-tree-view">
    <el-tree
      ref="treeRef"
      :data="treeData"
      :props="treeProps"
      :draggable="true"
      :allow-drop="allowDrop as any"
      :show-checkbox="true"
      node-key="id"
      :default-expanded-keys="expandedKeys"
      :default-checked-keys="checkedKeys"
      @node-drop="handleNodeDrop as any"
      @node-contextmenu="handleContextMenu"
      @check="handleCheck"
    >
      <template #default="{ node, data }">
        <TreeNode
          :node="node"
          :data="data"
          @delete="handleDelete"
          @show-details="handleShowDetails"
          @use="handleUse"
        />
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { ElTree } from 'element-plus'
import TreeNode from './TreeNode.vue'
import type { ActiveBlueprintNode } from '../../types'
import type { DropType } from '../../stores/ActiveBlueprint/types'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'

// Element Plus Tree Node 类型
interface TreeNode {
  data: ActiveBlueprintNode
  [key: string]: unknown
}

const emit = defineEmits<{
  (e: 'create-group', parentId: string): void
  (e: 'show-details', nodeId: string): void
}>()

const store = useActiveBlueprintStore()
const treeRef = ref<InstanceType<typeof ElTree>>()

const treeData = computed(() => {
  // Element Plus Tree 需要数组，返回根节点的 children
  return store.rootNode.children || []
})

const expandedKeys = computed(() => store.expandedKeys)
const checkedKeys = computed(() => store.checkedKeys)

const treeProps = {
  children: 'children',
  label: 'name',
}

const allowDrop = (draggingNode: TreeNode, dropNode: TreeNode, type: string): boolean => {
  // 禁止拖拽到蓝图节点内部
  const dropData = dropNode.data
  if (dropData.type === 'blueprint' && type === 'inner') {
    return false
  }
  return true
}

const handleNodeDrop = async (
  draggingNode: TreeNode,
  dropNode: TreeNode,
  dropType: DropType
) => {
  try {
    const dragData = draggingNode.data
    const dropData = dropNode.data
    await store.moveNode(
      dragData.id,
      dropData.id,
      dropType
    )
  } catch (error) {
    console.error('Failed to move node:', error)
  }
}

const handleContextMenu = (
  event: Event,
  data: ActiveBlueprintNode
) => {
  if (data.type === 'group') {
    // 显示右键菜单
    emit('create-group', data.id)
  }
}

const handleCheck = (
  data: ActiveBlueprintNode,
  checkedInfo: { checkedKeys: (string | number)[] }
) => {
  const checkedKeys = checkedInfo.checkedKeys.map((key) => String(key))
  store.checkNode(data.id, checkedKeys.includes(data.id))
}

const handleDelete = async (nodeId: string) => {
  try {
    // 查找节点信息
    const findNode = (nodes: ActiveBlueprintNode[]): ActiveBlueprintNode | null => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return node
        }
        if (node.children) {
          const found = findNode(node.children)
          if (found) {
            return found
          }
        }
      }
      return null
    }

    const node = findNode(store.treeData)
    if (!node) {
      return
    }

    // 如果是分组节点且有子节点，弹出确认对话框
    if (node.type === 'group' && node.children && node.children.length > 0) {
      try {
        await ElMessageBox.confirm(
          `删除分组"${node.name}"时，如何处理其内部的 ${node.children.length} 个子节点？`,
          '删除确认',
          {
            confirmButtonText: '一起删除',
            cancelButtonText: '移到未分组',
            distinguishCancelAndClose: true,
            type: 'warning',
          }
        )
        // 用户选择"一起删除"
        await store.deleteNode(nodeId, true)
      } catch (action) {
        if (action === 'cancel') {
          // 用户选择"移到未分组"
          await store.deleteNode(nodeId, false)
        }
        // 用户点击关闭或取消，不执行任何操作
      }
    } else {
      // 蓝图节点或空分组，直接删除
      await store.deleteNode(nodeId, true)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('不允许删除')) {
      ElMessageBox.alert(errorMessage, '提示', {
        type: 'warning',
      })
    } else {
      console.error('Failed to delete node:', error)
    }
  }
}

const handleShowDetails = (nodeId: string) => {
  emit('show-details', nodeId)
}

const handleUse = (nodeId: string) => {
  store.useBlueprint(nodeId)
}
</script>

<style scoped lang="scss">
.active-tree-view {
  flex: 1;
  overflow-y: scroll;
  padding: 12px 0;

  // 自定义滚动条样式（调低滚动条高度）
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    min-height: 20px; // 设置滚动条滑块最小高度
  }

  &::-webkit-scrollbar-track {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
}

// 覆盖 Element Plus Tree 节点高度（使用 :deep 穿透 scoped）
// 默认使用较小的高度（分组节点）
:deep(.el-tree-node__content) {
  height: auto !important;
  min-height: 26px; // Element Plus 默认最小高度
  line-height: 26px;
}

// 蓝图节点高度通过 TreeNode 组件内的样式设置（56px）
:deep(.node-blueprint) {
  height: 56px !important;
}
</style>

