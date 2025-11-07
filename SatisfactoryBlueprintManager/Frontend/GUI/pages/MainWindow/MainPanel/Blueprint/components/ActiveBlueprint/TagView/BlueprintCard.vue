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
      <h3 class="card-title" :class="{ 'with-checkbox': batchMode }">
        {{ blueprint.name }}
      </h3>
      <PathTag
        v-if="blueprint.directoryPath"
        :directory-path="blueprint.directoryPath"
        :full-path="blueprint.path || ''"
      />
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

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;

    .card-checkbox {
      flex-shrink: 0;
    }

    .card-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.with-checkbox {
        margin-left: 0;
      }
    }
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 24px;

    .user-tag {
      flex-shrink: 0;
    }
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: auto;
  }
}
</style>

