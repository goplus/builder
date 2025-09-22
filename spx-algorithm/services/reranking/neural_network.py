"""
神经网络模型：用于学习排序的深度学习模型
"""

import logging
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import pickle
import joblib
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class RerankingNeuralNetwork(nn.Module):
    """
    重排序神经网络模型
    
    架构：
    输入层: (3d + 6)维 -> 隐藏层1: 512维 -> 隐藏层2: 256维 -> 隐藏层3: 128维 -> 输出层: 1维
    默认输入维度: 3*512 + 6 = 1542维
    """
    
    def __init__(self, input_dim: int, hidden_dims: List[int] = None, dropout_rates: List[float] = None):
        """
        初始化神经网络
        
        Args:
            input_dim: 输入特征维度
            hidden_dims: 隐藏层维度列表，默认[512, 256, 128]
            dropout_rates: Dropout率列表，默认[0.3, 0.2, 0.1]
        """
        super(RerankingNeuralNetwork, self).__init__()
        
        if hidden_dims is None:
            hidden_dims = [512, 256, 128]
        if dropout_rates is None:
            dropout_rates = [0.3, 0.2, 0.1]
        
        self.input_dim = input_dim
        self.hidden_dims = hidden_dims
        self.dropout_rates = dropout_rates
        
        # 构建网络层
        layers = []
        prev_dim = input_dim
        
        for i, (hidden_dim, dropout_rate) in enumerate(zip(hidden_dims, dropout_rates)):
            # 线性层
            layers.append(nn.Linear(prev_dim, hidden_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout_rate))
            prev_dim = hidden_dim
        
        # 输出层
        layers.append(nn.Linear(prev_dim, 1))
        layers.append(nn.Sigmoid())
        
        self.network = nn.Sequential(*layers)
        
        # 初始化权重
        self._initialize_weights()
        
        logger.info(f"神经网络初始化完成: input_dim={input_dim}, hidden_dims={hidden_dims}")
    
    def _initialize_weights(self):
        """初始化网络权重"""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.constant_(module.bias, 0)
    
    def forward(self, x):
        """前向传播"""
        return self.network(x)
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        total_params = sum(p.numel() for p in self.parameters())
        trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)
        
        return {
            'input_dim': self.input_dim,
            'hidden_dims': self.hidden_dims,
            'dropout_rates': self.dropout_rates,
            'total_parameters': total_params,
            'trainable_parameters': trainable_params
        }


