<template>
  <div class="path-tag-tree">
    <PathTagTreeNode
      v-for="node in tree"
      :key="node.id"
      :node="node"
      :active-tags="activeTags"
      @toggle-tag="handleToggleTag"
    />
  </div>
</template>

<script setup lang="ts">
import PathTagTreeNode from './PathTagTreeNode.vue'
import type { PathTagTreeNode as PathTagTreeNodeType } from '../../../utils/tagHelpers'

interface Props {
  tree: PathTagTreeNodeType[]
  activeTags: Set<string>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-tag', tagId: string): void
}>()

const handleToggleTag = (tagId: string): void => {
  emit('toggle-tag', tagId)
}
</script>

<style scoped lang="scss">
.path-tag-tree {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>

