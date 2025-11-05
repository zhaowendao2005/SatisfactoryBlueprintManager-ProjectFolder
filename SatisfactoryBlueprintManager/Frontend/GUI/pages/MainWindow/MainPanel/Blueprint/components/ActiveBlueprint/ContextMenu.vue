<template>
  <el-dropdown
    :visible="visible"
    trigger="contextmenu"
    @command="handleCommand"
  >
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="create-group">
          在此处创建子分组
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'create-group', parentId: string): void
}>()

interface Props {
  visible: boolean
  parentId: string
}

const props = defineProps<Props>()

const handleCommand = (command: string) => {
  if (command === 'create-group') {
    emit('create-group', props.parentId)
  }
}
</script>

<style scoped lang="scss">
// ContextMenu 样式由 Element Plus 提供
</style>

