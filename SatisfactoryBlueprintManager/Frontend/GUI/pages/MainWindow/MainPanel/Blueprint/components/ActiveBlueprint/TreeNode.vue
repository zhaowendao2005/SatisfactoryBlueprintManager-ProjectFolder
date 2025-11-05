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
      {{ formatPath(data.path) }}
    </span>

    <!-- 工具箱 -->
    <div class="node-toolbox">
      <el-tooltip content="删除" placement="top">
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
  node: Record<string, unknown> // Element Plus TreeNode 对象
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

/**
 * 格式化路径：显示前后部分，中间用省略号
 */
const formatPath = (path: string): string => {
  if (!path) {
    return ''
  }

  // 标准化路径分隔符
  const normalizedPath = path.replace(/\\/g, '/')
  const maxLength = 50 // 最大显示长度

  if (normalizedPath.length <= maxLength) {
    return normalizedPath
  }

  // 计算前后各显示多少字符
  const prefixLength = Math.floor(maxLength / 2) - 2 // 减去省略号的长度
  const suffixLength = Math.floor(maxLength / 2) - 2

  const prefix = normalizedPath.substring(0, prefixLength)
  const suffix = normalizedPath.substring(normalizedPath.length - suffixLength)

  return `${prefix}...${suffix}`
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
    max-width: 400px;
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

