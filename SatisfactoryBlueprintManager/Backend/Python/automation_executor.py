"""
自动化执行器
封装 pywinauto 的鼠标键盘操作
"""
import time
import logging
from pywinauto import mouse, keyboard

logger = logging.getLogger(__name__)


class AutomationExecutor:
    """自动化操作执行器"""
    
    def __init__(self):
        """初始化执行器"""
        logger.info("自动化执行器初始化完成")
    
    def execute(self, action, params):
        """
        执行自动化操作
        
        Args:
            action: 操作类型 ("moveMouse" | "mouseClick" | "typeText")
            params: 操作参数
            
        Returns:
            dict: { success: bool, message: str }
        """
        try:
            if action == 'moveMouse':
                return self._move_mouse(params)
            elif action == 'mouseClick':
                return self._mouse_click(params)
            elif action == 'typeText':
                return self._type_text(params)
            else:
                return {
                    'success': False,
                    'message': f'未知的操作类型: {action}'
                }
        except Exception as e:
            logger.error(f"执行操作失败 [{action}]: {str(e)}", exc_info=True)
            return {
                'success': False,
                'message': f'操作失败: {str(e)}'
            }
    
    def _move_mouse(self, params):
        """
        移动鼠标到指定坐标
        
        Args:
            params: { x: int, y: int }
        """
        x = params['x']
        y = params['y']
        
        logger.info(f"移动鼠标到: ({x}, {y})")
        mouse.move(coords=(x, y))
        
        return {
            'success': True,
            'message': f'鼠标已移动到 ({x}, {y})'
        }
    
    def _mouse_click(self, params):
        """
        点击鼠标
        
        Args:
            params: { x: int, y: int, button: str }
        """
        x = params['x']
        y = params['y']
        button = params.get('button', 'left')
        
        logger.info(f"在 ({x}, {y}) 执行 {button} 点击")
        
        # 先移动到目标位置
        mouse.move(coords=(x, y))
        time.sleep(0.05)  # 短暂延迟，确保移动完成
        
        # 执行点击
        mouse.click(button=button, coords=(x, y))
        
        return {
            'success': True,
            'message': f'已在 ({x}, {y}) 执行 {button} 点击'
        }
    
    def _type_text(self, params):
        """
        逐字符输入文本
        
        Args:
            params: { text: str, delay: int }
        """
        text = params['text']
        delay = params['delay'] / 1000.0  # 转换为秒
        
        logger.info(f"输入文本: {text[:20]}{'...' if len(text) > 20 else ''} (延迟: {delay}s)")
        
        # 逐字符输入
        for char in text:
            keyboard.send_keys(char, pause=0)
            if delay > 0:
                time.sleep(delay)
        
        return {
            'success': True,
            'message': f'已输入 {len(text)} 个字符'
        }

