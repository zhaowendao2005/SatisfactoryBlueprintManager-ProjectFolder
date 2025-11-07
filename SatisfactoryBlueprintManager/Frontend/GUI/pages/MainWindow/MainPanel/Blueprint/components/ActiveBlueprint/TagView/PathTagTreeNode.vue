<template>
  <div class="path-tag-node">
    <div class="node-row">
      <!-- 折叠/展开图标 -->
      <el-icon
        v-if="hasChildren"
        class="expand-icon"
        @click.stop="handleExpandClick"
      >
        <ArrowRight v-if="!isExpanded" />
        <ArrowDown v-else />
      </el-icon>
      
      <!-- 占位符（没有子节点时保持对齐） -->
      <span v-else class="expand-placeholder"></span>
      
      <!-- 标签内容 -->
      <el-tag
        :type="getTagType()"
        :effect="isActive ? 'dark' : 'plain'"
        class="path-tag-item"
        @click="handleClick"
        @contextmenu.prevent="handleContextMenu"
      >
        <span class="tag-content">
          <span v-if="isActive" class="logic-badge">
            {{ getLogicLabel() }}
          </span>
          <el-icon v-if="hasChildren" class="folder-icon">
            <Folder />
          </el-icon>
          {{ node.name }}
        </span>
      </el-tag>
    </div>
    
    <!-- 递归渲染子节点（仅在展开时显示） -->
    <div
      v-if="hasChildren && isExpanded"
      class="children"
    >
      <PathTagTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :active-tags="activeTags"
        :expanded-keys="expandedKeys"
        :parent-path="node.fullPath"
        @toggle-tag="handleToggleTag"
        @change-logic="handleChangeLogic"
        @toggle-expand="handleToggleExpand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Folder, ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import type { PathTagTreeNode } from '../../../utils/tagHelpers'
import type { ActiveTagsMap } from '../../../types'

interface Props {
  node: PathTagTreeNode
  activeTags: ActiveTagsMap
  expandedKeys: Set<string>
  parentPath: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-tag', tagId: string): void
  (e: 'change-logic', tagId: string, logic: 'and' | 'or' | 'not'): void
  (e: 'toggle-expand', nodeId: string, parentPath: string): void
}>()

const isActive = computed(() => props.activeTags.has(props.node.id))

const getLogicLabel = (): string => {
  if (!isActive.value) return ''
  const logic = props.activeTags.get(props.node.id)
  if (logic === 'and') return '与'
  if (logic === 'or') return '或'
  if (logic === 'not') return '非'
  return ''
}

const getTagType = (): string => {
  if (!isActive.value) return ''
  const logic = props.activeTags.get(props.node.id)
  if (logic === 'and') return 'success'
  if (logic === 'or') return 'primary'
  if (logic === 'not') return 'danger'
  return ''
}

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedKeys.has(props.node.id)
})

const handleClick = (): void => {
  emit('toggle-tag', props.node.id)
}

const handleContextMenu = (event: MouseEvent): void => {
  if (!isActive.value) {
    // 如果未激活，先激活为"或"
    emit('toggle-tag', props.node.id)
    return
  }
  
  // 循环切换逻辑：或 -> 与 -> 非 -> 移除
  const currentLogic = props.activeTags.get(props.node.id)
  let nextLogic: 'and' | 'or' | 'not' | 'remove'
  
  if (currentLogic === 'or') {
    nextLogic = 'and'
  } else if (currentLogic === 'and') {
    nextLogic = 'not'
  } else if (currentLogic === 'not') {
    nextLogic = 'remove'
  } else {
    nextLogic = 'or'
  }
  
  if (nextLogic === 'remove') {
    emit('toggle-tag', props.node.id)
  } else {
    emit('change-logic', props.node.id, nextLogic)
  }
}

const handleExpandClick = (): void => {
  emit('toggle-expand', props.node.id, props.parentPath)
}

const handleToggleTag = (tagId: string): void => {
  emit('toggle-tag', tagId)
}

const handleChangeLogic = (tagId: string, logic: 'and' | 'or' | 'not'): void => {
  emit('change-logic', tagId, logic)
}

const handleToggleExpand = (nodeId: string, parentPath: string): void => {
  emit('toggle-expand', nodeId, parentPath)
}
</script>

<style scoped lang="scss">
.path-tag-node {
  .node-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .expand-icon {
    cursor: pointer;
    font-size: 14px;
    color: #666;
    transition: transform 0.2s;
    flex-shrink: 0;
    
    &:hover {
      color: #3b82f6;
    }
  }
  
  .expand-placeholder {
    width: 14px;
    flex-shrink: 0;
  }
  
  .path-tag-item {
    cursor: pointer;
    transition: all 0.2s;
    border-color: #3b82f6;
    color: #3b82f6;
    background-color: #fff;

    &:hover {
      opacity: 0.8;
    }

    .tag-content {
      display: flex;
      align-items: center;
      gap: 4px;

      .logic-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 0 2px;
        margin-right: 2px;
      }

      .folder-icon {
        font-size: 14px;
      }
    }
  }

  .children {
    margin-left: 20px;
    margin-top: 4px;
    padding-left: 8px;
    border-left: 2px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}
</style>

