<template>
  <div class="recent-blueprints-bar">
    <div class="bar-header">
      <span class="bar-title">最近使用</span>
    </div>
    <div class="blueprints-scroll">
      <div v-if="blueprints.length > 0" class="blueprints-list">
        <div
          v-for="blueprint in blueprints"
          :key="blueprint.path"
          class="recent-icon"
          @click="handleUseBlueprint(blueprint.path)"
        >
          <div class="icon-container">
            <div class="icon-content">{{ blueprint.name.substring(0, 2) }}</div>
          </div>
          <div class="icon-label" :title="blueprint.name">
            {{ blueprint.name }}
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">暂无最近使用的蓝图</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  blueprints: Array<{
    path: string
    name: string
    timestamp: number
  }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'use-blueprint', path: string): void
}>()

const handleUseBlueprint = (path: string): void => {
  emit('use-blueprint', path)
}
</script>

<style scoped lang="scss">
.recent-blueprints-bar {
  padding: 8px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e5e5e7;
}

.bar-header {
  margin-bottom: 8px;
}

.bar-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.blueprints-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.blueprints-list {
  display: flex;
  gap: 12px;
  padding-bottom: 4px;
}

.recent-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 8px;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px);
    background: #f5f5f7;
  }
}

.icon-container {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 4px;
}

.icon-content {
  font-size: 24px;
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.icon-label {
  font-size: 10px;
  color: #333;
  text-align: center;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
}

.empty-hint {
  font-size: 12px;
  color: #999;
  text-align: center;
  padding: 12px;
}
</style>

