<template>
  <div class="tree-node" :class="{ 'node-directory': data.type === 'directory', 'node-blueprint': data.type === 'blueprint' }">
    <!-- 图标 -->
    <el-icon class="node-icon" :class="iconClass">
      <Folder v-if="data.type === 'directory'" />
      <Document v-else />
    </el-icon>

    <!-- 目录节点名称 -->
    <span v-if="data.type === 'directory'" class="node-name">
      {{ data.name }}
    </span>

    <!-- 蓝图节点内容区域 -->
    <div v-if="data.type === 'blueprint'" class="node-content">
      <!-- 第一行：标题和激活 tag -->
      <div class="node-header">
        <span class="node-title-text">{{ data.name }}</span>
        <el-tag v-if="data.isActivated" size="small" type="success">
          已激活
        </el-tag>
      </div>

      <!-- 第二行：元数据 -->
      <div v-if="data.metadata" class="node-metadata">
        <span class="metadata-text">
          {{ formatMetadata(data.metadata) }}
        </span>
      </div>

      <!-- 第三行：详细信息摘要 -->
      <div v-if="data.summary" class="node-summary">
        {{ data.summary }}
      </div>
    </div>

    <!-- 工具箱 -->
    <div class="node-toolbox" @click.stop>
      <!-- 蓝图节点的激活按钮 -->
      <el-tooltip
        v-if="data.type === 'blueprint'"
        :content="data.isActivated ? '取消激活' : '激活'"
        placement="top"
      >
        <el-button
          :icon="data.isActivated ? CircleClose : CircleCheck"
          text
          :type="data.isActivated ? 'warning' : 'primary'"
          @click="handleToggleActivate"
        />
      </el-tooltip>
      <!-- 目录节点（根节点）的删除按钮 -->
      <el-tooltip
        v-if="data.type === 'directory' && isRootNode"
        content="删除源"
        placement="top"
      >
        <el-button
          :icon="Delete"
          text
          type="danger"
          @click="handleDelete"
        />
      </el-tooltip>
      <!-- 详细信息按钮 -->
      <el-tooltip content="详细信息" placement="top">
        <el-button
          :icon="InfoFilled"
          text
          @click="handleShowDetails"
        />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Folder, Document, CircleCheck, CircleClose, InfoFilled, Delete } from '@element-plus/icons-vue'
import type { BlueprintNode } from '../../types'

interface Props {
  node: any                     // Element Plus TreeNode 对象
  data: BlueprintNode
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'activate', nodeId: string): void
  (e: 'deactivate', nodeId: string): void
  (e: 'show-details', nodeId: string): void
  (e: 'delete', nodeId: string): void
}>()

// 判断是否为根节点（懒加载模式下根节点 level === 1）
const isRootNode = computed(() => {
  return props.data.type === 'directory' && props.node.level === 1
})

const iconClass = computed(() => {
  return props.data.type === 'directory' ? 'icon-directory' : 'icon-blueprint'
})

const formatMetadata = (metadata: Record<string, any>): string => {
  const parts: string[] = []
  if (metadata.version) {
    parts.push(`v${metadata.version}`)
  }
  if (metadata.author) {
    parts.push(`by ${metadata.author}`)
  }
  return parts.join(' | ')
}

const handleToggleActivate = () => {
  if (props.data.isActivated) {
    emit('deactivate', props.data.id)
  } else {
    emit('activate', props.data.id)
  }
}

const handleShowDetails = () => {
  emit('show-details', props.data.id)
}

const handleDelete = () => {
  emit('delete', props.data.id)
}
</script>

<style scoped lang="scss">
.tree-node {
  display: flex;
  align-items: flex-start; // 改为顶部对齐，支持多行内容
  gap: 8px;
  padding: 8px 12px; // 增加上下 padding
  flex: 1;

  .node-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px; // 图标稍微下移，与文字对齐

    &.icon-directory {
      color: #ffc107; // 黄色
    }

    &.icon-blueprint {
      color: #2196f3; // 蓝色
    }
  }

  .node-name {
    font-size: 14px;
    color: #333;
    flex-shrink: 0;
  }

  // 蓝图节点内容区域
  .node-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 4px;

    .node-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;

      .node-title-text {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }
    }

    .node-metadata {
      flex-shrink: 0;
      overflow-x: scroll;
      white-space: nowrap;
      font-size: 12px;
      color: #666;

      // Element Plus 风格的滚动条样式（调低高度）
      &::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.2);
        border-radius: 2px;
        min-height: 10px; // 调低滚动条滑块最小高度
      }

      &::-webkit-scrollbar-track {
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 2px;
      }

      .metadata-text {
        display: inline-block;
      }
    }

    .node-summary {
      flex: 1;
      font-size: 12px;
      color: #999;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2; // 最多显示 2 行
      -webkit-box-orient: vertical;
    }
  }

  // 目录节点使用默认高度，居中对齐
  &.node-directory {
    height: auto;
    align-items: center; // 目录节点居中对齐
  }

  // 蓝图节点自适应高度（支持多行内容），顶部对齐
  &.node-blueprint {
    height: auto;
    min-height: 56px; // 最小高度保持 56px
    align-items: flex-start; // 顶部对齐，支持多行内容
  }

  .node-toolbox {
    margin-left: auto;
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
}
</style>

