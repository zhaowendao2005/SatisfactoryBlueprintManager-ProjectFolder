<template>
  <div class="blueprint-info-controller">
    <el-button
      :icon="Refresh"
      :loading="isParsing"
      @click="handleRefresh"
    >
      刷新蓝图信息
    </el-button>

    <!-- 进度对话框 -->
    <ParseProgressDialog
      ref="dialogRef"
      v-model="dialogVisible"
      @complete="handleParseComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useActiveBlueprintStore } from '../../stores/ActiveBlueprint'
import { flattenBlueprintTree } from '../../utils/tagHelpers'
import type { BlueprintPathInfo, ParseResult } from 'blueprint-info'
import ParseProgressDialog from './ParseProgressDialog.vue'

const store = useActiveBlueprintStore()
const isParsing = ref(false)
const dialogVisible = ref(false)
const dialogRef = ref<{ setResult: (result: ParseResult) => void } | null>(null)

const handleRefresh = async () => {
  if (isParsing.value) {
    ElMessage.warning('解析任务正在进行中，请稍后')
    return
  }

  if (!store.hasActiveConfig()) {
    ElMessage.warning('请先创建或选择一个配置')
    return
  }

  // 获取所有已激活的蓝图
  const allBlueprints = flattenBlueprintTree(store.treeData, store.pathTagLevels)

  if (allBlueprints.length === 0) {
    ElMessage.info('没有已激活的蓝图')
    return
  }

  // 转换为 BlueprintPathInfo 格式
  const blueprints: BlueprintPathInfo[] = allBlueprints.map((bp) => ({
    id: bp.id,
    name: bp.name,
    path: bp.path || '',
  }))

  // 过滤掉没有路径的蓝图
  const validBlueprints = blueprints.filter((bp) => bp.path)

  if (validBlueprints.length === 0) {
    ElMessage.warning('没有有效的蓝图路径')
    return
  }

  try {
    isParsing.value = true
    dialogVisible.value = true

    // 调用解析 API
    if (!window.blueprintInfoAPI) {
      throw new Error('蓝图信息 API 不可用，请确保在 Electron 环境中运行')
    }

    const result = await window.blueprintInfoAPI.parseBlueprints(validBlueprints)

    // 设置结果到对话框
    if (dialogRef.value) {
      dialogRef.value.setResult(result)
    }

    // 解析完成，对话框会自动显示结果
    ElMessage.success(
      `解析完成：成功 ${result.succeeded.length} 个，失败 ${result.failed.length} 个`
    )
  } catch (error) {
    console.error('Failed to parse blueprints:', error)
    ElMessage.error(
      `解析失败：${error instanceof Error ? error.message : String(error)}`
    )
    dialogVisible.value = false
  } finally {
    isParsing.value = false
  }
}

const handleParseComplete = (result: ParseResult) => {
  console.log('Parse completed:', result)
}
</script>

<style scoped lang="scss">
.blueprint-info-controller {
  display: flex;
  align-items: center;
}
</style>

