<template>
  <div class="card general-settings-card">
    <div class="card-header">
      <h3 class="card-title">通用设置</h3>
    </div>

    <div class="card-content">
      <!-- 关闭窗口行为 -->
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

      <!-- 快速访问设置分组 -->
      <div class="setting-group">
        <div class="group-title">快速访问窗口</div>

        <!-- 快捷键配置 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">快捷键</span>
            <span class="label-desc">唤出快速访问窗口的快捷键（如：CommandOrControl+Shift+Q）</span>
          </div>
          <el-input
            v-model="quickAccessShortcut"
            placeholder="CommandOrControl+Shift+Q"
            class="setting-input"
            @blur="handleSave"
          />
        </div>

        <!-- 窗口置顶 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">窗口置顶</span>
            <span class="label-desc">快速访问窗口始终显示在其他窗口上方</span>
          </div>
          <el-switch
            v-model="quickAccessAlwaysOnTop"
            @change="handleSave"
          />
        </div>

        <!-- 使用后自动隐藏 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">使用蓝图后自动隐藏</span>
            <span class="label-desc">使用蓝图成功后自动隐藏快速访问窗口</span>
          </div>
          <el-switch
            v-model="quickAccessAutoHideAfterUse"
            @change="handleSave"
          />
        </div>

        <!-- 最近使用数量 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">最近使用蓝图数量</span>
            <span class="label-desc">记录最近使用的蓝图数量（{{ quickAccessRecentBlueprintsCount }}个）</span>
          </div>
          <el-slider
            v-model="quickAccessRecentBlueprintsCount"
            :min="5"
            :max="20"
            :step="1"
            :show-tooltip="true"
            class="setting-slider"
            @change="handleSave"
          />
        </div>
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
const quickAccessShortcut = ref<string>('CommandOrControl+Shift+Q')
const quickAccessAlwaysOnTop = ref<boolean>(true)
const quickAccessAutoHideAfterUse = ref<boolean>(true)
const quickAccessRecentBlueprintsCount = ref<number>(10)
const saveMessage = ref('')

onMounted(async () => {
  try {
    if (!window.generalSettingsAPI) {
      throw new Error('General Settings API not available')
    }

    const config = await window.generalSettingsAPI.loadGeneralSettings()
    closeWindowBehavior.value = config.closeWindowBehavior
    quickAccessShortcut.value = config.quickAccessShortcut || 'CommandOrControl+Shift+Q'
    quickAccessAlwaysOnTop.value = config.quickAccessAlwaysOnTop ?? true
    quickAccessAutoHideAfterUse.value = config.quickAccessAutoHideAfterUse ?? true
    quickAccessRecentBlueprintsCount.value = config.quickAccessRecentBlueprintsCount || 10
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
      quickAccessShortcut: quickAccessShortcut.value,
      quickAccessAlwaysOnTop: quickAccessAlwaysOnTop.value,
      quickAccessAutoHideAfterUse: quickAccessAutoHideAfterUse.value,
      quickAccessRecentBlueprintsCount: quickAccessRecentBlueprintsCount.value,
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

  .setting-input {
    width: 300px;
  }

  .setting-slider {
    width: 300px;
  }

  .setting-group {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 2px solid #ebeef5;

    .group-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 16px;
    }
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

