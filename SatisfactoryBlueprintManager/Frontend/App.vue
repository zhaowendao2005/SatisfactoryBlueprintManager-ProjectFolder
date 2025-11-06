<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
//
</script>

<style lang="scss">
// 导入 Quasar 变量（必须先导入，供其他样式使用）
@import './GUI/quasar.variables.scss';
// 导入全局样式
@import './GUI/app.scss';

.app-container {
  height: 100%;
  overflow: hidden;
}
</style>
