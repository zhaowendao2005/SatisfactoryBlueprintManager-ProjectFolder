/**
 * Python 自动化服务构建脚本
 * 
 * 功能：
 * 1. 清理 Backend/Python/dist 目录
 * 2. 使用 PyInstaller 打包 Python 应用为单文件 exe
 * 3. 复制 exe 到 public/automation-service/ 目录
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, rmSync, copyFileSync, statSync } from 'fs'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 项目根目录
const projectRoot = join(__dirname, '..')
const satisfactoryRoot = join(projectRoot, 'SatisfactoryBlueprintManager')

// 路径配置
const PYTHON_DIR = join(satisfactoryRoot, 'Backend', 'Python')
const DIST_DIR = join(PYTHON_DIR, 'dist')
const OUTPUT_DIR = join(satisfactoryRoot, 'public', 'automation-service')
const EXE_NAME = 'automation-service.exe'
const VENV_PYTHON = join(PYTHON_DIR, '.venv', 'Scripts', 'python.exe')

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
 * 执行命令并输出结果
 */
function execCommand(command, options = {}) {
  try {
    log(`执行命令: ${command}`)
    const output = execSync(command, {
      cwd: options.cwd || process.cwd(),
      encoding: 'utf8',
      stdio: 'inherit'
    })
    return output
  } catch (error) {
    throw new Error(`命令执行失败: ${error.message}`)
  }
}

/**
 * 检查 Python 环境
 */
function checkPythonEnvironment() {
  log('检查 Python 环境...')
  
  try {
    // 检查虚拟环境 Python 是否存在
    if (!existsSync(VENV_PYTHON)) {
      throw new Error(`虚拟环境 Python 不存在: ${VENV_PYTHON}，请先创建虚拟环境`)
    }
    
    // 检查 Python 版本
    execCommand(`"${VENV_PYTHON}" --version`, { cwd: PYTHON_DIR })
    
    // 检查 PyInstaller
    try {
      execCommand(`"${VENV_PYTHON}" -m PyInstaller --version`, { cwd: PYTHON_DIR })
    } catch (error) {
      throw new Error('PyInstaller 未安装，请运行: uv pip install -r requirements.txt')
    }
    
    log('Python 环境检查通过', 'success')
  } catch (error) {
    log(`Python 环境检查失败: ${error.message}`, 'error')
    throw error
  }
}

/**
 * 清理构建目录
 */
function cleanDistDirectory() {
  log('清理构建目录...')
  
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true, force: true })
    log('已清理 dist 目录', 'success')
  }
  
  // 同时清理 build 和 spec 文件
  const buildDir = join(PYTHON_DIR, 'build')
  if (existsSync(buildDir)) {
    rmSync(buildDir, { recursive: true, force: true })
  }
  
  const specFile = join(PYTHON_DIR, 'app.spec')
  if (existsSync(specFile)) {
    rmSync(specFile, { force: true })
  }
}

/**
 * 使用 PyInstaller 打包
 */
function buildWithPyInstaller() {
  log('开始 PyInstaller 打包...')
  
  // PyInstaller 参数说明：
  // --onefile: 打包为单文件
  // --noconsole: 不显示控制台窗口
  // --name: 指定输出文件名
  // --hidden-import: 显式声明依赖
  const command = [
    `"${VENV_PYTHON}"`,
    '-m PyInstaller',
    '--onefile',
    '--noconsole',
    `--name=${EXE_NAME.replace('.exe', '')}`,
    '--hidden-import=pywinauto',
    '--hidden-import=screeninfo',
    'app.py'
  ].join(' ')
  
  try {
    execCommand(command, { cwd: PYTHON_DIR })
    log('PyInstaller 打包完成', 'success')
  } catch (error) {
    log('PyInstaller 打包失败', 'error')
    throw error
  }
}

/**
 * 复制 exe 到目标目录
 */
function copyExeToPublic() {
  log('复制 exe 到 public 目录...')
  
  const sourceExe = join(DIST_DIR, EXE_NAME)
  const targetExe = join(OUTPUT_DIR, EXE_NAME)
  
  // 检查源 exe 是否存在
  if (!existsSync(sourceExe)) {
    throw new Error(`找不到打包后的 exe: ${sourceExe}`)
  }
  
  // 确保目标目录存在
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
    log(`创建目录: ${OUTPUT_DIR}`)
  }
  
  // 清理目标文件（如果存在）
  if (existsSync(targetExe)) {
    rmSync(targetExe, { force: true })
    log('已清理旧的 exe 文件')
  }
  
  // 复制文件
  copyFileSync(sourceExe, targetExe)
  
  log(`已复制 exe 到: ${targetExe}`, 'success')
  
  // 输出文件大小
  const stats = statSync(targetExe)
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
  log(`文件大小: ${sizeMB} MB`)
  
  if (stats.size > 30 * 1024 * 1024) {
    log(`警告: 文件大小超过 30MB，可能影响分发`, 'warn')
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n========================================')
  log('Python 自动化服务构建脚本')
  console.log('========================================\n')
  
  try {
    // 1. 检查环境
    checkPythonEnvironment()
    
    // 2. 清理旧文件
    cleanDistDirectory()
    
    // 3. 打包
    buildWithPyInstaller()
    
    // 4. 复制 exe
    copyFileSync(join(DIST_DIR, EXE_NAME), join(OUTPUT_DIR, EXE_NAME))
    
    console.log('\n========================================')
    log('构建完成！', 'success')
    log(`输出文件: ${join(OUTPUT_DIR, EXE_NAME)}`)
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

