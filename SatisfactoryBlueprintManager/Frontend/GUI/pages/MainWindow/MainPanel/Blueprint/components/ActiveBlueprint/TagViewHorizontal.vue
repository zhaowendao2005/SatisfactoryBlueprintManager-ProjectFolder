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
            @update:active-tags="handleActiveTagsChange"
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

          <!-- 布局模式控制器 -->
          <LayoutModeControl 
            v-model:layout-mode="layoutMode"
            v-model:card-columns="columnCount"
          />

          <!-- 蓝图卡片网格容器 -->
          <div 
            ref="gridContainerRef"
            class="blueprint-grid-container"
            @mousedown="handleMouseDown"
          >
            <!-- 卡片布局 -->
            <div
              v-if="layoutMode === 'card' && filteredBlueprints.length > 0"
              class="blueprint-grid blueprint-grid-card"
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

            <!-- 桌面布局 -->
            <div
              v-else-if="layoutMode === 'desktop' && filteredBlueprints.length > 0"
              class="blueprint-grid blueprint-grid-desktop"
            >
              <BlueprintDesktopIcon
                v-for="blueprint in filteredBlueprints"
                :key="blueprint.id"
                :ref="(el: any) => { if (el) iconRefs.set(blueprint.id, el) }"
                :blueprint="blueprint"
                :batch-mode="batchMode"
                :is-selected="selectedBlueprints.has(blueprint.id)"
                @toggle-select="handleToggleSelect"
                @use-blueprint="handleUseBlueprint"
                @mousedown="handleIconMouseDown"
              />
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
              <el-empty description="没有找到符合条件的蓝图" />
            </div>

            <!-- 框选选择框（仅桌面布局 + 批量模式） -->
            <div
              v-if="layoutMode === 'desktop' && batchMode && isSelecting"
              class="selection-box"
              :style="selectionBoxStyle"
            />
          </div>
        </div>
      </template>
    </CustomSplitter>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TagDefinition, ActiveBlueprintNodeWithTags, ActiveTagsMap } from '../../types'
import { flattenBlueprintTree, filterBlueprintsByTags, buildPathTagTree } from '../../utils/tagHelpers'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'
import { useGlobalTagsStore } from '../../stores/GlobalTags'
import CustomSplitter from './CustomSplitter.vue'
import TagFilter from './TagView/TagFilter.vue'
import BatchOperationBar from './TagView/BatchOperationBar.vue'
import LayoutModeControl from './TagView/LayoutModeControl.vue'
import BlueprintCard from './TagView/BlueprintCard.vue'
import BlueprintDesktopIcon from './TagView/BlueprintDesktopIcon.vue'

const activeBlueprintStore = useActiveBlueprintStore()
const globalTagsStore = useGlobalTagsStore()

// Splitter 模型（左侧面板宽度，单位：px）
const splitterModel = ref(300) // 默认左侧 300px

// 状态管理
const activeTags = ref<ActiveTagsMap>(new Map())
const batchMode = ref(false)
const selectedBlueprints = ref<Set<string>>(new Set())

// 🆕 框选相关状态
const gridContainerRef = ref<HTMLElement | null>(null)
const iconRefs = new Map<string, any>()
const isSelecting = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionEnd = ref({ x: 0, y: 0 })
const initialSelectedIds = ref<Set<string>>(new Set())
// 🆕 性能优化：缓存图标位置
const iconPositionsCache = new Map<string, { x1: number; y1: number; x2: number; y2: number }>()
let rafId: number | null = null

// 布局模式控制（持久化到 localStorage）
const layoutMode = ref<'card' | 'desktop'>(
  (localStorage.getItem('tagView:layoutMode') as 'card' | 'desktop') || 'card'
)
const columnCount = ref(Number(localStorage.getItem('tagView:columnCount')) || 3)

watch(layoutMode, (newValue) => {
  localStorage.setItem('tagView:layoutMode', newValue)
})

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
  return filterBlueprintsByTags(allBlueprints.value, activeTags.value)
})

// 🆕 选择框样式
const selectionBoxStyle = computed(() => {
  const x1 = Math.min(selectionStart.value.x, selectionEnd.value.x)
  const y1 = Math.min(selectionStart.value.y, selectionEnd.value.y)
  const x2 = Math.max(selectionStart.value.x, selectionEnd.value.x)
  const y2 = Math.max(selectionStart.value.y, selectionEnd.value.y)
  
  return {
    left: `${x1}px`,
    top: `${y1}px`,
    width: `${x2 - x1}px`,
    height: `${y2 - y1}px`,
  }
})

