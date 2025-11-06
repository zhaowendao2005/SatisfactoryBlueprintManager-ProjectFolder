<template>
  <div class="source-tree-view" @contextmenu.prevent="handleContextMenu">
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
      @node-contextmenu="handleNodeContextMenu"
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

    <!-- 上下文菜单 -->
    <ContextMenu
      v-if="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      @activate-selected="handleBatchActivate"
      @close="contextMenuVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { ElTree } from 'element-plus'
import TreeNode from './TreeNode.vue'
import ContextMenu from './ContextMenu.vue'
import type { BlueprintNode } from '../../types'
import { useBlueprintSourceStore } from '../../stores/BlueprintSource'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'

const emit = defineEmits<{
  (e: 'show-details', nodeId: string): void
  (e: 'delete', nodeId: string): void
}>()

const store = useBlueprintSourceStore()
const activeBlueprintStore = useActiveBlueprintStore()
const treeRef = ref<InstanceType<typeof ElTree>>()
const treeKey = ref(0) // 用于强制重新渲染树

const expandedKeys = computed(() => store.expandedKeys)
const checkedKeys = computed(() => store.checkedKeys)

// 上下文菜单相关
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

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
  // 同步所有选中的keys到store
    const checkedKeys = checkedInfo.checkedKeys.map((key) => String(key))
  // 过滤出蓝图节点
  const blueprintKeys = checkedKeys.filter(key => {
    const node = store.findNodeById(key)
    return node && node.type === 'blueprint'
  })
  store.checkedKeys = blueprintKeys
}

const handleActivate = async (nodeId: string) => {
  try {
    // 检查是否有配置
    if (!activeBlueprintStore.hasActiveConfig()) {
      ElMessage.error('请先创建或选择一个配置')
      return
    }

    await store.activateBlueprint(nodeId)
    ElMessage.success('激活成功')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('已激活')) {
      ElMessage.warning(errorMessage)
    } else {
      ElMessage.error(`激活失败：${errorMessage}`)
    }
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

const handleContextMenu = (event: MouseEvent) => {
  // 仅在右键空白区域时显示菜单
  event.preventDefault()
}

const handleNodeContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

const handleBatchActivate = async () => {
  try {
    // 检查是否有配置
    if (!activeBlueprintStore.hasActiveConfig()) {
      ElMessage.error('请先创建或选择一个配置')
      contextMenuVisible.value = false
      return
    }

    // 获取所有选中的节点（包括目录节点，智能分组算法会处理）
    const allCheckedKeys = treeRef.value?.getCheckedKeys() as string[] || []
    
    // 如果没有选中任何项，提示用户
    if (allCheckedKeys.length === 0) {
      ElMessage.warning('请先勾选要激活的蓝图或目录')
      contextMenuVisible.value = false
      return
    }
    
    // 使用增强版批量激活（支持懒加载目录深度遍历）
    await activeBlueprintStore.batchActivateBlueprintsEnhanced(allCheckedKeys, store.treeData)
    ElMessage.success(`成功激活选中项`)

    // 清空选中状态
    store.checkedKeys = []
    if (treeRef.value) {
      treeRef.value.setCheckedKeys([])
    }
    contextMenuVisible.value = false
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    ElMessage.error(`批量激活失败：${errorMessage}`)
    contextMenuVisible.value = false
  }
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

