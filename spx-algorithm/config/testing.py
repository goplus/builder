"""
测试环境配置
"""

from .base import BaseConfig
from dataclasses import dataclass


@dataclass
class TestingConfig(BaseConfig):
    """测试环境配置"""
    
    DEBUG: bool = True
    TESTING: bool = True
    
    # 测试环境特定配置
    SECRET_KEY: str = 'testing-secret-key'
    
    # 测试环境使用内存数据库或测试专用实例
    MILVUS_COLLECTION_NAME: str = 'test_spx_vector_collection'
    
    # 可能需要的其他测试配置
    # 例如使用测试专用的Milvus实例
    # MILVUS_HOST: str = 'localhost'
    # MILVUS_PORT: str = '19531'  # 使用不同端口避免冲突