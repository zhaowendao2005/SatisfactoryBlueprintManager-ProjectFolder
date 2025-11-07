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
        :effect="isActive ? 'dark' : 'plain'"
        class="path-tag-item"
        @click="handleClick"
      >
        <span class="tag-content">
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
        @toggle-expand="handleToggleExpand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Folder, ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import type { PathTagTreeNode } from '../../../utils/tagHelpers'

interface Props {
  node: PathTagTreeNode
  activeTags: Set<string>
  expandedKeys: Set<string>
  parentPath: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-tag', tagId: string): void
  (e: 'toggle-expand', nodeId: string, parentPath: string): void
}>()

const isActive = computed(() => props.activeTags.has(props.node.id))

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedKeys.has(props.node.id)
})

const handleClick = (): void => {
  emit('toggle-tag', props.node.id)
}

const handleExpandClick = (): void => {
  emit('toggle-expand', props.node.id, props.parentPath)
}

const handleToggleTag = (tagId: string): void => {
  emit('toggle-tag', tagId)
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

