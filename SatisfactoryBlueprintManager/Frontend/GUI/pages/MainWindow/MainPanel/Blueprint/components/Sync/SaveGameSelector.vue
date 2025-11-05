<template>
  <div class="save-game-selector">
    <div class="header">
      <h3 class="title">存档选择</h3>
    </div>

    <div class="content">
      <!-- 路径输入框 -->
      <div class="path-input-group">
        <el-input
          v-model="basePath"
          placeholder="请输入存档基础路径"
          class="path-input"
          @blur="handlePathBlur"
        >
          <template #append>
            <el-button @click="handleOpenFolder" :icon="FolderOpened" />
            <el-button @click="handleBrowse">浏览</el-button>
          </template>
        </el-input>
      </div>

      <!-- 存档下拉菜单 -->
      <div class="save-game-select">
        <el-select
          v-model="selectedSave"
          placeholder="请选择存档"
          style="width: 100%"
          :loading="loading"
          @change="handleSaveGameChange"
        >
          <el-option
            v-for="save in availableSaveGames"
            :key="save"
            :label="save"
            :value="save"
          />
        </el-select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { FolderOpened } from '@element-plus/icons-vue'
import { useSyncConfigStore } from '../../stores/Sync/config-store'
import { syncDatasource } from '../../stores/Sync/datasource'

const store = useSyncConfigStore()

const basePath = computed({
  get: () => store.saveGameBasePath,
  set: (value) => {
    void store.setSaveGamePath(value)
  },
})

const selectedSave = computed({
  get: () => store.selectedSaveGame || '',
  set: (value: string) => {
    store.selectSaveGame(value || null)
  },
})

const availableSaveGames = computed(() => store.availableSaveGames)
const loading = computed(() => false) // 可以添加加载状态

const handlePathBlur = async () => {
  // 如果输入为空，恢复默认路径
  if (!basePath.value || basePath.value.trim() === '') {
    const defaultPaths = await syncDatasource.getDefaultPaths()
    await store.setSaveGamePath(defaultPaths.saveGamePath)
  } else {
    await store.setSaveGamePath(basePath.value)
  }
}

const handleOpenFolder = async () => {
  try {
    await syncDatasource.openFolder(basePath.value || store.saveGameBasePath)
  } catch (error) {
    ElMessage.error(`打开文件夹失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleBrowse = async () => {
  try {
    if (!window.blueprintAPI) {
      throw new Error('blueprintAPI is not available')
    }

    const result = await window.blueprintAPI.selectDirectory()
    if (!result.canceled && result.path) {
      await store.setSaveGamePath(result.path)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('取消')) {
      // 用户取消，不显示错误
      return
    }
    ElMessage.error(`选择目录失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleSaveGameChange = (value: string) => {
  store.selectSaveGame(value)
}

onMounted(async () => {
  await store.loadConfig()
})
</script>

<style scoped lang="scss">
.save-game-selector {
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

  .content {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .path-input-group {
      .path-input {
        :deep(.el-input-group__append) {
          padding: 0;
          display: flex;

          .el-button {
            border-radius: 0;
            margin: 0;

            &:first-child {
              border-top-right-radius: 4px;
              border-bottom-right-radius: 4px;
            }

            &:last-child {
              border-left: none;
            }
          }
        }
      }
    }

    .save-game-select {
      width: 100%;
    }
  }
}
</style>

