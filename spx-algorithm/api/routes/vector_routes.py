"""
向量数据库API路由
"""

import logging
from functools import wraps

from flask import Blueprint, request, jsonify

from orchestrator.ranking_orchestrator import RankingOrchestrator

logger = logging.getLogger(__name__)

vector_bp = Blueprint('vector', __name__, url_prefix='/api/vector')

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
                'error': '向量数据库服务未初始化',
                'code': 'SERVICE_NOT_INITIALIZED'
            }), 500
        return f(*args, **kwargs)
    return decorated_function


@vector_bp.route('/health', methods=['GET'])
@ensure_orchestrator_initialized
def health_check():
    """健康检查"""
    try:
        health_info = orchestrator.health_check()
        
        if health_info.get('status') == 'healthy':
            return jsonify({
                'status': 'healthy',
                'service': 'spx-vector-database-api'
            })
        else:
            return jsonify({
                'status': 'unhealthy',
                'service': 'spx-vector-database-api',
                'details': health_info
            }), 503
            
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'spx-vector-database-api',
            'error': str(e)
        }), 503


@vector_bp.route('/stats', methods=['GET'])
@ensure_orchestrator_initialized
def get_stats():
    """获取数据库统计信息"""
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


@vector_bp.route('/add', methods=['POST'])
@validate_json_request(['id', 'url'], {
    'id': lambda x: isinstance(x, int) and x > 0,
    'url': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'svg_content': lambda x: isinstance(x, str) and len(x.strip()) > 0
})
@ensure_orchestrator_initialized
def add_image(data: dict):
    """
    添加图片到向量数据库
    
    接受JSON数据：
    {
        "id": 123,
        "url": "https://example.com/image.svg",
        "svg_content": "<svg>...</svg>"  // 可选
    }
    """
    try:
        image_id = data['id']
        image_url = data['url']
        svg_content = data.get('svg_content')
        
        logger.info(f"收到添加图片请求: ID={image_id}, URL={image_url}")
        
        success = orchestrator.add_image(image_id, image_url, svg_content)
        
        if success:
            return jsonify({
                'success': True,
                'message': '图片成功添加到向量数据库',
                'id': image_id,
                'url': image_url
            })
        else:
            return jsonify({
                'success': False,
                'error': '添加图片失败',
                'code': 'ADD_IMAGE_FAILED',
                'id': image_id,
                'url': image_url
            }), 500
    
    except Exception as e:
        logger.error(f"添加图片异常: {e}")
        return jsonify({
            'error': '添加图片失败',
            'code': 'ADD_IMAGE_FAILED',
            'details': str(e)
        }), 500


@vector_bp.route('/batch/add', methods=['POST'])
@validate_json_request(['images'])
@ensure_orchestrator_initialized
def batch_add_images(data: dict):
    """
    批量添加图片
    
    接受JSON数据：
    {
        "images": [
            {"id": 1, "url": "https://example.com/1.svg", "svg_content": "<svg>..."},
            {"id": 2, "url": "https://example.com/2.svg"}
        ]
    }
    """
    try:
        images = data['images']
        
        if not isinstance(images, list):
            return jsonify({
                'error': 'images参数必须是数组',
                'code': 'INVALID_IMAGES_FORMAT'
            }), 400
        
        if len(images) == 0:
            return jsonify({
                'error': '图片列表不能为空',
                'code': 'EMPTY_IMAGES_LIST'
            }), 400
        
        logger.info(f"收到批量添加请求，图片数量: {len(images)}")
        
        result = orchestrator.batch_add_images(images)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"批量添加图片异常: {e}")
        return jsonify({
            'success': False,
            'error': '批量添加失败',
            'code': 'BATCH_ADD_FAILED',
            'details': str(e)
        }), 500


@vector_bp.route('/search', methods=['POST'])
@validate_json_request(['text'], {
    'text': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'k': lambda x: isinstance(x, int) and x > 0
})
@ensure_orchestrator_initialized
def search_by_text(data: dict):
    """
    向量搜索接口
    
    接受JSON数据：
    {
        "text": "查询文本",
        "k": 10  // 可选，返回结果数量，默认10
    }
    """
    try:
        text_query = data['text'].strip()
        k = data.get('k', 10)
        
        logger.info(f"收到向量搜索请求: query='{text_query}', k={k}")
        
        # 执行搜索
        result = orchestrator.search(
            query_text=text_query,
            top_k=k,
            threshold=0.0
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'query': text_query,
                'k': k,
                'results_count': result['results_count'],
                'results': result['results']
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', '搜索失败'),
                'code': 'SEARCH_FAILED'
            }), 500
    
    except Exception as e:
        logger.error(f"向量搜索异常: {e}")
        return jsonify({
            'error': '搜索失败',
            'code': 'SEARCH_ERROR',
            'details': str(e)
        }), 500


@vector_bp.route('/data', methods=['GET'])
@ensure_orchestrator_initialized
def get_all_data():
    """
    获取所有数据
    
    查询参数：
    - include_vectors: 是否包含向量数据（true/false）
    - limit: 限制返回数量
    - offset: 偏移量
    """
    try:
        include_vectors = request.args.get('include_vectors', 'false').lower() == 'true'
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', 0, type=int)
        
        logger.info(f"获取所有数据: include_vectors={include_vectors}, limit={limit}, offset={offset}")
        
        data = orchestrator.get_all_data(include_vectors, limit, offset)
        
        return jsonify({
            'success': True,
            'total_count': len(data),  # 简化版本，实际应该是总数
            'returned_count': len(data),
            'offset': offset,
            'limit': limit,
            'include_vectors': include_vectors,
            'data': data
        })
    
    except Exception as e:
        logger.error(f"获取数据异常: {e}")
        return jsonify({
            'error': '获取数据失败',
            'code': 'GET_DATA_ERROR',
            'details': str(e)
        }), 500


@vector_bp.route('/delete', methods=['DELETE'])
@validate_json_request(['id'], {
    'id': lambda x: isinstance(x, int) and x > 0
})
@ensure_orchestrator_initialized
def delete_image(data: dict):
    """
    删除图片
    
    接受JSON数据：
    {
        "id": 123
    }
    """
    try:
        image_id = data['id']
        
        logger.info(f"收到删除图片请求: ID={image_id}")
        
        success = orchestrator.remove_image(image_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': '图片记录已删除',
                'id': image_id
            })
        else:
            return jsonify({
                'success': False,
                'error': '删除失败，图片ID不存在',
                'code': 'DELETE_FAILED',
                'id': image_id
            }), 404
    
    except Exception as e:
        logger.error(f"删除图片异常: {e}")
        return jsonify({
            'error': '删除失败',
            'code': 'DELETE_ERROR',
            'details': str(e)
        }), 500