// 事件处理
const handleActiveTagsChange = (tags: ActiveTagsMap): void => {
  activeTags.value = tags
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

// 🆕 框选开始（从容器空白处）
const handleMouseDown = (event: MouseEvent): void => {
  // 只在桌面布局 + 批量模式下启用
  if (layoutMode.value !== 'desktop' || !batchMode.value) return
  
  // 只响应左键，且点击的是容器本身或 grid（不是图标）
  if (event.button !== 0) return
  const target = event.target as HTMLElement
  if (!target.classList.contains('blueprint-grid-container') && 
      !target.classList.contains('blueprint-grid-desktop')) {
    return
  }
  
  startSelection(event)
}

// 🆕 框选开始（从图标上）
const handleIconMouseDown = (event: MouseEvent): void => {
  // 只在桌面布局 + 批量模式下启用
  if (layoutMode.value !== 'desktop' || !batchMode.value) return
  
  // 只响应左键
  if (event.button !== 0) return
  
  // 记录按下位置，等待判断是否是拖动
  const startX = event.clientX
  const startY = event.clientY
  let hasStartedSelection = false
  
  const handleMove = (e: MouseEvent): void => {
    const dx = Math.abs(e.clientX - startX)
    const dy = Math.abs(e.clientY - startY)
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // 如果移动距离超过 5px，开始框选
    if (distance > 5 && !hasStartedSelection) {
      hasStartedSelection = true
      // 移除临时监听器
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      
      // 使用当前鼠标位置开始框选
      const container = gridContainerRef.value
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      
      isSelecting.value = true
      selectionStart.value = {
        x: startX - rect.left + container.scrollLeft,
        y: startY - rect.top + container.scrollTop,
      }
      selectionEnd.value = {
        x: e.clientX - rect.left + container.scrollLeft,
        y: e.clientY - rect.top + container.scrollTop,
      }
      
      // 记录当前已选中的项（用于 Shift 键累加选择）
      initialSelectedIds.value = new Set(selectedBlueprints.value)
      
      // 🆕 性能优化：缓存所有图标的位置
      cacheIconPositions()
      
      // 开始正常的框选移动和结束监听
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }
  
  const handleUp = (): void => {
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleUp)
  }
  
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleUp)
}

// 🆕 统一的框选开始逻辑
const startSelection = (event: MouseEvent): void => {
  event.preventDefault()
  event.stopPropagation()
  
  const container = gridContainerRef.value
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  
  isSelecting.value = true
  selectionStart.value = {
    x: event.clientX - rect.left + container.scrollLeft,
    y: event.clientY - rect.top + container.scrollTop,
  }
  selectionEnd.value = { ...selectionStart.value }
  
  // 记录当前已选中的项（用于 Shift 键累加选择）
  initialSelectedIds.value = new Set(selectedBlueprints.value)
  
  // 🆕 性能优化：缓存所有图标的位置
  cacheIconPositions()
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 🆕 性能优化：缓存图标位置
const cacheIconPositions = (): void => {
  const container = gridContainerRef.value
  if (!container) return
  
  const containerRect = container.getBoundingClientRect()
  iconPositionsCache.clear()
  
  // 一次性计算所有图标位置
  filteredBlueprints.value.forEach(blueprint => {
    const iconEl = iconRefs.get(blueprint.id)?.$el
    if (!iconEl) return
    
    const iconRect = iconEl.getBoundingClientRect()
    
    // 转换为相对于容器的坐标（考虑滚动）
    const iconX1 = iconRect.left - containerRect.left + container.scrollLeft
    const iconY1 = iconRect.top - containerRect.top + container.scrollTop
    
    iconPositionsCache.set(blueprint.id, {
      x1: iconX1,
      y1: iconY1,
      x2: iconX1 + iconRect.width,
      y2: iconY1 + iconRect.height,
    })
  })
}

// 🆕 框选移动（使用 RAF 节流）
const handleMouseMove = (event: MouseEvent): void => {
  if (!isSelecting.value) return
  
  // 取消之前的 RAF
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  
  // 保存事件坐标（避免在 RAF 回调中 event 过期）
  const clientX = event.clientX
  const clientY = event.clientY
  
  // 使用 RAF 节流
  rafId = requestAnimationFrame(() => {
    const container = gridContainerRef.value
    if (!container) return
    
    const rect = container.getBoundingClientRect()
    
    selectionEnd.value = {
      x: clientX - rect.left + container.scrollLeft,
      y: clientY - rect.top + container.scrollTop,
    }
  })
}

// 🆕 框选结束
const handleMouseUp = (event: MouseEvent): void => {
  if (!isSelecting.value) return
  
  // 取消未完成的 RAF
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  
  // 松手时统一计算选中状态
  updateSelection(event.shiftKey)
  
  isSelecting.value = false
  
  // 🆕 清理缓存
  iconPositionsCache.clear()
  
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 🆕 更新选中状态（优化版）
const updateSelection = (additive: boolean): void => {
  const x1 = Math.min(selectionStart.value.x, selectionEnd.value.x)
  const y1 = Math.min(selectionStart.value.y, selectionEnd.value.y)
  const x2 = Math.max(selectionStart.value.x, selectionEnd.value.x)
  const y2 = Math.max(selectionStart.value.y, selectionEnd.value.y)
  
  const newSelected = additive ? new Set(initialSelectedIds.value) : new Set<string>()
  
  // 🆕 性能优化：使用缓存的位置进行碰撞检测
  for (const blueprint of filteredBlueprints.value) {
    const pos = iconPositionsCache.get(blueprint.id)
    if (!pos) continue
    
    // 碰撞检测：矩形相交
    const intersects = !(pos.x2 < x1 || pos.x1 > x2 || pos.y2 < y1 || pos.y1 > y2)
    
    if (intersects) {
      newSelected.add(blueprint.id)
    }
  }
  
  selectedBlueprints.value = newSelected
}

// 清理
onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
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
      position: relative; // 🆕 为选择框定位
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

    // 🆕 框选选择框样式
    .selection-box {
      position: absolute;
      border: 2px solid #409eff;
      background-color: rgba(64, 158, 255, 0.1);
      pointer-events: none;
      z-index: 100;
      transition: none;
    }

    // 卡片布局样式
    .blueprint-grid-card {
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

    // 桌面布局样式
    .blueprint-grid-desktop {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 12px;
      padding: 12px 0 20px;
      width: 100%;
      min-height: 100%;

      @media (max-width: 640px) {
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        gap: 8px;
      }

      @media (min-width: 1200px) {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 16px;
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

