<template>
  <div class="batch-operation-bar">
    <div class="batch-controls">
      <el-button
        :type="batchMode ? 'default' : 'primary'"
        @click="handleToggleBatchMode"
      >
        <el-icon v-if="!batchMode"><Check /></el-icon>
        <el-icon v-else><Close /></el-icon>
        <span>{{ batchMode ? '取消批量' : '批量操作' }}</span>
      </el-button>

      <div
        v-if="batchMode"
        class="batch-actions"
      >
        <span class="action-label">添加标签:</span>
        <el-select
          v-model="selectedTagId"
          placeholder="选择标签"
          size="small"
          style="width: 150px"
        >
          <el-option
            v-for="tag in userTags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.id"
          />
        </el-select>
        <el-button
          type="success"
          size="small"
          :disabled="!selectedTagId || selectedBlueprints.size === 0"
          @click="handleApplyTag"
        >
          应用
        </el-button>
        <el-button
          type="danger"
          size="small"
          :disabled="!selectedTagId || selectedBlueprints.size === 0"
          @click="handleRemoveTag"
        >
          移除
        </el-button>
        <el-button
          type="primary"
          size="small"
          @click="showCreateTagDialog"
        >
          新增标签
        </el-button>
      </div>
    </div>

    <div class="blueprint-count">
      <span>显示 {{ blueprintCount }} 个蓝图</span>
    </div>

    <!-- 新增标签对话框 -->
    <el-dialog
      v-model="showDialog"
      title="新增标签"
      width="400px"
    >
      <el-form :model="newTagForm" label-width="80px">
        <el-form-item label="标签名称">
          <el-input
            v-model="newTagForm.name"
            placeholder="请输入标签名称"
            maxlength="20"
          />
        </el-form-item>
        <el-form-item label="标签颜色">
          <el-color-picker v-model="newTagForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!newTagForm.name"
          @click="handleCreateTag"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'
import type { TagDefinition } from '../../../types'

interface Props {
  batchMode: boolean
  selectedBlueprints: Set<string>
  allTags: TagDefinition[]
  blueprintCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-batch-mode'): void
  (e: 'batch-add-tag', tagId: string): void
  (e: 'batch-remove-tag', tagId: string): void
  (e: 'create-tag', name: string, color: string): void
}>()

const selectedTagId = ref<string>('')
const showDialog = ref(false)
const newTagForm = ref({
  name: '',
  color: '#3B82F6',
})

// 只显示用户标签，不显示路径标签
const userTags = computed(() => {
  return props.allTags.filter((tag) => !tag.id.startsWith('path:'))
})

watch(
  () => props.batchMode,
  (newVal) => {
    if (!newVal) {
      selectedTagId.value = ''
    }
  }
)

const handleToggleBatchMode = (): void => {
  emit('toggle-batch-mode')
}

const handleApplyTag = (): void => {
  if (selectedTagId.value && props.selectedBlueprints.size > 0) {
    emit('batch-add-tag', selectedTagId.value)
  }
}

const handleRemoveTag = (): void => {
  if (selectedTagId.value && props.selectedBlueprints.size > 0) {
    emit('batch-remove-tag', selectedTagId.value)
  }
}

const showCreateTagDialog = (): void => {
  newTagForm.value = {
    name: '',
    color: '#3B82F6',
  }
  showDialog.value = true
}

const handleCreateTag = (): void => {
  if (newTagForm.value.name.trim()) {
    emit('create-tag', newTagForm.value.name.trim(), newTagForm.value.color)
    showDialog.value = false
  }
}
</script>

<style scoped lang="scss">
.batch-operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 16px;

  .batch-controls {
    display: flex;
    align-items: center;
    gap: 12px;

    .batch-actions {
      display: flex;
      align-items: center;
      gap: 8px;

      .action-label {
        font-size: 12px;
        color: #666;
      }
    }
  }

  .blueprint-count {
    font-size: 14px;
    color: #666;
  }
}
</style>

