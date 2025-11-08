<template>
  <el-dialog
    v-model="dialogVisible"
    title="最近访问"
    width="400px"
    :show-close="true"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    class="recent-dialog"
  >
    <div v-if="blueprints.length > 0" class="recent-grid">
      <div
        v-for="blueprint in displayBlueprints"
        :key="blueprint.path"
        class="recent-item"
        @click="handleUseBlueprint(blueprint.path)"
      >
        <div class="item-icon">
          <el-icon :size="24">
            <Document />
          </el-icon>
        </div>
        <div class="item-label" :title="blueprint.name">
          {{ blueprint.name }}
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <el-empty description="暂无最近使用的蓝图" :image-size="80" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElDialog, ElEmpty, ElIcon } from 'element-plus'
import { Document } from '@element-plus/icons-vue'

interface Props {
  visible: boolean
  blueprints: Array<{
    path: string
    name: string
    timestamp: number
  }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'use-blueprint', path: string): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 最多显示16个
const displayBlueprints = computed(() => {
  return props.blueprints.slice(0, 16)
})

const handleUseBlueprint = (path: string): void => {
  emit('use-blueprint', path)
  dialogVisible.value = false // 使用后关闭对话框
}
</script>

<style scoped lang="scss">
.recent-dialog {
  :deep(.el-dialog) {
    border-radius: 16px;
    background: rgba(245, 245, 247, 0.95);
    backdrop-filter: blur(20px);
  }
  
  :deep(.el-dialog__header) {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  :deep(.el-dialog__body) {
    padding: 16px;
  }
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 8px;
}

.recent-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.6);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0) scale(0.95);
  }
}

.item-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 4px;
}

.item-label {
  font-size: 10px;
  color: #333;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.empty-state {
  padding: 20px;
  text-align: center;
}
</style>

