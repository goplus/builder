"""
LTR模型训练器：基于神经网络的学习排序训练器
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from database.user_feedback.models import TrainingDataset
from .neural_network import NeuralNetworkTrainer

logger = logging.getLogger(__name__)


class LTRTrainer:
    """LTR模型训练器：基于神经网络的学习排序训练器"""
    
    def __init__(self, model_save_path: str = "models/ltr_model.pth", max_history_size: int = 100):
        """
        初始化神经网络训练器
        
        Args:
            model_save_path: 神经网络模型保存路径
            max_history_size: 训练历史记录最大保存数量
        """
        self.model_save_path = model_save_path
        self.nn_trainer = NeuralNetworkTrainer(model_save_path, max_history_size)
        
        logger.info(f"LTR神经网络训练器初始化完成，模型保存路径: {model_save_path}")
    
    def train_model(self, dataset: TrainingDataset, 
                   validation_split: float = 0.2,
                   **kwargs) -> Dict[str, Any]:
        """
        训练神经网络LTR模型
        
        Args:
            dataset: 训练数据集
            validation_split: 验证集比例
            **kwargs: 神经网络训练参数
                - epochs: 训练轮数（默认100）
                - batch_size: 批次大小（默认64）
                - learning_rate: 学习率（默认0.001）
                - early_stopping_patience: 早停耐心值（默认10）
            
        Returns:
            训练结果统计
        """
        try:
            if len(dataset) == 0:
                raise ValueError("训练数据集为空")
            
            logger.info(f"开始训练神经网络LTR模型，数据集大小: {len(dataset)}")
            
            # 提取特征和标签
            features, labels = dataset.get_features_and_labels()
            
            # 提取神经网络特定参数
            epochs = kwargs.get('epochs', 100)
            batch_size = kwargs.get('batch_size', 64)
            learning_rate = kwargs.get('learning_rate', 0.001)
            early_stopping_patience = kwargs.get('early_stopping_patience', 10)
            
            # 训练神经网络
            training_result = self.nn_trainer.train_model(
                features=features,
                labels=labels,
                validation_split=validation_split,
                epochs=epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
                early_stopping_patience=early_stopping_patience
            )
            
            logger.info("神经网络LTR模型训练完成")
            return training_result
            
        except Exception as e:
            logger.error(f"神经网络LTR模型训练失败: {e}")
            raise
    
    
    
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        加载训练好的神经网络模型
        
        Args:
            model_path: 模型路径，为None则使用默认路径
            
        Returns:
            是否加载成功
        """
        try:
            success = self.nn_trainer.load_model(model_path)
            logger.info(f"神经网络模型加载{'成功' if success else '失败'}")
            return success
            
        except Exception as e:
            logger.error(f"神经网络模型加载失败: {e}")
            return False
    
    def predict(self, features: List[List[float]]) -> List[float]:
        """
        使用训练好的神经网络进行预测
        
        Args:
            features: 特征列表
            
        Returns:
            预测分数列表
        """
        try:
            return self.nn_trainer.predict(features)
            
        except Exception as e:
            logger.error(f"神经网络预测失败: {e}")
            return []
    
    def predict_ranking_scores(self, features: List[List[float]]) -> List[float]:
        """
        为排序任务预测分数
        
        Args:
            features: 特征列表
            
        Returns:
            排序分数列表（分数越高排序越靠前）
        """
        try:
            predictions = self.predict(features)
            
            # 将概率分数转换为排序分数
            # 概率越高，说明该候选结果越好，排序越靠前
            return predictions
            
        except Exception as e:
            logger.error(f"排序分数预测失败: {e}")
            return []
    
    def get_feature_importance(self) -> Dict[str, float]:
        """获取特征重要性（神经网络暂不支持）"""
        logger.warning("神经网络模型暂不支持特征重要性分析")
        return {}
    
    def is_trained(self) -> bool:
        """检查神经网络是否已训练"""
        return self.nn_trainer.is_trained()
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取神经网络模型信息"""
        return self.nn_trainer.get_model_info()
    
    
    def get_last_training_date(self):
        """获取最后一次训练的日期"""
        return self.nn_trainer.get_last_training_date()
    
    def retrain_with_new_data(self, new_dataset: TrainingDataset,
                            existing_model_path: Optional[str] = None) -> Dict[str, Any]:
        """
        使用新数据增量训练神经网络
        
        Args:
            new_dataset: 新的训练数据
            existing_model_path: 现有模型路径
            
        Returns:
            训练结果
        """
        try:
            logger.info(f"开始神经网络增量训练，新数据大小: {len(new_dataset)}")
            
            features, labels = new_dataset.get_features_and_labels()
            result = self.nn_trainer.retrain_with_new_data(features, labels, existing_model_path)
            
            logger.info("神经网络增量训练完成")
            return result
            
        except Exception as e:
            logger.error(f"神经网络增量训练失败: {e}")
            raise
