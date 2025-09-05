"""
资源管理API路由
"""

import logging
from functools import wraps

from flask import Blueprint, request, jsonify

from orchestrator.ranking_orchestrator import RankingOrchestrator

logger = logging.getLogger(__name__)

resource_bp = Blueprint('resource', __name__, url_prefix='/v1/resource')

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
                'error': '资源服务未初始化',
                'code': 'SERVICE_NOT_INITIALIZED'
            }), 500
        return f(*args, **kwargs)
    return decorated_function


@resource_bp.route('/add', methods=['POST'])
@validate_json_request(['id', 'url'], {
    'id': lambda x: isinstance(x, int) and x > 0,
    'url': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'svg_content': lambda x: isinstance(x, str) and len(x.strip()) > 0
})
@ensure_orchestrator_initialized
def add_resource(data: dict):
    """
    添加单个资源
    
    接受JSON数据：
    {
        "id": 123,
        "url": "https://example.com/image.svg",
        "svg_content": "<svg>...</svg>"  // 可选
    }
    """
    try:
        resource_id = data['id']
        resource_url = data['url']
        svg_content = data.get('svg_content')
        
        logger.info(f"收到添加资源请求: ID={resource_id}, URL={resource_url}")
        
        success = orchestrator.add_image(resource_id, resource_url, svg_content)
        
        if success:
            return jsonify({
                'success': True,
                'message': '资源添加成功',
                'id': resource_id,
                'url': resource_url
            })
        else:
            return jsonify({
                'success': False,
                'error': '添加资源失败',
                'code': 'ADD_RESOURCE_FAILED',
                'id': resource_id,
                'url': resource_url
            }), 500
    
    except Exception as e:
        logger.error(f"添加资源异常: {e}")
        return jsonify({
            'error': '添加资源失败',
            'code': 'ADD_RESOURCE_FAILED',
            'details': str(e)
        }), 500


@resource_bp.route('/batch', methods=['POST'])
@validate_json_request(['resources'])
@ensure_orchestrator_initialized
def batch_add_resources(data: dict):
    """
    批量添加资源
    
    接受JSON数据：
    {
        "resources": [
            {"id": 1, "url": "https://example.com/1.svg", "svg_content": "<svg>..."},
            {"id": 2, "url": "https://example.com/2.svg"}
        ]
    }
    """
    try:
        resources = data['resources']
        
        if not isinstance(resources, list):
            return jsonify({
                'error': 'resources参数必须是数组',
                'code': 'INVALID_RESOURCES_FORMAT'
            }), 400
        
        if len(resources) == 0:
            return jsonify({
                'error': '资源列表不能为空',
                'code': 'EMPTY_RESOURCES_LIST'
            }), 400
        
        logger.info(f"收到批量添加请求，资源数量: {len(resources)}")
        
        # 将resources转换为images格式以兼容现有的orchestrator接口
        images = []
        for resource in resources:
            images.append({
                'id': resource['id'],
                'url': resource['url'],
                'svg_content': resource.get('svg_content')
            })
        
        result = orchestrator.batch_add_images(images)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"批量添加资源异常: {e}")
        return jsonify({
            'success': False,
            'error': '批量添加失败',
            'code': 'BATCH_ADD_FAILED',
            'details': str(e)
        }), 500


@resource_bp.route('/search', methods=['POST'])
@validate_json_request(['text'], {
    'text': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'top_k': lambda x: isinstance(x, int) and x > 0,
    'threshold': lambda x: isinstance(x, (int, float)) and 0 <= x <= 1
})
@ensure_orchestrator_initialized
def search_resources(data: dict):
    """
    搜索资源
    
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
        
        logger.info(f"收到资源搜索请求: query='{text_query}', top_k={top_k}, threshold={threshold}")
        
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

