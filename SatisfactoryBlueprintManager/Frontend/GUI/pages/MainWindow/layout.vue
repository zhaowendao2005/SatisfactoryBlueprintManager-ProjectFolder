<template>
  <div class="main-layout">
    <!-- 自定义标题栏 -->
    <header class="layout-header">
      <MainWindowTitleBar />
    </header>

    <!-- 主体容器：包含左侧导航栏和主内容区 -->
    <div class="layout-body">
      <!-- 左侧导航栏 -->
      <aside class="layout-drawer">
        <MainWindowNavbar />
      </aside>

      <!-- 主内容区域 -->
      <main class="layout-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import MainWindowTitleBar from './Shell/MainWindow.TitleBar/index.vue'
import MainWindowNavbar from './Shell/MainWindow.Navbar/index.vue'
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.layout-header {
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
}

.layout-body {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.layout-drawer {
  width: 60px;
  flex-shrink: 0;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  overflow-x: hidden;
}

.layout-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>

