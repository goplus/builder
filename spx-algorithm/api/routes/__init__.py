"""
API路由模块
"""

from .resource_routes import resource_bp, init_orchestrator as init_resource_orchestrator
from .internal_routes import internal_bp, init_orchestrator as init_internal_orchestrator
from .health_routes import health_bp

__all__ = [
    'resource_bp', 'internal_bp', 'health_bp',
    'init_resource_orchestrator', 'init_internal_orchestrator'
]


def init_all_orchestrators(config: dict):
    """初始化所有编排器"""
    init_resource_orchestrator(config)
    init_internal_orchestrator(config)