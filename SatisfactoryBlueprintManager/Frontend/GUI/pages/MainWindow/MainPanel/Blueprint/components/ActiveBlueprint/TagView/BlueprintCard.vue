<template>
  <div
    class="blueprint-card"
    :class="{ selected: isSelected }"
  >
    <div class="card-header">
      <el-checkbox
        v-if="batchMode"
        :model-value="isSelected"
        @change="handleToggleSelect"
        class="card-checkbox"
      />
      <div class="card-title-wrapper">
      <h3 class="card-title" :class="{ 'with-checkbox': batchMode }">
        {{ blueprint.name }}
      </h3>
      <PathTag
        v-if="blueprint.directoryPath"
        :directory-path="blueprint.directoryPath"
        :full-path="blueprint.path || ''"
          class="card-path-tag"
      />
      </div>
    </div>

    <div class="card-tags">
      <!-- 用户标签 -->
      <el-tag
        v-for="tagId in blueprint.tags"
        :key="tagId"
        :type="getTagType(tagId)"
        :style="getTagStyle(tagId)"
        size="small"
        class="user-tag"
      >
        {{ getTagName(tagId) }}
      </el-tag>
    </div>

    <div class="card-actions">
      <el-button
        type="primary"
        size="small"
        :disabled="batchMode"
        @click="handleUseBlueprint"
      >
        使用蓝图
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActiveBlueprintNodeWithTags, TagDefinition } from '../../../types'
import PathTag from './PathTag.vue'

interface Props {
  blueprint: ActiveBlueprintNodeWithTags
  batchMode: boolean
  isSelected: boolean
  allTags: TagDefinition[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-select', id: string): void
  (e: 'use-blueprint', id: string): void
}>()

const handleToggleSelect = (): void => {
  emit('toggle-select', props.blueprint.id)
}

const handleUseBlueprint = (): void => {
  emit('use-blueprint', props.blueprint.id)
}

const getTagName = (tagId: string): string => {
  const tag = props.allTags.find((t) => t.id === tagId)
  return tag?.name || tagId
}

const getTagType = (tagId: string): string => {
  const tag = props.allTags.find((t) => t.id === tagId)
  // Element Plus Tag 支持的类型：success/info/warning/danger
  // 这里可以根据 tag.color 映射，暂时返回空字符串使用默认样式
  return ''
}

const getTagStyle = (tagId: string): Record<string, string> => {
  const tag = props.allTags.find((t) => t.id === tagId)
  if (tag?.color) {
    return {
      backgroundColor: tag.color,
      borderColor: tag.color,
      color: '#fff',
    }
  }
  return {}
}
</script>

<style scoped lang="scss">
.blueprint-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  // 🔑 宽高比和高度控制
  min-height: 200px;  // 最小高度（约等于 2:3 比例）
  max-height: 500px;  // 最大高度限制
  
  // 内容溢出时卡片内部滚动
  overflow-y: auto;
  overflow-x: hidden;
  
  // 卡片内部滚动条样式
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: 2px;
  }
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    // hover 时显示滚动条
    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.3);
    }
  }

  &.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .card-header {
    display: flex;
    align-items: flex-start; // 改为顶部对齐
    gap: 8px;
    flex-shrink: 0; // 标题区不压缩

    .card-checkbox {
      flex-shrink: 0;
      margin-top: 2px; // 与标题顶部对齐
    }

    .card-title-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0; // 允许收缩
    }

    .card-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.with-checkbox {
        margin-left: 0;
      }
    }

    .card-path-tag {
      flex-shrink: 0;
    }
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    flex: 1; // 占据剩余空间
    min-height: 32px;
    max-height: 180px; // 标签区最大高度
    overflow-y: auto; // 标签过多时内部滚动
    overflow-x: hidden;
    
    // 标签区滚动条
    &::-webkit-scrollbar {
      width: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.1);
      border-radius: 2px;
    }

    .user-tag {
      flex-shrink: 0;
    }
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: auto; // 始终贴底
    flex-shrink: 0; // 按钮区不压缩
  }
}
</style>

