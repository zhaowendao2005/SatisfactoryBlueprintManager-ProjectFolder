<template>
  <div class="source-tree-view">
    <el-tree
      ref="treeRef"
      :key="treeKey"
      :props="treeProps"
      :lazy="true"
      :load="loadNode"
      :show-checkbox="true"
      node-key="id"
      :default-expanded-keys="expandedKeys"
      :default-checked-keys="checkedKeys"
      @check="handleCheck"
    >
      <template #default="{ node, data }">
        <TreeNode
          :node="node"
          :data="data"
          @activate="handleActivate"
          @deactivate="handleDeactivate"
          @show-details="handleShowDetails"
          @delete="handleDelete"
        />
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ElTree } from 'element-plus'
import TreeNode from './TreeNode.vue'
import type { BlueprintNode } from '../../types'
import { useBlueprintSourceStore } from '../../stores/BlueprintSource'

const emit = defineEmits<{
  (e: 'show-details', nodeId: string): void
  (e: 'delete', nodeId: string): void
}>()

const store = useBlueprintSourceStore()
const treeRef = ref<InstanceType<typeof ElTree>>()
const treeKey = ref(0) // 用于强制重新渲染树

const expandedKeys = computed(() => store.expandedKeys)
const checkedKeys = computed(() => store.checkedKeys)

// 暴露刷新方法给父组件
const refresh = async () => {
  await store.loadRootNodes()
  // 通过改变 key 强制重新渲染树
  treeKey.value++
}

defineExpose({
  refresh,
})

const treeProps = {
  children: 'children',
  label: 'name',
  isLeaf: (data: unknown) => {
    const node = data as BlueprintNode
    return node.isLeaf ?? node.type === 'blueprint'
  },
}

const loadNode = async (
  node: { level: number; data: unknown },
  resolve: (data: BlueprintNode[]) => void
) => {
  try {
    if (node.level === 0) {
      // 加载根节点
      // 确保 treeData 已加载
      if (store.treeData.length === 0) {
        await store.loadRootNodes()
      }
      // 直接返回当前的 treeData
      resolve(store.treeData)
    } else {
      // 懒加载子节点
      const nodeData = node.data as BlueprintNode
      const children = await store.loadChildren(nodeData.id)
      resolve(children)
    }
  } catch (error) {
    console.error('Failed to load node:', error)
    resolve([])
  }
}

const handleCheck = (
  data: BlueprintNode,
  checkedInfo: { checkedKeys: (string | number)[] }
) => {
  // 仅蓝图节点可以选中
  if (data.type === 'blueprint') {
    const checkedKeys = checkedInfo.checkedKeys.map((key) => String(key))
    store.checkNode(data.id, checkedKeys.includes(data.id))
  }
}

const handleActivate = async (nodeId: string) => {
  try {
    await store.activateBlueprint(nodeId)
  } catch (error) {
    console.error('Failed to activate blueprint:', error)
  }
}

const handleDeactivate = async (nodeId: string) => {
  try {
    await store.deactivateBlueprint(nodeId)
  } catch (error) {
    console.error('Failed to deactivate blueprint:', error)
  }
}

const handleShowDetails = (nodeId: string) => {
  emit('show-details', nodeId)
}

const handleDelete = (nodeId: string) => {
  emit('delete', nodeId)
}
</script>

<style scoped lang="scss">
.source-tree-view {
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
// 默认使用较小的高度（目录节点）
:deep(.el-tree-node__content) {
  height: auto !important;
  min-height: 26px; // Element Plus 默认最小高度
  line-height: 26px;
}

// 蓝图节点自适应高度（支持多行内容）
// 通过 :deep 穿透，蓝图节点的高度由 TreeNode 组件内的样式控制
</style>

