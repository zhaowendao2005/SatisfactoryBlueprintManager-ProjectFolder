<template>
  <el-dialog
    v-model="visible"
    title="重名蓝图选择"
    width="600px"
  >
    <div class="duplicate-content">
      <p><strong>蓝图名称：</strong>{{ duplicateInfo.blueprintName }}</p>
      <p>找到多个匹配的源路径，请选择其中一个：</p>

      <el-radio-group v-model="selectedPath">
        <el-radio
          v-for="candidate in duplicateInfo.candidates"
          :key="candidate.fullPath"
          :label="candidate.fullPath"
          style="display: block; margin-bottom: 8px;"
        >
          <div>
            <strong>{{ candidate.sourceName }}</strong>
            <br />
            <span style="color: #666; font-size: 12px;">{{ candidate.relativePath }}</span>
          </div>
        </el-radio>
      </el-radio-group>

      <el-checkbox v-model="applyToAll" style="margin-top: 16px;">
        应用到所有重名蓝图
      </el-checkbox>
    </div>

    <template #footer>
      <el-button @click="handleSkip">跳过此蓝图</el-button>
      <el-button @click="handleFallback">使用兜底目录</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DuplicateInfo, UserChoice } from '@types/sync'

const props = defineProps<{
  modelValue: boolean
  duplicateInfo: DuplicateInfo
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [choice: UserChoice]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const selectedPath = ref<string>(
  props.duplicateInfo.candidates.length > 0 ? props.duplicateInfo.candidates[0].fullPath : ''
)
const applyToAll = ref(false)

const handleConfirm = () => {
  emit('confirm', {
    action: 'select',
    selectedPath: selectedPath.value,
    applyToAll: applyToAll.value,
  })
  visible.value = false
}

const handleSkip = () => {
  emit('confirm', {
    action: 'skip',
    applyToAll: applyToAll.value,
  })
  visible.value = false
}

const handleFallback = () => {
  emit('confirm', {
    action: 'fallback',
    applyToAll: applyToAll.value,
  })
  visible.value = false
}
</script>

<style scoped lang="scss">
.duplicate-content {
  p {
    margin: 8px 0;
  }
}
</style>

