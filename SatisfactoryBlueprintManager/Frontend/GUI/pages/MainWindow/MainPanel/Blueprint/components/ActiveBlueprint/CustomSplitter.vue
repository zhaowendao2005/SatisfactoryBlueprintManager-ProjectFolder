<template>
  <div class="custom-splitter" :class="{ 'is-dragging': isDragging }">
    <div
      ref="leftPanelRef"
      class="splitter-panel left-panel"
      :style="{ width: leftWidth + 'px' }"
    >
      <slot name="left"></slot>
    </div>
    <div
      class="splitter-divider"
      @mousedown="handleMouseDown"
    >
      <div class="divider-line"></div>
    </div>
    <div
      ref="rightPanelRef"
      class="splitter-panel right-panel"
      :style="{ width: `calc(100% - ${leftWidth}px - 6px)` }"
    >
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  modelValue: number // 左侧面板宽度（px）
  min?: number // 左侧最小宽度（px）
  max?: number // 左侧最大宽度（px）
}

const props = withDefaults(defineProps<Props>(), {
  min: 200,
  max: 600,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const leftPanelRef = ref<HTMLElement>()
const rightPanelRef = ref<HTMLElement>()
const isDragging = ref(false)
const leftWidth = ref(props.modelValue || 300)

const handleMouseDown = (e: MouseEvent): void => {
  isDragging.value = true
  e.preventDefault()

  const startX = e.clientX
  const startWidth = leftWidth.value

  const handleMouseMove = (moveEvent: MouseEvent): void => {
    const diff = moveEvent.clientX - startX
    let newWidth = startWidth + diff

    // 限制在最小和最大宽度之间
    if (props.min !== undefined && newWidth < props.min) {
      newWidth = props.min
    }
    if (props.max !== undefined && newWidth > props.max) {
      newWidth = props.max
    }

    leftWidth.value = newWidth
    emit('update:modelValue', newWidth)
  }

  const handleMouseUp = (): void => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 监听外部传入的 modelValue 变化
const updateWidth = (newValue: number): void => {
  let width = newValue
  if (props.min !== undefined && width < props.min) {
    width = props.min
  }
  if (props.max !== undefined && width > props.max) {
    width = props.max
  }
  leftWidth.value = width
}

onMounted(() => {
  updateWidth(props.modelValue || 300)
})

// 监听 props.modelValue 变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== leftWidth.value) {
    updateWidth(newValue)
  }
})
</script>

<style scoped lang="scss">
.custom-splitter {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;

  &.is-dragging {
    user-select: none;
    cursor: col-resize;

    * {
      cursor: col-resize !important;
    }
  }

  .splitter-panel {
    flex-shrink: 0;
    height: 100%;
    overflow: hidden;

    &.left-panel {
      min-width: 0;
    }

    &.right-panel {
      flex: 1;
      min-width: 0;
    }
  }

  .splitter-divider {
    width: 6px;
    flex-shrink: 0;
    cursor: col-resize;
    background: #e0e0e0;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;

    &:hover {
      background: #3b82f6;
    }

    .divider-line {
      width: 2px;
      height: 100%;
      background: rgba(255, 255, 255, 0.5);
    }
  }
}
</style>

