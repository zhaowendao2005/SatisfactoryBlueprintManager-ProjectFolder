<template>
  <div class="tag-filter">
    <!-- 统一的逻辑切换器 -->
    <div class="filter-header">
      <div class="filter-title">
        <h3>标签筛选</h3>
        <p class="filter-hint">
          点击标签添加筛选，右键切换逻辑类型
          <el-tooltip placement="top" :width="350">
            <template #content>
              <div class="help-content">
                <div class="help-section">
                  <strong>与(AND)</strong>：蓝图必须匹配所有"与"标签<br>
                  <strong>或(OR)</strong>：蓝图匹配至少一个"或"标签<br>
                  <strong>非(NOT)</strong>：蓝图不能匹配任何"非"标签<br>
                </div>
                <div class="help-section">
                  <strong>优先级</strong>：非 > 与 > 或<br>
                  先排除"非"标签，再要求满足所有"与"标签，最后检查"或"标签
                </div>
                <div class="help-section">
                  <strong>操作方式</strong>：<br>
                  • 左键点击：添加/移除标签（默认为"或"）<br>
                  • 右键点击：切换逻辑类型（与/或/非）
                </div>
      </div>
            </template>
            <el-icon class="help-icon">
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </p>
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
          @change-logic="handleChangeLogic"
        />
        <span v-else class="empty-hint">暂无路径标签</span>
      </div>
    </div>

    <!-- 用户标签区块 -->
    <div class="tag-section">
      <h4 class="section-title">用户标签</h4>
      <div class="tag-list">
        <div
          v-for="tag in userTags"
          :key="tag.id"
          class="tag-wrapper"
          @contextmenu.prevent="handleContextMenu($event, tag.id)"
        >
          <el-tag
            :type="getTagType(tag.id)"
          :effect="activeTags.has(tag.id) ? 'dark' : 'plain'"
          :closable="true"
          class="filter-tag"
          @click="handleTagClick(tag.id)"
          @close.stop="handleDeleteTag(tag.id)"
        >
            <span v-if="activeTags.has(tag.id)" class="logic-badge">
              {{ getLogicLabel(tag.id) }}
            </span>
          {{ tag.name }}
        </el-tag>
        </div>
        <span v-if="userTags.length === 0" class="empty-hint">暂无用户标签</span>
      </div>
    </div>

    <!-- 当前筛选条件 -->
    <div v-if="activeTags.size > 0" class="active-filters">
      <span class="filters-label">当前筛选条件:</span>
      <div class="filter-groups">
        <!-- 与(AND)组 -->
        <div v-if="andTags.length > 0" class="filter-group and-group">
          <span class="group-label">与(AND):</span>
          <el-tag
            v-for="tagId in andTags"
            :key="tagId"
            type="success"
            closable
            @close="handleRemoveTag(tagId)"
            @contextmenu.prevent="handleContextMenu($event, tagId)"
          >
            {{ getTagName(tagId) }}
          </el-tag>
        </div>
        
        <!-- 或(OR)组 -->
        <div v-if="orTags.length > 0" class="filter-group or-group">
          <span class="group-label">或(OR):</span>
      <el-tag
            v-for="tagId in orTags"
        :key="tagId"
        type="primary"
        closable
            @close="handleRemoveTag(tagId)"
            @contextmenu.prevent="handleContextMenu($event, tagId)"
      >
        {{ getTagName(tagId) }}
      </el-tag>
        </div>
        
        <!-- 非(NOT)组 -->
        <div v-if="notTags.length > 0" class="filter-group not-group">
          <span class="group-label">非(NOT):</span>
          <el-tag
            v-for="tagId in notTags"
            :key="tagId"
            type="danger"
            closable
            @close="handleRemoveTag(tagId)"
            @contextmenu.prevent="handleContextMenu($event, tagId)"
          >
            {{ getTagName(tagId) }}
          </el-tag>
        </div>
      </div>
      
      <el-button type="text" size="small" @click="handleClearAll">
        清除全部
      </el-button>
    </div>

    <!-- 右键菜单 -->
    <el-dropdown
      ref="contextMenuRef"
      trigger="contextmenu"
      :virtual-ref="contextMenuTrigger"
      virtual-triggering
      @command="handleMenuCommand"
    >
      <span></span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="and">
            <el-icon><Check /></el-icon> 与(AND)
          </el-dropdown-item>
          <el-dropdown-item command="or">
            <el-icon><Plus /></el-icon> 或(OR)
          </el-dropdown-item>
          <el-dropdown-item command="not">
            <el-icon><Close /></el-icon> 非(NOT)
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { QuestionFilled, Check, Plus, Close } from '@element-plus/icons-vue'
import type { TagDefinition } from '../../../types'
import type { PathTagTreeNode } from '../../../utils/tagHelpers'
import type { ActiveTagsMap, TagLogicMode } from '../../../types'
import PathTagTree from './PathTagTree.vue'

