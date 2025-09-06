"""
开发环境配置
"""

from .base import BaseConfig
from dataclasses import dataclass


@dataclass
class DevelopmentConfig(BaseConfig):
    """开发环境配置"""
    
    DEBUG: bool = True
    TESTING: bool = False
    
    # 开发环境特定配置
    JSONIFY_PRETTYPRINT_REGULAR: bool = True
    
    # 可以在这里覆盖其他配置
    # 例如使用本地Milvus实例
    # MILVUS_HOST: str = 'localhost'
    # MILVUS_PORT: str = '19530'