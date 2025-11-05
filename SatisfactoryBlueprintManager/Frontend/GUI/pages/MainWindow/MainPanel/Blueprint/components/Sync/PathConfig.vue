<template>
  <div class="path-config">
    <div class="header">
      <h3 class="title">路径配置</h3>
    </div>

    <div class="content">
      <!-- 默认蓝图库 -->
      <div class="path-item">
        <label class="label">默认蓝图库</label>
        <div class="path-input-group">
          <el-input
            v-model="libraryPath"
            placeholder="默认蓝图库路径"
            class="path-input"
            @blur="handleLibraryPathBlur"
          >
            <template #append>
              <el-button @click="handleOpenLibraryFolder" :icon="FolderOpened" />
              <el-button @click="handleBrowseLibrary">浏览</el-button>
            </template>
          </el-input>
        </div>
      </div>

      <!-- 备份文件夹 -->
      <div class="path-item">
        <label class="label">备份文件夹</label>
        <div class="path-input-group">
          <el-input
            v-model="backupPath"
            placeholder="备份目录路径"
            class="path-input"
            @blur="handleBackupPathBlur"
          >
            <template #append>
              <el-button @click="handleOpenBackupFolder" :icon="FolderOpened" />
              <el-button @click="handleBrowseBackup">浏览</el-button>
            </template>
          </el-input>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { FolderOpened } from '@element-plus/icons-vue'
import { useSyncConfigStore } from '../../stores/Sync/config-store'
import { syncDatasource } from '../../stores/Sync/datasource'

const store = useSyncConfigStore()

const libraryPath = computed({
  get: () => store.libraryPath,
  set: (value) => {
    store.setLibraryPath(value)
  },
})

const backupPath = computed({
  get: () => store.backupPath,
  set: (value) => {
    store.setBackupPath(value)
  },
})

const handleLibraryPathBlur = async () => {
  // 如果输入为空，恢复默认路径
  if (!libraryPath.value || libraryPath.value.trim() === '') {
    const defaultPaths = await syncDatasource.getDefaultPaths()
    store.setLibraryPath(defaultPaths.libraryPath)
  } else {
    store.setLibraryPath(libraryPath.value)
  }
}

const handleBackupPathBlur = async () => {
  // 如果输入为空，恢复默认路径
  if (!backupPath.value || backupPath.value.trim() === '') {
    const defaultPaths = await syncDatasource.getDefaultPaths()
    store.setBackupPath(defaultPaths.backupPath)
  } else {
    store.setBackupPath(backupPath.value)
  }
}

const handleOpenLibraryFolder = async () => {
  try {
    await syncDatasource.openFolder(libraryPath.value)
  } catch (error) {
    ElMessage.error(`打开文件夹失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleOpenBackupFolder = async () => {
  try {
    await syncDatasource.openFolder(backupPath.value)
  } catch (error) {
    ElMessage.error(`打开文件夹失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleBrowseLibrary = async () => {
  try {
    if (!window.blueprintAPI) {
      throw new Error('blueprintAPI is not available')
    }

    const result = await window.blueprintAPI.selectDirectory()
    if (!result.canceled && result.path) {
      store.setLibraryPath(result.path)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('取消')) {
      return
    }
    ElMessage.error(`选择目录失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleBrowseBackup = async () => {
  try {
    if (!window.blueprintAPI) {
      throw new Error('blueprintAPI is not available')
    }

    const result = await window.blueprintAPI.selectDirectory()
    if (!result.canceled && result.path) {
      store.setBackupPath(result.path)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('取消')) {
      return
    }
    ElMessage.error(`选择目录失败：${error instanceof Error ? error.message : String(error)}`)
  }
}
</script>

<style scoped lang="scss">
.path-config {
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

    .path-item {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .label {
        font-size: 14px;
        font-weight: 500;
        color: #666;
      }

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
    }
  }
}
</style>

