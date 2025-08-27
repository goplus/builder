import logging
from typing import Dict, Any, List
from flask import Blueprint, request, jsonify
from cloud_vector_database import CloudVectorDatabase

logger = logging.getLogger(__name__)

# 创建Blueprint
cloud_vector_bp = Blueprint('cloud_vector', __name__, url_prefix='/api/vector')

# 全局数据库实例
vector_db = None


def init_cloud_vector_db(db_path: str = 'cloud_vector_db'):
    """初始化云端向量数据库"""
    global vector_db
    if vector_db is None:
        try:
            vector_db = CloudVectorDatabase(db_path=db_path)
            logger.info(f"云端向量数据库初始化成功: {db_path}")
        except Exception as e:
            logger.error(f"云端向量数据库初始化失败: {e}")
            raise


@cloud_vector_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'healthy',
        'service': 'cloud-vector-database-api'
    })


@cloud_vector_bp.route('/stats', methods=['GET'])
def get_stats():
    """获取数据库统计信息接口"""
    try:
        if vector_db is None:
            return jsonify({
                'error': '数据库未初始化',
                'code': 'DATABASE_NOT_INITIALIZED'
            }), 500
        
        stats = vector_db.get_database_stats()
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


@cloud_vector_bp.route('/add', methods=['POST'])
def add_image_by_url():
    """
    增量式写入接口：根据URL添加SVG图片到向量数据库
    
    接受JSON数据：
    {
        "id": 123,
        "url": "https://example.com/image.svg"
    }
    """
    try:
        if vector_db is None:
            init_cloud_vector_db()
        
        # 检查请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                'error': '请求体必须是有效的JSON',
                'code': 'INVALID_JSON'
            }), 400
        
        # 验证必需参数
        if 'id' not in data:
            return jsonify({
                'error': '缺少必需参数: id',
                'code': 'MISSING_ID'
            }), 400
        
        if 'url' not in data:
            return jsonify({
                'error': '缺少必需参数: url',
                'code': 'MISSING_URL'
            }), 400
        
        image_id = data['id']
        image_url = data['url']
        
        # 验证参数类型
        if not isinstance(image_id, int):
            return jsonify({
                'error': 'id参数必须是整数',
                'code': 'INVALID_ID_TYPE'
            }), 400
        
        if not isinstance(image_url, str) or not image_url.strip():
            return jsonify({
                'error': 'url参数必须是非空字符串',
                'code': 'INVALID_URL_TYPE'
            }), 400
        
        # 添加图片到数据库
        logger.info(f"开始添加图片: ID={image_id}, URL={image_url}")
        success = vector_db.add_image_by_url(image_id, image_url.strip())
        
        if success:
            return jsonify({
                'success': True,
                'message': '图片成功添加到向量数据库',
                'id': image_id,
                'url': image_url.strip()
            })
        else:
            return jsonify({
                'success': False,
                'error': '添加图片失败，请检查URL是否有效',
                'code': 'ADD_IMAGE_FAILED',
                'id': image_id,
                'url': image_url.strip()
            }), 400
    
    except Exception as e:
        logger.error(f"添加图片接口错误: {e}")
        return jsonify({
            'error': '内部服务器错误',
            'code': 'INTERNAL_ERROR',
            'details': str(e)
        }), 500


@cloud_vector_bp.route('/data', methods=['GET'])
def get_all_data():
    """
    读取所有数据接口：返回数据库中的所有图片信息
    
    可选查询参数：
    - include_vectors: 是否包含向量数据 (true/false，默认false)
    - limit: 限制返回数量
    - offset: 偏移量
    """
    try:
        if vector_db is None:
            return jsonify({
                'error': '数据库未初始化',
                'code': 'DATABASE_NOT_INITIALIZED'
            }), 500
        
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
        all_data = vector_db.get_all_data()
        
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
        total_count = len(vector_db.get_all_data())
        
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
        logger.error(f"获取所有数据失败: {e}")
        return jsonify({
            'error': '获取数据失败',
            'code': 'GET_DATA_ERROR',
            'details': str(e)
        }), 500


