<template>
  <div class="view-switcher">
    <el-tabs v-model="currentView" @tab-change="handleViewChange">
      <el-tab-pane label="Tree 视图" name="tree" />
      <el-tab-pane label="图标视图" name="icon" />
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ViewType } from '../../types'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'

const store = useActiveBlueprintStore()

const currentView = computed({
  get: () => store.currentView,
  set: (value: ViewType) => {
    store.switchView(value)
  },
})

const handleViewChange = (view: string) => {
  store.switchView(view as ViewType)
}
</script>

<style scoped lang="scss">
.view-switcher {
  height: 48px;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 16px;
}
</style>

