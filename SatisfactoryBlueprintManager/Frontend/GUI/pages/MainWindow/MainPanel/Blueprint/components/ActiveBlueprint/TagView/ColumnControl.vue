<template>
  <div class="column-control">
    <span class="label">布局栏数：</span>
    <el-radio-group 
      :model-value="columns" 
      size="small"
      @update:model-value="handleChange"
    >
      <el-radio-button :value="2">2栏</el-radio-button>
      <el-radio-button :value="3">3栏</el-radio-button>
      <el-radio-button :value="4">4栏</el-radio-button>
    </el-radio-group>
    <span class="hint">（窄屏自动降级）</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  columns: number
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:columns', value: number): void
}>()

const handleChange = (value: number): void => {
  emit('update:columns', value)
}
</script>

<style scoped lang="scss">
.column-control {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;

  .label {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }
  
  .hint {
    font-size: 12px;
    color: #999;
    margin-left: 8px;
  }
}
</style>

