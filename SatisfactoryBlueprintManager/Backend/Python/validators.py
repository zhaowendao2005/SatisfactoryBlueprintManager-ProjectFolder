"""
请求参数验证器
"""
import logging
from screeninfo import get_monitors

logger = logging.getLogger(__name__)


def validate_request(data):
    """
    验证自动化请求参数
    
    Args:
        data: 请求数据字典
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    # 检查必需字段
    if 'action' not in data:
        return False, '缺少必需参数: action'
    
    if 'params' not in data:
        return False, '缺少必需参数: params'
    
    action = data['action']
    params = data['params']
    
    # 根据 action 验证 params
    if action == 'moveMouse':
        return _validate_move_mouse(params)
    elif action == 'mouseClick':
        return _validate_mouse_click(params)
    elif action == 'typeText':
        return _validate_type_text(params)
    else:
        return False, f'无效的 action 值: {action}'


def _validate_move_mouse(params):
    """验证 moveMouse 参数"""
    # 检查必需参数
    if 'x' not in params or 'y' not in params:
        return False, 'moveMouse 需要 x 和 y 参数'
    
    # 检查类型
    if not isinstance(params['x'], (int, float)) or not isinstance(params['y'], (int, float)):
        return False, 'x 和 y 必须是数字'
    
    # 检查坐标范围
    if not _is_valid_screen_coords(params['x'], params['y']):
        return False, f"坐标 ({params['x']}, {params['y']}) 超出屏幕范围"
    
    return True, None


def _validate_mouse_click(params):
    """验证 mouseClick 参数"""
    # 检查必需参数
    if 'x' not in params or 'y' not in params:
        return False, 'mouseClick 需要 x 和 y 参数'
    
    # 检查类型
    if not isinstance(params['x'], (int, float)) or not isinstance(params['y'], (int, float)):
        return False, 'x 和 y 必须是数字'
    
    # 检查坐标范围
    if not _is_valid_screen_coords(params['x'], params['y']):
        return False, f"坐标 ({params['x']}, {params['y']}) 超出屏幕范围"
    
    # 检查 button 参数（可选）
    if 'button' in params:
        valid_buttons = ['left', 'right', 'middle']
        if params['button'] not in valid_buttons:
            return False, f"无效的 button 值: {params['button']}，应为 {valid_buttons} 之一"
    
    return True, None


def _validate_type_text(params):
    """验证 typeText 参数"""
    # 检查必需参数
    if 'text' not in params:
        return False, 'typeText 需要 text 参数'
    
    if 'delay' not in params:
        return False, 'typeText 需要 delay 参数'
    
    # 检查类型
    if not isinstance(params['text'], str):
        return False, 'text 必须是字符串'
    
    if not isinstance(params['delay'], (int, float)):
        return False, 'delay 必须是数字'
    
    # 检查范围
    if params['delay'] < 0:
        return False, 'delay 不能为负数'
    
    if params['delay'] > 10000:
        return False, 'delay 不能超过 10000ms'
    
    # 检查文本长度
    if len(params['text']) == 0:
        return False, 'text 不能为空'
    
    if len(params['text']) > 10000:
        return False, 'text 长度不能超过 10000 字符'
    
    return True, None


def _is_valid_screen_coords(x, y):
    """
    检查坐标是否在屏幕范围内
    
    Args:
        x: X 坐标
        y: Y 坐标
        
    Returns:
        bool: 是否有效
    """
    try:
        monitors = get_monitors()
        
        # 检查坐标是否在任意显示器范围内
        for monitor in monitors:
            if (monitor.x <= x < monitor.x + monitor.width and
                monitor.y <= y < monitor.y + monitor.height):
                return True
        
        return False
    except Exception as e:
        logger.warning(f"无法获取屏幕信息: {str(e)}，跳过坐标范围验证")
        # 如果无法获取屏幕信息，放行（避免阻塞）
        return True

