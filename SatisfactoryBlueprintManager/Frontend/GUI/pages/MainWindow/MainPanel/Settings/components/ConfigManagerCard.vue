<template>
  <q-card class="config-manager-card">
    <q-card-section>
      <div class="card-header">
        <h3 class="card-title">配置管理</h3>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="card-content">
      <div class="config-selector">
        <CustomSelect
          v-model="selectedConfigId"
          :options="selectOptions"
          placeholder="请先创建配置"
          width="300px"
          @change="handleConfigChange"
        />

        <!-- 操作按钮 -->
        <div class="actions">
          <q-btn
            color="primary"
            label="新建配置"
            @click="handleCreate"
          />
          <q-btn
            :disable="!selectedConfigId"
            label="重命名"
            @click="handleRename"
          />
          <q-btn
            :disable="!selectedConfigId"
            color="negative"
            label="删除"
            @click="handleDelete"
          />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAutomationConfigStore } from '../stores/AutomationConfig'
import CustomSelect from './CustomSelect.vue'

const store = useAutomationConfigStore()

const selectedConfigId = computed({
  get: () => store.currentConfigId,
  set: (value) => {
    if (value) {
      void store.loadConfig(value)
    }
  },
})

const selectOptions = computed(() => {
  return store.configList.map(config => ({
    label: config.name,
    value: config.id,
  }))
})

const handleConfigChange = async (configId: string | number | null) => {
  if (!configId) {
    return
  }
  try {
    await store.loadConfig(String(configId))
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ElMessage.error(`切换配置失败：${error instanceof Error ? error.message : String(error)}` as any)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ElMessage.success('配置创建成功' as any)
    }
  } catch (error) {
    if (error !== 'cancel') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ElMessage.error(`创建配置失败：${error instanceof Error ? error.message : String(error)}` as any)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ElMessage.success('重命名成功' as any)
    }
  } catch (error) {
    if (error !== 'cancel') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ElMessage.error(`重命名失败：${error instanceof Error ? error.message : String(error)}` as any)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ElMessage.success('删除成功' as any)
  } catch (error) {
    if (error !== 'cancel') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ElMessage.error(`删除失败：${error instanceof Error ? error.message : String(error)}` as any)
    }
  }
}
</script>

<style scoped lang="scss">
.config-manager-card {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  background-image: linear-gradient(rgb(255, 91, 87), rgb(170, 228, 215));
  border-radius: 10px;
  box-shadow: 0px 0px 10px 1px rgba(0, 0, 0, 0.2);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0;
  }

  .card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .card-content {
    padding: 16px;
    flex: 1;
    min-height: 0;
  }

  .config-selector {
    display: flex;
    align-items: center;
    gap: 16px;

    .actions {
      display: flex;
      gap: 8px;
    }

    // Element Plus 选择器使用全局样式（灰色半透明背景）
    // 样式已在 Settings/styles.scss 中定义

    // 调整按钮样式以适应渐变背景（仅新建和重命名按钮）
    :deep(.q-btn:not(.bg-negative)) {
      // 覆盖所有可能的背景色设置
      background-color: rgba(255, 255, 255, 0.2) !important;
      background: rgba(255, 255, 255, 0.2) !important;
      color: white !important;
      border: 1px solid rgba(255, 255, 255, 0.5) !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      box-shadow: none !important;

      // 覆盖 Quasar primary 颜色类
      &.bg-primary {
        background-color: rgba(255, 255, 255, 0.2) !important;
        background: rgba(255, 255, 255, 0.2) !important;
      }

      &:hover {
        background-color: rgba(255, 255, 255, 0.3) !important;
        background: rgba(255, 255, 255, 0.3) !important;
      }

      &.q-btn--disabled {
        opacity: 0.5;
        background-color: rgba(255, 255, 255, 0.1) !important;
        background: rgba(255, 255, 255, 0.1) !important;
      }

      // 覆盖按钮内部文字颜色
      .q-btn__content {
        color: white !important;
      }
    }

    // 删除按钮保持 Quasar 默认 negative 颜色（红色）
    :deep(.q-btn.bg-negative) {
      // 恢复 Quasar 默认样式，不覆盖
      background-color: unset !important;
      background: unset !important;
      color: unset !important;
      border: unset !important;
      text-shadow: none !important;
      box-shadow: unset !important;

      .q-btn__content {
        color: unset !important;
      }
    }
  }
}
</style>

