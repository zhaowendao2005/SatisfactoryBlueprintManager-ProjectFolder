<template>
  <div class="blueprint-source">
    <Topbar @add-source="handleAddSource" @refresh="handleRefresh" />
    <TreeView ref="treeViewRef" @show-details="handleShowDetails" @delete="handleDelete" />
    <!-- 详细信息抽屉 -->
    <DetailDrawer v-model="drawerVisible" @close="handleDrawerClose">
      <!-- 内容由使用方自定义 -->
    </DetailDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Topbar from './Topbar.vue'
import TreeView from './TreeView.vue'
import DetailDrawer from '../DetailDrawer.vue'
import { useBlueprintSourceStore } from '../../stores/BlueprintSource'
import { blueprintSourceDatasource } from '../../stores/BlueprintSource/datasource'
import {
  TimeoutError,
  PermissionError,
} from '../../stores/BlueprintSource/datasource'

const store = useBlueprintSourceStore()
const treeViewRef = ref<InstanceType<typeof TreeView>>()
const drawerVisible = ref(false)
const currentNodeId = ref<string | null>(null)

const handleAddSource = async () => {
  try {
    // 调用 datasource 选择并添加源
    const newSource = await blueprintSourceDatasource.selectAndAddSource()

    // 刷新根节点并强制刷新树
    await store.loadRootNodes()
    await treeViewRef.value?.refresh()

    ElMessage.success(`成功添加蓝图源：${newSource.name}`)
  } catch (error) {
    if (error instanceof TimeoutError) {
      ElMessage.error('扫描超时，请尝试更小的目录或增加超时时间')
    } else if (error instanceof PermissionError) {
      ElMessage.error('无法访问目录，请检查权限')
    } else if (error instanceof Error && error.message === '用户取消了选择') {
      // 用户取消，不显示错误
    } else if (error instanceof Error && error.message.includes('已存在')) {
      ElMessage.warning(error.message)
    } else {
      ElMessage.error(`添加失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

const handleRefresh = async () => {
  try {
    await store.refresh()
    // 强制刷新树视图
    await treeViewRef.value?.refresh()
    ElMessage.success('刷新成功')
  } catch (error) {
    console.error('Failed to refresh:', error)
    ElMessage.error(`刷新失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleShowDetails = (nodeId: string) => {
  currentNodeId.value = nodeId
  drawerVisible.value = true
}

const handleDrawerClose = () => {
  drawerVisible.value = false
  currentNodeId.value = null
}

const handleDelete = async (nodeId: string) => {
  try {
    // 查找源信息以显示名称
    const source = store.sources.find((s) => s.path === nodeId)
    const sourceName = source?.name || nodeId

    // 确认删除
    await ElMessageBox.confirm(
      `确定要删除蓝图源 "${sourceName}" 吗？此操作不会删除文件系统中的文件，只会移除该源的管理状态。`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      }
    )

    // 删除源（nodeId 是源路径）
    await store.removeSource(nodeId)

    // 刷新树
    await treeViewRef.value?.refresh()

    ElMessage.success('删除成功')
  } catch (error) {
    // 用户取消或其他错误
    if (error !== 'cancel') {
      console.error('Failed to delete source:', error)
      ElMessage.error(`删除失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
</script>

<style scoped lang="scss">
.blueprint-source {
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: 400px;
  display: flex;
  flex-direction: column;
}
</style>

