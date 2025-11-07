<template>
  <div class="config-manager">
    <!-- 标题栏 -->
    <div class="header">
      <h3 class="title">配置管理</h3>
    </div>

    <!-- 配置选择器 -->
    <div class="config-selector">
      <el-select
        v-model="selectedConfigId"
        placeholder="请先创建配置"
        style="width: 300px"
        @change="handleConfigChange"
      >
        <el-option
          v-for="config in store.configList"
          :key="config.id"
          :label="config.name"
          :value="config.id"
        />
      </el-select>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button type="primary" @click="handleCreate">
          新建配置
        </el-button>
        <el-button
          :disabled="!selectedConfigId"
          @click="handleRename"
        >
          重命名
        </el-button>
        <el-button
          :disabled="!selectedConfigId"
          type="danger"
          @click="handleDelete"
        >
          删除
        </el-button>
      </div>
    </div>

    <!-- 路径追踪级数配置 -->
    <div v-if="selectedConfigId" class="path-tag-config">
      <div class="config-label">
        <span>路径追踪级数:</span>
        <span class="value">{{ store.pathTagLevels }}</span>
      </div>
      <el-slider
        v-model="pathTagLevelsValue"
        :min="1"
        :max="6"
        :step="1"
        :show-tooltip="true"
        :format-tooltip="(val) => `${val} 级`"
        style="width: 300px"
      />
      <span class="hint">控制路径标签显示的目录层级（1-6级）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox, ElInput } from 'element-plus'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'

const store = useActiveBlueprintStore()

const selectedConfigId = computed({
  get: () => store.currentConfigId,
  set: (value) => {
    if (value) {
      void store.switchConfig(value)
    }
  },
})

// 路径追踪级数的双向绑定
const pathTagLevelsValue = computed({
  get: () => store.pathTagLevels,
  set: async (value) => {
    // setter：立即更新状态（同步滑块显示）
    try {
      await store.setPathTagLevels(value)
    } catch (error) {
      console.error('Failed to set path tag levels:', error)
    }
  },
})

const handleConfigChange = async (configId: string) => {
  try {
    await store.switchConfig(configId)
  } catch (error) {
    ElMessage.error(`切换配置失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleCreate = async () => {
  try {
    const { value: name } = await ElMessageBox.prompt('请输入配置名称', '新建配置', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPattern: /^.{1,50}$/,
      inputErrorMessage: '配置名称长度应在1-50字符之间',
    })

    if (name) {
      await store.createConfig(name)
      ElMessage.success('配置创建成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`创建配置失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

const handleRename = async () => {
  if (!selectedConfigId.value) {
    return
  }

  try {
    const config = store.configList.find(c => c.id === selectedConfigId.value)
    const currentName = config?.name || ''

    const { value: newName } = await ElMessageBox.prompt('请输入新名称', '重命名配置', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: currentName,
      inputPattern: /^.{1,50}$/,
      inputErrorMessage: '配置名称长度应在1-50字符之间',
    })

    if (newName && newName !== currentName) {
      await store.renameConfig(selectedConfigId.value, newName)
      ElMessage.success('重命名成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`重命名失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

const handleDelete = async () => {
  if (!selectedConfigId.value) {
    return
  }

  try {
    const config = store.configList.find(c => c.id === selectedConfigId.value)
    const configName = config?.name || ''

    await ElMessageBox.confirm(
      `确定要删除配置 "${configName}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      }
    )

    await store.deleteConfig(selectedConfigId.value)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
</script>

<style scoped lang="scss">
.config-manager {
  min-height: 120px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .header {
    height: 56px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e0e0e0;

    .title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
  }

  .config-selector {
    flex: 1;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;

    .actions {
      display: flex;
      gap: 8px;
    }
  }

  .path-tag-config {
    padding: 16px 20px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    gap: 16px;

    .config-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
      min-width: 120px;

      .value {
        font-weight: 600;
        color: #333;
      }
    }

    .hint {
      font-size: 12px;
      color: #999;
      margin-left: auto;
    }
  }
}
</style>

