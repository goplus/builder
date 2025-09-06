"""
Milvus数据库配置模块
"""

import os
from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class MilvusConfig:
    """Milvus配置类"""
    
    host: str = 'localhost'
    port: str = '19530'
    alias: str = 'default'
    collection_name: str = 'spx_vector_collection'
    dimension: int = 512
    
    # 索引配置
    index_type: str = 'IVF_FLAT'
    metric_type: str = 'IP'  # 内积相似度
    index_params: Dict[str, Any] = None
    
    # 搜索配置
    search_params: Dict[str, Any] = None
    
    def __post_init__(self):
        """初始化后处理"""
        if self.index_params is None:
            self.index_params = {
                "nlist": 1024
            }
        
        if self.search_params is None:
            self.search_params = {
                "nprobe": 10
            }
    
    @classmethod
    def from_env(cls) -> 'MilvusConfig':
        """从环境变量创建配置"""
        return cls(
            host=os.getenv('MILVUS_HOST', 'localhost'),
            port=os.getenv('MILVUS_PORT', '19530'),
            alias=os.getenv('MILVUS_ALIAS', 'default'),
            collection_name=os.getenv('MILVUS_COLLECTION_NAME', 'spx_vector_collection'),
            dimension=int(os.getenv('MILVUS_DIMENSION', '512')),
            index_type=os.getenv('MILVUS_INDEX_TYPE', 'IVF_FLAT'),
            metric_type=os.getenv('MILVUS_METRIC_TYPE', 'IP')
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'host': self.host,
            'port': self.port,
            'alias': self.alias,
            'collection_name': self.collection_name,
            'dimension': self.dimension,
            'index_type': self.index_type,
            'metric_type': self.metric_type,
            'index_params': self.index_params,
            'search_params': self.search_params
        }