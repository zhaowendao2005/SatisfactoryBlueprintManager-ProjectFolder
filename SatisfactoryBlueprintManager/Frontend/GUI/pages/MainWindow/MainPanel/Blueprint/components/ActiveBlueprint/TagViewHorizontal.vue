<template>
  <div class="tag-view-horizontal">
    <CustomSplitter
      v-model="splitterModel"
      :min="200"
      :max="600"
      class="split-container"
    >
      <template #left>
        <div class="left-panel">
          <TagFilter
            :path-tag-tree="pathTagTree"
            :user-tags="userTags"
            :active-tags="activeTags"
            :logic-mode="logicMode"
            @update:active-tags="handleActiveTagsChange"
            @update:logic-mode="handleLogicModeChange"
            @delete-tag="handleDeleteTag"
          />
        </div>
      </template>

      <template #right>
        <div class="right-panel">
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

          <!-- 栏数控制器 -->
          <ColumnControl v-model:columns="columnCount" />

          <!-- 蓝图卡片网格容器 -->
          <div class="blueprint-grid-container">
            <div
              v-if="filteredBlueprints.length > 0"
              class="blueprint-grid"
              :class="`columns-${columnCount}`"
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

            <div v-else class="empty-state">
              <el-empty description="没有找到符合条件的蓝图" />
            </div>
          </div>
        </div>
      </template>
    </CustomSplitter>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TagDefinition, ActiveBlueprintNodeWithTags } from '../../types'
import { flattenBlueprintTree, filterBlueprintsByTags, buildPathTagTree } from '../../utils/tagHelpers'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'
import { useGlobalTagsStore } from '../../stores/GlobalTags'
import CustomSplitter from './CustomSplitter.vue'
import TagFilter from './TagView/TagFilter.vue'
import BatchOperationBar from './TagView/BatchOperationBar.vue'
import ColumnControl from './TagView/ColumnControl.vue'
import BlueprintCard from './TagView/BlueprintCard.vue'

const activeBlueprintStore = useActiveBlueprintStore()
const globalTagsStore = useGlobalTagsStore()

// Splitter 模型（左侧面板宽度，单位：px）
const splitterModel = ref(300) // 默认左侧 300px

// 状态管理
const activeTags = ref<Set<string>>(new Set())
const logicMode = ref<'and' | 'or'>('and')
const batchMode = ref(false)
const selectedBlueprints = ref<Set<string>>(new Set())

// 栏数控制（持久化到 localStorage）
const columnCount = ref(Number(localStorage.getItem('tagView:columnCount')) || 3)

watch(columnCount, (newValue) => {
  localStorage.setItem('tagView:columnCount', String(newValue))
})

// 拍平树结构为一维蓝图数组（状态驱动：pathTagLevels 变化时自动重新计算）
const allBlueprints = computed(() => {
  const blueprints = flattenBlueprintTree(
    activeBlueprintStore.treeData,
    activeBlueprintStore.pathTagLevels
  )

  // 🔑 关键：从全局Store查询每个蓝图的标签
  return blueprints.map(bp => ({
    ...bp,
    tags: bp.path ? globalTagsStore.getBlueprintTags(bp.path) : []
  })) as ActiveBlueprintNodeWithTags[]
})

// ✅ 标签列表从全局Store获取
const userTags = computed<TagDefinition[]>(() => {
  return globalTagsStore.getAllTags()
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
  activeBlueprintStore.useBlueprint(id)
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
    // ✅ 标签操作仍使用 activeBlueprintStore（内部会委托给全局Store）
    await activeBlueprintStore.batchAddTags(nodeIds, tagId)
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
    // ✅ 标签操作仍使用 activeBlueprintStore（内部会委托给全局Store）
    await activeBlueprintStore.batchRemoveTags(nodeIds, tagId)
    ElMessage.success(`已从 ${nodeIds.length} 个蓝图中移除标签`)
    selectedBlueprints.value.clear()
  } catch (error) {
    console.error('Failed to batch remove tags:', error)
    ElMessage.error(error instanceof Error ? error.message : '批量移除标签失败')
  }
}

const handleCreateTag = async (name: string, color: string): Promise<void> => {
  try {
    // ✅ 标签操作仍使用 activeBlueprintStore（内部会委托给全局Store）
    await activeBlueprintStore.createTag(name, color)
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

    // ✅ 标签操作仍使用 activeBlueprintStore（内部会委托给全局Store）
    await activeBlueprintStore.deleteTag(tagId)
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
.tag-view-horizontal {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;

  .split-container {
    width: 100%;
    height: 100%;
  }

  // 左侧面板：标签筛选器（CustomSplitter 内部已经处理了高度，这里只需要处理内容滚动）
  :deep(.left-panel) {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    background: #fafafa;

    &::-webkit-scrollbar {
      width: 8px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    &::-webkit-scrollbar-track {
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }
  }

  // 右侧面板：其他内容（CustomSplitter 内部已经处理了高度，这里只需要处理内容滚动）
  :deep(.right-panel) {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;

    &::-webkit-scrollbar {
      width: 8px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    &::-webkit-scrollbar-track {
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }

    .blueprint-grid-container {
      height: 500px;
      min-height: 500px;
      flex-shrink: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 4px;

      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.25);
        border-radius: 3px;
      }
      &::-webkit-scrollbar-track {
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 3px;
      }
    }

    .blueprint-grid {
      display: grid;
      gap: 20px;
      padding-bottom: 20px;
      width: 100%;
      min-height: 100%;

      &.columns-2 {
        grid-template-columns: repeat(2, 1fr);
      }
      &.columns-3 {
        grid-template-columns: repeat(3, 1fr);
      }
      &.columns-4 {
        grid-template-columns: repeat(4, 1fr);
      }

      @media (max-width: 640px) {
        &.columns-2,
        &.columns-3,
        &.columns-4 {
          grid-template-columns: 1fr !important;
        }
      }
      @media (min-width: 641px) and (max-width: 920px) {
        &.columns-3,
        &.columns-4 {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      @media (min-width: 921px) and (max-width: 1240px) {
        &.columns-4 {
          grid-template-columns: repeat(3, 1fr) !important;
        }
      }
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
    }
  }
}
</style>

