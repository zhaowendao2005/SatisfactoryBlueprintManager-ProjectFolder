<template>
  <div class="tag-view">
    <!-- 标签筛选器 -->
    <TagFilter
      :path-tag-tree="pathTagTree"
      :user-tags="userTags"
      :active-tags="activeTags"
      :logic-mode="logicMode"
      @update:active-tags="handleActiveTagsChange"
      @update:logic-mode="handleLogicModeChange"
      @delete-tag="handleDeleteTag"
    />

    <!-- 批量操作工具栏 -->
    <BatchOperationBar
      :batch-mode="batchMode"
      :selected-blueprints="selectedBlueprints"
      :all-tags="tags"
      :blueprint-count="filteredBlueprints.length"
      @toggle-batch-mode="handleToggleBatchMode"
      @batch-add-tag="handleBatchAddTag"
      @batch-remove-tag="handleBatchRemoveTag"
      @create-tag="handleCreateTag"
    />

    <!-- 蓝图卡片网格 -->
    <div
      v-if="filteredBlueprints.length > 0"
      class="blueprint-grid"
    >
      <BlueprintCard
        v-for="blueprint in filteredBlueprints"
        :key="blueprint.id"
        :blueprint="blueprint"
        :batch-mode="batchMode"
        :is-selected="selectedBlueprints.has(blueprint.id)"
        :all-tags="tags"
        @toggle-select="handleToggleSelect"
        @use-blueprint="handleUseBlueprint"
      />
    </div>

    <!-- 空状态 -->
    <div
      v-else
      class="empty-state"
    >
      <el-empty description="没有找到符合条件的蓝图" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TagDefinition, ActiveBlueprintNodeWithTags } from '../../types'
import { flattenBlueprintTree, filterBlueprintsByTags, buildPathTagTree } from '../../utils/tagHelpers'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'
import TagFilter from './TagView/TagFilter.vue'
import BatchOperationBar from './TagView/BatchOperationBar.vue'
import BlueprintCard from './TagView/BlueprintCard.vue'

const store = useActiveBlueprintStore()

// 状态管理
const activeTags = ref<Set<string>>(new Set())
const logicMode = ref<'and' | 'or'>('and')
const batchMode = ref(false)
const selectedBlueprints = ref<Set<string>>(new Set())

// 拍平树结构为一维蓝图数组（状态驱动：pathTagLevels 变化时自动重新计算）
const allBlueprints = computed(() => {
  return flattenBlueprintTree(store.treeData, store.pathTagLevels)
})

// 使用 Store 中的动态标签列表 + 路径标签
const userTags = computed<TagDefinition[]>(() => {
  return store.tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
  }))
})

// 构建路径标签树
const pathTagTree = computed(() => {
  return buildPathTagTree(allBlueprints.value)
})

// 合并所有标签（用于其他组件）- 需要从树中提取平铺列表
const tags = computed<TagDefinition[]>(() => {
  const flattenTree = (nodes: any[]): TagDefinition[] => {
    const result: TagDefinition[] = []
    for (const node of nodes) {
      result.push({
        id: node.id,
        name: node.fullPath,
        color: '#3B82F6',
      })
      if (node.children) {
        result.push(...flattenTree(node.children))
      }
    }
    return result
  }
  
  const pathTagsList = flattenTree(pathTagTree.value)
  return [...userTags.value, ...pathTagsList]
})

// 根据标签筛选蓝图
const filteredBlueprints = computed(() => {
  return filterBlueprintsByTags(allBlueprints.value, activeTags.value, logicMode.value)
})

// 事件处理
const handleActiveTagsChange = (tags: Set<string>): void => {
  activeTags.value = tags
}

const handleLogicModeChange = (mode: 'and' | 'or'): void => {
  logicMode.value = mode
}

const handleToggleBatchMode = (): void => {
  batchMode.value = !batchMode.value
  if (!batchMode.value) {
    selectedBlueprints.value.clear()
  }
}

const handleToggleSelect = (id: string): void => {
  if (selectedBlueprints.value.has(id)) {
    selectedBlueprints.value.delete(id)
  } else {
    selectedBlueprints.value.add(id)
  }
}

const handleUseBlueprint = (id: string): void => {
  store.useBlueprint(id)
}

const handleBatchAddTag = async (tagId: string): Promise<void> => {
  if (selectedBlueprints.value.size === 0) {
    ElMessage.warning('请先选择要操作的蓝图')
    return
  }

  // 如果选择数量较多，弹出确认
  if (selectedBlueprints.value.size > 10) {
    try {
      await ElMessageBox.confirm(
        `确定要为 ${selectedBlueprints.value.size} 个蓝图添加标签"${tags.value.find((t) => t.id === tagId)?.name || tagId}"吗？`,
        '批量操作确认',
        {
          type: 'warning',
        }
      )
    } catch {
      return
    }
  }

  try {
    const nodeIds = Array.from(selectedBlueprints.value)
    await store.batchAddTags(nodeIds, tagId)
    ElMessage.success(`已为 ${nodeIds.length} 个蓝图添加标签`)
    selectedBlueprints.value.clear()
  } catch (error) {
    console.error('Failed to batch add tags:', error)
    ElMessage.error(error instanceof Error ? error.message : '批量添加标签失败')
  }
}

const handleBatchRemoveTag = async (tagId: string): Promise<void> => {
  if (selectedBlueprints.value.size === 0) {
    ElMessage.warning('请先选择要操作的蓝图')
    return
  }

  // 如果选择数量较多，弹出确认
  if (selectedBlueprints.value.size > 10) {
    try {
      await ElMessageBox.confirm(
        `确定要从 ${selectedBlueprints.value.size} 个蓝图中移除标签"${tags.value.find((t) => t.id === tagId)?.name || tagId}"吗？`,
        '批量操作确认',
        {
          type: 'warning',
        }
      )
    } catch {
      return
    }
  }

  try {
    const nodeIds = Array.from(selectedBlueprints.value)
    await store.batchRemoveTags(nodeIds, tagId)
    ElMessage.success(`已从 ${nodeIds.length} 个蓝图中移除标签`)
    selectedBlueprints.value.clear()
  } catch (error) {
    console.error('Failed to batch remove tags:', error)
    ElMessage.error(error instanceof Error ? error.message : '批量移除标签失败')
  }
}

const handleCreateTag = async (name: string, color: string): Promise<void> => {
  try {
    await store.createTag(name, color)
    ElMessage.success(`标签"${name}"创建成功`)
  } catch (error) {
    console.error('Failed to create tag:', error)
    ElMessage.error(error instanceof Error ? error.message : '创建标签失败')
  }
}

const handleDeleteTag = async (tagId: string): Promise<void> => {
  const tag = tags.value.find((t) => t.id === tagId)
  if (!tag) {
    return
  }

  // 路径标签不能删除
  if (tagId.startsWith('path:')) {
    ElMessage.warning('路径标签是自动生成的，无法删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除标签"${tag.name}"吗？删除后，所有蓝图中的该标签都将被移除。`,
      '删除标签确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      }
    )

    await store.deleteTag(tagId)
    ElMessage.success(`标签"${tag.name}"已删除`)
    
    // 如果该标签在筛选中，移除它
    if (activeTags.value.has(tagId)) {
      activeTags.value.delete(tagId)
    }
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    console.error('Failed to delete tag:', error)
    ElMessage.error(error instanceof Error ? error.message : '删除标签失败')
  }
}
</script>

<style scoped lang="scss">
.tag-view {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  .blueprint-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }

    @media (min-width: 641px) and (max-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: 1025px) and (max-width: 1440px) {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (min-width: 1441px) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }
}
</style>

