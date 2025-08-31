"""
生产环境配置
"""

import os
from .base import BaseConfig
from dataclasses import dataclass


@dataclass 
class ProductionConfig(BaseConfig):
    """生产环境配置"""
    
    DEBUG: bool = False
    TESTING: bool = False
    
    # 生产环境特定配置
    JSONIFY_PRETTYPRINT_REGULAR: bool = False
    
    # 生产环境建议的安全配置
    SECRET_KEY: str = os.environ.get('SECRET_KEY', 'CHANGE_THIS_IN_PRODUCTION')
    
    # 生产环境可能需要的其他配置
    # 例如使用远程Milvus集群
    # MILVUS_HOST: str = field(default_factory=lambda: os.environ.get('MILVUS_HOST', 'milvus-cluster'))
    # MILVUS_PORT: str = field(default_factory=lambda: os.environ.get('MILVUS_PORT', '19530'))