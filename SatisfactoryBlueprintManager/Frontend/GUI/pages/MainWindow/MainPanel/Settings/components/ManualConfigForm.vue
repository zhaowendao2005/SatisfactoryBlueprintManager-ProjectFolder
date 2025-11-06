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

      <!-- 显示器序号 -->
      <el-form-item
        label="显示器序号"
        class="form-item"
      >
        <div class="form-input-group">
          <el-input
            v-model.number="localParams.displayIndex"
            type="number"
            placeholder="未来记录操作的显示器序号"
            clearable
            @blur="handleBlur"
            @clear="handleClearDisplayIndex"
          />
        </div>
        <div class="form-hint">
          未来记录操作的显示器序号，可为空
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { debounce } from 'lodash-es'
import { Location } from '@element-plus/icons-vue'
import type { FormRules } from 'element-plus'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TypeScript 误报，@types 别名已正确配置
import type { ManualConfigParams } from '@types/automation-config'

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

// 组件挂载
onMounted(() => {
  // 初始化完成
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

// 清空显示器序号
const handleClearDisplayIndex = () => {
  localParams.value.displayIndex = null
  handleBlur()
}

// 定位按钮占位
const handleLocate = (type: 'inputField' | 'firstBlueprint') => {
  console.log(`定位${type === 'inputField' ? '输入栏' : '第一位蓝图位置'}`)
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
