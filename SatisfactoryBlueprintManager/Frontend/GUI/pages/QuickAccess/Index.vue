<template>
  <div class="quick-access-page">
    <!-- 顶部：自定义标题栏 -->
    <GeneralTitlebar title="快速访问" :show-icon="true" />

    <!-- 标签筛选器 -->
    <div class="filter-section">
      <QuickAccessTagFilter
        :tags="store.getAllTags"
        :blueprint-tags-map="store.blueprintTagsMap"
        :active-filters="store.activeFilters"
        @toggle-filter="handleToggleFilter"
        @clear-filters="handleClearFilters"
      />
    </div>

    <!-- 蓝图网格容器 -->
    <div class="blueprint-section">
      <div v-if="filteredBlueprints.length > 0 || store.recentBlueprintsWithNames.length > 0" class="blueprint-grid">
        <!-- 🆕 最近访问文件夹图标（永久显示在第一个位置） -->
        <RecentBlueprintsFolderIcon
          :recent-count="store.recentBlueprintsWithNames.length"
          @click="showRecentDialog = true"
        />
        
        <!-- 原有的蓝图图标 -->
        <BlueprintDesktopIcon
          v-for="blueprint in filteredBlueprints"
          :key="blueprint.id"
          :blueprint="blueprint"
          :batch-mode="false"
          :is-selected="false"
          :show-path="false"
          @use-blueprint="handleUseBlueprint"
        />
      </div>
      <div v-else class="empty-state">
        <el-empty description="没有找到符合条件的蓝图" />
      </div>
    </div>

    <!-- 底部工具栏 -->
    <QuickAccessToolbar
      :blueprint-count="filteredBlueprints.length"
      @refresh="handleRefresh"
      @close="handleClose"
    />

    <!-- 🆕 最近访问弹出对话框 -->
    <RecentBlueprintsDialog
      v-model:visible="showRecentDialog"
      :blueprints="store.recentBlueprintsWithNames"
      @use-blueprint="handleUseBlueprint"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ElEmpty, ElMessage } from 'element-plus'
import GeneralTitlebar from '@gui/components/General.Titlebar/index.vue'
import { useQuickAccessStore } from '@gui/stores/QuickAccess'
import BlueprintDesktopIcon from '@gui/pages/MainWindow/MainPanel/Blueprint/components/ActiveBlueprint/TagView/BlueprintDesktopIcon.vue'
import QuickAccessTagFilter from './components/QuickAccessTagFilter.vue'
import RecentBlueprintsFolderIcon from './components/RecentBlueprintsFolderIcon.vue'
import RecentBlueprintsDialog from './components/RecentBlueprintsDialog.vue'
import QuickAccessToolbar from './components/QuickAccessToolbar.vue'

const store = useQuickAccessStore()
const showRecentDialog = ref(false)

// 筛选后的蓝图列表
const filteredBlueprints = computed(() => {
  const result = store.getFilteredBlueprints().map((bp) => ({
    id: bp.id,
    name: bp.name,
    type: 'blueprint' as const,
    path: bp.path,
    directoryPath: bp.directoryPath,
    tags: bp.tags,
  }))
  
  // 调试日志
  if (result.length === 0) {
    console.log('[QuickAccessPage] 筛选后无蓝图:', {
      totalBlueprints: store.blueprints.length,
      activeFilters: Array.from(store.activeFilters.entries()),
      allTags: store.getAllTags.length,
    })
  }
  
  return result
})

// 切换筛选标签
const handleToggleFilter = (tagId: string, logic?: 'and' | 'or' | 'not'): void => {
  store.toggleFilter(tagId, logic)
}

// 清除所有筛选
const handleClearFilters = (): void => {
  store.clearFilters()
}

// 使用蓝图（支持从主网格区传入id，或从最近使用区传入path）
const handleUseBlueprint = async (blueprintIdOrPath: string): Promise<void> => {
  let blueprintPath: string
  let blueprintName: string

  // 判断是id还是path（path通常包含路径分隔符）
  if (blueprintIdOrPath.includes('/') || blueprintIdOrPath.includes('\\')) {
    // 是path，直接使用
    blueprintPath = blueprintIdOrPath
    const pathParts = blueprintPath.split(/[/\\]/)
    const fileName = pathParts[pathParts.length - 1] || blueprintPath
    blueprintName = fileName.replace(/\.(sbp|sbpcfg)$/i, '')
  } else {
    // 是id，从filteredBlueprints中查找
    const blueprint = filteredBlueprints.value.find((bp) => bp.id === blueprintIdOrPath)
    if (!blueprint || !blueprint.path) {
      ElMessage.error('蓝图路径不存在')
      return
    }
    blueprintPath = blueprint.path
    blueprintName = blueprint.name
  }

  try {
    await store.useBlueprint(blueprintPath)
    ElMessage.success(`蓝图 "${blueprintName}" 使用成功`)
  } catch (error) {
    ElMessage.error(`使用蓝图失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 刷新数据
const handleRefresh = async (): Promise<void> => {
  try {
    await store.loadBlueprints()
    await store.loadRecentBlueprints()
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 关闭窗口
const handleClose = (): void => {
  if (window.quickAccessAPI) {
    window.quickAccessAPI.hideQuickAccess()
  }
}

// 初始化
onMounted(async () => {
  try {
    await store.subscribeGlobalTags()
  } catch (error) {
    ElMessage.error(`初始化失败: ${error instanceof Error ? error.message : String(error)}`)
  }

  // 监听 Esc 键关闭窗口
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      handleClose()
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    store.unsubscribe()
  })
})
</script>

<style scoped lang="scss">
.quick-access-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
  overflow: hidden;
}

.filter-section {
  flex-shrink: 0;
  background: #f5f5f7;
  border-bottom: 1px solid #e5e5e7;
  max-height: 200px;
  overflow-y: auto;
}

.blueprint-section {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.blueprint-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 75px));
  gap: 12px;
  padding: 4px;
  justify-content: center;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}
</style>

