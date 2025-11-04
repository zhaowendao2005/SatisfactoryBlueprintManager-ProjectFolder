<template>
  <div class="nav-item" :class="{ active: isActive }" @click="handleClick">
    <q-icon :name="iconName" class="nav-icon" size="24px" />
    <span class="nav-label">{{ item.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NavItem } from '@gui/pages/MainWindow/Shell/types'

interface Props {
  item: NavItem
  isActive: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click', item: NavItem): void
}>()

const handleClick = () => {
  if (!props.item.disabled) {
    emit('click', props.item)
  }
}

// 图标名称映射（使用 Quasar Material Icons）
const iconName = computed(() => {
  const iconMap: Record<string, string> = {
    House: 'home',
    Document: 'description',
    Setting: 'settings',
  }
  return iconMap[props.item.icon] || 'description'
})
</script>

<style scoped lang="scss">
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin: 4px 3px; // 四周留出外边距
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px; // Word 风格的圆角
  gap: 4px;
  position: relative;

  &:hover:not(.active) {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &.active {
    // 直接设置背景色，确保显示
    background-color: var(--q-primary);
    color: white;

    .nav-icon {
      color: white !important;
    }

    .nav-label {
      color: white !important;
    }
  }

  .nav-icon {
    font-size: 24px;
    color: #666;
    transition: color 0.2s ease;
  }

  .nav-label {
    font-size: 12px;
    color: #666;
    transition: color 0.2s ease;
  }
}
</style>

