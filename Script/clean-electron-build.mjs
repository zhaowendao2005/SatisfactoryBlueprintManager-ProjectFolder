/**
 * 清理 Electron 构建输出脚本
 * 功能：
 * 1. 检查并关闭可能运行的 Electron 进程
 * 2. 等待文件解锁
 * 3. 清理构建输出目录
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, rmSync } from 'fs'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 项目根目录
const projectRoot = join(__dirname, '..')
const satisfactoryRoot = join(projectRoot, 'SatisfactoryBlueprintManager')

/**
 * 日志输出
 */
function log(message, type = 'info') {
  const prefix = {
    info: '🧹',
    success: '✅',
    error: '❌',
    warn: '⚠️'
  }[type] || '🧹'
  
  console.log(`${prefix} ${message}`)
}

/**
 * 检查并关闭 Electron 进程
 */
async function killElectronProcesses() {
  log('检查 Electron 进程...')
  
  try {
    const platform = process.platform
    
    if (platform === 'win32') {
      // Windows: 查找并关闭 Electron 进程
      try {
        // 查找 SatisfactoryBlueprintManager 相关的进程
        const result = execSync(
          'tasklist /FI "IMAGENAME eq SatisfactoryBlueprintManager.exe" /FO CSV /NH',
          { encoding: 'utf8', stdio: 'pipe' }
        )
        
        if (result.trim()) {
          log('发现运行的 Electron 进程，正在关闭...', 'warn')
          execSync('taskkill /F /IM SatisfactoryBlueprintManager.exe /T', { stdio: 'inherit' })
          log('Electron 进程已关闭', 'success')
          
          // 等待进程完全退出
          log('等待进程退出...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else {
          log('未发现运行的 Electron 进程', 'success')
        }
      } catch (error) {
        // 如果没有找到进程，taskkill 会报错，这是正常的
        if (error.message && !error.message.includes('not found')) {
          log(`检查进程时出错: ${error.message}`, 'warn')
        }
      }
      
      // 也检查 electron.exe 进程
      try {
        const electronResult = execSync(
          'tasklist /FI "IMAGENAME eq electron.exe" /FO CSV /NH',
          { encoding: 'utf8', stdio: 'pipe' }
        )
        
        if (electronResult.trim()) {
          log('发现运行的 electron.exe 进程，正在关闭...', 'warn')
          execSync('taskkill /F /IM electron.exe /T', { stdio: 'inherit' })
          log('electron.exe 进程已关闭', 'success')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        // 忽略未找到进程的错误
      }
    } else if (platform === 'darwin' || platform === 'linux') {
      // macOS/Linux: 使用 pkill
      try {
        execSync('pkill -f "SatisfactoryBlueprintManager"', { stdio: 'pipe' })
        log('Electron 进程已关闭', 'success')
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        // 如果没有找到进程，pkill 会返回非零退出码，这是正常的
        log('未发现运行的 Electron 进程', 'success')
      }
    }
  } catch (error) {
    log(`关闭进程时出错: ${error.message}`, 'warn')
  }
}

/**
 * 清理构建输出目录
 */
async function cleanBuildDirectories() {
  log('清理构建输出目录...')
  
  const distElectronPath = join(satisfactoryRoot, 'dist', 'electron')
  
  if (!existsSync(distElectronPath)) {
    log('构建输出目录不存在，跳过清理', 'info')
    return
  }
  
  const dirsToClean = [
    join(distElectronPath, 'Packaged'),
    join(distElectronPath, 'UnPackaged')
  ]
  
  for (const dir of dirsToClean) {
    if (existsSync(dir)) {
      try {
        log(`删除目录: ${dir}`)
        
        // 尝试多次删除，处理文件锁定问题
        let retries = 3
        let success = false
        
        while (retries > 0 && !success) {
          try {
            rmSync(dir, { recursive: true, force: true })
            success = true
            log(`已删除: ${dir}`, 'success')
          } catch (rmError) {
            retries--
            if (rmError.code === 'EBUSY') {
              if (retries > 0) {
                log(`目录被锁定，等待后重试... (剩余 ${retries} 次)`, 'warn')
                await new Promise(resolve => setTimeout(resolve, 1000))
              } else {
                throw rmError
              }
            } else {
              throw rmError
            }
          }
        }
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'ENOENT') {
          log(`目录被锁定或不存在，跳过: ${dir}`, 'warn')
          log('提示: 请确保没有 Electron 应用正在运行，或手动删除该目录', 'warn')
        } else {
          log(`删除目录失败: ${dir}`, 'error')
          log(`错误: ${error.message}`, 'error')
          // 不抛出错误，继续清理其他目录
        }
      }
    }
  }
}

/**
 * 等待文件解锁（Windows 特有）
 */
async function waitForFileUnlock(filePath, maxRetries = 10, delay = 500) {
  if (process.platform !== 'win32') {
    return true
  }
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 尝试打开文件，如果成功则说明已解锁
      const handle = await import('fs/promises').then(m => m.open(filePath, 'r'))
      await handle.close()
      return true
    } catch (error) {
      if (error.code === 'EBUSY' || error.code === 'EACCES') {
        // 文件仍被锁定，等待后重试
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      } else if (error.code === 'ENOENT') {
        // 文件不存在，说明已经删除
        return true
      } else {
        // 其他错误，直接返回
        return false
      }
    }
  }
  
  return false
}

/**
 * 主函数
 */
async function main() {
  console.log('\n========================================')
  log('清理 Electron 构建输出')
  console.log('========================================\n')
  
  try {
    // 1. 关闭 Electron 进程
    await killElectronProcesses()
    
    // 2. 等待一下，确保进程完全退出
    log('等待文件解锁...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 3. 清理构建目录
    await cleanBuildDirectories()
    
    console.log('\n========================================')
    log('清理完成！', 'success')
    console.log('========================================\n')
    
  } catch (error) {
    console.log('\n========================================')
    log(`清理失败: ${error.message}`, 'error')
    log('提示: 请手动关闭所有 Electron 应用后重试', 'warn')
    console.log('========================================\n')
    process.exit(1)
  }
}

// 执行
main()

