"""
自动化服务主应用
Flask HTTP API 服务，提供鼠标键盘自动化接口
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import logging
from automation_executor import AutomationExecutor
from validators import validate_request

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域（Electron 调用）

# 全局执行器实例
executor = AutomationExecutor()

# 版本信息
VERSION = "1.0.0"


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'ok',
        'version': VERSION
    }), 200


@app.route('/api/execute', methods=['POST'])
def execute_automation():
    """
    执行自动化任务接口
    
    请求体格式：
    {
        "action": "moveMouse" | "mouseClick" | "typeText",
        "params": { ... }
    }
    
    返回格式：
    {
        "success": bool,
        "message": str,
        "duration": float  # 可选，执行耗时（秒）
    }
    """
    try:
        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': '请求体不能为空'
            }), 400
        
        # 验证请求参数
        is_valid, error_message = validate_request(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': error_message
            }), 400
        
        # 记录请求
        action = data.get('action')
        logger.info(f"执行操作: {action}")
        
        # 执行自动化操作
        start_time = time.time()
        result = executor.execute(action, data.get('params'))
        duration = time.time() - start_time
        
        # 返回结果
        response = {
            'success': result['success'],
            'message': result['message'],
            'duration': round(duration, 3)
        }
        
        return jsonify(response), 200 if result['success'] else 500
        
    except Exception as e:
        logger.error(f"执行失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'服务器内部错误: {str(e)}'
        }), 500


@app.errorhandler(404)
def not_found(error):
    """404 错误处理"""
    return jsonify({
        'success': False,
        'message': '接口不存在'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """500 错误处理"""
    logger.error(f"服务器错误: {str(error)}", exc_info=True)
    return jsonify({
        'success': False,
        'message': '服务器内部错误'
    }), 500


if __name__ == '__main__':
    # 生产模式启动（单线程，适合自动化场景）
    logger.info(f"自动化服务启动中... 版本: {VERSION}")
    logger.info("监听端口: 58888")
    
    app.run(
        host='0.0.0.0',
        port=58888,
        debug=False,
        threaded=False  # 单线程模式，避免并发冲突
    )

