<template>
  <q-page class="welcome-page">
    <!-- 背景图片容器（无边距，z-index 低） -->
    <div class="background-image-container"></div>
    
    <!-- 卡片容器（有边距，z-index 高） -->
    <div class="welcome-card">
      <!-- 半透明遮罩层 -->
      <div class="overlay-mask">
        <!-- 内部内容 -->
        <div class="content-container">
          <h1 class="title-text">幸福工厂蓝图管理器</h1>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
// Welcome 页面
</script>

<style scoped lang="scss">
.welcome-page {
  display: flex;
  position: relative;
  padding: 24px; // 固定外边距
  background-color: white;

  // 背景图片容器（无边距，z-index 低，并列）
  .background-image-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    background-image: url('./BackGround.png'); // 引用同级图片
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #1a1a1a; // 默认暗色背景（如果图片加载失败时）
  }

  // 卡片容器（有边距，z-index 高，并列）
  .welcome-card {
    flex: 1;
    display: flex;
    position: relative;
    z-index: 2;
    padding: 0px; // 卡片边距
    border-radius: 12px;
    overflow: hidden;

    // 半透明 + 暗色遮罩（有边距）
    .overlay-mask {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px; // 遮罩边距
      background-color: rgba(0, 0, 0, 0.5); // 暗色遮罩（50% 透明度）
      backdrop-filter: blur(2px); // 轻微模糊效果
      border-radius: 8px;

      // 内部内容容器（半透明）
      .content-container {
        padding: 48px;
        background-color: rgba(255, 255, 255, 0.1); // 半透明白色背景
        border-radius: 8px;
        backdrop-filter: blur(4px);

        .title-text {
          font-size: 36px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif; // 非衬线字体
          color: rgba(255, 255, 255, 0.95); // 白色半透明文字
          margin: 0;
          text-align: center;
        }
      }
    }
  }
}
</style>
