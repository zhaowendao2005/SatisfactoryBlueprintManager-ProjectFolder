<template>
  <el-dropdown-menu>
    <el-dropdown-item command="rename">
      <el-icon><Edit /></el-icon>
      <span>重命名</span>
    </el-dropdown-item>
    <el-dropdown-item command="create-group">
      <el-icon><Plus /></el-icon>
      <span>创建新组</span>
    </el-dropdown-item>
  </el-dropdown-menu>
</template>

<script setup lang="ts">
import { Edit, Plus } from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'rename'): void
  (e: 'create-group'): void
}>()

interface Props {
  nodeId: string
}

defineProps<Props>()

// ContextMenu 现在不需要 handleCommand，因为 ElDropdownMenu 会直接触发 command 事件
// 这个组件只是菜单项的展示，事件由父组件处理
</script>

<style scoped lang="scss">
// ContextMenu 样式由 Element Plus 提供
</style>

