/**
 * Overlay 窗口 HTML 模板
 * 所有内容内联为字符串，通过 data URL 加载
 */
export function getOverlayHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>坐标标定</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      cursor: crosshair;
      position: relative;
    }

    #screenshot {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    #overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.3);
    }

    #crosshair {
      position: absolute;
      pointer-events: none;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
    }

    #crosshair::before,
    #crosshair::after {
      content: '';
      position: absolute;
      background-color: #ff0000;
    }

    #crosshair::before {
      top: 50%;
      left: 0;
      width: 100%;
      height: 2px;
      transform: translateY(-50%);
    }

    #crosshair::after {
      left: 50%;
      top: 0;
      width: 2px;
      height: 100%;
      transform: translateX(-50%);
    }

    #crosshair {
      background: radial-gradient(circle, transparent 5px, rgba(255, 0, 0, 0.3) 5px);
    }

    #hint {
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 18px;
      font-family: Arial, sans-serif;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
      background-color: rgba(0, 0, 0, 0.6);
      padding: 12px 24px;
      border-radius: 8px;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <img id="screenshot" alt="屏幕截图" />
  <div id="overlay">
    <div id="crosshair"></div>
    <div id="hint">点击屏幕标定坐标，按 ESC 取消</div>
  </div>
  <script>
    // 获取 DOM 元素
    const crosshair = document.getElementById('crosshair');
    const hint = document.getElementById('hint');

    if (!crosshair || !hint) {
      console.error('无法找到必要的 DOM 元素');
    } else {
      // 鼠标移动时更新十字准星位置
      document.addEventListener('mousemove', (event) => {
        crosshair.style.left = event.clientX + 'px';
        crosshair.style.top = event.clientY + 'px';
      });

      // 监听点击和取消事件通过 preload API
      if (window.overlayAPI) {
        window.overlayAPI.onClick((x, y) => {});
        window.overlayAPI.onCancel(() => {});
      }
    }
  </script>
</body>
</html>`
}

