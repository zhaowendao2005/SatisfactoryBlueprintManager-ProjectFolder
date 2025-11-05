<template>
  <div class="tree-node" :class="{ 'node-group': data.type === 'group', 'node-blueprint': data.type === 'blueprint' }">
    <!-- 图标 -->
    <el-icon class="node-icon">
      <Folder v-if="data.type === 'group'" />
      <Document v-else />
    </el-icon>

    <!-- Title -->
    <span class="node-title">{{ data.name }}</span>

    <!-- 路径（仅蓝图节点） -->
    <span v-if="data.type === 'blueprint' && data.path" class="node-path">
      {{ data.path }}
    </span>

    <!-- 工具箱 -->
    <div class="node-toolbox">
      <el-tooltip v-if="data.type === 'group'" content="删除" placement="top">
        <el-button
          :icon="Delete"
          text
          type="danger"
          @click="handleDelete"
        />
      </el-tooltip>
      <el-tooltip content="详细信息" placement="top">
        <el-button
          :icon="InfoFilled"
          text
          @click="handleShowDetails"
        />
      </el-tooltip>
      <el-tooltip v-if="data.type === 'blueprint'" content="使用" placement="top">
        <el-button
          :icon="Operation"
          text
          type="primary"
          @click="handleUse"
        />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Folder, Document, Delete, InfoFilled, Operation } from '@element-plus/icons-vue'
import type { ActiveBlueprintNode } from '../../types'

interface Props {
  node: any                     // Element Plus TreeNode 对象
  data: ActiveBlueprintNode
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'delete', nodeId: string): void
  (e: 'show-details', nodeId: string): void
  (e: 'use', nodeId: string): void
}>()

const handleDelete = () => {
  emit('delete', props.data.id)
}

const handleShowDetails = () => {
  emit('show-details', props.data.id)
}

const handleUse = () => {
  emit('use', props.data.id)
}
</script>

<style scoped lang="scss">
.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  flex: 1;

  // 分组节点使用默认高度
  &.node-group {
    height: auto;
  }

  // 蓝图节点保持 56px
  &.node-blueprint {
    height: 56px;
  }

  .node-icon {
    font-size: 20px;
    flex-shrink: 0;
    color: #666;
  }

  .node-title {
    flex: 1;
    font-size: 14px;
    color: #333;
    min-width: 0;
  }

  .node-path {
    flex-shrink: 0;
    font-size: 12px;
    color: #999;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-toolbox {
    margin-left: auto;
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
}
</style>

