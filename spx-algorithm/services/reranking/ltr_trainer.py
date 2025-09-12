"""
LTR模型训练器：基于LightGBM实现pair-wise学习排序
"""

import logging
import pickle
import joblib
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from database.user_feedback.models import TrainingDataset
from .feature_extractor import LTRFeatureExtractor

logger = logging.getLogger(__name__)


class LTRTrainer:
    """LTR模型训练器"""
    
    def __init__(self, model_save_path: str = "models/ltr_model.pkl"):
        """
        初始化训练器
        
        Args:
            model_save_path: 模型保存路径
        """
        self.model_save_path = model_save_path
        self.model = None
        self.feature_names = []
        self.training_history = []
        
        # 确保模型目录存在
        Path(self.model_save_path).parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"LTR训练器初始化完成，模型保存路径: {model_save_path}")
    
    def train_model(self, dataset: TrainingDataset, 
                   validation_split: float = 0.2,
                   lgb_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        训练LTR模型
        
        Args:
            dataset: 训练数据集
            validation_split: 验证集比例
            lgb_params: LightGBM参数
            
        Returns:
            训练结果统计
        """
        try:
            if len(dataset) == 0:
                raise ValueError("训练数据集为空")
            
            logger.info(f"开始训练LTR模型，数据集大小: {len(dataset)}")
            
            # 提取特征和标签
            features, labels = dataset.get_features_and_labels()
            features = np.array(features)
            labels = np.array(labels)
            
            logger.info(f"特征维度: {features.shape}, 标签分布: {np.bincount(labels)}")
            
            # 划分训练集和验证集
            X_train, X_val, y_train, y_val = train_test_split(
                features, labels, test_size=validation_split, 
                random_state=42, stratify=labels
            )
            
            # 设置默认的LightGBM参数
            if lgb_params is None:
                lgb_params = {
                    'objective': 'binary',
                    'metric': 'binary_logloss',
                    'boosting_type': 'gbdt',
                    'num_leaves': 31,
                    'learning_rate': 0.1,
                    'feature_fraction': 0.8,
                    'bagging_fraction': 0.8,
                    'bagging_freq': 5,
                    'verbose': -1,
                    'random_state': 42
                }
            
            # 创建LightGBM数据集
            train_data = lgb.Dataset(X_train, label=y_train)
            val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
            
            # 训练模型
            logger.info("开始LightGBM模型训练...")
            self.model = lgb.train(
                lgb_params,
                train_data,
                valid_sets=[val_data],
                num_boost_round=1000,
                callbacks=[
                    lgb.early_stopping(stopping_rounds=50),
                    lgb.log_evaluation(period=100)
                ]
            )
            
            # 评估模型
            train_metrics = self._evaluate_model(X_train, y_train, "训练集")
            val_metrics = self._evaluate_model(X_val, y_val, "验证集")
            
            # 保存模型
            self._save_model()
            
            # 记录训练历史
            training_record = {
                'timestamp': datetime.now().isoformat(),
                'dataset_size': len(dataset),
                'train_size': len(X_train),
                'val_size': len(X_val),
                'train_metrics': train_metrics,
                'val_metrics': val_metrics,
                'lgb_params': lgb_params,
                'model_path': self.model_save_path
            }
            
            self.training_history.append(training_record)
            
            logger.info("LTR模型训练完成")
            logger.info(f"训练集性能: {train_metrics}")
            logger.info(f"验证集性能: {val_metrics}")
            
            return training_record
            
        except Exception as e:
            logger.error(f"LTR模型训练失败: {e}")
            raise
    
    def _evaluate_model(self, X: np.ndarray, y: np.ndarray, dataset_name: str) -> Dict[str, float]:
        """评估模型性能"""
        try:
            y_pred_proba = self.model.predict(X)
            y_pred = (y_pred_proba > 0.5).astype(int)
            
            metrics = {
                'accuracy': accuracy_score(y, y_pred),
                'precision': precision_score(y, y_pred, zero_division=0),
                'recall': recall_score(y, y_pred, zero_division=0),
                'f1_score': f1_score(y, y_pred, zero_division=0),
                'auc_score': self._calculate_auc(y, y_pred_proba)
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"模型评估失败 ({dataset_name}): {e}")
            return {}
    
    def _calculate_auc(self, y_true: np.ndarray, y_scores: np.ndarray) -> float:
        """计算AUC分数"""
        try:
            from sklearn.metrics import roc_auc_score
            return roc_auc_score(y_true, y_scores)
        except:
            return 0.0
    
    def _save_model(self):
        """保存模型"""
        try:
            model_data = {
                'model': self.model,
                'feature_names': self.feature_names,
                'training_history': self.training_history,
                'save_time': datetime.now().isoformat()
            }
            
            joblib.dump(model_data, self.model_save_path)
            logger.info(f"模型已保存到: {self.model_save_path}")
            
        except Exception as e:
            logger.error(f"模型保存失败: {e}")
            raise
    
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        加载训练好的模型
        
        Args:
            model_path: 模型路径，为None则使用默认路径
            
        Returns:
            是否加载成功
        """
        try:
            path = model_path or self.model_save_path
            
            if not Path(path).exists():
                logger.error(f"模型文件不存在: {path}")
                return False
            
            model_data = joblib.load(path)
            
            self.model = model_data['model']
            self.feature_names = model_data.get('feature_names', [])
            self.training_history = model_data.get('training_history', [])
            
            logger.info(f"模型加载成功: {path}")
            return True
            
        except Exception as e:
            logger.error(f"模型加载失败: {e}")
            return False
    
    def predict(self, features: List[List[float]]) -> List[float]:
        """
        使用训练好的模型进行预测
        
        Args:
            features: 特征列表
            
        Returns:
            预测分数列表
        """
        try:
            if self.model is None:
                logger.error("模型未加载，无法进行预测")
                return []
            
            if not features:
                return []
            
            features_array = np.array(features)
            predictions = self.model.predict(features_array)
            
            return predictions.tolist()
            
        except Exception as e:
            logger.error(f"模型预测失败: {e}")
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
        """获取特征重要性"""
        try:
            if self.model is None:
                return {}
            
            importance = self.model.feature_importance()
            feature_names = self.feature_names if self.feature_names else [f"feature_{i}" for i in range(len(importance))]
            
            return dict(zip(feature_names, importance.tolist()))
            
        except Exception as e:
            logger.error(f"获取特征重要性失败: {e}")
            return {}
    
    def is_trained(self) -> bool:
        """检查模型是否已训练"""
        return self.model is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        info = {
            'is_trained': self.is_trained(),
            'model_path': self.model_save_path,
            'model_exists': Path(self.model_save_path).exists(),
            'feature_count': len(self.feature_names),
            'training_history_count': len(self.training_history)
        }
        
        if self.training_history:
            latest_training = self.training_history[-1]
            info.update({
                'latest_training_time': latest_training.get('timestamp'),
                'latest_dataset_size': latest_training.get('dataset_size'),
                'latest_val_metrics': latest_training.get('val_metrics')
            })
        
        return info
    
    def retrain_with_new_data(self, new_dataset: TrainingDataset,
                            existing_model_path: Optional[str] = None) -> Dict[str, Any]:
        """
        使用新数据增量训练模型
        
        Args:
            new_dataset: 新的训练数据
            existing_model_path: 现有模型路径
            
        Returns:
            训练结果
        """
        try:
            logger.info(f"开始增量训练，新数据大小: {len(new_dataset)}")
            
            # 加载现有模型（如果存在）
            if existing_model_path and Path(existing_model_path).exists():
                self.load_model(existing_model_path)
                logger.info("已加载现有模型进行增量训练")
            
            # 使用新数据训练
            result = self.train_model(new_dataset)
            
            logger.info("增量训练完成")
            return result
            
        except Exception as e:
            logger.error(f"增量训练失败: {e}")
            raise