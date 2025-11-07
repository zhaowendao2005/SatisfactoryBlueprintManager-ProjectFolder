/**
 * 主预加载脚本
 * 汇总暴露所有 API
 */
import { exposeWindowAPI } from './Preload/window'
import { exposeBlueprintAPI } from './Preload/blueprint'
import { exposeConfigAPI } from './Preload/config'
import { exposeGlobalTagsAPI } from './Preload/global-tags'
import { exposeSyncAPI } from './Preload/sync'
import { exposeAutomationConfigAPI } from './Preload/automation-config'
import { exposeBlueprintInfoAPI } from './Preload/blueprint-info'
import { exposeShortcutConfigAPI } from './Preload/shortcut'
import { exposeGeneralSettingsAPI } from './Preload/general-settings'

// 暴露窗口控制 API
exposeWindowAPI()

// 暴露蓝图 API
exposeBlueprintAPI()

// 暴露配置管理 API
exposeConfigAPI()

// 暴露全局标签 API
exposeGlobalTagsAPI()

// 暴露同步 API
exposeSyncAPI()

// 暴露自动化配置 API
exposeAutomationConfigAPI()

// 暴露蓝图信息 API
exposeBlueprintInfoAPI()

// 暴露快捷键配置 API
exposeShortcutConfigAPI()

// 暴露通用设置 API
exposeGeneralSettingsAPI()

// 其他 API 暴露...

