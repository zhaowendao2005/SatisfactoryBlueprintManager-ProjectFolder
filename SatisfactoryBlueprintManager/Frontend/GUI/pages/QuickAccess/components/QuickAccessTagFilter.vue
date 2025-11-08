<template>
  <div class="quick-access-tag-filter">
    <div class="filter-header">
      <span class="filter-title">🏷️ 标签筛选</span>
      <a v-if="activeFilters.size > 0" href="#" class="clear-link" @click.prevent="handleClearAll">
        清除全部
      </a>
    </div>
    <div class="filter-hint">左键切换筛选 | 右键切换逻辑（与/或/非）</div>

    <!-- 路径标签 -->
    <div v-if="pathTags.length > 0" class="tag-group">
      <div class="tag-group-title">📁 路径标签</div>
      <div class="tag-list">
        <div
          v-for="tag in pathTags"
          :key="tag.id"
          class="tag-chip"
          :class="getTagClass(tag.id)"
          @click="handleTagClick(tag.id)"
          @contextmenu.prevent="handleContextMenu(tag.id)"
        >
          <span v-if="activeFilters.has(tag.id)" class="logic-badge">
            {{ getLogicLabel(tag.id) }}
          </span>
          {{ tag.name }}
        </div>
      </div>
    </div>

    <!-- 用户标签 -->
    <div v-if="userTags.length > 0" class="tag-group">
      <div class="tag-group-title">🎨 用户标签</div>
      <div class="tag-list">
        <div
          v-for="tag in userTags"
          :key="tag.id"
          class="tag-chip"
          :class="getTagClass(tag.id)"
          @click="handleTagClick(tag.id)"
          @contextmenu.prevent="handleContextMenu(tag.id)"
        >
          <span v-if="activeFilters.has(tag.id)" class="logic-badge">
            {{ getLogicLabel(tag.id) }}
          </span>
          {{ tag.name }}
        </div>
      </div>
    </div>

    <div v-if="pathTags.length === 0 && userTags.length === 0" class="empty-hint">
      暂无标签
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TagDefinition } from '@gui/pages/MainWindow/MainPanel/Blueprint/types'
import { buildPathTagTree } from '@gui/pages/MainWindow/MainPanel/Blueprint/utils/tagHelpers'

interface Props {
  tags: TagDefinition[]
  blueprintTagsMap: Map<string, string[]>
  activeFilters: Map<string, 'and' | 'or' | 'not'>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-filter', tagId: string, logic?: 'and' | 'or' | 'not'): void
  (e: 'clear-filters'): void
}>()

// 分离路径标签和用户标签
const pathTags = computed(() => {
  return props.tags.filter((tag) => tag.id.startsWith('path:'))
})

const userTags = computed(() => {
  return props.tags.filter((tag) => !tag.id.startsWith('path:'))
})

// 获取标签样式类
const getTagClass = (tagId: string): string => {
  if (!props.activeFilters.has(tagId)) {
    return 'inactive'
  }
  const logic = props.activeFilters.get(tagId)
  return `active-${logic}`
}

// 获取逻辑标签
const getLogicLabel = (tagId: string): string => {
  const logic = props.activeFilters.get(tagId)
  return logic === 'and' ? '与' : (logic === 'or' ? '或' : '非')
}

// 点击标签
const handleTagClick = (tagId: string): void => {
  emit('toggle-filter', tagId)
}

// 右键切换逻辑
const handleContextMenu = (tagId: string): void => {
  if (props.activeFilters.has(tagId)) {
    const currentLogic = props.activeFilters.get(tagId)
    const nextLogic = currentLogic === 'or' ? 'and' : (currentLogic === 'and' ? 'not' : 'or')
    emit('toggle-filter', tagId, nextLogic)
  } else {
    emit('toggle-filter', tagId, 'or')
  }
}

// 清除所有筛选
const handleClearAll = (): void => {
  emit('clear-filters')
}
</script>

<style scoped lang="scss">
.quick-access-tag-filter {
  padding: 12px 16px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.filter-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.clear-link {
  font-size: 12px;
  color: #007AFF;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.filter-hint {
  font-size: 11px;
  color: #666;
  margin-bottom: 10px;
}

.tag-group {
  margin-bottom: 10px;
}

.tag-group-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  border: 1px solid transparent;

  &.inactive {
    background: #e5e5e7;
    color: #666;

    &:hover {
      background: #d1d1d6;
    }
  }

  &.active-and {
    background: #34c759;
    color: white;
    border-color: #34c759;
  }

  &.active-or {
    background: #007AFF;
    color: white;
    border-color: #007AFF;
  }

  &.active-not {
    background: #ff3b30;
    color: white;
    border-color: #ff3b30;
  }
}

.logic-badge {
  font-size: 10px;
  padding: 1px 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  font-weight: 600;
}

.empty-hint {
  font-size: 12px;
  color: #999;
  text-align: center;
  padding: 20px;
}
</style>

