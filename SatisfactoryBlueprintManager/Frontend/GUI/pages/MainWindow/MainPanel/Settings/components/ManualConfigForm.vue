<template>
  <div class="manual-config-form">
    <el-form
      :model="localParams"
      :rules="rules"
      label-width="120px"
      class="form-content"
    >
      <!-- 输入栏定位 -->
      <el-form-item
        label="输入栏定位"
        class="form-item"
      >
        <div class="form-input-group">
          <el-input
            v-model.number="localParams.inputFieldPosition.x"
            type="number"
            placeholder="X坐标"
            @blur="handleBlur"
          />
          <el-input
            v-model.number="localParams.inputFieldPosition.y"
            type="number"
            placeholder="Y坐标"
            @blur="handleBlur"
          />
          <el-button
            type="primary"
            :icon="Location"
            @click="handleLocate('inputField')"
          >
            定位
          </el-button>
        </div>
      </el-form-item>

      <!-- 第一位蓝图位置定位 -->
      <el-form-item
        label="第一位蓝图位置"
        class="form-item"
      >
        <div class="form-input-group">
          <el-input
            v-model.number="localParams.firstBlueprintPosition.x"
            type="number"
            placeholder="X坐标"
            @blur="handleBlur"
          />
          <el-input
            v-model.number="localParams.firstBlueprintPosition.y"
            type="number"
            placeholder="Y坐标"
            @blur="handleBlur"
          />
          <el-button
            type="primary"
            :icon="Location"
            @click="handleLocate('firstBlueprint')"
          >
            定位
          </el-button>
        </div>
      </el-form-item>

      <!-- 字符输入速度 -->
      <el-form-item
        label="字符输入速度"
        prop="charInputDelay"
        class="form-item"
      >
        <div class="form-input-group">
          <el-input
            v-model.number="localParams.charInputDelay"
            type="number"
            placeholder="间隔时长"
            :min="10"
            :max="1000"
            @blur="handleBlur"
          >
            <template #suffix>
              <span style="color: #999;">ms</span>
            </template>
          </el-input>
        </div>
        <div class="form-hint">
          范围：10ms - 1000ms，默认 100ms
        </div>
      </el-form-item>

      <!-- 显示器选择 -->
      <el-form-item
        label="显示器选择"
        class="form-item"
      >
        <DisplaySelector
          v-model="localParams.displayIndex"
          @update:model-value="handleDisplayIndexChange"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'
import { Location } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TypeScript 误报，@types 别名已正确配置
import type { ManualConfigParams } from '@types/automation-config'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TypeScript 误报，@types 别名已正确配置
import type { CalibrationType, CalibrationResult } from '@types/automation-config/calibration'
import DisplaySelector from './DisplaySelector.vue'

interface Props {
  modelValue: ManualConfigParams
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ManualConfigParams): void
}>()

const localParams = ref<ManualConfigParams>({ ...props.modelValue })

// 标志位：是否正在同步外部数据（避免触发保存）
const isSyncing = ref(false)

// 表单验证规则
const rules: FormRules = {
  charInputDelay: [
    { required: true, message: '请输入字符输入速度', trigger: 'blur' },
    { type: 'number', min: 10, max: 1000, message: '范围：10ms - 1000ms', trigger: 'blur' },
  ],
}

// 标定相关状态
const isCalibrating = ref(false)
const currentCalibrationType = ref<CalibrationType | null>(null)
let unsubscribeResult: (() => void) | null = null
let unsubscribeError: (() => void) | null = null

// 组件挂载
onMounted(() => {
  // 注册标定结果监听
  const api = window.automationConfigAPI
  if (api) {
    unsubscribeResult = api.onCalibrationResult((result: CalibrationResult) => {
      handleCalibrationResult(result)
    })
    unsubscribeError = api.onCalibrationError((error: string) => {
      handleCalibrationError(error)
    })
  }
})

// 组件卸载
onUnmounted(() => {
  // 清理监听器
  if (unsubscribeResult) {
    unsubscribeResult()
    unsubscribeResult = null
  }
  if (unsubscribeError) {
    unsubscribeError()
    unsubscribeError = null
  }
})

