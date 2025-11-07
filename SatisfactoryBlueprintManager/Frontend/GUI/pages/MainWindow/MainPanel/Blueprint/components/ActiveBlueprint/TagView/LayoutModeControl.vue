<template>
  <div class="layout-mode-control">
    <span class="label">布局模式：</span>
    
    <!-- 布局模式选择 -->
    <el-radio-group 
      :model-value="layoutMode" 
      size="small"
      @update:model-value="handleModeChange"
    >
      <el-radio-button value="card">卡片布局</el-radio-button>
      <el-radio-button value="desktop">桌面布局</el-radio-button>
    </el-radio-group>
    
    <!-- 卡片布局：栏数控制 -->
    <template v-if="layoutMode === 'card'">
      <span class="sub-label">栏数：</span>
      <el-radio-group 
        :model-value="cardColumns" 
        size="small"
        @update:model-value="handleColumnsChange"
      >
        <el-radio-button :value="2">2栏</el-radio-button>
        <el-radio-button :value="3">3栏</el-radio-button>
        <el-radio-button :value="4">4栏</el-radio-button>
      </el-radio-group>
    </template>
    
    <span class="hint">{{ layoutHint }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  layoutMode: 'card' | 'desktop'
  cardColumns: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:layoutMode', value: 'card' | 'desktop'): void
  (e: 'update:cardColumns', value: number): void
}>()

const layoutHint = computed(() => {
  if (props.layoutMode === 'card') {
    return '（窄屏自动降级）'
  }
  return '（紧凑型布局，自动适应容器宽度）'
})

const handleModeChange = (value: 'card' | 'desktop'): void => {
  emit('update:layoutMode', value)
}

const handleColumnsChange = (value: number): void => {
  emit('update:cardColumns', value)
}
</script>

<style scoped lang="scss">
.layout-mode-control {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;

  .label {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }
  
  .sub-label {
    font-size: 13px;
    color: #666;
    margin-left: 8px;
  }
  
  .hint {
    font-size: 12px;
    color: #999;
    margin-left: auto;
  }
}
</style>

