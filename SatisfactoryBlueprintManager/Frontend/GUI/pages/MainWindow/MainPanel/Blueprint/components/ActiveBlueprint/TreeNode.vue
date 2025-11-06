<template>
  <el-dropdown
    v-if="data.type === 'group' && data.id !== 'ungrouped'"
    trigger="contextmenu"
    @command="handleMenuCommand"
  >
    <div class="tree-node" :class="{ 'node-group': data.type === 'group', 'node-blueprint': data.type === 'blueprint' }">
      <!-- 图标 -->
      <el-icon class="node-icon">
        <Folder v-if="data.type === 'group'" />
        <Document v-else />
      </el-icon>

    <!-- Title - 可编辑 -->
    <span
      v-if="!isEditing"
      class="node-title"
      @dblclick="handleStartEdit"
    >
      {{ data.name }}
    </span>
    <el-input
      v-else
      ref="editInputRef"
      v-model="editValue"
      class="node-title-input"
      size="small"
      @blur="handleSaveEdit"
      @keyup.enter="handleSaveEdit"
      @keyup.esc="handleCancelEdit"
    />

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
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="rename">
          <el-icon><Edit /></el-icon>
          <span>重命名</span>
        </el-dropdown-item>
        <el-dropdown-item command="create-group">
          <el-icon><Plus /></el-icon>
          <span>创建新组</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  <div v-else class="tree-node" :class="{ 'node-group': data.type === 'group', 'node-blueprint': data.type === 'blueprint' }">
    <!-- 图标 -->
    <el-icon class="node-icon">
      <Folder v-if="data.type === 'group'" />
      <Document v-else />
    </el-icon>

    <!-- Title - 可编辑 -->
    <span
      v-if="!isEditing"
      class="node-title"
      @dblclick="handleStartEdit"
    >
      {{ data.name }}
    </span>
    <el-input
      v-else
      ref="editInputRef"
      v-model="editValue"
      class="node-title-input"
      size="small"
      @blur="handleSaveEdit"
      @keyup.enter="handleSaveEdit"
      @keyup.esc="handleCancelEdit"
    />

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
import { ref, nextTick } from 'vue'
import { Folder, Document, Delete, InfoFilled, Operation, Edit, Plus } from '@element-plus/icons-vue'
import { ElInput } from 'element-plus'
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
  (e: 'rename', nodeId: string, newName: string): void
  (e: 'create-group', nodeId: string): void
}>()

const isEditing = ref(false)
const editValue = ref('')
const editInputRef = ref<InstanceType<typeof ElInput>>()

const handleDelete = () => {
  emit('delete', props.data.id)
}

const handleShowDetails = () => {
  emit('show-details', props.data.id)
}

const handleUse = () => {
  emit('use', props.data.id)
}

const handleStartEdit = () => {
  // 只有分组节点可以双击重命名
  if (props.data.type === 'group' && props.data.id !== 'ungrouped') {
    isEditing.value = true
    editValue.value = props.data.name
    void nextTick(() => {
      editInputRef.value?.focus()
      editInputRef.value?.select()
    })
  }
}

const handleSaveEdit = () => {
  if (editValue.value.trim() && editValue.value.trim() !== props.data.name) {
    emit('rename', props.data.id, editValue.value.trim())
  }
  isEditing.value = false
}

const handleCancelEdit = () => {
  isEditing.value = false
  editValue.value = ''
}

const handleMenuCommand = (command: string) => {
  if (command === 'rename') {
    handleStartEdit()
  } else if (command === 'create-group') {
    emit('create-group', props.data.id)
  }
}

// 暴露开始编辑方法供外部调用（右键菜单）
defineExpose({
  startEdit: handleStartEdit,
})

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
// 确保 el-dropdown 内的 tree-node 填满宽度
:deep(.el-dropdown) {
  display: flex !important;
  flex: 1 !important;
  width: 100% !important;
  min-width: 0 !important;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  flex: 1;
  width: 100%; // 确保填满父容器
  min-width: 0; // 允许 flex 收缩

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
    cursor: default;
    
    // 分组节点可双击编辑
    .node-group & {
      cursor: text;
    }
  }

  .node-title-input {
    flex: 1;
    min-width: 0;
    
    :deep(.el-input__wrapper) {
      padding: 0 4px;
      box-shadow: 0 0 0 1px #409eff inset;
    }
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

