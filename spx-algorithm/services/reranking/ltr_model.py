"""
LTR重排序模型：支持LightGBM和神经网络的统一接口
"""

import logging
from typing import List, Dict, Any, Optional
from .ltr_trainer import LTRTrainer
from .feature_extractor import LTRFeatureExtractor

logger = logging.getLogger(__name__)


class LTRModel:
    """Learning to Rank 模型类：支持LightGBM和神经网络"""
    
    def __init__(self, model_path: Optional[str] = None, model_type: str = "neural_network"):
        """
        初始化LTR模型
        
        Args:
            model_path: 模型文件路径
            model_type: 模型类型，'lightgbm' 或 'neural_network'
        """
        self.model_path = model_path or "models/ltr_model.pkl"
        self.model_type = model_type
        self.trainer = LTRTrainer(self.model_path, model_type)
        self.feature_extractor = None  # 需要在初始化时注入
        self.is_trained = False
        
        logger.info(f"LTR模型初始化完成，模型类型: {model_type}, 模型路径: {self.model_path}")
    
    def set_feature_extractor(self, feature_extractor: LTRFeatureExtractor):
        """设置特征提取器"""
        self.feature_extractor = feature_extractor
        
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        加载训练好的模型
        
        Args:
            model_path: 模型文件路径，为None则使用默认路径
            
        Returns:
            是否加载成功
        """
        try:
            success = self.trainer.load_model(model_path)
            if success:
                self.is_trained = True
                logger.info("LTR模型加载成功")
            else:
                logger.error("LTR模型加载失败")
            return success
        except Exception as e:
            logger.error(f"LTR模型加载异常: {e}")
            return False
    
    def predict_ranking_scores(self, query_text: str, 
                             candidates: List[Dict[str, Any]]) -> List[float]:
        """
        预测候选结果的排序分数
        
        Args:
            query_text: 查询文本
            candidates: 候选结果列表，每个包含id, vector等字段
            
        Returns:
            排序分数列表（分数越高排序越靠前）
        """
        try:
            if not self.is_trained:
                logger.warning("模型未训练，返回默认分数")
                return [candidate.get('similarity', 0.0) for candidate in candidates]
            
            if self.feature_extractor is None:
                logger.error("特征提取器未设置")
                return [0.0] * len(candidates)
            
            # 提取排序特征（神经网络或传统特征）
            features = self.feature_extractor.extract_ranking_features(query_text, candidates)
            
            if not features:
                logger.warning("特征提取失败，返回默认分数")
                return [candidate.get('similarity', 0.0) for candidate in candidates]
            
            # 预测排序分数（自动适配模型类型）
            scores = self.trainer.predict_ranking_scores(features)
            
            if not scores:
                logger.warning("排序分数预测失败，返回默认分数")
                return [candidate.get('similarity', 0.0) for candidate in candidates]
            
            return scores
            
        except Exception as e:
            logger.error(f"排序分数预测异常: {e}")
            return [0.0] * len(candidates)
    
    def rerank(self, query_text: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        重新排序候选结果
        
        Args:
            query_text: 查询文本  
            candidates: 候选结果列表
            
        Returns:
            重新排序后的结果列表
        """
        try:
            if not candidates:
                return candidates
            
            # 预测排序分数
            ranking_scores = self.predict_ranking_scores(query_text, candidates)
            
            # 将分数添加到候选结果中
            for i, candidate in enumerate(candidates):
                if i < len(ranking_scores):
                    candidate['ltr_score'] = ranking_scores[i]
                else:
                    candidate['ltr_score'] = candidate.get('similarity', 0.0)
            
            # 按LTR分数重新排序（降序）
            reranked_candidates = sorted(
                candidates, 
                key=lambda x: x.get('ltr_score', 0.0), 
                reverse=True
            )
            
            # 更新排序位置
            for i, candidate in enumerate(reranked_candidates):
                candidate['rank'] = i + 1
            
            logger.info(f"LTR重排序完成，候选数: {len(reranked_candidates)}")
            return reranked_candidates
            
        except Exception as e:
            logger.error(f"LTR重排序异常: {e}")
            return candidates
    
    def get_feature_importance(self) -> Dict[str, float]:
        """
        获取特征重要性
        
        Returns:
            特征重要性字典
        """
        try:
            if not self.is_trained:
                logger.warning("模型未训练，无法获取特征重要性")
                return {}
            
            return self.trainer.get_feature_importance()
            
        except Exception as e:
            logger.error(f"获取特征重要性异常: {e}")
            return {}
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        获取模型信息
        
        Returns:
            模型信息字典
        """
        try:
            trainer_info = self.trainer.get_model_info()
            
            return {
                **trainer_info,
                'model_path': self.model_path,
                'model_type': self.model_type,
                'has_feature_extractor': self.feature_extractor is not None,
                'is_ready': self.is_trained and self.feature_extractor is not None
            }
            
        except Exception as e:
            logger.error(f"获取模型信息异常: {e}")
            return {'error': str(e)}
    
    def is_ready(self) -> bool:
        """
        检查模型是否准备就绪
        
        Returns:
            是否可以进行预测
        """
        return self.is_trained and self.feature_extractor is not None