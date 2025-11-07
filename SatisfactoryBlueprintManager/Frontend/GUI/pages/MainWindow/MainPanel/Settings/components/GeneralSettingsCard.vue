<template>
  <div class="card general-settings-card">
    <div class="card-header">
      <h3 class="card-title">通用设置</h3>
    </div>

    <div class="card-content">
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">关闭窗口行为</span>
          <span class="label-desc">选择点击关闭按钮时的行为</span>
        </div>
        <el-select
          v-model="closeWindowBehavior"
          placeholder="请选择"
          class="setting-select"
          @change="handleSave"
        >
          <el-option
            label="最小化到托盘"
            value="minimize-to-tray"
          />
          <el-option
            label="直接退出程序"
            value="quit"
          />
          <el-option
            label="询问"
            value="ask"
          />
        </el-select>
      </div>

      <div v-if="saveMessage" class="save-message">
        {{ saveMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { CloseWindowBehavior } from '@types/general-settings'

const closeWindowBehavior = ref<CloseWindowBehavior>('minimize-to-tray')
const saveMessage = ref('')

onMounted(async () => {
  try {
    if (!window.generalSettingsAPI) {
      throw new Error('General Settings API not available')
    }

    const config = await window.generalSettingsAPI.loadGeneralSettings()
    closeWindowBehavior.value = config.closeWindowBehavior
  } catch (error) {
    console.error('Failed to load general settings:', error)
    ElMessage.error('加载通用设置失败')
  }
})

const handleSave = async (): Promise<void> => {
  try {
    if (!window.generalSettingsAPI) {
      throw new Error('General Settings API not available')
    }

    await window.generalSettingsAPI.saveGeneralSettings({
      closeWindowBehavior: closeWindowBehavior.value,
    })

    saveMessage.value = '保存成功'
    setTimeout(() => {
      saveMessage.value = ''
    }, 2000)

    ElMessage.success('保存成功')
  } catch (error) {
    console.error('Failed to save general settings:', error)
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped lang="scss">
.general-settings-card {
  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
    }
  }

  .setting-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .label-text {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }

    .label-desc {
      font-size: 12px;
      color: #909399;
    }
  }

  .setting-select {
    width: 200px;
  }

  .save-message {
    margin-top: 12px;
    padding: 8px 12px;
    background: #f0f9ff;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
    color: #1e40af;
    font-size: 12px;
  }
}
</style>

