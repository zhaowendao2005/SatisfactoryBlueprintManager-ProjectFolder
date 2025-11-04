/**
 * 通用标题栏组件属性
 * @注意事项 title 为空时显示默认应用名称
 */
export interface TitlebarProps {
  /** 标题文本，默认为应用名称 */
  title?: string
  /** 是否显示应用图标，默认 true */
  showIcon?: boolean
}

