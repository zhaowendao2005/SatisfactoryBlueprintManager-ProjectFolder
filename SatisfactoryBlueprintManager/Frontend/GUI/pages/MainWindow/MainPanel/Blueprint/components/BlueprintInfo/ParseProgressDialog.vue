<template>
  <el-dialog
    v-model="visible"
    title="解析蓝图信息"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!isParsing"
    width="500px"
  >
    <div class="parse-progress-dialog">
      <!-- 进度信息 -->
      <div v-if="progress" class="progress-info">
        <div class="progress-header">
          <span class="current-blueprint">
            {{ progress.currentBlueprintName || '准备中...' }}
          </span>
          <span class="progress-text">
            {{ progress.completed }} / {{ progress.total }}
          </span>
        </div>

        <!-- 进度条 -->
        <el-progress
          :percentage="progress.percentage"
          :status="progress.percentage === 100 ? 'success' : undefined"
        />

        <!-- 统计信息 -->
        <div class="stats">
          <span class="stat-item success">
            成功: {{ progress.succeeded }}
          </span>
          <span class="stat-item failed">
            失败: {{ progress.failed }}
          </span>
          <span v-if="progress.estimatedTimeLeft > 0" class="stat-item time">
            预计剩余: {{ formatTime(progress.estimatedTimeLeft) }}
          </span>
        </div>
      </div>

      <!-- 完成结果 -->
      <div v-if="result && !isParsing" class="result-summary">
        <el-alert
          :title="`解析完成：成功 ${result.succeeded.length} 个，失败 ${result.failed.length} 个`"
          :type="result.failed.length === 0 ? 'success' : 'warning'"
          :closable="false"
        />

        <!-- 失败列表 -->
        <div v-if="result.failed && result.failed.length > 0" class="failed-list">
          <div class="failed-title">失败详情：</div>
          <div
            v-for="(item, index) in result.failed"
            :key="index"
            class="failed-item"
          >
            <span class="failed-name">{{ item.blueprintName }}</span>
            <span class="failed-error">{{ item.error }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button
        v-if="isParsing"
        disabled
      >
        解析中...
      </el-button>
      <el-button
        v-else
        type="primary"
        @click="handleClose"
      >
        关闭
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ParseProgressInfo, ParseResult } from 'blueprint-info'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'complete', result: ParseResult): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

const progress = ref<ParseProgressInfo | null>(null)
const result = ref<ParseResult | null>(null)
const isParsing = computed(() => progress.value !== null && progress.value.percentage < 100)

let unsubscribeProgress: (() => void) | null = null

onMounted(() => {
  // 订阅进度事件
  if (window.blueprintInfoAPI) {
    unsubscribeProgress = window.blueprintInfoAPI.onProgress((prog: ParseProgressInfo) => {
      progress.value = prog
    })
  }
})

onUnmounted(() => {
  if (unsubscribeProgress) {
    unsubscribeProgress()
  }
})

const handleClose = () => {
  visible.value = false
  progress.value = null
  result.value = null
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} 秒`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes} 分 ${remainingSeconds} 秒`
}

// 暴露方法供外部调用
defineExpose({
  setResult: (parseResult: ParseResult) => {
    result.value = parseResult
    emit('complete', parseResult)
  },
})
</script>

<style scoped lang="scss">
.parse-progress-dialog {
  .progress-info {
    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      .current-blueprint {
        font-weight: 500;
        color: #333;
      }

      .progress-text {
        color: #666;
        font-size: 14px;
      }
    }

    .stats {
      display: flex;
      gap: 16px;
      margin-top: 12px;
      font-size: 14px;

      .stat-item {
        &.success {
          color: #67c23a;
        }

        &.failed {
          color: #f56c6c;
        }

        &.time {
          color: #909399;
        }
      }
    }
  }

  .result-summary {
    margin-top: 20px;

    .failed-list {
      margin-top: 16px;

      .failed-title {
        font-weight: 500;
        margin-bottom: 8px;
        color: #333;
      }

      .failed-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        background: #fef0f0;
        border-radius: 4px;
        margin-bottom: 8px;

        .failed-name {
          font-weight: 500;
          color: #333;
        }

        .failed-error {
          font-size: 12px;
          color: #f56c6c;
        }
      }
    }
  }
}
</style>

