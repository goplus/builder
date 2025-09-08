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

logger = logging.getLogger(__name__)


class RerankService:
    """重排序服务类"""
    
    def __init__(self, ltr_model_path: Optional[str] = None, 
                 clip_service: Optional[CLIPService] = None):
        """
        初始化重排序服务
        
        Args:
            ltr_model_path: LTR模型路径
            clip_service: CLIP服务实例（用于特征提取）
        """
        self.ltr_model = LTRModel(ltr_model_path)
        self.feature_extractor = None
        self.feedback_storage = FeedbackStorage()
        self.enabled = False
        
        # 如果提供了CLIP服务，初始化特征提取器
        if clip_service:
            self.feature_extractor = LTRFeatureExtractor(clip_service)
            self.ltr_model.set_feature_extractor(self.feature_extractor)
            logger.info("特征提取器初始化完成")
        
        logger.info("重排序服务初始化完成")
    
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
            
            # TODO: 从向量数据库获取缺失的向量信息
            # 这里需要与数据库层集成，暂时返回原始结果
            logger.warning("候选结果缺少向量信息，需要从数据库获取")
            
            # 临时解决方案：为每个候选结果添加空向量
            for candidate in candidates:
                if 'vector' not in candidate:
                    candidate['vector'] = [0.0] * 512  # 假设向量维度为512
            
            return candidates
            
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
            
            # TODO: 获取图片向量数据
            # 这里需要从向量数据库获取所有相关图片的向量
            # 暂时使用空字典，实际应该从数据库获取
            image_vectors = {}  # {pic_id: vector}
            
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