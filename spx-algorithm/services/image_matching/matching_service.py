"""
图文匹配服务模块
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np

from database.resource_vector.operations import MilvusOperations
from database.resource_vector.config import MilvusConfig
from .vector_service import VectorService
from .clip_service import CLIPService

logger = logging.getLogger(__name__)


class ImageMatchingService:
    """图文匹配服务类"""
    
    def __init__(self, milvus_config: MilvusConfig, clip_model_name: str = 'ViT-B-32', 
                 clip_pretrained: str = 'laion2b_s34b_b79k'):
        """
        初始化图文匹配服务
        
        Args:
            milvus_config: Milvus配置
            clip_model_name: CLIP模型名称
            clip_pretrained: CLIP预训练权重
        """
        self.milvus_config = milvus_config
        
        # 初始化服务组件
        self.clip_service = CLIPService(clip_model_name, clip_pretrained)
        self.vector_service = VectorService(self.clip_service)
        self.milvus_ops = MilvusOperations(milvus_config)
        
        logger.info("图文匹配服务初始化完成")
    
    def add_image_by_url(self, id: int, url: str) -> bool:
        """
        通过URL添加图片到数据库
        
        Args:
            id: 图片ID
            url: 图片URL
            
        Returns:
            是否添加成功
        """
        try:
            logger.info(f"开始添加图片: ID={id}, URL={url}")
            
            # 向量化图片
            vector = self.vector_service.vectorize_image_from_url(url)
            if vector is None:
                logger.error(f"图片向量化失败: ID={id}, URL={url}")
                return False
            
            # 使用upsert方法处理插入或更新
            success = self.milvus_ops.upsert(id, url, vector.tolist())
            
            if success:
                logger.info(f"图片成功添加: ID={id}")
            else:
                logger.error(f"图片添加失败: ID={id}")
            
            return success
            
        except Exception as e:
            logger.error(f"添加图片异常: ID={id}, URL={url}, 错误: {e}")
            return False
    
    def add_image_with_svg_content(self, id: int, url: str, svg_content: str) -> bool:
        """
        通过SVG内容添加图片到数据库
        
        Args:
            id: 图片ID
            url: 图片URL（仅用于记录）
            svg_content: SVG内容
            
        Returns:
            是否添加成功
        """
        try:
            logger.info(f"开始添加SVG图片: ID={id}, URL={url}")
            
            # 向量化SVG内容
            vector = self.vector_service.vectorize_image_from_svg_content(svg_content)
            if vector is None:
                logger.error(f"SVG向量化失败: ID={id}")
                return False
            
            # 使用upsert方法处理插入或更新
            success = self.milvus_ops.upsert(id, url, vector.tolist())
            
            if success:
                logger.info(f"SVG图片成功添加: ID={id}")
            else:
                logger.error(f"SVG图片添加失败: ID={id}")
            
            return success
            
        except Exception as e:
            logger.error(f"添加SVG图片异常: ID={id}, URL={url}, 错误: {e}")
            return False
    
    def batch_add_images(self, images: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        批量添加图片
        
        Args:
            images: 图片信息列表，每个元素包含 id, url, svg_content(可选)
            
        Returns:
            批量添加结果
        """
        try:
            total = len(images)
            success_count = 0
            failed_count = 0
            results = []
            
            logger.info(f"开始批量添加图片，共 {total} 张")
            
            for i, image_info in enumerate(images):
                try:
                    image_id = image_info.get('id')
                    image_url = image_info.get('url')
                    svg_content = image_info.get('svg_content')
                    
                    if image_id is None or image_url is None:
                        logger.error(f"图片信息不完整: index={i}, info={image_info}")
                        results.append({
                            'index': i,
                            'success': False,
                            'error': '图片信息不完整'
                        })
                        failed_count += 1
                        continue
                    
                    # 根据是否有SVG内容选择添加方法
                    if svg_content:
                        success = self.add_image_with_svg_content(image_id, image_url, svg_content)
                    else:
                        success = self.add_image_by_url(image_id, image_url)
                    
                    result = {
                        'index': i,
                        'success': success,
                        'id': image_id,
                        'url': image_url
                    }
                    
                    if success:
                        success_count += 1
                    else:
                        failed_count += 1
                        result['error'] = '添加失败'
                    
                    results.append(result)
                    
                except Exception as e:
                    logger.error(f"处理图片 {i} 时出错: {e}")
                    results.append({
                        'index': i,
                        'success': False,
                        'error': str(e)
                    })
                    failed_count += 1
            
            logger.info(f"批量添加完成: 总数={total}, 成功={success_count}, 失败={failed_count}")
            
            return {
                'success': True,
                'total': total,
                'success_count': success_count,
                'failed_count': failed_count,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"批量添加图片异常: {e}")
            return {
                'success': False,
                'error': str(e),
                'total': len(images) if images else 0,
                'success_count': 0,
                'failed_count': len(images) if images else 0,
                'results': []
            }
    
    def search_by_text(self, query_text: str, top_k: int = 10, 
                      threshold: float = 0.0) -> List[Dict[str, Any]]:
        """
        基于文本搜索相似图片
        
        Args:
            query_text: 查询文本
            top_k: 返回结果数量
            threshold: 相似度阈值
            
        Returns:
            搜索结果列表
        """
        try:
            if not query_text.strip():
                logger.error("查询文本不能为空")
                return []
            
            logger.info(f"开始文本搜索: '{query_text}', top_k={top_k}, threshold={threshold}")
            
            # 向量化查询文本
            query_vector = self.vector_service.vectorize_text(query_text)
            if query_vector is None:
                logger.error("查询文本向量化失败")
                return []
            
            # 在向量数据库中搜索
            search_results = self.milvus_ops.search_by_vector(
                query_vector.tolist(), 
                limit=top_k
            )
            
            # 应用阈值过滤
            if threshold > 0:
                before_count = len(search_results)
                search_results = [r for r in search_results if r['similarity'] >= threshold]
                logger.info(f"阈值过滤: {before_count} -> {len(search_results)} 个结果（阈值: {threshold}）")
            
            logger.info(f"文本搜索完成: 找到 {len(search_results)} 个结果")
            return search_results
            
        except Exception as e:
            logger.error(f"文本搜索异常: {e}")
            return []
    
    def search_by_image(self, svg_content: str, top_k: int = 10, 
                       threshold: float = 0.0) -> List[Dict[str, Any]]:
        """
        基于图片内容搜索相似图片
        
        Args:
            svg_content: SVG图片内容
            top_k: 返回结果数量
            threshold: 相似度阈值
            
        Returns:
            搜索结果列表
        """
        try:
            if not svg_content.strip():
                logger.error("SVG内容不能为空")
                return []
            
            logger.info(f"开始图片搜索: top_k={top_k}, threshold={threshold}, svg_length={len(svg_content)}")
            
            # 向量化SVG图片内容
            query_vector = self.vector_service.vectorize_image_from_svg_content(svg_content)
            if query_vector is None:
                logger.error("SVG图片向量化失败")
                return []
            
            # 在向量数据库中搜索（使用距离度量）
            search_results = self.milvus_ops.search_by_vector_distance(
                query_vector.tolist(), 
                limit=top_k
            )
            
            # 应用相似度阈值过滤（统一使用similarity进行过滤，消除与search路由的歧义）
            if threshold > 0:
                before_count = len(search_results)
                # 统一使用相似度阈值过滤：similarity越大越相似，所以是大于等于阈值
                search_results = [r for r in search_results if r['similarity'] >= threshold]
                logger.info(f"相似度阈值过滤: {before_count} -> {len(search_results)} 个结果（最小相似度: {threshold}）")
            
            logger.info(f"图片搜索完成: 找到 {len(search_results)} 个结果")
            return search_results
            
        except Exception as e:
            logger.error(f"图片搜索异常: {e}")
            return []
    
    def delete_image(self, id: int) -> bool:
        """
        删除图片
        
        Args:
            id: 图片ID
            
        Returns:
            是否删除成功
        """
        try:
            success = self.milvus_ops.delete_by_id(id)
            if success:
                logger.info(f"图片删除成功: ID={id}")
            else:
                logger.warning(f"图片删除失败: ID={id}")
            return success
        except Exception as e:
            logger.error(f"删除图片异常: ID={id}, 错误: {e}")
            return False
    
    def get_all_images(self, include_vectors: bool = False, limit: Optional[int] = None,
                      offset: int = 0) -> List[Dict[str, Any]]:
        """
        获取所有图片数据
        
        Args:
            include_vectors: 是否包含向量数据
            limit: 限制返回数量
            offset: 偏移量
            
        Returns:
            图片数据列表
        """
        try:
            return self.milvus_ops.get_all_data(include_vectors, limit, offset)
        except Exception as e:
            logger.error(f"获取所有图片异常: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取服务统计信息
        
        Returns:
            统计信息字典
        """
        try:
            milvus_stats = self.milvus_ops.get_stats()
            clip_info = self.clip_service.get_model_info()
            
            return {
                **milvus_stats,
                **clip_info
            }
        except Exception as e:
            logger.error(f"获取统计信息异常: {e}")
            return {}
    
    def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            健康状态信息
        """
        try:
            # 检查Milvus连接
            milvus_healthy = self.milvus_ops.connection.health_check()
            
            # 检查CLIP模型
            clip_healthy = self.clip_service.model is not None
            
            overall_healthy = milvus_healthy and clip_healthy
            
            return {
                'status': 'healthy' if overall_healthy else 'unhealthy',
                'components': {
                    'milvus': 'healthy' if milvus_healthy else 'unhealthy',
                    'clip_model': 'healthy' if clip_healthy else 'unhealthy'
                }
            }
        except Exception as e:
            logger.error(f"健康检查异常: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e)
            }