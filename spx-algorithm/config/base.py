"""
基础配置模块
"""

import os
from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class BaseConfig:
    """基础配置类"""
    
    # Flask应用配置
    DEBUG: bool = False
    TESTING: bool = False
    SECRET_KEY: str = field(default_factory=lambda: os.environ.get('SECRET_KEY', 'spx-algorithm-secret-key'))
    
    # CLIP模型配置
    CLIP_MODEL_NAME: str = field(default_factory=lambda: os.environ.get('CLIP_MODEL_NAME', 'ViT-B-32'))
    CLIP_PRETRAINED: str = field(default_factory=lambda: os.environ.get('CLIP_PRETRAINED', 'laion2b_s34b_b79k'))
    
    # Milvus配置
    MILVUS_HOST: str = field(default_factory=lambda: os.environ.get('MILVUS_HOST', 'localhost'))
    MILVUS_PORT: str = field(default_factory=lambda: os.environ.get('MILVUS_PORT', '19530'))
    MILVUS_COLLECTION_NAME: str = field(default_factory=lambda: os.environ.get('MILVUS_COLLECTION_NAME', 'spx_vector_collection'))
    MILVUS_DIMENSION: int = field(default_factory=lambda: int(os.environ.get('MILVUS_DIMENSION', '512')))
    
    # 服务功能配置
    ENABLE_RERANKING: bool = field(default_factory=lambda: os.environ.get('ENABLE_RERANKING', 'false').lower() == 'true')
    LTR_MODEL_PATH: str = field(default_factory=lambda: os.environ.get('LTR_MODEL_PATH', ''))
    
    # Flask配置
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16MB
    JSON_AS_ASCII: bool = False
    JSONIFY_PRETTYPRINT_REGULAR: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'DEBUG': self.DEBUG,
            'TESTING': self.TESTING,
            'SECRET_KEY': self.SECRET_KEY,
            'CLIP_MODEL_NAME': self.CLIP_MODEL_NAME,
            'CLIP_PRETRAINED': self.CLIP_PRETRAINED,
            'MILVUS_HOST': self.MILVUS_HOST,
            'MILVUS_PORT': self.MILVUS_PORT,
            'MILVUS_COLLECTION_NAME': self.MILVUS_COLLECTION_NAME,
            'MILVUS_DIMENSION': self.MILVUS_DIMENSION,
            'ENABLE_RERANKING': self.ENABLE_RERANKING,
            'LTR_MODEL_PATH': self.LTR_MODEL_PATH,
            'MAX_CONTENT_LENGTH': self.MAX_CONTENT_LENGTH,
            'JSON_AS_ASCII': self.JSON_AS_ASCII,
            'JSONIFY_PRETTYPRINT_REGULAR': self.JSONIFY_PRETTYPRINT_REGULAR
        }
    
    def get_coordinator_config(self) -> Dict[str, Any]:
        """获取协调器配置"""
        return {
            'image_matching': {
                'model_name': self.CLIP_MODEL_NAME,
                'pretrained': self.CLIP_PRETRAINED,
                'collection_name': self.MILVUS_COLLECTION_NAME,
                'dimension': self.MILVUS_DIMENSION,
                'milvus_host': self.MILVUS_HOST,
                'milvus_port': self.MILVUS_PORT
            },
            'reranking': {
                'enabled': self.ENABLE_RERANKING,
                'model_path': self.LTR_MODEL_PATH if self.LTR_MODEL_PATH else None
            }
        }