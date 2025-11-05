<template>
  <el-dialog
    v-model="visible"
    title="同步进度"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div v-if="progress" class="progress-content">
      <el-progress
        :percentage="progressPercentage"
        :status="progress.status"
      />
      <p class="current-file">当前处理：{{ progress.current }}</p>
      <div class="stats">
        <span>总计：{{ progress.total }}</span>
        <span>已完成：{{ progress.completed }}</span>
        <span>失败：{{ progress.failed }}</span>
        <span>跳过：{{ progress.skipped }}</span>
      </div>
    </div>

    <div v-if="result" class="result-content">
      <h4>同步结果</h4>
      <p>成功：{{ result.succeeded.length }}</p>
      <p>失败：{{ result.failed.length }}</p>
      <p>跳过：{{ result.skipped.length }}</p>
      <p v-if="result.backupPath">备份路径：{{ result.backupPath }}</p>
    </div>

    <template #footer>
      <el-button v-if="isSyncing" @click="handleCancel">取消</el-button>
      <el-button v-else type="primary" @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useSyncOperationStore } from '../../stores/Sync/operation-store'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useSyncOperationStore()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const progress = computed(() => store.progress)
const result = computed(() => store.syncResult)
const isSyncing = computed(() => store.isSyncing)

const progressPercentage = computed(() => {
  if (!progress.value || progress.value.total === 0) {
    return 0
  }
  return Math.round(
    ((progress.value.completed + progress.value.failed + progress.value.skipped) /
      progress.value.total) *
      100
  )
})

const handleCancel = () => {
  store.cancelSync()
}

const handleClose = () => {
  visible.value = false
  store.clearResult()
}

// 监听同步状态，自动打开对话框
watch(
  () => store.isSyncing,
  (syncing) => {
    if (syncing) {
      visible.value = true
    }
  }
)
</script>

<style scoped lang="scss">
.progress-content {
  .current-file {
    margin-top: 16px;
    color: #666;
  }

  .stats {
    margin-top: 16px;
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: #666;
  }
}

.result-content {
  h4 {
    margin-top: 0;
  }

  p {
    margin: 8px 0;
  }
}
</style>

