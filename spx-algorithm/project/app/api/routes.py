import logging
from functools import wraps

from flask import Blueprint, request, jsonify, current_app

from ..services.image_search_service import ImageSearchService
from ..services.vector_database_service import VectorDatabaseService

logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')

# 全局服务实例
search_service = None
vector_db_service = None


def init_search_service(model_name: str = 'ViT-B-32', pretrained: str = 'laion2b_s34b_b79k'):
    """初始化搜索服务"""
    global search_service
    if search_service is None:
        search_service = ImageSearchService(model_name, pretrained)


def init_vector_database_service():
    """初始化向量数据库服务"""
    global vector_db_service
    if vector_db_service is None:
        try:
            vector_db_service = VectorDatabaseService(
                model_name=current_app.config['CLIP_MODEL_NAME'],
                pretrained=current_app.config['CLIP_PRETRAINED'],
                collection_name=current_app.config['MILVUS_COLLECTION_NAME'],
                dimension=current_app.config['MILVUS_DIMENSION'],
                host=current_app.config['MILVUS_HOST'],
                port=current_app.config['MILVUS_PORT']
            )
            logger.info("向量数据库服务初始化成功")
        except Exception as e:
            logger.error(f"向量数据库服务初始化失败: {e}")
            raise


def validate_json_request(required_fields: list, field_validators: dict = None):
    """装饰器：验证JSON请求参数和类型"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            if not data:
                return jsonify({
                    'error': '请求体必须是有效的JSON',
                    'code': 'INVALID_JSON'
                }), 400
            
            # 验证必需字段存在
            for field in required_fields:
                if field not in data:
                    return jsonify({
                        'error': f'缺少必需参数: {field}',
                        'code': f'MISSING_{field.upper()}'
                    }), 400
            
            # 验证字段类型（如果提供了验证器）
            if field_validators:
                for field, validator in field_validators.items():
                    if field in data:
                        if isinstance(validator, type):
                            if not isinstance(data[field], validator):
                                return jsonify({
                                    'error': f'{field}参数类型错误，应为{validator.__name__}',
                                    'code': f'INVALID_{field.upper()}_TYPE'
                                }), 400
                        elif callable(validator):
                            try:
                                if not validator(data[field]):
                                    return jsonify({
                                        'error': f'{field}参数验证失败',
                                        'code': f'INVALID_{field.upper()}'
                                    }), 400
                            except Exception:
                                return jsonify({
                                    'error': f'{field}参数验证出错',
                                    'code': f'INVALID_{field.upper()}'
                                }), 400
            
            return f(data, *args, **kwargs)
        return decorated_function
    return decorator


def ensure_vector_db_initialized(f):
    """装饰器：确保向量数据库已初始化"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        global vector_db_service
        if vector_db_service is None:
            try:
                init_vector_database_service()
            except Exception as e:
                return jsonify({
                    'error': '向量数据库初始化失败',
                    'code': 'VECTOR_DB_INIT_FAILED',
                    'details': str(e)
                }), 500
        return f(*args, **kwargs)
    return decorated_function


def allowed_file(filename: str) -> bool:
    """检查文件扩展名是否允许"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@api_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'healthy',
        'service': 'image-search-api'
    })


# @api_bp.route('/search', methods=['POST'])
# def search_images():
#     """
#     图像搜索接口
    
#     接受表单数据：
#     - text: 查询文本
#     - images: 多个图片文件
#     - top_k: 返回前k张图片（可选，默认返回所有）
#     """
#     try:
#         # 检查是否有文本查询
#         text_query = request.form.get('text', '').strip()
#         if not text_query:
#             return jsonify({
#                 'error': '查询文本不能为空',
#                 'code': 'MISSING_TEXT_QUERY'
#             }), 400
        
#         # 检查是否有上传的文件
#         if 'images' not in request.files:
#             return jsonify({
#                 'error': '没有上传图片文件',
#                 'code': 'NO_FILES_UPLOADED'
#             }), 400
        
