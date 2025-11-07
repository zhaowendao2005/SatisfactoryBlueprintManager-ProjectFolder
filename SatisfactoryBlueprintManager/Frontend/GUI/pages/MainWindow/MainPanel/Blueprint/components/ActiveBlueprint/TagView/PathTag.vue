<template>
  <el-tag
    class="path-tag"
    size="small"
    :title="fullPath"
  >
    {{ directoryPath }}
  </el-tag>
</template>

<script setup lang="ts">
interface Props {
  directoryPath: string  // 已处理的目录路径
  fullPath: string       // 完整路径（用于 hover 提示）
}

defineProps<Props>()
</script>

<style scoped lang="scss">
.path-tag {
  border: 1px solid #3b82f6;
  background: #fff;
  color: #3b82f6;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>

