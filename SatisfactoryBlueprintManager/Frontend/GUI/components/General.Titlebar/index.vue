<template>
  <div class="titlebar">
    <div class="titlebar-content" :style="{ '-webkit-app-region': 'drag' }">
      <div class="titlebar-title">
        <q-icon v-if="showIcon" name="menu" size="16px" class="titlebar-icon" />
        <span>{{ title || 'Satisfactory Blueprint Manager' }}</span>
      </div>
    </div>
    <div class="titlebar-controls" :style="{ '-webkit-app-region': 'no-drag' }">
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="minimize"
        class="titlebar-button titlebar-button-minimize"
        :disable="!isElectron"
        @click="handleMinimize"
      />
      <q-btn
        flat
        dense
        round
        size="sm"
        :icon="isMaximized ? 'fullscreen_exit' : 'fullscreen'"
        class="titlebar-button"
        :disable="!isElectron"
        @click="handleMaximize"
      />
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="close"
        class="titlebar-button titlebar-button-close"
        :disable="!isElectron"
        @click="handleClose"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { TitlebarProps } from './types'
import type { ElectronWindowAPI } from '@gui/types/window'

const props = withDefaults(defineProps<TitlebarProps>(), {
  title: 'Satisfactory Blueprint Manager',
  showIcon: true,
})

const isElectron = ref(false)
const isMaximized = ref(false)

const checkElectron = () => {
  isElectron.value = typeof window !== 'undefined' && window.electronAPI !== undefined
}

const handleMinimize = async () => {
  if (!isElectron.value || !window.electronAPI) return
  try {
    await window.electronAPI.windowControl('minimize')
  } catch (error) {
    console.error('Failed to minimize window:', error)
  }
}

const handleMaximize = async () => {
  if (!isElectron.value || !window.electronAPI) return
  try {
    await window.electronAPI.windowControl(isMaximized.value ? 'unmaximize' : 'maximize')
  } catch (error) {
    console.error('Failed to maximize window:', error)
  }
}

const handleClose = async () => {
  if (!isElectron.value || !window.electronAPI) return
  try {
    await window.electronAPI.windowControl('close')
  } catch (error) {
    console.error('Failed to close window:', error)
  }
}

let maximizeChangeCallback: ((isMaximized: boolean) => void) | null = null

onMounted(() => {
  checkElectron()
  
  if (isElectron.value && window.electronAPI) {
    maximizeChangeCallback = (maximized: boolean) => {
      isMaximized.value = maximized
    }
    window.electronAPI.onMaximizeChange(maximizeChangeCallback)
  }
})

onUnmounted(() => {
  // Cleanup is handled by Electron IPC internally
  maximizeChangeCallback = null
})
</script>

<style scoped lang="scss">
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  background-color: #f3f3f3; // Word 风格浅灰色背景
  color: #323130; // 深色文字
  user-select: none;
  -webkit-app-region: drag;
  border-bottom: 1px solid #e1e1e1; // 底部边框

  .titlebar-content {
    flex: 1;
    display: flex;
    align-items: center;
    padding-left: 12px;
    height: 100%;

    .titlebar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 400; // Word 使用较细的字体

      .titlebar-icon {
        opacity: 0.8;
        color: #323130;
      }
    }
  }

  .titlebar-controls {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 2px; // 按钮之间的间距
    padding-right: 2px;
    -webkit-app-region: no-drag;

    .titlebar-button {
      width: 46px; // Word 风格的宽度
      height: 32px;
      color: #323130; // 深色图标
      border-radius: 0; // Word 的按钮没有圆角
      transition: background-color 0.1s ease;

      // 移除默认的 padding
      :deep(.q-btn__content) {
        padding: 0;
      }

      &:hover {
        background-color: #e5e5e5; // Word 风格的浅灰色 hover
      }

      &:active {
        background-color: #d6d6d6; // 按下时更深的灰色
      }

      &.titlebar-button-minimize {
        // 向上调整最小化图标
        :deep(.q-icon) {
          transform: translateY(-5px);
        }
      }

      &.titlebar-button-close:hover {
        background-color: #e81123; // Word 的红色关闭按钮
        color: white;

        :deep(.q-icon) {
          color: white;
        }
      }

      &.titlebar-button-close:active {
        background-color: #c50b1a; // 按下时更深的红色
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
}
</style>

