/**
 * 图标匹配工具函数
 * 根据蓝图名称和路径智能匹配合适的 Element Plus 图标
 */

import type { Component } from 'vue'
import {
  Folder,
  Document,
  Setting,
  Operation,
  InfoFilled,
  QuestionFilled,
  Edit,
  Plus,
  Delete,
  Refresh,
  Check,
  Close,
  CircleCheck,
  CircleClose,
  FolderOpened,
  Location,
  ShoppingCart,
  User,
} from '@element-plus/icons-vue'

// Element Plus 图标组件映射（仅使用项目中已验证可用的图标）
const iconComponentMap: Record<string, Component> = {
  // 工厂/建筑相关
  'factory': Folder,
  'plant': Folder,
  'manufacturing': Folder,
  '工厂': Folder,
  'building': Folder,
  'construction': Folder,
  'structure': Folder,
  '建筑': Folder,
  'workshop': Operation,
  '车间': Operation,
  
  // 传送带/运输相关
  'conveyor': Setting,
  'belt': Setting,
  '传送带': Setting,
  'transport': ShoppingCart,
  'shipping': ShoppingCart,
  'delivery': ShoppingCart,
  '运输': ShoppingCart,
  'traffic': Location,
  'hub': Location,
  '交通': Location,
  'logistics': FolderOpened,
  '物流': FolderOpened,
  'distribution': ShoppingCart,
  
  // 电力/能源相关
  'power': CircleCheck,
  'electric': CircleCheck,
  '电力': CircleCheck,
  'energy': CircleCheck,
  '能源': CircleCheck,
  'battery': CircleCheck,
  'generator': CircleCheck,
  
  // 资源/挖掘相关
  'resource': Plus,
  'mining': Plus,
  'extraction': Plus,
  '资源': Plus,
  '挖掘': Plus,
  'mine': Plus,
  
  // 存储相关
  'storage': FolderOpened,
  'warehouse': FolderOpened,
  'inventory': FolderOpened,
  '存储': FolderOpened,
  '仓库': FolderOpened,
  
  // 生产/制造相关
  'production': Folder,
  '生产': Folder,
  'manufacturing': Operation,
  '制造': Operation,
  'assembly': Operation,
  '装配': Operation,
  'line': Folder,
  '流水线': Folder,
  'pipeline': Setting,
  
  // 自动化/机器人相关
  'automation': Operation,
  'robot': Operation,
  'auto': Operation,
  '自动化': Operation,
  '机器人': Operation,
  
  // 研究/开发相关
  'research': InfoFilled,
  'r&d': InfoFilled,
  'rd': InfoFilled,
  '研究': InfoFilled,
  'development': InfoFilled,
  '研发': InfoFilled,
  'lab': InfoFilled,
  'laboratory': InfoFilled,
  '实验室': InfoFilled,
  'facility': InfoFilled,
  
  // 创新/设计相关
  'innovation': QuestionFilled,
  'creative': QuestionFilled,
  '创新': QuestionFilled,
  'design': Document,
  'layout': Edit,
  '设计': Document,
  '布局': Edit,
  'prototype': Plus,
  '原型': Plus,
  
  // 质量/测试相关
  'quality': Check,
  'control': Check,
  '质量': Check,
  'testing': CircleCheck,
  'test': CircleCheck,
  '测试': CircleCheck,
  'platform': Setting,
  '平台': Setting,
  
  // 数据/信息相关
  'data': Document,
  'database': Document,
  'information': Document,
  '数据': Document,
  '信息': Document,
  'center': FolderOpened,
  '中心': FolderOpened,
  
  // 监控/安全相关
  'monitoring': InfoFilled,
  'surveillance': InfoFilled,
  'camera': InfoFilled,
  '监控': InfoFilled,
  'security': CircleCheck,
  'safety': CircleCheck,
  'protection': CircleCheck,
  '安全': CircleCheck,
  
  // 维护/工具相关
  'maintenance': Setting,
  'repair': Setting,
  'service': Setting,
  '维护': Setting,
  'tool': Setting,
  '工具': Setting,
  
  // 包装相关
  'packaging': FolderOpened,
  'package': FolderOpened,
  '包装': FolderOpened,
  
  // 系统相关
  'system': Setting,
  'network': Setting,
  '系统': Setting,
  '网络': Setting,
}

/**
 * 根据蓝图名称和路径智能匹配图标组件
 * @param name - 蓝图名称
 * @param path - 蓝图路径
 * @returns 匹配的图标组件
 */
export function getIconForBlueprint(name: string, path: string): Component {
  // 合并名称和路径，转换为小写以便匹配
  const searchText = (name + ' ' + path).toLowerCase()
  
  // 按优先级匹配（先匹配更具体的词）
  const sortedKeywords = Object.keys(iconComponentMap).sort((a, b) => b.length - a.length)
  
  for (const keyword of sortedKeywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      return iconComponentMap[keyword]
    }
  }
  
  // 如果没有匹配到，返回默认图标
  return Document
}