#         files = request.files.getlist('images')
#         if not files or all(f.filename == '' for f in files):
#             return jsonify({
#                 'error': '没有选择有效的图片文件',
#                 'code': 'NO_VALID_FILES'
#             }), 400
        
#         # 获取top_k参数
#         top_k = request.form.get('top_k')
#         if top_k:
#             try:
#                 top_k = int(top_k)
#                 if top_k <= 0:
#                     top_k = None
#             except ValueError:
#                 return jsonify({
#                     'error': 'top_k参数必须是正整数',
#                     'code': 'INVALID_TOP_K'
#                 }), 400
        
#         # 保存上传的文件
#         upload_folder = current_app.config['UPLOAD_FOLDER']
#         session_id = str(uuid.uuid4())
#         session_folder = os.path.join(upload_folder, session_id)
#         os.makedirs(session_folder, exist_ok=True)
        
#         image_paths = []
#         for file in files:
#             if file and file.filename != '' and allowed_file(file.filename):
#                 filename = secure_filename(file.filename)
#                 # 添加时间戳避免文件名冲突
#                 name, ext = os.path.splitext(filename)
#                 filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
#                 file_path = os.path.join(session_folder, filename)
#                 file.save(file_path)
#                 image_paths.append(file_path)
        
#         if not image_paths:
#             return jsonify({
#                 'error': '没有有效的图片文件被保存',
#                 'code': 'NO_VALID_IMAGES_SAVED'
#             }), 400
        
#         # 初始化服务（如果还没有初始化）
#         if search_service is None:
#             init_search_service()
        
#         # 执行搜索
#         results = search_service.search_images(text_query, image_paths, top_k)
        
#         # 清理临时文件
#         try:
#             for file_path in image_paths:
#                 if os.path.exists(file_path):
#                     os.remove(file_path)
#             os.rmdir(session_folder)
#         except Exception as e:
#             logger.warning(f"清理临时文件失败: {e}")
        
#         # 处理结果，移除绝对路径信息
#         processed_results = []
#         for result in results:
#             processed_results.append({
#                 'rank': result['rank'],
#                 'similarity': result['similarity'],
#                 'filename': os.path.basename(result['image_path'])
#             })
        
#         return jsonify({
#             'query': text_query,
#             'total_images': len(image_paths),
#             'results_count': len(processed_results),
#             'results': processed_results
#         })
    
#     except Exception as e:
#         logger.error(f"搜索过程中出现错误: {e}")
#         return jsonify({
#             'error': '内部服务器错误',
#             'code': 'INTERNAL_ERROR',
#             'details': str(e)
#         }), 500


# @api_bp.route('/search/url', methods=['POST'])
# def search_images_by_url():
#     """
#     通过URL搜索图像接口
    
#     接受JSON数据：
#     {
#         "text": "查询文本",
#         "image_urls": ["图片URL列表"],
#         "top_k": 5  // 可选
#     }
#     """
#     try:
#         data = request.get_json()
#         if not data:
#             return jsonify({
#                 'error': '请求体必须是有效的JSON',
#                 'code': 'INVALID_JSON'
#             }), 400
        
#         text_query = data.get('text', '').strip()
#         if not text_query:
#             return jsonify({
#                 'error': '查询文本不能为空',
#                 'code': 'MISSING_TEXT_QUERY'
#             }), 400
        
#         image_urls = data.get('image_urls', [])
#         if not image_urls or not isinstance(image_urls, list):
#             return jsonify({
#                 'error': 'image_urls必须是非空的URL列表',
#                 'code': 'INVALID_IMAGE_URLS'
#             }), 400
        
#         top_k = data.get('top_k')
#         if top_k is not None:
#             if not isinstance(top_k, int) or top_k <= 0:
#                 return jsonify({
#                     'error': 'top_k参数必须是正整数',
#                     'code': 'INVALID_TOP_K'
#                 }), 400
        
#         # 初始化服务（如果还没有初始化）
#         if search_service is None:
#             init_search_service()
        
#         # 执行搜索
#         results = search_service.search_images(text_query, image_urls, top_k)
        