// 同步外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    isSyncing.value = true
    localParams.value = { ...newValue }
    // 使用 nextTick 确保在下一个事件循环中重置标志
    setTimeout(() => {
      isSyncing.value = false
    }, 0)
  },
  { deep: true }
)

// 深度克隆函数，去除 Vue Proxy
const deepCloneParams = (params: ManualConfigParams): ManualConfigParams => {
  return {
    inputFieldPosition: { ...params.inputFieldPosition },
    firstBlueprintPosition: { ...params.firstBlueprintPosition },
    charInputDelay: params.charInputDelay,
    displayIndex: params.displayIndex,
  }
}

// 防抖保存函数
const debouncedSave = debounce(() => {
  if (!isSyncing.value) {
    emit('update:modelValue', deepCloneParams(localParams.value))
  }
}, 500)

// 监听参数变化，防抖保存（仅在非同步状态下）
watch(
  localParams,
  () => {
    if (!isSyncing.value) {
      debouncedSave()
    }
  },
  { deep: true }
)

// 失焦立即保存
const handleBlur = () => {
  if (!isSyncing.value) {
    debouncedSave.cancel() // 取消防抖
    emit('update:modelValue', deepCloneParams(localParams.value))
  }
}

// 处理显示器序号变化
const handleDisplayIndexChange = () => {
  handleBlur()
}

// 定位按钮处理
const handleLocate = async (type: 'inputField' | 'firstBlueprint') => {
  const api = window.automationConfigAPI
  if (!api) {
    ElMessage.error('自动化配置 API 不可用，请确保在 Electron 环境中运行')
    return
  }

  if (isCalibrating.value) {
    ElMessage.warning('标定流程已在进行中，请等待完成')
    return
  }

  try {
    isCalibrating.value = true
    const calibrationType: CalibrationType = type === 'inputField' ? 'inputField' : 'firstBlueprint'
    currentCalibrationType.value = calibrationType
    
    // 启动标定流程（结果通过事件回调接收）
    await api.startCalibration(calibrationType)
    
    // 注意：结果会在 handleCalibrationResult 中处理
  } catch (error) {
    console.error('启动标定失败:', error)
    ElMessage.error(`启动标定失败: ${error instanceof Error ? error.message : String(error)}`)
    isCalibrating.value = false
    currentCalibrationType.value = null
  }
}

// 处理标定结果
const handleCalibrationResult = (result: CalibrationResult) => {
  isCalibrating.value = false
  
  // 根据标定类型更新对应的坐标
  if (result.displayIndex !== undefined && result.displayIndex !== null) {
    // 更新显示器序号（如果用户还没有设置）
    if (localParams.value.displayIndex === null || localParams.value.displayIndex === undefined) {
      localParams.value.displayIndex = result.displayIndex
    }
  }
  
  // 根据当前标定类型更新对应字段
  if (currentCalibrationType.value === 'inputField') {
    localParams.value.inputFieldPosition = { x: result.x, y: result.y }
  } else if (currentCalibrationType.value === 'firstBlueprint') {
    localParams.value.firstBlueprintPosition = { x: result.x, y: result.y }
  }
  
  // 重置标定类型
  currentCalibrationType.value = null
  
  // 立即保存
  handleBlur()
  
  ElMessage.success('坐标标定成功')
}

// 处理标定错误
const handleCalibrationError = (error: string) => {
  isCalibrating.value = false
  currentCalibrationType.value = null
  
  // 用户取消不显示错误提示
  if (error.includes('取消') || error.includes('cancelled')) {
    return
  }
  
  ElMessage.error(`标定失败: ${error}`)
}
</script>

<style scoped lang="scss">
.manual-config-form {
  padding: 16px 0;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-item {
  margin-bottom: 0;
}

.form-input-group {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.form-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

// Element Plus 表单样式覆盖（适配渐变背景）
:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

:deep(.el-input__inner) {
  background-color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.3);
  color: #333;

  &:focus {
    background-color: #fff;
    border-color: var(--el-color-primary);
  }
}

:deep(.el-form-item__error) {
  color: #ffd700;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}
</style>
