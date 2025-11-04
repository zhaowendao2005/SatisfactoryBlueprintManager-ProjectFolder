<template>
  <q-layout view="hHh lpR fFf">
    <!-- 自定义标题栏 -->
    <q-header style="height: 32px; padding: 0">
      <MainWindowTitleBar />
    </q-header>

    <!-- 左侧导航栏 -->
    <q-drawer
      :model-value="true"
      show-if-above
      :width="60"
      :breakpoint="0"
      bordered
      class="bg-grey-2"
    >
      <MainWindowNavbar />
    </q-drawer>

    <!-- 主内容区域 -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import MainWindowTitleBar from './Shell/MainWindow.TitleBar/index.vue'
import MainWindowNavbar from './Shell/MainWindow.Navbar/index.vue'
</script>

<style scoped lang="scss">
// QLayout 会自动处理布局，不需要自定义样式
</style>