interface Props {
  pathTagTree: PathTagTreeNode[]
  userTags: TagDefinition[]
  activeTags: ActiveTagsMap
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:activeTags', tags: ActiveTagsMap): void
  (e: 'delete-tag', tagId: string): void
}>()

// 右键菜单
const contextMenuRef = ref()
const contextMenuTrigger = ref<HTMLElement>()
const contextTagId = ref('')

// 分组计算
const andTags = computed(() => {
  const tags: string[] = []
  props.activeTags.forEach((logic, tagId) => {
    if (logic === 'and') tags.push(tagId)
  })
  return tags
})

const orTags = computed(() => {
  const tags: string[] = []
  props.activeTags.forEach((logic, tagId) => {
    if (logic === 'or') tags.push(tagId)
  })
  return tags
})

const notTags = computed(() => {
  const tags: string[] = []
  props.activeTags.forEach((logic, tagId) => {
    if (logic === 'not') tags.push(tagId)
  })
  return tags
})

const handleTagClick = (tagId: string): void => {
  const newActiveTags = new Map(props.activeTags)
  if (newActiveTags.has(tagId)) {
    newActiveTags.delete(tagId)
  } else {
    // 默认为"或"逻辑
    newActiveTags.set(tagId, 'or')
  }
  emit('update:activeTags', newActiveTags)
}

const handleChangeLogic = (tagId: string, logic: TagLogicMode): void => {
  if (!props.activeTags.has(tagId)) return
  
  const newActiveTags = new Map(props.activeTags)
  newActiveTags.set(tagId, logic)
  emit('update:activeTags', newActiveTags)
}

const handleRemoveTag = (tagId: string): void => {
  const newActiveTags = new Map(props.activeTags)
  newActiveTags.delete(tagId)
  emit('update:activeTags', newActiveTags)
}

const handleContextMenu = (event: MouseEvent, tagId: string): void => {
  if (!props.activeTags.has(tagId)) {
    // 如果标签未激活，先激活它
    handleTagClick(tagId)
  }
  contextTagId.value = tagId
  contextMenuTrigger.value = event.target as HTMLElement
  contextMenuRef.value?.handleOpen()
}

const handleMenuCommand = (command: string): void => {
  const logic = command as TagLogicMode
  handleChangeLogic(contextTagId.value, logic)
}

const handleClearAll = (): void => {
  emit('update:activeTags', new Map())
}

const getLogicLabel = (tagId: string): string => {
  const logic = props.activeTags.get(tagId)
  if (logic === 'and') return '与'
  if (logic === 'or') return '或'
  if (logic === 'not') return '非'
  return ''
}

const getTagType = (tagId: string): string => {
  if (!props.activeTags.has(tagId)) return ''
  const logic = props.activeTags.get(tagId)
  if (logic === 'and') return 'success'
  if (logic === 'or') return 'primary'
  if (logic === 'not') return 'danger'
  return ''
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
      flex: 1;
      
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
      display: flex;
      align-items: center;
        gap: 4px;

        .help-icon {
          cursor: help;
          color: #909399;
          font-size: 14px;
          transition: color 0.2s;

          &:hover {
            color: #409eff;
          }
        }
      }
    }
  }

  .help-content {
    .help-section {
      margin-bottom: 8px;
      line-height: 1.6;
        font-size: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      strong {
        color: #409eff;
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

      .tag-wrapper {
        display: inline-block;
      }

      .filter-tag {
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          opacity: 0.8;
        }

        .logic-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 0 2px;
          margin-right: 2px;
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
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid #e0e0e0;
    min-height: 32px;

    .filters-label {
      font-size: 12px;
      color: #666;
      font-weight: 600;
    }

    .filter-groups {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .filter-group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;

        .group-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
          min-width: 60px;
        }
      }
    }
  }
}
</style>