class NeuralNetworkTrainer:
    """神经网络训练器"""
    
    def __init__(self, model_save_path: str = "models/neural_rerank_model.pth", max_history_size: int = 100):
        """
        初始化训练器
        
        Args:
            model_save_path: 模型保存路径
            max_history_size: 训练历史记录最大保存数量
        """
        self.model_save_path = model_save_path
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.training_history = []
        self.max_history_size = max_history_size
        
        # 确保模型目录存在
        Path(self.model_save_path).parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"神经网络训练器初始化完成，设备: {self.device}, 模型保存路径: {model_save_path}")
    
    def train_model(self, 
                   features: List[List[float]], 
                   labels: List[int],
                   validation_split: float = 0.2,
                   epochs: int = 100,
                   batch_size: int = 64,
                   learning_rate: float = 0.001,
                   early_stopping_patience: int = 10,
                   continue_training: bool = False) -> Dict[str, Any]:
        """
        训练神经网络模型
        
        Args:
            features: 特征列表
            labels: 标签列表
            validation_split: 验证集比例
            epochs: 训练轮数
            batch_size: 批次大小
            learning_rate: 学习率
            early_stopping_patience: 早停耐心值
            continue_training: 是否继续训练现有模型（True）还是从头开始（False）
            
        Returns:
            训练结果统计
        """
        try:
            if len(features) == 0:
                raise ValueError("训练数据集为空")
            
            logger.info(f"开始训练神经网络模型，数据集大小: {len(features)}")
            
            # 转换为numpy数组
            X = np.array(features, dtype=np.float32)
            y = np.array(labels, dtype=np.float32)
            
            logger.info(f"特征维度: {X.shape}, 标签分布: {np.bincount(y.astype(int))}")
            
            # 划分训练集和验证集
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=validation_split, 
                random_state=42, stratify=y
            )
            
            # 转换为PyTorch张量
            X_train_tensor = torch.FloatTensor(X_train).to(self.device)
            y_train_tensor = torch.FloatTensor(y_train).to(self.device)
            X_val_tensor = torch.FloatTensor(X_val).to(self.device)
            y_val_tensor = torch.FloatTensor(y_val).to(self.device)
            
            # 创建数据加载器
            train_dataset = torch.utils.data.TensorDataset(X_train_tensor, y_train_tensor)
            train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
            
            # 初始化或继续训练模型
            input_dim = X.shape[1]
            if continue_training and self.model is not None:
                # 验证现有模型的输入维度是否匹配
                if self.model.input_dim != input_dim:
                    logger.warning(f"现有模型输入维度({self.model.input_dim})与新数据维度({input_dim})不匹配，将重新初始化模型")
                    self.model = RerankingNeuralNetwork(input_dim).to(self.device)
                else:
                    logger.info(f"继续训练现有模型，输入维度: {input_dim}")
            else:
                # 重新初始化模型
                logger.info(f"初始化新模型，输入维度: {input_dim}")
                self.model = RerankingNeuralNetwork(input_dim).to(self.device)
            
            # 定义损失函数和优化器
            criterion = nn.BCELoss()
            optimizer = optim.Adam(self.model.parameters(), lr=learning_rate)
            
            # 训练循环
            train_losses = []
            val_losses = []
            val_accuracies = []
            best_val_loss = float('inf')
            patience_counter = 0
            
            logger.info("开始神经网络训练...")
            
            for epoch in range(epochs):
                # 训练阶段
                self.model.train()
                epoch_train_loss = 0.0
                
                for batch_X, batch_y in train_loader:
                    optimizer.zero_grad()
                    outputs = self.model(batch_X).squeeze()
                    loss = criterion(outputs, batch_y)
                    loss.backward()
                    optimizer.step()
                    epoch_train_loss += loss.item()
                
                avg_train_loss = epoch_train_loss / len(train_loader)
                train_losses.append(avg_train_loss)
                
                # 验证阶段
                self.model.eval()
                with torch.no_grad():
                    val_outputs = self.model(X_val_tensor).squeeze()
                    val_loss = criterion(val_outputs, y_val_tensor).item()
                    val_losses.append(val_loss)
                    
                    # 计算验证准确率
                    val_predictions = (val_outputs > 0.5).float()
                    val_accuracy = (val_predictions == y_val_tensor).float().mean().item()
                    val_accuracies.append(val_accuracy)
                
                # 记录训练过程
                if (epoch + 1) % 10 == 0:
                    logger.info(f"Epoch {epoch+1}/{epochs}, "
                              f"Train Loss: {avg_train_loss:.4f}, "
                              f"Val Loss: {val_loss:.4f}, "
                              f"Val Acc: {val_accuracy:.4f}")
                
                # 早停检查
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    patience_counter = 0
                    # 保存最佳模型
                    self._save_checkpoint()
                else:
                    patience_counter += 1
                    if patience_counter >= early_stopping_patience:
                        logger.info(f"早停触发，在第 {epoch+1} 轮停止训练")
                        break
            
            # 加载最佳模型
            self._load_checkpoint()
            
            # 评估模型
            train_metrics = self._evaluate_model(X_train, y_train, "训练集")
            val_metrics = self._evaluate_model(X_val, y_val, "验证集")
            
            # 保存最终模型
            self._save_model()
            
            # 记录训练历史
            training_record = {
                'timestamp': datetime.now().isoformat(),
                'dataset_size': len(features),
                'train_size': len(X_train),
                'val_size': len(X_val),
                'input_dim': input_dim,
                'epochs_trained': epoch + 1,
                'train_metrics': train_metrics,
                'val_metrics': val_metrics,
                'model_info': self.model.get_model_info(),
                'training_params': {
                    'epochs': epochs,
                    'batch_size': batch_size,
                    'learning_rate': learning_rate,
                    'early_stopping_patience': early_stopping_patience
                },
                'model_path': self.model_save_path
            }
            
            self.training_history.append(training_record)
            self._cleanup_training_history()
            
            logger.info("神经网络训练完成")
            logger.info(f"训练集性能: {train_metrics}")
            logger.info(f"验证集性能: {val_metrics}")
            
            return training_record
            
        except Exception as e:
            logger.error(f"神经网络训练失败: {e}")
            raise
    
    def _evaluate_model(self, X: np.ndarray, y: np.ndarray, dataset_name: str) -> Dict[str, float]:
        """评估模型性能"""
        try:
            self.model.eval()
            with torch.no_grad():
                X_tensor = torch.FloatTensor(X).to(self.device)
                y_pred_proba = self.model(X_tensor).squeeze().cpu().numpy()
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
            return roc_auc_score(y_true, y_scores)
        except:
            return 0.0
    
    def _save_checkpoint(self):
        """保存检查点"""
        if self.model is not None:
            checkpoint_path = self.model_save_path.replace('.pth', '_checkpoint.pth')
            torch.save(self.model.state_dict(), checkpoint_path)
    
    def _load_checkpoint(self):
        """加载检查点"""
        if self.model is not None:
            checkpoint_path = self.model_save_path.replace('.pth', '_checkpoint.pth')
            if Path(checkpoint_path).exists():
                self.model.load_state_dict(torch.load(checkpoint_path, map_location=self.device))
    
    def _save_model(self):
        """保存模型"""
        try:
            model_data = {
                'model_state_dict': self.model.state_dict(),
                'model_config': {
                    'input_dim': self.model.input_dim,
                    'hidden_dims': self.model.hidden_dims,
                    'dropout_rates': self.model.dropout_rates
                },
                'training_history': self.training_history,
                'save_time': datetime.now().isoformat()
            }
            
            torch.save(model_data, self.model_save_path)
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
            
            model_data = torch.load(path, map_location=self.device)
            
            # 重建模型
            model_config = model_data['model_config']
            self.model = RerankingNeuralNetwork(
                input_dim=model_config['input_dim'],
                hidden_dims=model_config['hidden_dims'],
                dropout_rates=model_config['dropout_rates']
            ).to(self.device)
            
            # 加载权重
            self.model.load_state_dict(model_data['model_state_dict'])
            self.model.eval()
            
            # 加载训练历史
            self.training_history = model_data.get('training_history', [])
            self._cleanup_training_history()
            
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
            
            self.model.eval()
            with torch.no_grad():
                X = torch.FloatTensor(features).to(self.device)
                predictions = self.model(X).squeeze().cpu().numpy()
                
                # 确保返回的是列表
                if predictions.ndim == 0:
                    predictions = [float(predictions)]
                else:
                    predictions = predictions.tolist()
            
            return predictions
            
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
        return self.predict(features)
    
    def is_trained(self) -> bool:
        """检查模型是否已训练"""
        return self.model is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        info = {
            'is_trained': self.is_trained(),
            'model_path': self.model_save_path,
            'model_exists': Path(self.model_save_path).exists(),
            'device': str(self.device),
            'training_history_count': len(self.training_history)
        }
        
        if self.model is not None:
            info.update(self.model.get_model_info())
        
        if self.training_history:
            latest_training = self.training_history[-1]
            info.update({
                'latest_training_time': latest_training.get('timestamp'),
                'latest_dataset_size': latest_training.get('dataset_size'),
                'latest_val_metrics': latest_training.get('val_metrics')
            })
        
        return info
    
    def _cleanup_training_history(self):
        """清理训练历史记录，保留最近的记录"""
        cleanup_threshold = self.max_history_size + 10
        
        if len(self.training_history) > cleanup_threshold:
            old_count = len(self.training_history)
            self.training_history = self.training_history[-self.max_history_size:]
            removed_count = old_count - len(self.training_history)
            logger.info(f"清理训练历史记录：删除了 {removed_count} 条旧记录，保留最近 {len(self.training_history)} 条")
    
    def get_last_training_date(self):
        """
        获取最后一次训练的日期
        
        Returns:
            最后训练日期，如果没有训练记录则返回None
        """
        try:
            if not self.training_history:
                return None
            
            latest_training = self.training_history[-1]
            timestamp_str = latest_training.get('timestamp')
            
            if timestamp_str:
                from datetime import datetime
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                return timestamp.date()
            
            return None
            
        except Exception as e:
            logger.error(f"获取最后训练日期失败: {e}")
            return None
    
    def retrain_with_new_data(self, features: List[List[float]], labels: List[int],
                            existing_model_path: Optional[str] = None) -> Dict[str, Any]:
        """
        使用新数据增量训练模型
        
        此方法会加载现有模型（如果存在）并在其基础上继续训练，而不是从头开始重新训练。
        
        Args:
            features: 新的训练特征
            labels: 新的训练标签
            existing_model_path: 现有模型路径，如果为None则使用默认路径
            
        Returns:
            训练结果
        """
        try:
            logger.info(f"开始增量训练，新数据大小: {len(features)}")
            
            # 加载现有模型（如果存在）
            if existing_model_path and Path(existing_model_path).exists():
                self.load_model(existing_model_path)
                logger.info("已加载现有模型进行增量训练")
            
            # 使用新数据进行增量训练
            result = self.train_model(features, labels, continue_training=True)
            
            logger.info("增量训练完成")
            return result
            
        except Exception as e:
            logger.error(f"增量训练失败: {e}")
            raise
        