"""
API路由模块
"""

from .resource_routes import resource_bp, init_coordinator as init_resource_coordinator
from .internal_routes import internal_bp, init_coordinator as init_internal_coordinator
from .health_routes import health_bp
from .feedback_routes import feedback_bp, init_feedback_routes

__all__ = [
    'resource_bp', 'internal_bp', 'health_bp', 'feedback_bp',
    'init_resource_coordinator', 'init_internal_coordinator', 'init_feedback_routes'
]


def init_all_coordinators(config: dict):
    """初始化所有协调器"""
    # 初始化搜索协调器
    init_resource_coordinator(config)
    init_internal_coordinator(config)
    
    # 从协调器获取重排序服务并初始化反馈路由
    from .resource_routes import coordinator
    if coordinator and coordinator.rerank_service:
        init_feedback_routes(coordinator.rerank_service)
    else:
        import logging
        logging.getLogger(__name__).warning("重排序服务未找到，反馈API将不可用")