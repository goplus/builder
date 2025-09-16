"""
重排序服务模块：基于LTR的用户反馈重排方案
"""

import logging
from typing import List, Dict, Any, Optional
from .ltr_model import LTRModel
from .feature_extractor import LTRFeatureExtractor
from ..image_matching.clip_service import CLIPService
from database.user_feedback.feedback_storage import FeedbackStorage
from database.user_feedback.models import UserFeedback
from database.resource_vector.operations import MilvusOperations
from database.resource_vector.config import MilvusConfig

logger = logging.getLogger(__name__)


class RerankService:
    """重排序服务类"""
    
    def __init__(self, ltr_model_path: Optional[str] = None, 
                 clip_service: Optional[CLIPService] = None,
                 rerank_config: Optional[Dict[str, Any]] = None):
        """
        初始化重排序服务
        
        Args:
            ltr_model_path: LTR模型路径（为保持向后兼容性保留）
            clip_service: CLIP服务实例（用于特征提取）
            rerank_config: 重排序配置字典
        """
        # 优先使用rerank_config中的配置，fallback到ltr_model_path参数
        config = rerank_config or {}
        model_path = config.get('model_path') or ltr_model_path
        
        self.ltr_model = LTRModel(model_path)
        self.feature_extractor = None
        self.feedback_storage = FeedbackStorage()
        self.enabled = False
        
        # 初始化向量数据库操作
        self.milvus_config = MilvusConfig.from_env()
        self.milvus_ops = MilvusOperations(self.milvus_config)
        
        # 如果提供了CLIP服务，初始化特征提取器
        if clip_service:
            self.feature_extractor = LTRFeatureExtractor(clip_service)
            self.ltr_model.set_feature_extractor(self.feature_extractor)
            logger.info("特征提取器初始化完成")
        
        # 内部处理模型初始化和启用逻辑
        self._initialize_model(config)
        
        logger.info("重排序服务初始化完成")
    
    def _initialize_model(self, config: Dict[str, Any]):
        """
        内部模型初始化方法
        
        Args:
            config: 重排序配置字典
        """
        model_path = config.get('model_path')
        if model_path and self.load_trained_model(model_path):
            logger.info("LTR模型加载成功")
            # 如果配置启用重排序，则启用
            if config.get('enabled', False):
                self.enable_reranking()
        else:
            logger.info("未配置模型路径或模型加载失败，重排序功能暂时不可用")
    
    def set_clip_service(self, clip_service: CLIPService):
        """设置CLIP服务（延迟初始化）"""
        self.feature_extractor = LTRFeatureExtractor(clip_service)
        self.ltr_model.set_feature_extractor(self.feature_extractor)
        logger.info("CLIP服务和特征提取器设置完成")
    
    def rerank_results(self, query: str, candidates: List[Dict[str, Any]], 
                      user_context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        对候选结果进行重排序
        
        Args:
            query: 查询文本
            candidates: 候选结果列表
            user_context: 用户上下文信息
            
        Returns:
            重排序后的结果列表
        """
        if not self.enabled:
            logger.debug("重排序功能未启用，返回原始结果")
            return candidates
        
        if not candidates:
            logger.debug("候选结果为空，直接返回")
            return candidates
        
        try:
            logger.info(f"开始LTR重排序，候选结果数: {len(candidates)}")
            
            # 检查模型是否准备就绪
            if not self.ltr_model.is_ready():
                logger.warning("LTR模型未准备就绪，返回原始结果")
                return candidates
            
            # 确保候选结果包含向量信息（如果没有，需要从数据库获取）
            candidates_with_vectors = self._ensure_candidate_vectors(candidates)
            
            # 使用LTR模型重排序
            reranked_candidates = self.ltr_model.rerank(query, candidates_with_vectors)
            
            logger.info(f"LTR重排序完成，结果数: {len(reranked_candidates)}")
            return reranked_candidates
            
        except Exception as e:
            logger.error(f"重排序失败: {e}")
            # 出错时返回原始结果
            return candidates
    
    def _ensure_candidate_vectors(self, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        确保候选结果包含向量信息
        
        Args:
            candidates: 候选结果列表
            
        Returns:
            包含向量的候选结果列表
        """
        try:
            # 如果候选结果已经包含向量，直接返回
            if candidates and 'vector' in candidates[0]:
                return candidates
            
            # 从向量数据库获取缺失的向量信息
            logger.info("从Milvus向量数据库获取候选结果的向量信息")
            
            candidates_with_vectors = []
            for candidate in candidates:
                if 'vector' in candidate:
                    # 已有向量，直接添加
                    candidates_with_vectors.append(candidate)
                else:
                    # 缺少向量，从数据库获取
                    pic_id = candidate.get('id') or candidate.get('pic_id')
                    if pic_id:
                        # 查询向量数据库获取向量
                        vector_data = self._get_vector_from_database(pic_id)
                        if vector_data:
                            candidate['vector'] = vector_data['vector']
                            # 确保URL信息一致
                            if 'url' not in candidate and 'url' in vector_data:
                                candidate['url'] = vector_data['url']
                        else:
                            # 如果数据库中没有找到，使用零向量占位
                            logger.warning(f"数据库中未找到ID {pic_id} 的向量数据")
                            candidate['vector'] = [0.0] * self.milvus_config.dimension
                    else:
                        logger.warning(f"候选结果缺少ID信息，无法获取向量: {candidate}")
                        candidate['vector'] = [0.0] * self.milvus_config.dimension
                    
                    candidates_with_vectors.append(candidate)
            
            return candidates_with_vectors
            
        except Exception as e:
            logger.error(f"确保候选向量失败: {e}")
            return candidates
    
    def save_user_feedback(self, feedback: UserFeedback) -> bool:
        """
        保存用户反馈
        
        Args:
            feedback: 用户反馈数据
            
        Returns:
            是否保存成功
        """
        try:
            return self.feedback_storage.save_feedback(feedback)
        except Exception as e:
            logger.error(f"保存用户反馈失败: {e}")
            return False
    
    def train_model_with_feedback(self, limit: Optional[int] = None) -> Dict[str, Any]:
        """
        使用用户反馈数据训练LTR模型
        
        Args:
            limit: 限制使用的反馈数据量
            
        Returns:
            训练结果
        """
        try:
            if self.feature_extractor is None:
                raise ValueError("特征提取器未初始化")
            
            # 获取用户反馈数据
            feedback_list = self.feedback_storage.get_all_feedback(limit=limit)
            
            if not feedback_list:
                raise ValueError("没有可用的用户反馈数据")
            
            logger.info(f"开始训练LTR模型，反馈数据量: {len(feedback_list)}")
            
            # 获取图片向量数据
            logger.info("从Milvus向量数据库获取图片向量数据")
            image_vectors = self._get_image_vectors_from_feedback(feedback_list)
            
            # 构建训练数据集
            dataset = self.feature_extractor.build_training_dataset(feedback_list, image_vectors)
            
            if len(dataset) == 0:
                raise ValueError("无法构建有效的训练数据集")
            
            # 训练模型
            training_result = self.ltr_model.trainer.train_model(dataset)
            
            # 加载训练好的模型
            self.ltr_model.is_trained = True
            
            logger.info("LTR模型训练完成")
            return training_result
            
        except Exception as e:
            logger.error(f"LTR模型训练失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'feedback_count': len(feedback_list) if 'feedback_list' in locals() else 0
            }
    
    def retrain_model_with_feedback(self, limit: Optional[int] = None) -> Dict[str, Any]:
        """
        使用用户反馈数据进行增量训练LTR模型
        
        Args:
            limit: 限制使用的反馈数据量
            
        Returns:
            训练结果
        """
        try:
            if self.feature_extractor is None:
                raise ValueError("特征提取器未初始化")
            
            # 获取最后训练日期，用于增量数据获取
            last_training_date = self.ltr_model.trainer.get_last_training_date()
            
            if last_training_date:
                # 使用现有接口的start_date参数获取增量数据
                logger.info(f"获取自 {last_training_date} 之后的增量反馈数据")
                feedback_list = self.feedback_storage.get_all_feedback(
                    limit=limit, 
                    start_date=last_training_date
                )
                
                if not feedback_list:
                    logger.info("没有新的反馈数据，无需增量训练")
                    return {
                        'success': True,
                        'message': '没有新的反馈数据，无需增量训练',
                        'last_training_date': last_training_date.isoformat(),
                        'feedback_count': 0,
                        'incremental': True
                    }
            else:
                # 没有训练历史，使用全量数据进行首次训练
                logger.warning("没有训练历史记录，使用全量数据进行首次训练")
                feedback_list = self.feedback_storage.get_all_feedback(limit=limit)
            
            if not feedback_list:
                raise ValueError("没有可用的用户反馈数据")
            
            logger.info(f"开始增量训练LTR模型，增量反馈数据量: {len(feedback_list)}")
            
            # 获取图片向量数据
            logger.info("从Milvus向量数据库获取图片向量数据")
            image_vectors = self._get_image_vectors_from_feedback(feedback_list)
            
            # 构建训练数据集
            dataset = self.feature_extractor.build_training_dataset(feedback_list, image_vectors)
            
            if len(dataset) == 0:
                raise ValueError("无法构建有效的训练数据集")
            
            # 使用增量训练
            training_result = self.ltr_model.trainer.retrain_with_new_data(
                dataset, 
                existing_model_path=self.ltr_model.model_path
            )
            
            # 更新模型状态
            self.ltr_model.is_trained = True
            
            # 添加增量训练标识信息
            training_result['incremental'] = True
            training_result['last_training_date'] = last_training_date.isoformat() if last_training_date else None
            
            logger.info("LTR模型增量训练完成")
            return training_result
            
        except Exception as e:
            logger.error(f"LTR模型增量训练失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'feedback_count': len(feedback_list) if 'feedback_list' in locals() else 0,
                'incremental': True
            }
    
    def load_trained_model(self, model_path: Optional[str] = None) -> bool:
        """
        加载训练好的LTR模型
        
        Args:
            model_path: 模型路径
            
        Returns:
            是否加载成功
        """
        try:
            success = self.ltr_model.load_model(model_path)
            if success:
                logger.info("LTR模型加载成功，重排序功能可用")
            return success
        except Exception as e:
            logger.error(f"加载LTR模型失败: {e}")
            return False
    
    def enable_reranking(self):
        """启用重排序功能"""
        if self.ltr_model.is_ready():
            self.enabled = True
            logger.info("重排序功能已启用")
        else:
            logger.warning("LTR模型未准备就绪，无法启用重排序功能")
    
    def disable_reranking(self):
        """禁用重排序功能"""
        self.enabled = False
        logger.info("重排序功能已禁用")
    
    def is_enabled(self) -> bool:
        """
        检查重排序功能是否启用
        
        Returns:
            是否启用
        """
        return self.enabled
    
    def get_service_status(self) -> Dict[str, Any]:
        """
        获取服务状态
        
        Returns:
            服务状态信息
        """
        try:
            feedback_stats = self.feedback_storage.get_stats()
            model_info = self.ltr_model.get_model_info()
            
            return {
                'enabled': self.enabled,
                'model_ready': self.ltr_model.is_ready(),
                'has_feature_extractor': self.feature_extractor is not None,
                'feedback_stats': feedback_stats,
                'model_info': model_info
            }
            
        except Exception as e:
            logger.error(f"获取服务状态失败: {e}")
            return {'error': str(e)}
    
    def get_model_performance(self) -> Dict[str, Any]:
        """
        获取模型性能指标
        
        Returns:
            模型性能信息
        """
        try:
            feature_importance = self.ltr_model.get_feature_importance()
            model_info = self.ltr_model.get_model_info()
            
            return {
                'feature_importance': feature_importance,
                'model_metrics': model_info.get('latest_val_metrics', {}),
                'training_history': model_info.get('training_history_count', 0)
            }
            
        except Exception as e:
            logger.error(f"获取模型性能失败: {e}")
            return {'error': str(e)}
    
    def _get_vector_from_database(self, pic_id: int) -> Optional[Dict[str, Any]]:
        """
        从向量数据库获取指定图片的向量数据
        
        Args:
            pic_id: 图片ID
            
        Returns:
            包含向量和URL的字典，如果未找到则返回None
        """
        try:
            # 使用query方法获取特定ID的数据
            result = self.milvus_ops.collection.query(
                expr=f"id == {pic_id}",
                output_fields=["id", "url", "vector"],
                limit=1
            )
            
            if result and len(result) > 0:
                data = result[0]
                return {
                    'id': data['id'],
                    'url': data['url'],
                    'vector': data['vector']
                }
            else:
                logger.warning(f"向量数据库中未找到ID {pic_id} 的数据")
                return None
                
        except Exception as e:
            logger.error(f"从向量数据库获取数据失败，ID: {pic_id}, 错误: {e}")
            return None
    
    def _get_image_vectors_from_feedback(self, feedback_list: List[UserFeedback]) -> Dict[int, List[float]]:
        """
        从反馈数据中提取所有相关图片ID，并从向量数据库获取对应的向量
        
        Args:
            feedback_list: 用户反馈数据列表
            
        Returns:
            图片ID到向量的映射字典
        """
        try:
            # 提取所有唯一的图片ID
            pic_ids = set()
            for feedback in feedback_list:
                # 从反馈数据中提取推荐图片ID列表
                recommended_pics = feedback.get_recommended_pics()  # 返回 [pic_id_1, pic_id_2, pic_id_3, pic_id_4]
                for pic_id in recommended_pics:
                    if pic_id:  # 确保pic_id不为空或0
                        pic_ids.add(pic_id)
                
                # 同时也添加用户选择的图片ID（虽然通常已经包含在推荐列表中）
                if feedback.choose_id:
                    pic_ids.add(feedback.choose_id)
            
            if not pic_ids:
                logger.warning("从反馈数据中未能提取到任何图片ID")
                return {}
            
            logger.info(f"需要从向量数据库获取 {len(pic_ids)} 个图片的向量数据")
            
            # 批量查询向量数据
            image_vectors = {}
            pic_ids_list = list(pic_ids)
            
            # 构建批量查询表达式
            if len(pic_ids_list) == 1:
                expr = f"id == {pic_ids_list[0]}"
            else:
                expr = f"id in {pic_ids_list}"
            
            try:
                result = self.milvus_ops.collection.query(
                    expr=expr,
                    output_fields=["id", "vector"],
                    limit=len(pic_ids_list)
                )
                
                for data in result:
                    image_vectors[data['id']] = data['vector']
                
                logger.info(f"成功从向量数据库获取了 {len(image_vectors)} 个图片的向量数据")
                
            except Exception as e:
                logger.error(f"批量查询向量数据失败: {e}")
                # 如果批量查询失败，尝试逐个查询
                logger.info("尝试逐个查询向量数据")
                for pic_id in pic_ids_list:
                    vector_data = self._get_vector_from_database(pic_id)
                    if vector_data:
                        image_vectors[pic_id] = vector_data['vector']
            
            # 对于未找到向量的图片ID，记录警告
            missing_ids = pic_ids - set(image_vectors.keys())
            if missing_ids:
                logger.warning(f"以下图片ID在向量数据库中未找到: {missing_ids}")
            
            return image_vectors
            
        except Exception as e:
            logger.error(f"从反馈数据获取图片向量失败: {e}")
            return {}