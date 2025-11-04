<template>
  <q-page class="welcome-page">
    <div class="welcome-content">
      <h1>Welcome</h1>
      <p>Welcome to Satisfactory Blueprint Manager</p>
    </div>
  </q-page>
</template>

<script setup lang="ts">
// Welcome 页面
</script>

<style scoped lang="scss">
.welcome-page {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: white;
  min-height: 100%;

  .welcome-content {
    text-align: center;

    h1 {
      font-size: 32px;
      margin-bottom: 16px;
      color: #2196F3;
    }

    p {
      color: #666;
    }
  }
}
</style>

