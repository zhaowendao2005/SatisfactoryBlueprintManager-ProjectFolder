<template>
  <div class="tag-filter">
    <!-- 统一的逻辑切换器 -->
    <div class="filter-header">
      <div class="filter-title">
        <h3>标签筛选</h3>
        <p class="filter-hint">点击标签进行筛选，可组合逻辑条件</p>
      </div>

      <div class="logic-switcher">
        <span class="logic-label">多标签逻辑:</span>
        <el-button
          :type="logicMode === 'and' ? 'primary' : 'default'"
          size="small"
          @click="handleLogicChange('and')"
        >
          与
        </el-button>
        <el-button
          :type="logicMode === 'or' ? 'primary' : 'default'"
          size="small"
          @click="handleLogicChange('or')"
        >
          或
        </el-button>
      </div>
    </div>

    <!-- 路径标签区块（树形结构） -->
    <div class="tag-section">
      <h4 class="section-title">路径标签</h4>
      <div class="tag-tree">
        <PathTagTree
          v-if="pathTagTree.length > 0"
          :tree="pathTagTree"
          :active-tags="activeTags"
          @toggle-tag="handleTagClick"
        />
        <span v-else class="empty-hint">暂无路径标签</span>
      </div>
    </div>

    <!-- 用户标签区块 -->
    <div class="tag-section">
      <h4 class="section-title">用户标签</h4>
      <div class="tag-list">
        <el-tag
          v-for="tag in userTags"
          :key="tag.id"
          :type="getTagType(tag)"
          :effect="activeTags.has(tag.id) ? 'dark' : 'plain'"
          :closable="true"
          class="filter-tag"
          @click="handleTagClick(tag.id)"
          @close.stop="handleDeleteTag(tag.id)"
        >
          {{ tag.name }}
        </el-tag>
        <span v-if="userTags.length === 0" class="empty-hint">暂无用户标签</span>
      </div>
    </div>

    <!-- 当前筛选条件 -->
    <div
      v-if="activeTags.size > 0"
      class="active-filters"
    >
      <span class="filters-label">当前筛选:</span>
      <el-tag
        v-for="tagId in activeTags"
        :key="tagId"
        type="primary"
        closable
        @close="handleTagClick(tagId)"
        class="active-filter-tag"
      >
        {{ getTagName(tagId) }}
      </el-tag>
      <el-button
        type="text"
        size="small"
        @click="handleClearAll"
      >
        清除全部
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TagDefinition } from '../../../types'
import type { PathTagTreeNode } from '../../../utils/tagHelpers'
import PathTagTree from './PathTagTree.vue'

interface Props {
  pathTagTree: PathTagTreeNode[]  // 路径标签树
  userTags: TagDefinition[]       // 用户标签列表
  activeTags: Set<string>
  logicMode: 'and' | 'or'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:activeTags', tags: Set<string>): void
  (e: 'update:logicMode', mode: 'and' | 'or'): void
  (e: 'delete-tag', tagId: string): void
}>()

const handleTagClick = (tagId: string): void => {
  const newActiveTags = new Set(props.activeTags)
  if (newActiveTags.has(tagId)) {
    newActiveTags.delete(tagId)
  } else {
    newActiveTags.add(tagId)
  }
  emit('update:activeTags', newActiveTags)
}

const handleLogicChange = (mode: 'and' | 'or'): void => {
  emit('update:logicMode', mode)
}

const handleClearAll = (): void => {
  emit('update:activeTags', new Set())
}

const getTagName = (tagId: string): string => {
  // 先查找路径标签（在树中递归查找）
  const findInTree = (nodes: PathTagTreeNode[]): PathTagTreeNode | null => {
    for (const node of nodes) {
      if (node.id === tagId) {
        return node
      }
      if (node.children) {
        const found = findInTree(node.children)
        if (found) {
          return found
        }
      }
    }
    return null
  }
  
  const pathTag = findInTree(props.pathTagTree)
  if (pathTag) {
    return pathTag.fullPath
  }
  
  // 再查找用户标签
  const userTag = props.userTags.find((t) => t.id === tagId)
  return userTag?.name || tagId
}

const getTagType = (tag: TagDefinition): string => {
  // 根据颜色映射到 Element Plus Tag 类型
  // 暂时返回空字符串使用默认样式
  return ''
}

const handleDeleteTag = (tagId: string): void => {
  emit('delete-tag', tagId)
}
</script>

<style scoped lang="scss">
.tag-filter {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;

    .filter-title {
      h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .filter-hint {
        margin: 0;
        font-size: 12px;
        color: #666;
      }
    }

    .logic-switcher {
      display: flex;
      align-items: center;
      gap: 8px;

      .logic-label {
        font-size: 12px;
        color: #666;
      }
    }
  }

  .tag-section {
    margin-bottom: 16px;

    .section-title {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #666;
    }

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-height: 32px;
      align-items: center;

      .filter-tag {
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          opacity: 0.8;
        }

        &.path-tag-filter {
          border-color: #3b82f6;
          color: #3b82f6;
          background-color: #fff;
        }
      }

      .empty-hint {
        font-size: 12px;
        color: #999;
        font-style: italic;
      }
    }

    .tag-tree {
      max-height: 300px;
      overflow-y: scroll;
      overflow-x: hidden;
      padding-right: 8px;
      
      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 3px;

        &:hover {
          background: #555;
        }
      }

      .empty-hint {
        font-size: 12px;
        color: #999;
        font-style: italic;
      }
    }
  }

  .active-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid #e0e0e0;
    min-height: 32px;

    .filters-label {
      font-size: 12px;
      color: #666;
    }

    .active-filter-tag {
      cursor: pointer;
    }
  }
}
</style>
