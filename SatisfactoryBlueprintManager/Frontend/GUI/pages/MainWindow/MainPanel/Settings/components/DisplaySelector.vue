<template>
  <div class="display-selector">
    <div class="display-selector-label">
      <span>显示器选择</span>
      <el-tooltip content="点击矩形选择显示器，选中的显示器会放大显示">
        <el-icon class="info-icon"><QuestionFilled /></el-icon>
      </el-tooltip>
    </div>

    <div
      v-if="displays.length === 0"
      class="display-selector-empty"
    >
      正在加载显示器信息...
    </div>

    <div
      v-else
      class="display-selector-content"
    >
      <svg
        :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
        class="display-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <g>
          <rect
            v-for="rect in layoutRects"
            :key="rect.displayIndex"
            :x="rect.x"
            :y="rect.y"
            :width="rect.width"
            :height="rect.height"
            :class="{
              'display-rect': true,
              'display-rect-selected': rect.isSelected,
              'display-rect-primary': rect.isPrimary,
            }"
            @click="handleRectClick(rect.displayIndex)"
          />
          <text
            v-for="rect in layoutRects"
            :key="`text-${rect.displayIndex}`"
            :x="rect.x + rect.width / 2"
            :y="rect.y + rect.height / 2"
            class="display-label"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {{ rect.displayIndex }}
            <tspan
              v-if="rect.isPrimary"
              class="display-label-primary"
            >主</tspan>
          </text>
        </g>
      </svg>
    </div>

    <div
      v-if="selectedDisplayIndex !== null"
      class="display-selector-info"
    >
      已选择显示器 {{ selectedDisplayIndex }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TypeScript 误报，@types 别名已正确配置
import type { DisplayInfo } from '@types/automation-config'

interface Props {
  modelValue: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()

const displays = ref<DisplayInfo[]>([])
const selectedDisplayIndex = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

/**
 * 显示器布局矩形
 */
interface DisplayLayoutRect {
  x: number           // SVG 归一化 X 坐标
  y: number           // SVG 归一化 Y 坐标
  width: number       // SVG 归一化宽度
  height: number      // SVG 归一化高度
  displayIndex: number // 显示器索引
  isSelected: boolean  // 是否被选中
  isPrimary: boolean   // 是否主显示器
}

/**
 * 计算显示器布局矩形
 */
function calculateLayout(displays: DisplayInfo[], selectedIndex: number | null): DisplayLayoutRect[] {
  if (displays.length === 0) {
    return []
  }

  // 1. 找到所有显示器的边界框
  const minX = Math.min(...displays.map(d => d.bounds.x))
  const minY = Math.min(...displays.map(d => d.bounds.y))
  const maxX = Math.max(...displays.map(d => d.bounds.x + d.bounds.width))
  const maxY = Math.max(...displays.map(d => d.bounds.y + d.bounds.height))

  // 2. 计算缩放比例（归一化到 100x100 viewBox）
  const totalWidth = maxX - minX
  const totalHeight = maxY - minY
  const maxDimension = Math.max(totalWidth, totalHeight)
  const scale = maxDimension > 0 ? 100 / maxDimension : 1

  // 3. 为每个显示器生成矩形
  return displays.map((display, index) => {
    const isSelected = index === selectedIndex
    const scaleFactor = isSelected ? 1.3 : 1

    // 计算基础位置和尺寸
    const baseX = (display.bounds.x - minX) * scale
    const baseY = (display.bounds.y - minY) * scale
    const baseWidth = display.bounds.width * scale
    const baseHeight = display.bounds.height * scale

    // 如果选中，需要调整位置以保持中心点不变
    const scaledWidth = baseWidth * scaleFactor
    const scaledHeight = baseHeight * scaleFactor
    const offsetX = (scaledWidth - baseWidth) / 2
    const offsetY = (scaledHeight - baseHeight) / 2

    return {
      x: baseX - offsetX,
      y: baseY - offsetY,
      width: scaledWidth,
      height: scaledHeight,
      displayIndex: index,
      isSelected,
      isPrimary: display.isPrimary,
    }
  })
}

const layoutRects = computed(() => calculateLayout(displays.value, selectedDisplayIndex.value ?? null))

const viewBoxWidth = computed(() => {
  if (layoutRects.value.length === 0) return 100
  return Math.max(...layoutRects.value.map(r => r.x + r.width)) + 5
})

const viewBoxHeight = computed(() => {
  if (layoutRects.value.length === 0) return 100
  return Math.max(...layoutRects.value.map(r => r.y + r.height)) + 5
})

/**
 * 加载显示器信息
 */
async function loadDisplaysInfo(): Promise<void> {
  const api = window.automationConfigAPI
  if (!api) {
    ElMessage.error('自动化配置 API 不可用，请确保在 Electron 环境中运行')
    return
  }

  try {
    displays.value = await api.getDisplaysInfo()
  } catch (error) {
    console.error('Failed to load displays info:', error)
    ElMessage.error(`加载显示器信息失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 处理矩形点击
 */
function handleRectClick(index: number): void {
  if (selectedDisplayIndex.value === index) {
    // 如果点击的是已选中的显示器，取消选择
    selectedDisplayIndex.value = null
  } else {
    selectedDisplayIndex.value = index
  }
}

onMounted(() => {
  loadDisplaysInfo()
})
</script>

<style scoped lang="scss">
.display-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.display-selector-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  font-size: 14px;
  font-weight: 500;

  .info-icon {
    color: rgba(255, 255, 255, 0.7);
    cursor: help;
  }
}

.display-selector-empty {
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

.display-selector-content {
  width: 100%;
  height: 200px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.display-svg {
  width: 100%;
  height: 100%;
}

.display-rect {
  fill: rgba(255, 255, 255, 0.2);
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 1;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    fill: rgba(255, 255, 255, 0.3);
    stroke: rgba(255, 255, 255, 0.8);
  }
}

.display-rect-selected {
  fill: rgba(64, 158, 255, 0.4);
  stroke: rgba(64, 158, 255, 1);
  stroke-width: 2;
  filter: drop-shadow(0 0 4px rgba(64, 158, 255, 0.6));

  &:hover {
    fill: rgba(64, 158, 255, 0.5);
  }
}

.display-rect-primary {
  stroke-dasharray: 4 2;
}

.display-label {
  fill: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.display-label-primary {
  font-size: 10px;
  fill: rgba(255, 215, 0, 1);
}

.display-selector-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}
</style>

