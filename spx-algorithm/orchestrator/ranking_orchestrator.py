"""
排序编排器：管理粗排细排的协调工作
"""

import logging
from typing import Dict, Any, Optional

from services.image_matching.matching_service import ImageMatchingService
from services.reranking.rerank_service import RerankService
from database.resource_vector.config import MilvusConfig
from .pipeline_service import SearchPipelineService

logger = logging.getLogger(__name__)


class RankingOrchestrator:
    """排序编排器：统一管理和协调粗排细排服务"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化编排器
        
        Args:
            config: 配置字典
        """
        self.config = config
        self.image_matching_service = None
        self.rerank_service = None
        self.pipeline_service = None
        
        self._init_services()
    
    def _init_services(self):
        """初始化各个服务"""
        try:
            # 初始化图文匹配服务
            self._init_image_matching()
            
            # 初始化重排序服务（如果配置了）
            self._init_reranking()
            
            # 初始化管道服务
            self._init_pipeline()
            
            logger.info("排序编排器初始化完成")
            
        except Exception as e:
            logger.error(f"排序编排器初始化失败: {e}")
            raise
    
    def _init_image_matching(self):
        """初始化图文匹配服务"""
        matching_config = self.config.get('image_matching', {})
        
        # 创建Milvus配置
        milvus_config = MilvusConfig(
            host=matching_config.get('milvus_host', 'localhost'),
            port=matching_config.get('milvus_port', '19530'),
            collection_name=matching_config.get('collection_name', 'spx_vector_collection'),
            dimension=matching_config.get('dimension', 512)
        )
        
        self.image_matching_service = ImageMatchingService(
            milvus_config=milvus_config,
            clip_model_name=matching_config.get('model_name', 'ViT-B-32'),
            clip_pretrained=matching_config.get('pretrained', 'laion2b_s34b_b79k')
        )
        
        logger.info("图文匹配服务初始化完成")
    
    def _init_reranking(self):
        """初始化重排序服务"""
        rerank_config = self.config.get('reranking', {})
        
        if not rerank_config.get('enabled', False):
            logger.info("重排序服务未启用")
            return
        
        self.rerank_service = RerankService(
            ltr_model_path=rerank_config.get('model_path')
        )
        
        if rerank_config.get('enabled', False):
            self.rerank_service.enable_reranking()
        
        logger.info("重排序服务初始化完成")
    
    def _init_pipeline(self):
        """初始化管道服务"""
        enable_reranking = (
            self.config.get('reranking', {}).get('enabled', False) and 
            self.rerank_service is not None
        )
        
        self.pipeline_service = SearchPipelineService(
            image_matching_service=self.image_matching_service,
            rerank_service=self.rerank_service,
            enable_reranking=enable_reranking
        )
        
        logger.info("管道服务初始化完成")
    
    def search(self, query_text: str, **kwargs) -> Dict[str, Any]:
        """执行搜索"""
        if not self.pipeline_service:
            raise RuntimeError("管道服务未初始化")
        
        return self.pipeline_service.search(query_text, **kwargs)
    
    def add_image(self, image_id: int, image_url: str, svg_content: Optional[str] = None) -> bool:
        """添加图片"""
        if not self.image_matching_service:
            raise RuntimeError("图文匹配服务未初始化")
        
        if svg_content:
            return self.image_matching_service.add_image_with_svg_content(image_id, image_url, svg_content)
        else:
            return self.image_matching_service.add_image_by_url(image_id, image_url)
    
    def remove_image(self, image_id: int) -> bool:
        """删除图片"""
        if not self.image_matching_service:
            raise RuntimeError("图文匹配服务未初始化")
        
        return self.image_matching_service.delete_image(image_id)
    
    def batch_add_images(self, images: list) -> Dict[str, Any]:
        """批量添加图片"""
        if not self.image_matching_service:
            raise RuntimeError("图文匹配服务未初始化")
        
        return self.image_matching_service.batch_add_images(images)
    
    def get_all_data(self, include_vectors: bool = False, limit: Optional[int] = None, 
                    offset: int = 0) -> list:
        """获取所有数据"""
        if not self.image_matching_service:
            raise RuntimeError("图文匹配服务未初始化")
        
        return self.image_matching_service.get_all_images(include_vectors, limit, offset)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = {}
        
        if self.image_matching_service:
            stats['image_matching'] = self.image_matching_service.get_stats()
        
        if self.rerank_service and self.rerank_service.is_enabled():
            stats['reranking'] = {'enabled': True}
        else:
            stats['reranking'] = {'enabled': False}
        
        return stats
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        if not self.image_matching_service:
            return {'status': 'unhealthy', 'error': '图文匹配服务未初始化'}
        
        return self.image_matching_service.health_check()