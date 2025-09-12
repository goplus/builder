"""
用户反馈收集API路由
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from typing import Dict, Any

from database.user_feedback.models import UserFeedback
from services.reranking.rerank_service import RerankService

logger = logging.getLogger(__name__)

# 创建蓝图
feedback_bp = Blueprint('feedback', __name__, url_prefix='/v1/feedback')

# 全局重排序服务实例（将在应用初始化时设置）
rerank_service: RerankService = None


def init_feedback_routes(rerank_service_instance: RerankService):
    """
    初始化反馈路由，设置重排序服务实例
    
    Args:
        rerank_service_instance: 重排序服务实例
    """
    global rerank_service
    rerank_service = rerank_service_instance
    logger.info("用户反馈路由初始化完成")


@feedback_bp.route('/submit', methods=['POST'])
def submit_feedback():
    """
    提交用户反馈
    
    POST /v1/feedback/submit
    Content-Type: application/json
    
    {
        "query_id": 123,
        "query": "dog running in park",
        "recommended_pics": [1001, 1002, 1003, 1004],
        "chosen_pic": 1002
    }
    """
    try:
        if rerank_service is None:
            return jsonify({
                'success': False,
                'error': '重排序服务未初始化'
            }), 500
        
        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '请求体不能为空'
            }), 400
        
        # 验证必需字段
        required_fields = ['query_id', 'query', 'recommended_pics', 'chosen_pic']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'缺少必需字段: {missing_fields}'
            }), 400
        
        # 验证推荐图片数量
        recommended_pics = data.get('recommended_pics', [])
        if len(recommended_pics) != 4:
            return jsonify({
                'success': False,
                'error': '推荐图片必须包含4张图片'
            }), 400
        
        # 验证选择的图片在推荐列表中
        chosen_pic = data.get('chosen_pic')
        if chosen_pic not in recommended_pics:
            return jsonify({
                'success': False,
                'error': '选择的图片不在推荐列表中'
            }), 400
        
        # 构造用户反馈对象
        feedback = UserFeedback(
            id=int(data['query_id']),
            query=str(data['query']).strip(),
            pic_id_1=int(recommended_pics[0]),
            pic_id_2=int(recommended_pics[1]),
            pic_id_3=int(recommended_pics[2]),
            pic_id_4=int(recommended_pics[3]),
            choose_id=int(chosen_pic),
            date=datetime.now()
        )
        
        # 验证反馈数据
        if not feedback.is_valid():
            return jsonify({
                'success': False,
                'error': '反馈数据验证失败'
            }), 400
        
        # 保存反馈
        success = rerank_service.save_user_feedback(feedback)
        
        if success:
            logger.info(f"用户反馈保存成功: query_id={feedback.id}, query='{feedback.query}', chosen={chosen_pic}")
            return jsonify({
                'success': True,
                'message': '用户反馈提交成功',
                'query_id': feedback.id
            })
        else:
            logger.error(f"用户反馈保存失败: query_id={feedback.id}")
            return jsonify({
                'success': False,
                'error': '反馈保存失败'
            }), 500
            
    except ValueError as e:
        logger.error(f"反馈数据格式错误: {e}")
        return jsonify({
            'success': False,
            'error': f'数据格式错误: {str(e)}'
        }), 400
        
    except Exception as e:
        logger.error(f"提交用户反馈异常: {e}")
        return jsonify({
            'success': False,
            'error': '服务器内部错误'
        }), 500


@feedback_bp.route('/stats', methods=['GET'])
def get_feedback_stats():
    """
    获取反馈统计信息
    
    GET /v1/feedback/stats
    """
    try:
        if rerank_service is None:
            return jsonify({
                'success': False,
                'error': '重排序服务未初始化'
            }), 500
        
        stats = rerank_service.feedback_storage.get_stats()
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"获取反馈统计信息异常: {e}")
        return jsonify({
            'success': False,
            'error': '获取统计信息失败'
        }), 500


@feedback_bp.route('/recent', methods=['GET'])
def get_recent_feedback():
    """
    获取最近的反馈数据
    
    GET /v1/feedback/recent?limit=10
    """
    try:
        if rerank_service is None:
            return jsonify({
                'success': False,
                'error': '重排序服务未初始化'
            }), 500
        
        # 获取查询参数
        limit = request.args.get('limit', 10, type=int)
        limit = min(limit, 100)  # 限制最大数量
        
        # 获取最近的反馈数据
        feedback_list = rerank_service.feedback_storage.get_all_feedback(limit=limit)
        
        # 转换为字典格式
        feedback_data = []
        for feedback in feedback_list:
            feedback_data.append({
                'query_id': feedback.id,
                'query': feedback.query,
                'recommended_pics': feedback.get_recommended_pics(),
                'chosen_pic': feedback.choose_id,
                'date': feedback.date.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return jsonify({
            'success': True,
            'count': len(feedback_data),
            'feedback': feedback_data
        })
        
    except Exception as e:
        logger.error(f"获取最近反馈数据异常: {e}")
        return jsonify({
            'success': False,
            'error': '获取反馈数据失败'
        }), 500


@feedback_bp.route('/train', methods=['POST'])
def train_ltr_model():
    """
    使用反馈数据训练LTR模型
    
    POST /v1/feedback/train
    Content-Type: application/json
    
    {
        "limit": 1000  // 可选，限制使用的反馈数据量
    }
    """
    try:
        if rerank_service is None:
            return jsonify({
                'success': False,
                'error': '重排序服务未初始化'
            }), 500
        
        # 获取请求参数
        data = request.get_json() or {}
        limit = data.get('limit', None)
        
        if limit is not None:
            limit = int(limit)
            if limit <= 0:
                return jsonify({
                    'success': False,
                    'error': '数据量限制必须大于0'
                }), 400
        
        logger.info(f"开始训练LTR模型，数据量限制: {limit}")
        
        # 训练模型
        training_result = rerank_service.train_model_with_feedback(limit=limit)
        
        if training_result.get('success', True):
            logger.info("LTR模型训练成功")
            return jsonify({
                'success': True,
                'message': 'LTR模型训练完成',
                'training_result': training_result
            })
        else:
            logger.error(f"LTR模型训练失败: {training_result.get('error')}")
            return jsonify({
                'success': False,
                'error': training_result.get('error', '训练失败'),
                'details': training_result
            }), 500
            
    except ValueError as e:
        logger.error(f"训练参数错误: {e}")
        return jsonify({
            'success': False,
            'error': f'参数错误: {str(e)}'
        }), 400
        
    except Exception as e:
        logger.error(f"训练LTR模型异常: {e}")
        return jsonify({
            'success': False,
            'error': '模型训练失败'
        }), 500


@feedback_bp.route('/model/status', methods=['GET'])
def get_model_status():
    """
    获取LTR模型状态
    
    GET /v1/feedback/model/status
    """
    try:
        if rerank_service is None:
            return jsonify({
                'success': False,
                'error': '重排序服务未初始化'
            }), 500
        
        status = rerank_service.get_service_status()
        performance = rerank_service.get_model_performance()
        
        return jsonify({
            'success': True,
            'service_status': status,
            'model_performance': performance
        })
        
    except Exception as e:
        logger.error(f"获取模型状态异常: {e}")
        return jsonify({
            'success': False,
            'error': '获取模型状态失败'
        }), 500


@feedback_bp.route('/model/enable', methods=['POST'])
def enable_reranking():
    """
    启用重排序功能
    
    POST /v1/feedback/model/enable
    """
    try:
        if rerank_service is None:
            return jsonify({
                'success': False,
                'error': '重排序服务未初始化'
            }), 500
        
        rerank_service.enable_reranking()
        
        return jsonify({
            'success': True,
            'message': '重排序功能已启用',
            'enabled': rerank_service.is_enabled()
        })
        
    except Exception as e:
        logger.error(f"启用重排序功能异常: {e}")
        return jsonify({
            'success': False,
            'error': '启用重排序功能失败'
        }), 500


@feedback_bp.route('/model/disable', methods=['POST'])
def disable_reranking():
    """
    禁用重排序功能
    
    POST /v1/feedback/model/disable
    """
    try:
        if rerank_service is None:
            return jsonify({
                'success': False,
                'error': '重排序服务未初始化'
            }), 500
        
        rerank_service.disable_reranking()
        
        return jsonify({
            'success': True,
            'message': '重排序功能已禁用',
            'enabled': rerank_service.is_enabled()
        })
        
    except Exception as e:
        logger.error(f"禁用重排序功能异常: {e}")
        return jsonify({
            'success': False,
            'error': '禁用重排序功能失败'
        }), 500