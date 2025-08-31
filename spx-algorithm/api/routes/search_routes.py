"""
搜索API路由
"""

import logging
from functools import wraps

from flask import Blueprint, request, jsonify

from orchestrator.ranking_orchestrator import RankingOrchestrator

logger = logging.getLogger(__name__)

search_bp = Blueprint('search', __name__, url_prefix='/api/search')

# 全局编排器实例
orchestrator = None


def init_orchestrator(config: dict):
    """初始化编排器"""
    global orchestrator
    if orchestrator is None:
        orchestrator = RankingOrchestrator(config)


def validate_json_request(required_fields: list, field_validators: dict = None):
    """装饰器：验证JSON请求参数"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            if not data:
                return jsonify({
                    'error': '请求体必须是有效的JSON',
                    'code': 'INVALID_JSON'
                }), 400
            
            for field in required_fields:
                if field not in data:
                    return jsonify({
                        'error': f'缺少必需参数: {field}',
                        'code': f'MISSING_{field.upper()}'
                    }), 400
            
            if field_validators:
                for field, validator in field_validators.items():
                    if field in data and not validator(data[field]):
                        return jsonify({
                            'error': f'{field}参数验证失败',
                            'code': f'INVALID_{field.upper()}'
                        }), 400
            
            return f(data, *args, **kwargs)
        return decorated_function
    return decorator


def ensure_orchestrator_initialized(f):
    """装饰器：确保编排器已初始化"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        global orchestrator
        if orchestrator is None:
            return jsonify({
                'error': '搜索服务未初始化',
                'code': 'SERVICE_NOT_INITIALIZED'
            }), 500
        return f(*args, **kwargs)
    return decorated_function


@search_bp.route('/resource', methods=['POST'])
@validate_json_request(['text'], {
    'text': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'top_k': lambda x: isinstance(x, int) and x > 0,
    'threshold': lambda x: isinstance(x, (int, float)) and 0 <= x <= 1
})
@ensure_orchestrator_initialized
def search_by_text(data: dict):
    """
    文本搜索接口
    
    接受JSON数据：
    {
        "text": "查询文本",
        "top_k": 10,  // 可选，返回结果数量，默认10
        "threshold": 0.0  // 可选，相似度阈值，默认0.0
    }
    """
    try:
        text_query = data['text'].strip()
        top_k = data.get('top_k', 10)
        threshold = data.get('threshold', 0.0)
        
        logger.info(f"收到搜索请求: query='{text_query}', top_k={top_k}, threshold={threshold}")
        
        # 执行搜索
        result = orchestrator.search(
            query_text=text_query,
            top_k=top_k,
            threshold=threshold
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'query': text_query,
                'top_k': top_k,
                'threshold': threshold,
                'results_count': result['results_count'],
                'results': result['results']
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', '搜索失败'),
                'code': 'SEARCH_FAILED'
            }), 500
    
    except ValueError as e:
        logger.error(f"搜索参数异常: {e}")
        return jsonify({
            'error': str(e),
            'code': 'INVALID_PARAMETER'
        }), 400
    
    except Exception as e:
        logger.error(f"搜索系统异常: {e}")
        return jsonify({
            'error': '内部服务器错误',
            'code': 'INTERNAL_ERROR',
            'details': str(e)
        }), 500


@search_bp.route('/stats', methods=['GET'])
@ensure_orchestrator_initialized
def get_search_stats():
    """获取搜索服务统计信息"""
    try:
        stats = orchestrator.get_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        return jsonify({
            'error': '获取统计信息失败',
            'code': 'GET_STATS_ERROR',
            'details': str(e)
        }), 500