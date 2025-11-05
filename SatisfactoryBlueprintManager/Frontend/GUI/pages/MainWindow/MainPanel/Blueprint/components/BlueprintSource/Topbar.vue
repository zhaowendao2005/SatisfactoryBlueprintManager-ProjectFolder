<template>
  <div class="source-topbar">
    <Toolbar @add-source="handleAddSource" @refresh="handleRefresh" />
  </div>
</template>

<script setup lang="ts">
import Toolbar from './Toolbar.vue'

const emit = defineEmits<{
  (e: 'add-source'): void
  (e: 'refresh'): void
}>()

const handleAddSource = () => {
  emit('add-source')
}

const handleRefresh = () => {
  emit('refresh')
}
</script>

<style scoped lang="scss">
.source-topbar {
  height: 60px;
  border-bottom: 1px solid #e0e0e0;
}
</style>

