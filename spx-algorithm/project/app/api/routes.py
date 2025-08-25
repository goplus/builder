import logging
import os
import uuid

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from ..services.image_search_service import ImageSearchService

logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')

# 全局服务实例
search_service = None


def init_search_service(model_name: str = 'ViT-B-32', pretrained: str = 'laion2b_s34b_b79k'):
    """初始化搜索服务"""
    global search_service
    if search_service is None:
        search_service = ImageSearchService(model_name, pretrained)


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


@api_bp.route('/search', methods=['POST'])
def search_images():
    """
    图像搜索接口
    
    接受表单数据：
    - text: 查询文本
    - images: 多个图片文件
    - top_k: 返回前k张图片（可选，默认返回所有）
    """
    try:
        # 检查是否有文本查询
        text_query = request.form.get('text', '').strip()
        if not text_query:
            return jsonify({
                'error': '查询文本不能为空',
                'code': 'MISSING_TEXT_QUERY'
            }), 400
        
        # 检查是否有上传的文件
        if 'images' not in request.files:
            return jsonify({
                'error': '没有上传图片文件',
                'code': 'NO_FILES_UPLOADED'
            }), 400
        
        files = request.files.getlist('images')
        if not files or all(f.filename == '' for f in files):
            return jsonify({
                'error': '没有选择有效的图片文件',
                'code': 'NO_VALID_FILES'
            }), 400
        
        # 获取top_k参数
        top_k = request.form.get('top_k')
        if top_k:
            try:
                top_k = int(top_k)
                if top_k <= 0:
                    top_k = None
            except ValueError:
                return jsonify({
                    'error': 'top_k参数必须是正整数',
                    'code': 'INVALID_TOP_K'
                }), 400
        
        # 保存上传的文件
        upload_folder = current_app.config['UPLOAD_FOLDER']
        session_id = str(uuid.uuid4())
        session_folder = os.path.join(upload_folder, session_id)
        os.makedirs(session_folder, exist_ok=True)
        
        image_paths = []
        for file in files:
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # 添加时间戳避免文件名冲突
                name, ext = os.path.splitext(filename)
                filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
                file_path = os.path.join(session_folder, filename)
                file.save(file_path)
                image_paths.append(file_path)
        
        if not image_paths:
            return jsonify({
                'error': '没有有效的图片文件被保存',
                'code': 'NO_VALID_IMAGES_SAVED'
            }), 400
        
        # 初始化服务（如果还没有初始化）
        if search_service is None:
            init_search_service()
        
        # 执行搜索
        results = search_service.search_images(text_query, image_paths, top_k)
        
        # 清理临时文件
        try:
            for file_path in image_paths:
                if os.path.exists(file_path):
                    os.remove(file_path)
            os.rmdir(session_folder)
        except Exception as e:
            logger.warning(f"清理临时文件失败: {e}")
        
        # 处理结果，移除绝对路径信息
        processed_results = []
        for result in results:
            processed_results.append({
                'rank': result['rank'],
                'similarity': result['similarity'],
                'filename': os.path.basename(result['image_path'])
            })
        
        return jsonify({
            'query': text_query,
            'total_images': len(image_paths),
            'results_count': len(processed_results),
            'results': processed_results
        })
    
    except Exception as e:
        logger.error(f"搜索过程中出现错误: {e}")
        return jsonify({
            'error': '内部服务器错误',
            'code': 'INTERNAL_ERROR',
            'details': str(e)
        }), 500


@api_bp.route('/search/url', methods=['POST'])
def search_images_by_url():
    """
    通过URL搜索图像接口
    
    接受JSON数据：
    {
        "text": "查询文本",
        "image_urls": ["图片URL列表"],
        "top_k": 5  // 可选
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': '请求体必须是有效的JSON',
                'code': 'INVALID_JSON'
            }), 400
        
        text_query = data.get('text', '').strip()
        if not text_query:
            return jsonify({
                'error': '查询文本不能为空',
                'code': 'MISSING_TEXT_QUERY'
            }), 400
        
        image_urls = data.get('image_urls', [])
        if not image_urls or not isinstance(image_urls, list):
            return jsonify({
                'error': 'image_urls必须是非空的URL列表',
                'code': 'INVALID_IMAGE_URLS'
            }), 400
        
        top_k = data.get('top_k')
        if top_k is not None:
            if not isinstance(top_k, int) or top_k <= 0:
                return jsonify({
                    'error': 'top_k参数必须是正整数',
                    'code': 'INVALID_TOP_K'
                }), 400
        
        # 初始化服务（如果还没有初始化）
        if search_service is None:
            init_search_service()
        
        # 执行搜索
        results = search_service.search_images(text_query, image_urls, top_k)
        
        return jsonify({
            'query': text_query,
            'total_images': len(image_urls),
            'results_count': len(results),
            'results': results
        })
    
    except Exception as e:
        logger.error(f"URL搜索过程中出现错误: {e}")
        return jsonify({
            'error': '内部服务器错误',
            'code': 'INTERNAL_ERROR',
            'details': str(e)
        }), 500