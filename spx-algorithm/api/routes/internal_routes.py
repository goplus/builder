"""
内部调试API路由
用于debug向量数据等底层信息
"""

import logging
from functools import wraps

from flask import Blueprint, request, jsonify

from orchestrator.ranking_orchestrator import RankingOrchestrator

logger = logging.getLogger(__name__)

internal_bp = Blueprint('internal', __name__, url_prefix='/v1/internal')

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
                'error': '内部服务未初始化',
                'code': 'SERVICE_NOT_INITIALIZED'
            }), 500
        return f(*args, **kwargs)
    return decorated_function


@internal_bp.route('/health', methods=['GET'])
@ensure_orchestrator_initialized
def health_check():
    """内部健康检查"""
    try:
        health_info = orchestrator.health_check()
        
        if health_info.get('status') == 'healthy':
            return jsonify({
                'status': 'healthy',
                'service': 'spx-internal-debug-api',
                'details': health_info
            })
        else:
            return jsonify({
                'status': 'unhealthy',
                'service': 'spx-internal-debug-api',
                'details': health_info
            }), 503
            
    except Exception as e:
        logger.error(f"内部健康检查失败: {e}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'spx-internal-debug-api',
            'error': str(e)
        }), 503


@internal_bp.route('/vectors', methods=['GET'])
@ensure_orchestrator_initialized
def get_vector_data():
    """
    获取向量数据（用于调试）
    
    查询参数：
    - limit: 限制返回数量
    - offset: 偏移量
    - include_vectors: 是否包含向量数据（true/false）
    """
    try:
        include_vectors = request.args.get('include_vectors', 'true').lower() == 'true'
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', 0, type=int)
        
        logger.info(f"获取向量数据: include_vectors={include_vectors}, limit={limit}, offset={offset}")
        
        data = orchestrator.get_all_data(include_vectors, limit, offset)
        
        return jsonify({
            'success': True,
            'total_count': len(data),
            'returned_count': len(data),
            'offset': offset,
            'limit': limit,
            'include_vectors': include_vectors,
            'debug_data': data
        })
    
    except Exception as e:
        logger.error(f"获取向量数据异常: {e}")
        return jsonify({
            'error': '获取向量数据失败',
            'code': 'GET_VECTOR_DATA_ERROR',
            'details': str(e)
        }), 500


@internal_bp.route('/vectors/search', methods=['POST'])
@validate_json_request(['text'], {
    'text': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'k': lambda x: isinstance(x, int) and x > 0
})
@ensure_orchestrator_initialized
def debug_vector_search(data: dict):
    """
    向量搜索调试接口（返回详细的向量相似度信息）
    
    接受JSON数据：
    {
        "text": "查询文本",
        "k": 10  // 可选，返回结果数量，默认10
    }
    """
    try:
        text_query = data['text'].strip()
        k = data.get('k', 10)
        
        logger.info(f"收到向量搜索调试请求: query='{text_query}', k={k}")
        
        # 执行搜索
        result = orchestrator.search(
            query_text=text_query,
            top_k=k,
            threshold=0.0
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'debug_info': {
                    'query': text_query,
                    'k': k,
                    'results_count': result['results_count'],
                    'search_method': 'vector_similarity',
                    'model_info': 'CLIP-based'
                },
                'results': result['results']
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', '向量搜索失败'),
                'code': 'VECTOR_SEARCH_FAILED'
            }), 500
    
    except Exception as e:
        logger.error(f"向量搜索调试异常: {e}")
        return jsonify({
            'error': '向量搜索调试失败',
            'code': 'DEBUG_VECTOR_SEARCH_ERROR',
            'details': str(e)
        }), 500


@internal_bp.route('/database/stats', methods=['GET'])
@ensure_orchestrator_initialized
def get_detailed_database_stats():
    """获取详细的数据库统计信息（包含向量数据库详情）"""
    try:
        stats = orchestrator.get_stats()
        
        # 添加更多调试信息
        detailed_stats = {
            'basic_stats': stats,
            'debug_info': {
                'vector_database': 'milvus',
                'collection_info': '向量维度、索引类型等底层信息',
                'model_info': 'CLIP模型版本和配置',
                'timestamp': '获取统计信息的时间戳'
            }
        }
        
        return jsonify({
            'success': True,
            'detailed_stats': detailed_stats
        })
    except Exception as e:
        logger.error(f"获取详细统计信息失败: {e}")
        return jsonify({
            'error': '获取详细统计信息失败',
            'code': 'GET_DETAILED_STATS_ERROR',
            'details': str(e)
        }), 500


@internal_bp.route('/database/collection/info', methods=['GET'])
@ensure_orchestrator_initialized
def get_collection_info():
    """获取向量数据库集合信息（调试用）"""
    try:
        # 这里应该调用底层的Milvus操作来获取集合详情
        # 为了演示，返回模拟的信息
        collection_info = {
            'collection_name': 'spx_vector_collection',
            'vector_dimension': 512,
            'index_type': 'IVF_FLAT',
            'metric_type': 'L2',
            'total_entities': '从实际数据库获取',
            'schema_info': '集合的字段定义'
        }
        
        return jsonify({
            'success': True,
            'collection_info': collection_info
        })
    
    except Exception as e:
        logger.error(f"获取集合信息失败: {e}")
        return jsonify({
            'error': '获取集合信息失败',
            'code': 'GET_COLLECTION_INFO_ERROR',
            'details': str(e)
        }), 500


