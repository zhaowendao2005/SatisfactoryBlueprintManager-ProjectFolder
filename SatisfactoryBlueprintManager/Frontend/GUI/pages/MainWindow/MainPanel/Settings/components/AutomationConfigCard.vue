<template>
  <div class="card automation-config-card">
    <div class="card-header">
      <h3 class="card-title">自动化配置</h3>
    </div>

    <div class="card-content">
      <div
        v-if="!store.currentConfig"
        class="empty-state"
      >
        <p>请选择一个配置</p>
      </div>
      <div v-else>
        <!-- 模式选择器 -->
        <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
        <el-tabs
          :model-value="currentMode as any"
          class="mode-tabs"
          @update:model-value="(val: string | number) => { currentMode = String(val) as 'manual' | 'smart' }"
        >
          <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
          <el-tab-pane
            label="手动配置"
            :name="'manual' as any"
          />
        </el-tabs>

        <!-- 配置表单内容 -->
        <div class="form-scroll-area">
          <ManualConfigForm
            v-if="currentMode === 'manual' && store.currentConfig"
            :key="store.currentConfigId || 'no-config'"
            :model-value="formParams"
            @update:model-value="handleParamsUpdate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TypeScript 误报，@types 别名已正确配置
import type { ManualConfigParams } from '@types/automation-config'
import { useAutomationConfigStore } from '../stores/AutomationConfig'
import ManualConfigForm from './ManualConfigForm.vue'

const store = useAutomationConfigStore()
const currentMode = ref<'manual' | 'smart'>('manual')

// 计算表单参数，确保类型正确，并深度克隆去除 Proxy
const formParams = computed<ManualConfigParams>(() => {
  if (!store.currentConfig || store.currentConfig.mode !== 'manual') {
    return {
      inputFieldPosition: { x: 0, y: 0 },
      firstBlueprintPosition: { x: 0, y: 0 },
      charInputDelay: 100,
      displayIndex: null,
    }
  }
  // 深度克隆去除 Pinia 的 Proxy 包装
  const params = store.currentConfig.params as ManualConfigParams
  return {
    inputFieldPosition: { ...params.inputFieldPosition },
    firstBlueprintPosition: { ...params.firstBlueprintPosition },
    charInputDelay: params.charInputDelay,
    displayIndex: params.displayIndex,
  }
})

// 当切换配置时，重置模式
watch(
  () => store.currentConfigId,
  () => {
    currentMode.value = 'manual'
  }
)

const handleParamsUpdate = async (params: ManualConfigParams) => {
  try {
    await store.updateConfigParams(params)
  } catch (error) {
    console.error('Failed to update params:', error)
  }
}
</script>

<style scoped lang="scss">
.automation-config-card {
  /* From Uiverse.io by JaydipPrajapati1910 */
  width: 100%;
  min-height: 300px;
  border: none;
  border-radius: 10px;
  background: radial-gradient(ellipse farthest-side at 76% 77%, rgba(245, 228, 212, 0.25) 4%, rgba(255, 255, 255, 0) calc(4% + 1px)), radial-gradient(circle at 76% 40%, #fef6ec 4%, rgba(255, 255, 255, 0) 4.18%), linear-gradient(135deg, #ff0000 0%, #000036 100%), radial-gradient(ellipse at 28% 0%, #ffcfac 0%, rgba(98, 149, 144, 0.5) 100%), linear-gradient(180deg, #cd6e8a 0%, #f5eab0 69%, #d6c8a2 70%, #a2758d 100%);
  background-blend-mode: normal, normal, screen, overlay, normal;
  box-shadow: 0px 0px 10px 1px #000000;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .card-content {
    flex: 1;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .mode-tabs {
    margin-bottom: 16px;
    flex-shrink: 0;
  }

  .form-scroll-area {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-right: 8px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-track {
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 48px 16px;
    color: rgba(255, 255, 255, 0.8);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}
</style>
