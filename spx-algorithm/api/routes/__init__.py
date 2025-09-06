"""
API路由模块
"""

from .resource_routes import resource_bp, init_coordinator as init_resource_coordinator
from .internal_routes import internal_bp, init_coordinator as init_internal_coordinator
from .health_routes import health_bp

__all__ = [
    'resource_bp', 'internal_bp', 'health_bp',
    'init_resource_coordinator', 'init_internal_coordinator'
]


def init_all_coordinators(config: dict):
    """初始化所有协调器"""
    init_resource_coordinator(config)
    init_internal_coordinator(config)