#         return jsonify({
#             'query': text_query,
#             'total_images': len(image_urls),
#             'results_count': len(results),
#             'results': results
#         })
    
#     except Exception as e:
#         logger.error(f"URL搜索过程中出现错误: {e}")
#         return jsonify({
#             'error': '内部服务器错误',
#             'code': 'INTERNAL_ERROR',
#             'details': str(e)
#         }), 500


@api_bp.route('/search/resource', methods=['POST'])
@validate_json_request(['text'], {
    'text': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'top_k': lambda x: isinstance(x, int) and x > 0,
    'threshold': lambda x: isinstance(x, (int, float)) and 0 <= x <= 1
})
@ensure_vector_db_initialized
def search_resource_svgs(data: dict):
    """
    搜索向量数据库中的SVG图片接口
    
    接受JSON数据：
    {
        "text": "查询文本",
        "top_k": 5,  // 可选，返回前k张图片，默认10
        "threshold": 0.0  // 可选，相似度阈值（0-1之间），默认0.0
    }
    """
    try:
        text_query = data['text'].strip()
        k = data.get('top_k', 10)
        threshold = data.get('threshold', 0.0)
        
        logger.info(f"开始搜索向量数据库: 查询='{text_query}', top_k={k}, threshold={threshold}")
        
        # 使用向量数据库搜索
        search_results = vector_db_service.search_by_text(text_query, k)
        
        # 过滤结果基于阈值
        filtered_results = []
        if threshold > 0:
            filtered_results = [r for r in search_results if r['similarity'] >= threshold]
            logger.info(f"阈值筛选后保留 {len(filtered_results)} 个结果（阈值: {threshold}）")
        else:
            filtered_results = search_results
        
        # 处理结果格式，确保与原接口兼容
        processed_results = []
        for result in filtered_results:
            processed_results.append({
                'rank': result['rank'],
                'similarity': result['similarity'],
                'id': result['id'],
                'url': result['url'],
                'image_path': result['url'],  # 为了向后兼容，保留image_path字段
                'added_at': result.get('added_at'),
                'updated_at': result.get('updated_at')
            })
        
        logger.info(f"搜索完成: 查询='{text_query}', 返回 {len(processed_results)} 个结果")
        return jsonify({
            'success': True,
            'query': text_query,
            'top_k': k,
            'threshold': threshold,
            'results_count': len(processed_results),
            'results': processed_results
        })
    
    except Exception as e:
        logger.error(f"搜索向量数据库时出现错误: {e}")
        return jsonify({
            'error': '搜索失败',
            'code': 'SEARCH_ERROR',
            'details': str(e)
        }), 500


# ===================== 向量数据库相关接口 =====================


@api_bp.route('/vector/health', methods=['GET'])
def vector_db_health_check():
    """向量数据库健康检查接口"""
    return jsonify({
        'status': 'healthy',
        'service': 'spx-vector-database-api'
    })


@api_bp.route('/vector/stats', methods=['GET'])
@ensure_vector_db_initialized
def get_vector_db_stats():
    """获取向量数据库统计信息接口"""
    try:
        stats = vector_db_service.get_database_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        logger.error(f"获取向量数据库统计信息失败: {e}")
        return jsonify({
            'error': '获取统计信息失败',
            'code': 'GET_STATS_ERROR',
            'details': str(e)
        }), 500