@cloud_vector_bp.route('/search', methods=['POST'])
def search_by_text():
    """
    文本搜索接口：通过文本搜索相似图片
    
    接受JSON数据：
    {
        "text": "search query",
        "k": 10
    }
    """
    try:
        if vector_db is None:
            return jsonify({
                'error': '数据库未初始化',
                'code': 'DATABASE_NOT_INITIALIZED'
            }), 500
        
        # 检查请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                'error': '请求体必须是有效的JSON',
                'code': 'INVALID_JSON'
            }), 400
        
        # 验证必需参数
        if 'text' not in data:
            return jsonify({
                'error': '缺少必需参数: text',
                'code': 'MISSING_TEXT'
            }), 400
        
        query_text = data['text']
        k = data.get('k', 10)
        
        # 验证参数
        if not isinstance(query_text, str) or not query_text.strip():
            return jsonify({
                'error': 'text参数必须是非空字符串',
                'code': 'INVALID_TEXT'
            }), 400
        
        if not isinstance(k, int) or k <= 0:
            return jsonify({
                'error': 'k参数必须是正整数',
                'code': 'INVALID_K'
            }), 400
        
        # 执行搜索
        results = vector_db.search_by_text(query_text.strip(), k)
        
        return jsonify({
            'success': True,
            'query': query_text.strip(),
            'k': k,
            'results_count': len(results),
            'results': results
        })
    
    except Exception as e:
        logger.error(f"文本搜索失败: {e}")
        return jsonify({
            'error': '搜索失败',
            'code': 'SEARCH_ERROR',
            'details': str(e)
        }), 500


@cloud_vector_bp.route('/delete', methods=['DELETE'])
def delete_by_id():
    """
    删除接口：根据ID删除图片记录
    
    接受JSON数据：
    {
        "id": 123
    }
    """
    try:
        if vector_db is None:
            return jsonify({
                'error': '数据库未初始化',
                'code': 'DATABASE_NOT_INITIALIZED'
            }), 500
        
        # 检查请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                'error': '请求体必须是有效的JSON',
                'code': 'INVALID_JSON'
            }), 400
        
        # 验证必需参数
        if 'id' not in data:
            return jsonify({
                'error': '缺少必需参数: id',
                'code': 'MISSING_ID'
            }), 400
        
        image_id = data['id']
        
        # 验证参数类型
        if not isinstance(image_id, int):
            return jsonify({
                'error': 'id参数必须是整数',
                'code': 'INVALID_ID_TYPE'
            }), 400
        
        # 删除图片
        success = vector_db.remove_by_id(image_id)
        
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
        logger.error(f"删除图片失败: {e}")
        return jsonify({
            'error': '删除操作失败',
            'code': 'DELETE_ERROR',
            'details': str(e)
        }), 500


# 批量操作接口
@cloud_vector_bp.route('/batch/add', methods=['POST'])
def batch_add_images():
    """
    批量添加接口：批量添加多个图片
    
    接受JSON数据：
    {
        "images": [
            {"id": 1, "url": "https://example.com/image1.svg"},
            {"id": 2, "url": "https://example.com/image2.svg"}
        ]
    }
    """
    try:
        if vector_db is None:
            init_cloud_vector_db()
        
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
                
                # 验证数据类型
                if not isinstance(image_id, int) or not isinstance(image_url, str):
                    results.append({
                        'index': i,
                        'success': False,
                        'error': 'id必须是整数，url必须是字符串',
                        'data': img_data
                    })
                    continue
                
                # 添加图片
                success = vector_db.add_image_by_url(image_id, image_url)
                
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
        logger.error(f"批量添加失败: {e}")
        return jsonify({
            'error': '批量添加失败',
            'code': 'BATCH_ADD_ERROR',
            'details': str(e)
        }), 500


if __name__ == "__main__":
    # 测试API
    from flask import Flask
    
    app = Flask(__name__)
    app.register_blueprint(cloud_vector_bp)
    
    # 设置日志
    logging.basicConfig(level=logging.INFO)
    
    print("云端向量数据库API服务器启动...")
    print("可用接口:")
    print("  GET  /api/vector/health - 健康检查")
    print("  GET  /api/vector/stats - 获取统计信息")
    print("  POST /api/vector/add - 添加图片")
    print("  GET  /api/vector/data - 获取所有数据")
    print("  POST /api/vector/search - 文本搜索")
    print("  DELETE /api/vector/delete - 删除图片")
    print("  POST /api/vector/batch/add - 批量添加图片")
    
    app.run(host='0.0.0.0', port=5001, debug=True)