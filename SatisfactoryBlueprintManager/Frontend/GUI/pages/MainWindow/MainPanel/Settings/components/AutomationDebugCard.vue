<template>
  <div class="card automation-debug-card">
    <div class="card-header">
      <h3 class="card-title">自动化测试</h3>
    </div>

    <div class="card-content">
      <div class="debug-form">
        <el-form
          :model="formData"
          label-width="100px"
        >
          <el-form-item label="测试文本">
            <el-input
              v-model="formData.testText"
              type="textarea"
              :rows="3"
              placeholder="请输入要测试的文本内容"
              :disabled="isExecuting"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="isExecuting"
              :disabled="!canExecute"
              @click="handleExecute"
            >
              {{ isExecuting ? '执行中...' : '测试' }}
            </el-button>
            <el-button
              v-if="isExecuting"
              @click="handleCancel"
            >
              取消
            </el-button>
          </el-form-item>

          <el-form-item
            v-if="lastResult"
            label="执行结果"
          >
            <el-alert
              :type="lastResult.success ? 'success' : 'error'"
              :title="lastResult.message"
              :closable="false"
              show-icon
            >
              <template
                v-if="lastResult.duration"
                #default
              >
                <div>
                  {{ lastResult.message }}
                  <span class="result-duration">（耗时: {{ lastResult.duration }}ms）</span>
                </div>
              </template>
            </el-alert>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TypeScript 误报，@types 别名已正确配置
import type { AutomationTestResult } from '@types/automation-config'
import { useAutomationConfigStore } from '../stores/AutomationConfig'

const store = useAutomationConfigStore()

const formData = ref({
  testText: '',
})

const isExecuting = ref(false)
const lastResult = ref<AutomationTestResult | null>(null)

const canExecute = computed(() => {
  return !isExecuting.value && formData.value.testText.trim().length > 0 && store.currentConfig !== null
})

/**
 * 执行测试
 */
async function handleExecute(): Promise<void> {
  const api = window.automationConfigAPI
  if (!api) {
    ElMessage.error('自动化配置 API 不可用，请确保在 Electron 环境中运行')
    return
  }

  if (!store.currentConfig) {
    ElMessage.warning('请先选择一个配置')
    return
  }

  const testText = formData.value.testText.trim()
  if (!testText) {
    ElMessage.warning('请输入测试文本')
    return
  }

  try {
    isExecuting.value = true
    lastResult.value = null

    const result = await api.executeTest(testText, store.currentConfigId || undefined)
    lastResult.value = result

    if (result.success) {
      ElMessage.success('自动化测试执行成功')
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    lastResult.value = {
      success: false,
      message: errorMessage,
    }
    ElMessage.error(`执行失败: ${errorMessage}`)
  } finally {
    isExecuting.value = false
  }
}

/**
 * 取消执行
 */
function handleCancel(): void {
  // 注意：当前实现不支持取消，这里只是重置状态
  isExecuting.value = false
  ElMessage.info('取消操作（注意：已开始的操作可能无法立即停止）')
}
</script>

<style scoped lang="scss">
.automation-debug-card {
  /* From Uiverse.io by JaydipPrajapati1910 */
  width: 100%;
  min-height: 200px;
  border: none;
  border-radius: 10px;
  background: radial-gradient(ellipse farthest-side at 76% 77%, rgba(245, 228, 212, 0.25) 4%, rgba(255, 255, 255, 0) calc(4% + 1px)), radial-gradient(circle at 76% 40%, #fef6ec 4%, rgba(255, 255, 255, 0) 4.18%), linear-gradient(135deg, #ff0000 0%, #000036 100%), radial-gradient(ellipse at 28% 0%, #ffcfac 0%, rgba(98, 149, 144, 0.5) 100%), linear-gradient(180deg, #cd6e8a 0%, #f5eab0 69%, #d6c8a2 70%, #a2758d 100%);
  background-blend-mode: normal, normal, screen, overlay, normal;
  box-shadow: 0px 0px 10px 1px #000000;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .card-content {
    flex: 1;
    padding: 16px 20px;
  }
}

.debug-form {
  :deep(.el-form-item__label) {
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  :deep(.el-input__inner),
  :deep(.el-textarea__inner) {
    background-color: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.3);
    color: #333;

    &:focus {
      background-color: #fff;
      border-color: var(--el-color-primary);
    }

    &:disabled {
      background-color: rgba(255, 255, 255, 0.6);
      cursor: not-allowed;
    }
  }
}

.result-duration {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-left: 8px;
}
</style>

