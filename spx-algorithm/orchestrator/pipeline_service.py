"""
搜索管道服务：协调图文匹配和重排序的执行流程
"""

import logging
from typing import Dict, Any, Optional, List

from services.image_matching.matching_service import ImageMatchingService
from services.reranking.rerank_service import RerankService

logger = logging.getLogger(__name__)


class SearchPipelineService:
    """搜索管道服务：管理搜索的完整流程"""
    
    def __init__(self, 
                 image_matching_service: ImageMatchingService,
                 rerank_service: Optional[RerankService] = None,
                 enable_reranking: bool = False):
        """
        初始化搜索管道服务
        
        Args:
            image_matching_service: 图文匹配服务
            rerank_service: 重排序服务
            enable_reranking: 是否启用重排序
        """
        self.image_matching_service = image_matching_service
        self.rerank_service = rerank_service
        self.enable_reranking = enable_reranking
        
        if self.enable_reranking and not self.rerank_service:
            logger.warning("启用了重排序但未提供重排序服务，将只使用图文匹配")
            self.enable_reranking = False
        
        logger.info(f"搜索管道服务初始化完成，重排序启用状态: {enable_reranking}")
    
    def search(self, query_text: str, 
               top_k: int = 10, 
               threshold: float = 0.0,
               **kwargs) -> Dict[str, Any]:
        """
        执行完整的搜索流程
        
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
            
            # 第一阶段：图文匹配（向量搜索）
            matching_results = self._image_matching(query_text, top_k, threshold)
            
            if not matching_results:
                logger.info("图文匹配没有返回结果")
                return {
                    'success': True,
                    'query': query_text,
                    'top_k': top_k,
                    'threshold': threshold,
                    'results_count': 0,
                    'results': [],
                    'pipeline_stages': ['image_matching'],
                    'matching_results_count': 0
                }
            
            # 第二阶段：重排序（如果启用）
            final_results = matching_results
            pipeline_stages = ['image_matching']
            
            if self.enable_reranking and self.rerank_service:
                logger.info("执行重排序阶段")
                final_results = self._reranking(query_text, matching_results, **kwargs)
                pipeline_stages.append('reranking')
            
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
    
    def _image_matching(self, query_text: str, top_k: int, threshold: float) -> List[Dict[str, Any]]:
        """
        图文匹配阶段：向量相似度搜索
        
        Args:
            query_text: 查询文本
            top_k: 返回结果数量
            threshold: 相似度阈值
            
        Returns:
            匹配结果列表
        """
        try:
            logger.info("执行图文匹配阶段")
            
            # 通过图文匹配服务搜索
            results = self.image_matching_service.search_by_text(query_text, top_k, threshold)
            
            logger.info(f"图文匹配完成，返回 {len(results)} 个结果")
            return results
            
        except Exception as e:
            logger.error(f"图文匹配阶段异常: {e}")
            return []
    
    def _reranking(self, query_text: str, candidates: List[Dict[str, Any]], 
                  **kwargs) -> List[Dict[str, Any]]:
        """
        重排序阶段：基于用户反馈和更复杂的模型重新排序
        
        Args:
            query_text: 查询文本
            candidates: 候选结果列表
            **kwargs: 其他参数
            
        Returns:
            重排序后的结果列表
        """
        try:
            logger.info(f"执行重排序阶段，候选数: {len(candidates)}")
            
            # 使用重排序服务重新排序
            user_context = kwargs.get('user_context')
            reranked_results = self.rerank_service.rerank_results(
                query_text, candidates, user_context
            )
            
            logger.info(f"重排序完成，返回 {len(reranked_results)} 个结果")
            return reranked_results
            
        except Exception as e:
            logger.error(f"重排序阶段异常: {e}")
            # 重排序失败时返回原始结果
            return candidates