/**
 * 主预加载脚本
 * 汇总暴露所有 API
 */
import { exposeWindowAPI } from './Preload/window'

// 暴露窗口控制 API
exposeWindowAPI()

// 其他 API 暴露...

