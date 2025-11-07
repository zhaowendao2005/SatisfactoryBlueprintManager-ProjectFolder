<template>
  <div class="blueprint-detail-panel">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 未解析状态 -->
    <div v-else-if="!formattedInfo" class="not-parsed-state">
      <el-empty description="该蓝图尚未解析">
        <template #image>
          <el-icon :size="64" color="#909399">
            <Document />
          </el-icon>
        </template>
        <template #description>
          <p>请点击顶部的"刷新蓝图信息"按钮解析全部蓝图</p>
        </template>
      </el-empty>
    </div>

    <!-- 已解析：显示详细信息 -->
    <div v-else class="detail-content">
      <!-- 作者信息卡片（如果有作者） -->
      <el-card v-if="formattedInfo.author" class="info-card author-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>作者信息</span>
          </div>
        </template>
        <div class="author-content">
          <el-tag type="primary" size="large">{{ formattedInfo.author }}</el-tag>
        </div>
      </el-card>

      <!-- 基本信息卡片 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><InfoFilled /></el-icon>
            <span>基本信息</span>
          </div>
        </template>
        <div class="info-content">
          <div class="info-row">
            <span class="label">蓝图名称：</span>
            <span class="value">{{ formattedInfo.name }}</span>
          </div>
          <div class="info-row">
            <span class="label">描述：</span>
            <span class="value description">{{ formattedInfo.description || '无描述' }}</span>
          </div>
          <div class="info-row">
            <span class="label">颜色：</span>
            <span class="value">
              <span
                class="color-block"
                :style="{ backgroundColor: formattedInfo.color }"
              />
              <span class="color-text">{{ formattedInfo.color }}</span>
            </span>
          </div>
          <div class="info-row">
            <span class="label">图标ID：</span>
            <span class="value">{{ formattedInfo.iconID }}</span>
          </div>
        </div>
      </el-card>

      <!-- 技术信息卡片 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Setting /></el-icon>
            <span>技术信息</span>
          </div>
        </template>
        <div class="info-content">
          <div class="info-row">
            <span class="label">设计尺寸：</span>
            <span class="value">{{ formattedInfo.designerDimension }}</span>
          </div>
          <div class="info-row">
            <span class="label">游戏版本：</span>
            <span class="value">{{ formattedInfo.buildVersion }}</span>
          </div>
          <div class="info-row">
            <span class="label">存档版本：</span>
            <span class="value">{{ formattedInfo.saveVersion }}</span>
          </div>
          <div class="info-row">
            <span class="label">对象数量：</span>
            <span class="value">{{ formattedInfo.objectCount }} 个</span>
          </div>
          <div class="info-row">
            <span class="label">配方数量：</span>
            <span class="value">{{ formattedInfo.recipeCount }} 个</span>
          </div>
        </div>
      </el-card>

      <!-- 建造成本卡片 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><ShoppingCart /></el-icon>
            <span>建造成本</span>
          </div>
        </template>
        <div class="info-content">
          <div v-if="formattedInfo.itemCosts.length === 0" class="empty-costs">
            无需材料
          </div>
          <div v-else class="costs-list">
            <div
              v-for="(item, index) in formattedInfo.itemCosts"
              :key="index"
              class="cost-item"
            >
              <el-checkbox :model-value="true" disabled />
              <span class="item-name">{{ item.itemName }}</span>
              <span class="item-amount">× {{ item.amount }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 文件信息卡片 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>文件信息</span>
          </div>
        </template>
        <div class="info-content">
          <div class="info-row">
            <span class="label">.sbp 文件：</span>
            <span class="value">{{ formatFileSize(formattedInfo.fileSize.sbp) }}</span>
          </div>
          <div class="info-row">
            <span class="label">.sbpcfg 文件：</span>
            <span class="value">{{ formatFileSize(formattedInfo.fileSize.sbpcfg) }}</span>
          </div>
          <div class="info-row">
            <span class="label">总大小：</span>
            <span class="value">{{ formatFileSize(formattedInfo.fileSize.total) }}</span>
          </div>
          <div class="info-row">
            <span class="label">解析时间：</span>
            <span class="value">{{ formatDate(formattedInfo.parsedAt) }}</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Document, User, InfoFilled, Setting, ShoppingCart } from '@element-plus/icons-vue'
import type { FormattedBlueprintInfo } from '../../utils/blueprintInfoFormatter'
import { blueprintInfoFormatter } from '../../utils/blueprintInfoFormatter'

interface Props {
  blueprintId: string | null
}

const props = defineProps<Props>()

const loading = ref(false)
const formattedInfo = ref<FormattedBlueprintInfo | null>(null)

/**
 * 加载蓝图信息（懒加载）
 */
const loadBlueprintInfo = async (blueprintId: string): Promise<void> => {
  if (!blueprintId) {
    formattedInfo.value = null
    return
  }

  loading.value = true
  formattedInfo.value = null

  try {
    if (!window.blueprintInfoAPI) {
      throw new Error('蓝图信息 API 不可用，请确保在 Electron 环境中运行')
    }

    const info = await window.blueprintInfoAPI.getBlueprintInfo(blueprintId)

    if (info) {
      formattedInfo.value = blueprintInfoFormatter.format(info)
      // 调试：检查作者信息是否提取成功
      if (formattedInfo.value.author) {
        console.log('作者信息提取成功:', formattedInfo.value.author)
      } else {
        console.log('未找到作者信息，描述内容:', info.blueprint?.config?.description)
      }
    } else {
      formattedInfo.value = null
    }
  } catch (error) {
    console.error('Failed to load blueprint info:', error)
    formattedInfo.value = null
  } finally {
    loading.value = false
  }
}

/**
 * 监听 blueprintId 变化，懒加载数据
 */
watch(
  () => props.blueprintId,
  (newId) => {
    if (newId) {
      void loadBlueprintInfo(newId)
    } else {
      formattedInfo.value = null
    }
  },
  { immediate: true }
)

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}

/**
 * 格式化日期
 */
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped lang="scss">
.blueprint-detail-panel {
  padding: 20px;
  height: 100%;

  .loading-state,
  .not-parsed-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .detail-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .info-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
      color: #333;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;

      .label {
        flex-shrink: 0;
        color: #666;
        font-weight: 500;
        min-width: 100px;
      }

      .value {
        flex: 1;
        color: #333;
        word-break: break-word;

        &.description {
          white-space: pre-wrap;
          line-height: 1.6;
        }
      }

      .color-block {
        display: inline-block;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 1px solid #ddd;
        vertical-align: middle;
        margin-right: 8px;
      }

      .color-text {
        font-family: monospace;
        font-size: 12px;
      }
    }

    .author-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .empty-costs {
      color: #999;
      font-style: italic;
      padding: 20px 0;
      text-align: center;
    }

    .costs-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
      padding: 4px 0;

      .cost-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f5f7fa;
        }

        .item-name {
          flex: 1;
          color: #333;
          font-weight: 500;
        }

        .item-amount {
          color: #666;
          font-size: 14px;
        }
      }
    }
  }
}
</style>

