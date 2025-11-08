<template>
  <div class="recent-folder-icon" @click="$emit('click')">
    <!-- 图标容器 -->
    <div class="icon-container">
      <!-- 九宫格图标 -->
      <div class="grid-icon">
        <div v-for="i in 9" :key="i" class="grid-item" />
      </div>
      <!-- 角标显示数量 -->
      <div v-if="recentCount > 0" class="badge">{{ recentCount }}</div>
    </div>
    
    <!-- 标签 -->
    <div class="icon-label">最近访问</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  recentCount: number
}

defineProps<Props>()
defineEmits<{
  (e: 'click'): void
}>()
</script>

<style scoped lang="scss">
.recent-folder-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 8px;
  border-radius: 12px;
  position: relative;
  user-select: none;
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    background: rgba(0, 0, 0, 0.02);
  }
  
  &:active {
    transform: translateY(0) scale(1);
  }
  
  .icon-container {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    position: relative;
    overflow: visible;
  }
  
  &:hover .icon-container {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
  
  .grid-icon {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
    padding: 12px;
    width: 100%;
    height: 100%;
  }
  
  .grid-item {
    background: rgba(102, 126, 234, 0.6);
    border-radius: 3px;
    transition: all 0.2s ease;
  }
  
  &:hover .grid-item {
    background: rgba(102, 126, 234, 0.8);
  }
  
  .badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #f56c6c;
    color: white;
    font-size: 10px;
    font-weight: 600;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .icon-label {
    margin-top: 6px;
    color: #333;
    text-align: center;
    font-weight: 500;
    font-size: 10px;
    max-width: 100%;
    line-height: 1.3;
    white-space: nowrap;
  }
}
</style>

