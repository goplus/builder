"""
健康检查API路由
"""

from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__, url_prefix='/api')


@health_bp.route('/health', methods=['GET'])
def health_check():
    """服务健康检查"""
    return jsonify({
        'status': 'healthy',
        'service': 'spx-algorithm-api',
        'version': '1.0.0'
    })


@health_bp.route('/ping', methods=['GET'])
def ping():
    """简单的ping接口"""
    return jsonify({'message': 'pong'})