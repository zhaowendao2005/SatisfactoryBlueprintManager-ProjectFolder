/**
 * 屏幕截图工具类
 */
import { desktopCapturer, screen } from 'electron'

/**
 * 捕获所有显示器的截图
 * @returns Promise<Map<string, string>> displayId → base64 dataURL
 * @注意事项 截图尺寸自动匹配显示器分辨率，考虑 DPI 缩放
 */
export async function captureAllScreens(): Promise<Map<string, string>> {
  const displays = screen.getAllDisplays()
  const screenshotMap = new Map<string, string>()

  if (displays.length === 0) {
    throw new Error('未检测到显示器')
  }

  try {
    // 获取所有屏幕源
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: 1920, // 默认尺寸，实际会根据显示器自动调整
        height: 1080
      }
    })

    // 为每个显示器匹配截图
    for (const display of displays) {
      const displayId = String(display.id)
      
      // 查找匹配的截图源
      const source = sources.find(s => String(s.display_id) === displayId)
      
      if (source && source.thumbnail) {
        // 转换为 base64 dataURL
        const dataURL = source.thumbnail.toDataURL()
        screenshotMap.set(displayId, dataURL)
      } else {
        // 如果找不到截图，使用降级背景
        const fallback = generateFallbackBackground(display)
        screenshotMap.set(displayId, fallback)
      }
    }

    return screenshotMap
  } catch (error) {
    console.error('截图捕获失败:', error)
    // 降级：为所有显示器生成纯色背景
    for (const display of displays) {
      const displayId = String(display.id)
      const fallback = generateFallbackBackground(display)
      screenshotMap.set(displayId, fallback)
    }
    return screenshotMap
  }
}

/**
 * 生成降级背景（纯色 + 提示文字）
 * @param display - 显示器信息
 * @returns string - HTML 格式的 dataURL
 */
export function generateFallbackBackground(display: Electron.Display): string {
  const width = display.bounds.width
  const height = display.bounds.height
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: ${width}px;
      height: ${height}px;
      background-color: #808080;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      color: white;
      font-size: 24px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div>无法获取截图，请点击屏幕标定坐标</div>
</body>
</html>
  `.trim()

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

