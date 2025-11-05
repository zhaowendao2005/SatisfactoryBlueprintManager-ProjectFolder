/**
 * 主预加载脚本
 * 汇总暴露所有 API
 */
import { exposeWindowAPI } from './Preload/window'
import { exposeBlueprintAPI } from './Preload/blueprint'
import { exposeConfigAPI } from './Preload/config'

// 暴露窗口控制 API
exposeWindowAPI()

// 暴露蓝图 API
exposeBlueprintAPI()

// 暴露配置管理 API
exposeConfigAPI()

// 其他 API 暴露...

