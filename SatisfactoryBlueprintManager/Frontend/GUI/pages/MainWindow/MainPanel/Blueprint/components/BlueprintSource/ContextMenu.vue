<template>
  <div
    v-if="visible"
    class="context-menu"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @click.stop
  >
    <div
      v-if="hasSelected"
      class="menu-item"
      @click="handleActivateSelected"
    >
      <el-icon><CircleCheck /></el-icon>
      <span>激活选中项</span>
    </div>
    <div
      v-else
      class="menu-item disabled"
    >
      <span>请先勾选蓝图</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { CircleCheck } from '@element-plus/icons-vue'

interface Props {
  x: number
  y: number
  hasSelected: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'activate-selected'): void
  (e: 'close'): void
}>()

const visible = ref(false)

watch(() => props.x, () => {
  visible.value = true
})

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.context-menu')) {
    visible.value = false
    emit('close')
  }
}

// 监听点击事件
if (typeof window !== 'undefined') {
  window.addEventListener('click', handleClickOutside)
}

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', handleClickOutside)
  }
})

const handleActivateSelected = () => {
  if (props.hasSelected) {
    emit('activate-selected')
  }
}
</script>

<style scoped lang="scss">
.context-menu {
  position: fixed;
  z-index: 9999;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 150px;

  .menu-item {
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f5f5;
    }

    &.disabled {
      color: #999;
      cursor: not-allowed;

      &:hover {
        background-color: transparent;
      }
    }

    .el-icon {
      font-size: 16px;
    }
  }
}
</style>