@api_bp.route('/vector/add', methods=['POST'])
@validate_json_request(['id', 'url'], {
    'id': int,
    'url': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'svg_content': lambda x: x is None or (isinstance(x, str) and len(x.strip()) > 0)
})
@ensure_vector_db_initialized
def add_image_to_vector_db(data: dict):
    """
    添加SVG图片到向量数据库接口
    
    接受JSON数据：
    方式1 - 通过URL：
    {
        "id": 123,
        "url": "https://example.com/image.svg"
    }
    
    方式2 - 直接提供SVG内容（推荐）：
    {
        "id": 123,
        "url": "https://example.com/image.svg",
        "svg_content": "<svg>...</svg>"
    }
    """
    try:
        image_id = data['id']
        image_url = data['url'].strip()
        svg_content = data.get('svg_content')
        if svg_content:
            svg_content = svg_content.strip()
        
        # 添加图片到数据库
        if svg_content:
            logger.info(f"开始添加图片（使用SVG内容）: ID={image_id}, URL={image_url}")
            success = vector_db_service.add_image_with_svg(image_id, image_url, svg_content)
        else:
            logger.info(f"开始添加图片（从URL下载）: ID={image_id}, URL={image_url}")
            success = vector_db_service.add_image_by_url(image_id, image_url)
        
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
                'error': '添加图片失败，请检查URL是否有效',
                'code': 'ADD_IMAGE_FAILED',
                'id': image_id,
                'url': image_url
            }), 400
    
    except Exception as e:
        logger.error(f"添加图片到向量数据库接口错误: {e}")
        return jsonify({
            'error': '内部服务器错误',
            'code': 'INTERNAL_ERROR',
            'details': str(e)
        }), 500


@api_bp.route('/vector/data', methods=['GET'])
@ensure_vector_db_initialized
def get_vector_db_data():
    """
    读取向量数据库中的所有图片信息
    
    可选查询参数：
    - include_vectors: 是否包含向量数据 (true/false，默认false)
    - limit: 限制返回数量
    - offset: 偏移量
    """
    try:
        # 获取查询参数
        include_vectors = request.args.get('include_vectors', 'false').lower() == 'true'
        limit = request.args.get('limit')
        offset = request.args.get('offset', 0)
        
        # 验证参数
        try:
            if limit is not None:
                limit = int(limit)
                if limit <= 0:
                    return jsonify({
                        'error': 'limit参数必须是正整数',
                        'code': 'INVALID_LIMIT'
                    }), 400
            
            offset = int(offset)
            if offset < 0:
                return jsonify({
                    'error': 'offset参数必须是非负整数',
                    'code': 'INVALID_OFFSET'
                }), 400
                
        except ValueError:
            return jsonify({
                'error': 'limit和offset参数必须是整数',
                'code': 'INVALID_PAGINATION_PARAMS'
            }), 400
        
        # 获取所有数据
        all_data = vector_db_service.get_all_data()
        
        # 应用分页
        if offset > 0:
            all_data = all_data[offset:]
        if limit is not None:
            all_data = all_data[:limit]
        
        # 处理向量数据
        if not include_vectors:
            # 移除向量数据以减少传输大小
            for item in all_data:
                if 'vector' in item:
                    del item['vector']
        
        # 计算总数
        total_count = len(vector_db_service.get_all_data())
        
        return jsonify({
            'success': True,
            'total_count': total_count,
            'returned_count': len(all_data),
            'offset': offset,
            'limit': limit,
            'include_vectors': include_vectors,
            'data': all_data
        })
    
    except Exception as e:
        logger.error(f"获取向量数据库数据失败: {e}")
        return jsonify({
            'error': '获取数据失败',
            'code': 'GET_DATA_ERROR',
            'details': str(e)
        }), 500


@api_bp.route('/vector/search', methods=['POST'])
@validate_json_request(['text'], {
    'text': lambda x: isinstance(x, str) and len(x.strip()) > 0,
    'k': lambda x: isinstance(x, int) and x > 0
})
@ensure_vector_db_initialized
def search_vector_db_by_text(data: dict):
    """
    向量数据库文本搜索接口
    
    接受JSON数据：
    {
        "text": "search query",
        "k": 10
    }
    """
    try:
        query_text = data['text'].strip()
        k = data.get('k', 10)
        
        # 验证参数
        if not isinstance(k, int) or k <= 0:
            return jsonify({
                'error': 'k参数必须是正整数',
                'code': 'INVALID_K'
            }), 400
        
        # 执行搜索
        results = vector_db_service.search_by_text(query_text, k)
        
        return jsonify({
            'success': True,
            'query': query_text,
            'k': k,
            'results_count': len(results),
            'results': results
        })
    
    except Exception as e:
        logger.error(f"向量数据库文本搜索失败: {e}")
        return jsonify({
            'error': '搜索失败',
            'code': 'SEARCH_ERROR',
            'details': str(e)
        }), 500