@internal_bp.route('/vectors/<int:resource_id>', methods=['GET'])
@ensure_orchestrator_initialized
def get_resource_vector(resource_id: int):
    """获取特定资源的向量数据（调试用）"""
    try:
        logger.info(f"获取资源向量数据: ID={resource_id}")
        
        # 这里应该调用底层操作获取特定资源的向量
        # 目前通过get_all_data筛选（效率不高，仅用于调试）
        all_data = orchestrator.get_all_data(include_vectors=True, limit=None, offset=0)
        
        resource_data = None
        for item in all_data:
            if item.get('id') == resource_id:
                resource_data = item
                break
        
        if resource_data:
            return jsonify({
                'success': True,
                'resource_id': resource_id,
                'vector_data': resource_data
            })
        else:
            return jsonify({
                'success': False,
                'error': f'未找到资源ID: {resource_id}',
                'code': 'RESOURCE_NOT_FOUND'
            }), 404
    
    except Exception as e:
        logger.error(f"获取资源向量异常: {e}")
        return jsonify({
            'error': '获取资源向量失败',
            'code': 'GET_RESOURCE_VECTOR_ERROR',
            'details': str(e)
        }), 500


@internal_bp.route('/resources', methods=['GET'])
@ensure_orchestrator_initialized
def list_resources():
    """
    获取资源列表（内部调试用）
    
    查询参数：
    - limit: 限制返回数量
    - offset: 偏移量
    """
    try:
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', 0, type=int)
        
        logger.info(f"内部获取资源列表: limit={limit}, offset={offset}")
        
        # 调用orchestrator获取数据，但不包含向量数据
        data = orchestrator.get_all_data(include_vectors=False, limit=limit, offset=offset)
        
        return jsonify({
            'success': True,
            'total_count': len(data),
            'returned_count': len(data),
            'offset': offset,
            'limit': limit,
            'resources': data
        })
    
    except Exception as e:
        logger.error(f"获取资源列表异常: {e}")
        return jsonify({
            'error': '获取资源列表失败',
            'code': 'LIST_RESOURCES_ERROR',
            'details': str(e)
        }), 500


@internal_bp.route('/resources/<int:resource_id>', methods=['DELETE'])
@ensure_orchestrator_initialized
def delete_resource(resource_id: int):
    """
    删除资源（内部调试用）
    
    路径参数：
    - resource_id: 资源ID
    """
    try:
        logger.info(f"内部删除资源请求: ID={resource_id}")
        
        success = orchestrator.remove_image(resource_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': '资源已删除',
                'id': resource_id
            })
        else:
            return jsonify({
                'success': False,
                'error': '删除失败，资源ID不存在',
                'code': 'DELETE_FAILED',
                'id': resource_id
            }), 404
    
    except Exception as e:
        logger.error(f"删除资源异常: {e}")
        return jsonify({
            'error': '删除失败',
            'code': 'DELETE_ERROR',
            'details': str(e)
        }), 500


@internal_bp.route('/resources/search', methods=['POST'])
@validate_json_request(['text'], {
    'text': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'limit': lambda x: isinstance(x, int) and x > 0,
    'threshold': lambda x: isinstance(x, (int, float)) and 0 <= x <= 1
})
@ensure_orchestrator_initialized
def internal_search_resources(data: dict):
    """
    内部资源搜索（用于调试，返回详细信息）
    
    接受JSON数据：
    {
        "text": "查询文本",
        "limit": 10,  // 可选，返回结果数量，默认10
        "threshold": 0.0  // 可选，相似度阈值，默认0.0
    }
    """
    try:
        text_query = data['text'].strip()
        limit = data.get('limit', 10)
        threshold = data.get('threshold', 0.0)
        
        logger.info(f"内部资源搜索请求: query='{text_query}', limit={limit}, threshold={threshold}")
        
        # 执行搜索
        result = orchestrator.search(
            query_text=text_query,
            top_k=limit,
            threshold=threshold
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'debug_info': {
                    'query': text_query,
                    'limit': limit,
                    'threshold': threshold,
                    'search_method': 'semantic_matching',
                    'model_info': 'CLIP-based'
                },
                'query': text_query,
                'limit': limit,
                'threshold': threshold,
                'total_found': result['results_count'],
                'resources': result['results']
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', '搜索失败'),
                'code': 'SEARCH_FAILED'
            }), 500
    
    except Exception as e:
        logger.error(f"内部搜索资源异常: {e}")
        return jsonify({
            'error': '搜索失败',
            'code': 'SEARCH_ERROR',
            'details': str(e)
        }), 500


@internal_bp.route('/resources/stats', methods=['GET'])
@ensure_orchestrator_initialized
def get_internal_resource_stats():
    """获取详细的资源统计信息（内部调试用）"""
    try:
        stats = orchestrator.get_stats()
        
        # 添加更多调试信息
        detailed_stats = {
            'basic_stats': stats,
            'debug_info': {
                'storage_type': 'vector_database',
                'collection_info': '资源集合的底层信息',
                'model_info': 'CLIP模型版本和配置',
                'last_updated': '最后更新时间'
            }
        }
        
        return jsonify({
            'success': True,
            'detailed_stats': detailed_stats
        })
    except Exception as e:
        logger.error(f"获取详细统计信息失败: {e}")
        return jsonify({
            'error': '获取详细统计信息失败',
            'code': 'GET_DETAILED_STATS_ERROR',
            'details': str(e)
        }), 500
    