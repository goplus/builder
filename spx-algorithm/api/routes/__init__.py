"""
API路由模块
"""

from .search_routes import search_bp, init_orchestrator as init_search_orchestrator
from .vector_routes import vector_bp, init_orchestrator as init_vector_orchestrator
from .health_routes import health_bp

__all__ = [
    'search_bp', 'vector_bp', 'health_bp',
    'init_search_orchestrator', 'init_vector_orchestrator'
]


def init_all_orchestrators(config: dict):
    """初始化所有编排器"""
    init_search_orchestrator(config)
    init_vector_orchestrator(config)