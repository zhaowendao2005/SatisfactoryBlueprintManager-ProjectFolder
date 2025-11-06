# Python 自动化服务

基于 Flask + pywinauto 的自动化后端服务，通过 HTTP API 提供鼠标键盘控制功能。

## 📦 环境要求

- Python 3.8+
- Windows 10/11（pywinauto 仅支持 Windows）

## 🔧 开发环境设置

### 1. 安装 Python 依赖

```bash
cd Backend/Python
pip install -r requirements.txt
```

### 2. 安装 PyInstaller（用于打包）

```bash
pip install pyinstaller
```

### 3. 本地测试运行

```bash
python app.py
```

服务将在 `http://localhost:58888` 启动。

### 4. 测试 API

**健康检查：**
```bash
curl http://localhost:58888/health
```

**移动鼠标：**
```bash
curl -X POST http://localhost:58888/api/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"moveMouse","params":{"x":500,"y":500}}'
```

**点击鼠标：**
```bash
curl -X POST http://localhost:58888/api/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"mouseClick","params":{"x":500,"y":500,"button":"left"}}'
```

**输入文本：**
```bash
curl -X POST http://localhost:58888/api/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"typeText","params":{"text":"Hello","delay":50}}'
```

## 📦 打包为单文件 exe

在项目根目录运行：

```bash
npm run build:python
```

该命令会：
1. 清理 `Backend/Python/dist` 目录
2. 使用 PyInstaller 打包为单文件 exe
3. 复制 exe 到 `public/automation-service/automation-service.exe`

## 🏗️ 文件结构

```
Backend/Python/
├── app.py                    # Flask 主应用
├── automation_executor.py    # pywinauto 封装
├── validators.py             # 参数验证器
├── requirements.txt          # Python 依赖
├── .gitignore               # Git 忽略规则
└── README.md                # 本文档
```

## 🔌 API 接口

### GET /health

健康检查接口

**响应：**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### POST /api/execute

执行自动化操作接口

**请求体：**
```typescript
{
  action: "moveMouse" | "mouseClick" | "typeText",
  params: {
    // 根据 action 不同而不同
  }
}
```

**响应：**
```json
{
  "success": true,
  "message": "操作成功",
  "duration": 0.123
}
```

#### 操作类型

**1. moveMouse - 移动鼠标**
```json
{
  "action": "moveMouse",
  "params": {
    "x": 100,
    "y": 200
  }
}
```

**2. mouseClick - 点击鼠标**
```json
{
  "action": "mouseClick",
  "params": {
    "x": 100,
    "y": 200,
    "button": "left"  // "left" | "right" | "middle"
  }
}
```

**3. typeText - 输入文本**
```json
{
  "action": "typeText",
  "params": {
    "text": "Hello World",
    "delay": 50  // 每个字符间隔（毫秒）
  }
}
```

## ⚠️ 注意事项

1. **单线程模式**：服务运行在单线程模式，同一时间只能处理一个请求
2. **权限要求**：需要管理员权限或辅助功能权限
3. **坐标系统**：使用屏幕物理坐标（像素）
4. **仅支持 Windows**：pywinauto 仅支持 Windows 平台

## 🐛 故障排除

### 端口被占用

如果 58888 端口被占用，可以修改 `app.py` 中的端口号：

```python
app.run(host='0.0.0.0', port=58888, ...)
```

### 打包失败

1. 确保安装了 PyInstaller：`pip install pyinstaller`
2. 检查 Python 版本是否为 3.8+
3. 查看构建脚本输出的错误信息

### 权限错误

pywinauto 需要足够的权限来控制鼠标键盘：
- 以管理员身份运行
- 或在 Windows 设置中启用辅助功能权限

## 📝 开发说明

### 添加新的自动化操作

1. 在 `automation_executor.py` 中添加新的私有方法
2. 在 `execute()` 方法中添加新的 action 分支
3. 在 `validators.py` 中添加参数验证逻辑

### 修改端口或配置

所有配置都在 `app.py` 的底部：

```python
app.run(
    host='0.0.0.0',      # 监听地址
    port=58888,          # 端口号
    debug=False,         # 调试模式
    threaded=False       # 单线程模式
)
```

## 🔗 相关链接

- [pywinauto 文档](https://pywinauto.readthedocs.io/)
- [Flask 文档](https://flask.palletsprojects.com/)
- [PyInstaller 文档](https://pyinstaller.org/)