@api_bp.route('/vector/delete', methods=['DELETE'])
@validate_json_request(['id'], {'id': int})
@ensure_vector_db_initialized
def delete_from_vector_db(data: dict):
    """
    从向量数据库删除图片记录接口
    
    接受JSON数据：
    {
        "id": 123
    }
    """
    try:
        image_id = data['id']
        
        # 删除图片
        success = vector_db_service.remove_by_id(image_id)
        
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
        logger.error(f"从向量数据库删除图片失败: {e}")
        return jsonify({
            'error': '删除操作失败',
            'code': 'DELETE_ERROR',
            'details': str(e)
        }), 500


@api_bp.route('/vector/batch/add', methods=['POST'])
@ensure_vector_db_initialized
def batch_add_to_vector_db():
    """
    批量添加图片到向量数据库接口
    
    接受JSON数据：
    方式1 - 通过URL：
    {
        "images": [
            {"id": 1, "url": "https://example.com/image1.svg"},
            {"id": 2, "url": "https://example.com/image2.svg"}
        ]
    }
    
    方式2 - 直接提供SVG内容（推荐）：
    {
        "images": [
            {"id": 1, "url": "https://example.com/image1.svg", "svg_content": "<svg>...</svg>"},
            {"id": 2, "url": "https://example.com/image2.svg", "svg_content": "<svg>...</svg>"}
        ]
    }
    """ 
    try:
        # 检查请求数据
        data = request.get_json()
        if not data or 'images' not in data:
            return jsonify({
                'error': '请求体必须包含images数组',
                'code': 'MISSING_IMAGES_ARRAY'
            }), 400
        
        images = data['images']
        if not isinstance(images, list):
            return jsonify({
                'error': 'images必须是数组',
                'code': 'INVALID_IMAGES_ARRAY'
            }), 400
        
        results = []
        success_count = 0
        
        for i, img_data in enumerate(images):
            try:
                if not isinstance(img_data, dict) or 'id' not in img_data or 'url' not in img_data:
                    results.append({
                        'index': i,
                        'success': False,
                        'error': '缺少id或url字段',
                        'data': img_data
                    })
                    continue
                
                image_id = img_data['id']
                image_url = img_data['url']
                svg_content = img_data.get('svg_content')
                
                # 验证数据类型
                if not isinstance(image_id, int) or not isinstance(image_url, str):
                    results.append({
                        'index': i,
                        'success': False,
                        'error': 'id必须是整数，url必须是字符串',
                        'data': img_data
                    })
                    continue
                
                # 验证SVG内容（如果提供）
                if svg_content is not None and (not isinstance(svg_content, str) or not svg_content.strip()):
                    results.append({
                        'index': i,
                        'success': False,
                        'error': 'svg_content必须是非空字符串',
                        'data': img_data
                    })
                    continue
                
                # 添加图片
                if svg_content:
                    success = vector_db_service.add_image_with_svg(image_id, image_url, svg_content.strip())
                else:
                    success = vector_db_service.add_image_by_url(image_id, image_url)
                
                if success:
                    success_count += 1
                    results.append({
                        'index': i,
                        'success': True,
                        'id': image_id,
                        'url': image_url
                    })
                else:
                    results.append({
                        'index': i,
                        'success': False,
                        'error': '添加图片失败',
                        'data': img_data
                    })
                    
            except Exception as e:
                results.append({
                    'index': i,
                    'success': False,
                    'error': str(e),
                    'data': img_data
                })
        
        return jsonify({
            'success': True,
            'total': len(images),
            'success_count': success_count,
            'failed_count': len(images) - success_count,
            'results': results
        })
    
    except Exception as e:
        logger.error(f"批量添加到向量数据库失败: {e}")
        return jsonify({
            'error': '批量添加失败',
            'code': 'BATCH_ADD_ERROR',
            'details': str(e)
        }), 500