"""
搜索协调器：管理和协调多种排序方案的搜索服务
"""

import logging
from typing import Dict, Any, Optional, List, Tuple

from services.image_matching.matching_service import ImageMatchingService
from services.reranking.rerank_service import RerankService
from database.resource_vector.config import MilvusConfig

logger = logging.getLogger(__name__)


class SearchCoordinator:
    """搜索协调器：统一管理和协调粗排细排服务"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化搜索协调器
        
        Args:
            config: 配置字典
        """
        self.config = config
        self.image_matching_service = None
        self.rerank_service = None
        self.enable_reranking = False
        
        self._init_services()
    
    def _init_services(self):
        """初始化各个服务"""
        try:
            # 初始化图文匹配服务
            self._init_image_matching()
            
            # 初始化重排序服务（如果配置了）
            self._init_reranking()
            
            logger.info("搜索协调器初始化完成")
            
        except Exception as e:
            logger.error(f"搜索协调器初始化失败: {e}")
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
            self.enable_reranking = False
            return
        
        # 创建重排序服务，传递完整配置让其内部处理模型加载和启用逻辑
        self.rerank_service = RerankService(
            clip_service=self.image_matching_service.clip_service,
            rerank_config=rerank_config
        )
        
        # 检查重排序服务是否成功启用
        self.enable_reranking = self.rerank_service.is_enabled()
        
        logger.info(f"重排序服务初始化完成，启用状态: {self.enable_reranking}")
    
    def search(self, query_text: str, 
               top_k: int = 10, 
               threshold: float = 0.0,
               **kwargs) -> Dict[str, Any]:
        """
        执行完整的搜索流程：协调粗排和细排
        
        Args:
            query_text: 查询文本
            top_k: 返回结果数量
            threshold: 相似度阈值
            **kwargs: 其他参数
            
        Returns:
            搜索结果
        """
        try:
            logger.info(f"开始搜索流程: query='{query_text}', top_k={top_k}, threshold={threshold}")
            
            # 第一阶段：图文匹配（粗排）
            matching_results = self._execute_coarse_ranking(query_text, top_k, threshold)
            
            if not matching_results:
                logger.info("粗排阶段没有返回结果")
                return {
                    'success': True,
                    'query': query_text,
                    'top_k': top_k,
                    'threshold': threshold,
                    'results_count': 0,
                    'results': [],
                    'pipeline_stages': ['coarse_ranking'],
                    'matching_results_count': 0
                }
            
            # 第二阶段：重排序（细排）
            final_results, did_rerank = self._execute_fine_ranking(query_text, matching_results, top_k, **kwargs)
            
            # 构建流程阶段信息
            pipeline_stages = ['coarse_ranking']
            if threshold > 0:
                pipeline_stages.append('threshold_filtering')
            if did_rerank:
                pipeline_stages.append('fine_ranking')
            
            logger.info(f"搜索流程完成，返回 {len(final_results)} 个结果")
            
            return {
                'success': True,
                'query': query_text,
                'top_k': top_k,
                'threshold': threshold,
                'results_count': len(final_results),
                'results': final_results,
                'pipeline_stages': pipeline_stages,
                'matching_results_count': len(matching_results)
            }
            
        except Exception as e:
            logger.error(f"搜索流程异常: {e}")
            return {
                'success': False,
                'error': str(e),
                'query': query_text,
                'top_k': top_k,
                'threshold': threshold,
                'results_count': 0,
                'results': []
            }
    
    def _execute_coarse_ranking(self, query_text: str, top_k: int, threshold: float) -> List[Dict[str, Any]]:
        """
        执行粗排阶段：基于向量相似度的快速筛选
        
        Args:
            query_text: 查询文本
            top_k: 最终需要返回的结果数量
            threshold: 相似度阈值
            
        Returns:
            粗排结果列表
        """
        try:
            logger.info("执行粗排阶段（图文匹配）")
            
            # 如果启用了重排序，粗排阶段需要检索更多结果供LTR重排序使用
            if self.enable_reranking and self.rerank_service:
                # 从配置获取粗排候选数量参数
                coarse_multiplier = self.config.get('reranking', {}).get('coarse_multiplier', 3)
                max_candidates = self.config.get('reranking', {}).get('max_candidates', 100)
                
                # 粗排检索数量：取top_k的倍数，但限制在合理范围内
                coarse_top_k = max(min(top_k * coarse_multiplier, max_candidates), min(top_k + 10, 20))
                logger.info(f"启用重排序，粗排检索 {coarse_top_k} 个候选结果 (multiplier={coarse_multiplier}, max={max_candidates})")
            else:
                # 未启用重排序，直接按需求数量检索
                coarse_top_k = top_k
                logger.info(f"未启用重排序，粗排检索 {coarse_top_k} 个结果")
            
            # 通过图文匹配服务搜索，应用threshold过滤
            results = self.image_matching_service.search_by_text(query_text, coarse_top_k, threshold)
            
            logger.info(f"粗排+阈值过滤完成，返回 {len(results)} 个符合条件的候选结果")
            return results
            
        except Exception as e:
            logger.error(f"粗排阶段异常: {e}")
            return []
    
    def _execute_fine_ranking(self, query_text: str, candidates: List[Dict[str, Any]], 
                             top_k: int, **kwargs) -> Tuple[List[Dict[str, Any]], bool]:
        """
        执行细排阶段：根据配置决定是否进行重排序，并返回前top_k个结果
        
        Args:
            query_text: 查询文本
            candidates: 候选结果列表
            top_k: 最终需要返回的结果数量
            **kwargs: 其他参数
            
        Returns:
            Tuple[细排后的前top_k个结果列表, 是否实际执行了重排序]
        """
        try:
            # 如果没有候选结果，直接返回空列表
            if not candidates:
                logger.info("无候选结果，跳过细排阶段")
                return [], False
            
            # 如果未启用重排序或重排序服务不可用，直接返回粗排结果
            if not self.enable_reranking or not self.rerank_service:
                logger.info("重排序未启用，返回粗排结果")
                return candidates[:top_k], False
            
            logger.info(f"执行细排阶段（LTR重排序），候选数: {len(candidates)}, 目标返回数: {top_k}")
            
            # 获取用户上下文
            user_context = kwargs.get('user_context')
            
            # 确保候选结果包含向量信息
            candidates_with_vectors = self._ensure_candidates_have_vectors(candidates)
            
            # 使用重排序服务重新排序
            reranked_results = self.rerank_service.rerank_results(
                query_text, candidates_with_vectors, user_context
            )
            
            # 取前top_k个结果
            final_results = reranked_results[:top_k]
            
            logger.info(f"LTR细排完成，从 {len(reranked_results)} 个重排序结果中返回前 {len(final_results)} 个")
            return final_results, True
            
        except Exception as e:
            logger.error(f"细排阶段异常: {e}")
            # 细排失败时返回原始结果的前top_k个
            return candidates[:top_k], False
    
    def _ensure_candidates_have_vectors(self, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        确保候选结果包含向量信息
        委托给重排序服务处理，避免重复代码
        
        Args:
            candidates: 候选结果列表
            
        Returns:
            包含向量信息的候选结果列表
        """
        try:
            # 如果有重排序服务，委托给它处理
            if self.rerank_service:
                return self.rerank_service._ensure_candidate_vectors(candidates)
            
            # 如果没有重排序服务，直接返回原结果
            logger.warning("重排序服务不可用，无法补充向量信息")
            return candidates
            
        except Exception as e:
            logger.error(f"确保候选向量信息异常: {e}")
            return candidates
    
    def add_image(self, image_id: int, image_url: str, svg_content: Optional[str] = None) -> bool:
        """添加图片资源"""
        if not self.image_matching_service:
            raise RuntimeError("图文匹配服务未初始化")
        
        if svg_content:
            return self.image_matching_service.add_image_with_svg_content(image_id, image_url, svg_content)
        else:
            return self.image_matching_service.add_image_by_url(image_id, image_url)
    
    def remove_image(self, image_id: int) -> bool:
        """删除图片资源"""
        if not self.image_matching_service:
            raise RuntimeError("图文匹配服务未初始化")
        
        return self.image_matching_service.delete_image(image_id)
    
    def batch_add_images(self, images: list) -> Dict[str, Any]:
        """批量添加图片资源"""
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
        
        if self.rerank_service:
            rerank_stats = self.rerank_service.get_service_status()
            stats['reranking'] = {
                'enabled': self.enable_reranking,
                'service_ready': rerank_stats.get('model_ready', False),
                'feedback_stats': rerank_stats.get('feedback_stats', {})
            }
        else:
            stats['reranking'] = {'enabled': False}
        
        return stats
    
    def get_rerank_service(self) -> RerankService:
        """获取重排序服务实例（用于API层调用）"""
        return self.rerank_service
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        if not self.image_matching_service:
            return {'status': 'unhealthy', 'error': '图文匹配服务未初始化'}
        
        return self.image_matching_service.health_check()


# 为了保持向后兼容，创建别名
RankingOrchestrator = SearchCoordinator
SearchPipelineService = SearchCoordinator