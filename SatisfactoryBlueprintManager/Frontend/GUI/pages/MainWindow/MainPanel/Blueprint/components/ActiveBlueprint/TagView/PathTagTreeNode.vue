<template>
  <div class="path-tag-node">
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
    
    <!-- 递归渲染子节点 -->
    <div v-if="node.children && node.children.length > 0" class="children">
      <PathTagTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :active-tags="activeTags"
        @toggle-tag="handleToggleTag"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Folder } from '@element-plus/icons-vue'
import type { PathTagTreeNode } from '../../../utils/tagHelpers'

interface Props {
  node: PathTagTreeNode
  activeTags: Set<string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-tag', tagId: string): void
}>()

const isActive = computed(() => props.activeTags.has(props.node.id))

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const handleClick = (): void => {
  emit('toggle-tag', props.node.id)
}

const handleToggleTag = (tagId: string): void => {
  emit('toggle-tag', tagId)
}
</script>

<style scoped lang="scss">
.path-tag-node {
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

