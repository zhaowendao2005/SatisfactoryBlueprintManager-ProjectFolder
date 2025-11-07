<template>
  <div class="settings-page">
    <div class="settings-container">
      <!-- 左侧锚点导航栏 -->
      <div class="anchor-sidebar">
        <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
        <el-anchor
          v-if="containerRef"
          :container="(containerRef as any)"
          :offset="70"
          @click="handleClick"
        >
          <el-anchor-link href="#general-settings" title="通用设置" />
          <el-anchor-link href="#config-management" title="配置管理" />
          <el-anchor-link href="#automation-config" title="自动化配置" />
          <el-anchor-link href="#shortcut-config" title="快捷键配置" />
          <el-anchor-link href="#automation-debug" title="自动化测试" />
        </el-anchor>
      </div>

      <!-- 右侧内容区 -->
      <div ref="containerRef" class="content-area">
        <!-- 通用设置卡片 -->
        <section
          id="general-settings"
          class="content-section"
        >
          <GeneralSettingsCard />
        </section>

        <!-- 配置管理卡片 -->
        <section
          id="config-management"
          class="content-section"
        >
          <ConfigManagerCard />
        </section>

        <!-- 自动化配置卡片 -->
        <section
          id="automation-config"
          class="content-section"
        >
          <AutomationConfigCard />
        </section>

        <!-- 快捷键配置卡片 -->
        <section
          id="shortcut-config"
          class="content-section"
        >
          <ShortcutConfigCard />
        </section>

        <!-- 自动化测试卡片 -->
        <section
          id="automation-debug"
          class="content-section"
        >
          <AutomationDebugCard />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import GeneralSettingsCard from './components/GeneralSettingsCard.vue'
import ConfigManagerCard from './components/ConfigManagerCard.vue'
import AutomationConfigCard from './components/AutomationConfigCard.vue'
import ShortcutConfigCard from './components/ShortcutConfigCard.vue'
import AutomationDebugCard from './components/AutomationDebugCard.vue'
import { useAutomationConfigStore } from './stores/AutomationConfig'

const automationConfigStore = useAutomationConfigStore()
const containerRef = ref<HTMLElement | null>(null)

const handleClick = (e: MouseEvent) => {
  e.preventDefault()
}

onMounted(async () => {
  try {
    // 从localStorage恢复上次使用的配置（内部会先加载配置列表）
    await automationConfigStore.initializeFromLocalStorage()
  } catch (error) {
    console.error('Failed to initialize automation config:', error)
  }
})
</script>

<style scoped lang="scss">
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;

  // 引入 Settings 页面 Element Plus 组件样式
  @import './styles.scss';
}

.settings-container {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
}

.anchor-sidebar {
  width: 200px;
  flex-shrink: 0;
  padding: 24px 16px;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;

  // 强制 el-anchor 填充父容器高度
  :deep(.el-anchor) {
    height: 100%;
  }
}

.content-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 24px;
  background-color: #fff;
}

.content-section {
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
}
</style>

