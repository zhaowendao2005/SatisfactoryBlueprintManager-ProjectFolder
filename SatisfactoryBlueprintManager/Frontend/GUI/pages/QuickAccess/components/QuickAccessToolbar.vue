<template>
  <div class="quick-access-toolbar">
    <div class="toolbar-left">
      <q-btn
        flat
        dense
        round
        size="sm"
        :icon="isPinned ? 'push_pin' : 'push_pin_outlined'"
        :color="isPinned ? 'primary' : 'grey'"
        @click="handleTogglePin"
      >
        <q-tooltip>{{ isPinned ? '取消置顶' : '置顶' }}</q-tooltip>
      </q-btn>
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="refresh"
        @click="handleRefresh"
      >
        <q-tooltip>刷新</q-tooltip>
      </q-btn>
    </div>
    <div class="toolbar-center">
      <span class="info-text">显示 <strong>{{ blueprintCount }}</strong> 个蓝图</span>
    </div>
    <div class="toolbar-right">
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="close"
        color="negative"
        @click="handleClose"
      >
        <q-tooltip>关闭</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  blueprintCount: number
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'close'): void
}>()

const isPinned = ref(true)

// 切换置顶
const handleTogglePin = async (): Promise<void> => {
  if (!window.quickAccessAPI) return

  try {
    isPinned.value = !isPinned.value
    // 通过 IPC 更新窗口置顶状态
    if (window.generalSettingsAPI) {
      const settings = await window.generalSettingsAPI.loadGeneralSettings()
      settings.quickAccessAlwaysOnTop = isPinned.value
      await window.generalSettingsAPI.saveGeneralSettings(settings)
    }
  } catch (error) {
    console.error('[QuickAccessToolbar] 切换置顶失败:', error)
  }
}

// 刷新
const handleRefresh = (): void => {
  emit('refresh')
}

// 关闭
const handleClose = (): void => {
  emit('close')
}

// 初始化置顶状态
onMounted(async () => {
  if (window.generalSettingsAPI) {
    try {
      const settings = await window.generalSettingsAPI.loadGeneralSettings()
      isPinned.value = settings.quickAccessAlwaysOnTop ?? true
    } catch (error) {
      console.error('[QuickAccessToolbar] 加载置顶状态失败:', error)
    }
  }
})
</script>

<style scoped lang="scss">
.quick-access-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #ffffff;
  border-top: 1px solid #e5e5e7;
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
}

.toolbar-center {
  flex: 1;
  text-align: center;
}

.info-text {
  font-size: 11px;
  color: #666;
}
</style>

