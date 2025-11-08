/**
 * NSIS 安装包构建脚本
 * 
 * 功能：
 * 1. 构建 Electron 应用（使用 Quasar）
 * 2. 使用 electron-builder 生成 NSIS 安装包
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { spawn } from 'child_process'

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
    info: '📦',
    success: '✅',
    error: '❌',
    warn: '⚠️'
  }[type] || '📦'
  
  console.log(`${prefix} ${message}`)
}

/**
 * 执行命令并等待完成
 */
function execCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`执行命令: ${command} ${args.join(' ')}`)
    
    const child = spawn(command, args, {
      cwd: options.cwd || satisfactoryRoot,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, ...options.env }
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(new Error(`命令执行错误: ${error.message}`))
    })
  })
}

/**
 * 检查构建前置条件
 */
async function checkPrerequisites() {
  log('检查构建前置条件...')
  
  // 检查 dist/electron/UnPackaged 目录是否存在（Quasar 构建输出）
  const unpackagedDir = join(satisfactoryRoot, 'dist', 'electron', 'UnPackaged')
  
  if (!existsSync(unpackagedDir)) {
    log('未找到 Electron 构建输出，需要先构建 Electron 应用', 'warn')
    log('开始构建 Electron 应用...')
    
    // 先构建 Electron 应用
    await execCommand('npm', ['run', 'build:electron:no-lint'], {
      cwd: projectRoot
    })
    
    if (!existsSync(unpackagedDir)) {
      throw new Error('Electron 应用构建失败，未找到构建输出目录')
    }
    
    log('Electron 应用构建完成', 'success')
  } else {
    log('找到 Electron 构建输出', 'success')
  }
}

/**
 * 构建 NSIS 安装包
 */
async function buildNSISInstaller() {
  log('开始构建 NSIS 安装包...')
  
  // 直接使用 electron-builder 构建安装包
  // electron-builder 会读取 package.json 中的 build 配置
  // 但 Quasar 的配置在 quasar.config.ts 中，所以我们需要创建一个临时的 electron-builder 配置
  // 或者直接使用 electron-builder，它会自动读取 quasar.config.ts 中的 builder 配置（如果 Quasar 支持）
  
  // 实际上，最简单的方法是：
  // 1. 先确保 Electron 应用已构建（在 checkPrerequisites 中完成）
  // 2. 然后使用 electron-builder 直接构建安装包
  // 3. electron-builder 需要从 package.json 或单独的配置文件中读取配置
  
  // 由于 Quasar 的配置在 quasar.config.ts 中，我们需要：
  // 方案A：创建一个 electron-builder.yml 配置文件（推荐）
  // 方案B：在 package.json 中添加 build 配置
  // 方案C：使用环境变量传递配置
  
  // 我们使用方案B：在 package.json 中添加 build 配置
  // 但为了不污染 package.json，我们直接使用 electron-builder 的命令行参数
  
  log('使用 electron-builder 构建 NSIS 安装包...')
  
  // electron-builder 命令参数：
  // --win: Windows 平台
  // --x64: 64位架构
  // --config: 配置文件路径（可选，默认读取 package.json 或 electron-builder.yml）
  
  // 注意：electron-builder 需要从 package.json 的 "build" 字段读取配置
  // 或者从 electron-builder.yml 读取
  // 但 Quasar 的配置在 quasar.config.ts 中，所以我们需要手动指定配置
  
  // 使用 electron-builder，它会自动查找配置
  // 如果 package.json 中有 "build" 字段，会使用它
  // 否则会查找 electron-builder.yml
  
  // 使用 electron-builder 构建，指定配置文件
  await execCommand('npx', ['electron-builder', '--win', '--x64', '--config', 'electron-builder.yml'], {
    cwd: satisfactoryRoot
  })
  
  log('NSIS 安装包构建完成', 'success')
}

/**
 * 主函数
 */
async function main() {
  console.log('\n========================================')
  log('NSIS 安装包构建脚本')
  console.log('========================================\n')
  
  try {
    // 1. 检查前置条件（如果需要，先构建 Electron 应用）
    await checkPrerequisites()
    
    // 2. 构建 NSIS 安装包
    await buildNSISInstaller()
    
    console.log('\n========================================')
    log('构建完成！', 'success')
    log('安装包位置: dist/electron/Installer/')
    console.log('========================================\n')
    
  } catch (error) {
    console.log('\n========================================')
    log(`构建失败: ${error.message}`, 'error')
    console.log('========================================\n')
    process.exit(1)
  }
}

// 执行
main()

