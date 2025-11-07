<template>
  <div
    class="blueprint-icon"
    :class="{ 
      selected: isSelected,
      'batch-mode': batchMode 
    }"
    @mousedown="handleMouseDown"
    @click="handleClick"
  >
    <!-- 批量选择复选框 -->
    <el-checkbox
      v-if="batchMode"
      :model-value="isSelected"
      class="icon-checkbox"
      @click.stop
      @change="handleToggleSelect"
    />
    
    <!-- 图标容器 -->
    <div class="icon-container" :style="iconStyle">
      <el-icon class="icon-content" :size="28 as any">
        <component :is="iconComponent" />
      </el-icon>
    </div>
    
      <!-- 蓝图名称 -->
      <div 
        ref="labelRef"
        class="icon-label" 
        :class="{ 'overflow-text': needsOverflow }"
        :style="labelStyle"
        :title="blueprint.name"
      >
        {{ displayName }}
      </div>
    
    <!-- 路径标签（可选） -->
    <div v-if="showPath" class="icon-path-tag" :title="blueprint.directoryPath">
      {{ pathTag }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { ElIcon } from 'element-plus'
import type { ActiveBlueprintNodeWithTags } from '../../../types'
import { getIconForBlueprint } from '../../../utils/iconHelpers'

interface Props {
  blueprint: ActiveBlueprintNodeWithTags
  batchMode: boolean
  isSelected: boolean
  showPath?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showPath: false
})

const emit = defineEmits<{
  (e: 'toggle-select', id: string): void
  (e: 'use-blueprint', id: string): void
}>()

// 用于区分点击和拖动
const mouseDownPos = ref<{ x: number; y: number } | null>(null)
const isDragging = ref(false)

// 🆕 标签元素引用
const labelRef = ref<HTMLElement | null>(null)
const containerWidth = ref(70) // 默认容器宽度（图标宽度）

// 最低字体大小
const MIN_FONT_SIZE = 8
// 最高字体大小
const MAX_FONT_SIZE = 11

// 图标组件（使用智能匹配的 Element Plus 图标）
const iconComponent = computed(() => {
  const name = props.blueprint.name || ''
  const path = props.blueprint.directoryPath || props.blueprint.path || ''
  return getIconForBlueprint(name, path)
})

// 图标颜色（根据名称哈希生成）
const iconStyle = computed(() => {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  ]
  
  // 简单哈希
  const name = props.blueprint.name || ''
  const hash = name.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  
  return {
    background: gradients[hash % gradients.length]
  }
})

// 路径标签（取路径最后一部分）
const pathTag = computed(() => {
  if (!props.blueprint.directoryPath) return ''
  const parts = props.blueprint.directoryPath.split(/[/\\]/)
  return parts[parts.length - 1] || parts[parts.length - 2] || ''
})

// 🆕 计算字符数（所有字符都视为1字符，包括空格）
const charCount = computed(() => {
  return (props.blueprint.name || '').length
})

// 🆕 计算合适的字体大小
const calculatedFontSize = computed(() => {
  const count = charCount.value
  if (count === 0) return MAX_FONT_SIZE
  
  // 估算：假设每个字符的平均宽度约为字体大小的 0.6 倍（考虑中英文混合）
  // 容器宽度减去左右padding（8px * 2 = 16px）
  const availableWidth = containerWidth.value - 16
  // 公式：availableWidth = charCount * fontSize * 0.6
  // 所以：fontSize = availableWidth / (charCount * 0.6)
  const fontSize = availableWidth / (count * 0.6)
  
  // 限制在最小和最大字体大小之间
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize))
})

// 🆕 是否需要溢出处理（达到最低字体大小仍无法显示全）
const needsOverflow = computed(() => {
  return calculatedFontSize.value <= MIN_FONT_SIZE
})

// 🆕 显示的名称（始终显示完整名称）
const displayName = computed(() => {
  return props.blueprint.name || ''
})

// 🆕 标签样式（根据计算出的字体大小）
const labelStyle = computed(() => {
  return {
    fontSize: `${calculatedFontSize.value.toFixed(1)}px`
  }
})

// 🆕 更新容器宽度
const updateContainerWidth = (): void => {
  nextTick(() => {
    if (labelRef.value) {
      const parent = labelRef.value.parentElement
      if (parent) {
        // 获取图标容器的宽度（通常是100%）
        const iconContainer = parent.querySelector('.icon-container') as HTMLElement
        if (iconContainer) {
          containerWidth.value = iconContainer.offsetWidth || 70
        } else {
          // 如果没有找到图标容器，使用父元素的宽度
          containerWidth.value = parent.clientWidth || 70
        }
      }
    }
  })
}

onMounted(() => {
  updateContainerWidth()
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateContainerWidth)
})

watch(() => props.blueprint.name, () => {
  updateContainerWidth()
})

const handleMouseDown = (event: MouseEvent): void => {
  // 记录按下位置
  mouseDownPos.value = { x: event.clientX, y: event.clientY }
  isDragging.value = false
  
  // 监听鼠标移动，判断是否是拖动
  const handleMove = (e: MouseEvent): void => {
    if (!mouseDownPos.value) return
    
    const dx = Math.abs(e.clientX - mouseDownPos.value.x)
    const dy = Math.abs(e.clientY - mouseDownPos.value.y)
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // 如果移动距离超过 5px，认为是拖动
    if (distance > 5) {
      isDragging.value = true
    }
  }
  
  const handleUp = (): void => {
    mouseDownPos.value = null
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleUp)
  }
  
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleUp)
}

const handleClick = (event: MouseEvent): void => {
  // 如果是拖动，不触发点击事件
  if (isDragging.value) {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = false
    return
  }
  
  if (props.batchMode) {
    emit('toggle-select', props.blueprint.id)
  } else {
    emit('use-blueprint', props.blueprint.id)
  }
}

const handleToggleSelect = (): void => {
  emit('toggle-select', props.blueprint.id)
}
</script>

<style scoped lang="scss">
.blueprint-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 8px;
  border-radius: 12px;
  position: relative;
  user-select: none; // 🆕 禁用文本选择
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    background: rgba(0, 0, 0, 0.02);
  }
  
  &:active {
    transform: translateY(0) scale(1);
  }
  
  &.selected {
    .icon-container {
      border: 2px solid #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }
    
    .icon-label {
      color: #409eff;
      font-weight: 600;
    }
  }
  
  &.batch-mode {
    padding-top: 24px; // 为复选框留空间
  }
  
  .icon-checkbox {
    position: absolute;
    top: 4px;
    left: 4px;
    z-index: 1;
  }
  
  .icon-container {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
  }
  
  &:hover .icon-container {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    
    &::before {
      opacity: 1;
    }
  }
  
  .icon-content {
    color: white;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
    z-index: 1;
  }
  
  .icon-label {
    margin-top: 6px;
    color: #333;
    text-align: center;
    font-weight: 500;
    max-width: 100%;
    line-height: 1.3;
    transition: font-size 0.2s ease;
    
    // 默认情况下不溢出，完整显示（字体大小会动态调整）
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    word-break: break-all;
    
    // 如果需要溢出处理（达到最低字体大小仍无法显示全）
    &.overflow-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .icon-path-tag {
    margin-top: 2px;
    font-size: 9px;
    color: #999;
    text-align: center;
    opacity: 0.7;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>

