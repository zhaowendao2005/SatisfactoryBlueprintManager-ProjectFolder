<template>
  <div class="card shortcut-config-card">
    <div class="card-header">
      <h3 class="card-title">快捷键配置</h3>
    </div>

    <div class="card-content">
      <div class="shortcut-item">
        <div class="shortcut-label">
          <span class="label-text">唤出窗口</span>
          <span class="label-desc">按此快捷键可唤出或最小化窗口</span>
        </div>
        <div class="shortcut-input-group">
          <el-input
            v-model="shortcutPreview"
            readonly
            placeholder="点击录制按钮设置快捷键"
            class="shortcut-input"
          />
          <el-button
            v-if="!isRecording"
            type="primary"
            @click="startRecording"
          >
            录制快捷键
          </el-button>
          <el-button
            v-else
            type="warning"
            @click="stopRecording"
          >
            停止录制
          </el-button>
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { ShortcutConfig } from '@types/shortcut-config'

const shortcutPreview = ref('')
const isRecording = ref(false)
const errorMessage = ref('')
const currentKeys = ref<Set<string>>(new Set())

/**
 * 将按键组合转换为Electron快捷键格式
 */
const formatShortcut = (keys: Set<string>): string => {
  const parts: string[] = []
  
  // 修饰键优先级：CommandOrControl > Shift > Alt
  if (keys.has('Control') || keys.has('Meta')) {
    parts.push('CommandOrControl')
  }
  if (keys.has('Shift')) {
    parts.push('Shift')
  }
  if (keys.has('Alt')) {
    parts.push('Alt')
  }
  
  // 非修饰键
  const nonModifierKeys = Array.from(keys).filter(
    key => !['Control', 'Meta', 'Shift', 'Alt'].includes(key)
  )
  
  if (nonModifierKeys.length === 0) {
    return ''
  }
  
  // 取第一个非修饰键
  parts.push(nonModifierKeys[0].toUpperCase())
  
  return parts.join('+')
}

/**
 * 将Electron快捷键格式转换为显示格式
 */
const formatDisplay = (shortcut: string): string => {
  return shortcut
    .replace(/CommandOrControl/g, process.platform === 'darwin' ? '⌘' : 'Ctrl')
    .replace(/Shift/g, 'Shift')
    .replace(/Alt/g, 'Alt')
    .replace(/\+/g, ' + ')
}

/**
 * 处理键盘按下事件
 */
const handleKeyDown = (e: KeyboardEvent): void => {
  if (!isRecording.value) return

  e.preventDefault()
  e.stopPropagation()

  const key = e.key
  
  // 忽略重复按键
  if (currentKeys.value.has(key)) {
    return
  }

  // 记录修饰键
  if (e.ctrlKey || e.metaKey) {
    currentKeys.value.add(process.platform === 'darwin' ? 'Meta' : 'Control')
  }
  if (e.shiftKey) {
    currentKeys.value.add('Shift')
  }
  if (e.altKey) {
    currentKeys.value.add('Alt')
  }

  // 记录非修饰键（排除特殊键）
  if (!['Control', 'Meta', 'Shift', 'Alt', 'Tab', 'Escape'].includes(key)) {
    currentKeys.value.add(key)
    
    // 有非修饰键时，停止录制
    const shortcut = formatShortcut(currentKeys.value)
    if (shortcut) {
      stopRecording()
      void saveShortcut(shortcut)
    }
  }
}

/**
 * 处理键盘释放事件
 */
const handleKeyUp = (): void => {
  // 清除修饰键状态
  currentKeys.value.clear()
}

/**
 * 开始录制快捷键
 */
const startRecording = (): void => {
  isRecording.value = true
  errorMessage.value = ''
  currentKeys.value.clear()
  shortcutPreview.value = '请按下快捷键组合...'
  
  window.addEventListener('keydown', handleKeyDown, true)
  window.addEventListener('keyup', handleKeyUp, true)
}

/**
 * 停止录制快捷键
 */
const stopRecording = (): void => {
  isRecording.value = false
  window.removeEventListener('keydown', handleKeyDown, true)
  window.removeEventListener('keyup', handleKeyUp, true)
  
  if (currentKeys.value.size === 0) {
    shortcutPreview.value = ''
  }
}

/**
 * 保存快捷键配置
 */
const saveShortcut = async (shortcut: string): Promise<void> => {
  if (!window.shortcutConfigAPI) {
    ElMessage.error('快捷键配置 API 不可用')
    return
  }

  try {
    // 验证快捷键格式
    const isValid = await window.shortcutConfigAPI.validateShortcut(shortcut)
    if (!isValid) {
      errorMessage.value = '快捷键格式无效或已被系统占用'
      shortcutPreview.value = ''
      return
    }

    // 保存配置
    const config: ShortcutConfig = {
      toggleWindow: shortcut,
    }
    await window.shortcutConfigAPI.saveShortcutConfig(config)
    
    shortcutPreview.value = formatDisplay(shortcut)
    errorMessage.value = ''
    ElMessage.success('快捷键设置成功')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败'
    ElMessage.error('保存快捷键配置失败')
  }
}

/**
 * 加载快捷键配置
 */
const loadShortcutConfig = async (): Promise<void> => {
  if (!window.shortcutConfigAPI) {
    return
  }

  try {
    const config = await window.shortcutConfigAPI.loadShortcutConfig()
    shortcutPreview.value = formatDisplay(config.toggleWindow)
  } catch (error) {
    console.error('Failed to load shortcut config:', error)
  }
}

onMounted(() => {
  void loadShortcutConfig()
})

onUnmounted(() => {
  if (isRecording.value) {
    stopRecording()
  }
})
</script>

<style scoped lang="scss">
.shortcut-config-card {
  .card-content {
    padding: 24px;
  }

  .shortcut-item {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .shortcut-label {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .label-text {
      font-weight: 600;
      font-size: 14px;
      color: #333;
    }

    .label-desc {
      font-size: 12px;
      color: #666;
    }
  }

  .shortcut-input-group {
    display: flex;
    gap: 12px;
    align-items: center;

    .shortcut-input {
      flex: 1;
      max-width: 300px;
    }
  }

  .error-message {
    color: #f56c6c;
    font-size: 12px;
    margin-top: -8px;
  }
}
</style>

