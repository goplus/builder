"""
用户反馈数据模型定义
"""

from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
import numpy as np


@dataclass
class UserFeedback:
    """用户反馈数据模型"""
    id: int  # 查询记录ID
    query: str  # 用户查询文本
    pic_id_1: int  # 推荐图片1
    pic_id_2: int  # 推荐图片2
    pic_id_3: int  # 推荐图片3
    pic_id_4: int  # 推荐图片4
    choose_id: int  # 用户选择的图片ID
    date: datetime  # 查询日期
    
    def get_recommended_pics(self) -> List[int]:
        """获取推荐的图片ID列表"""
        return [self.pic_id_1, self.pic_id_2, self.pic_id_3, self.pic_id_4]
    
    def get_non_chosen_pics(self) -> List[int]:
        """获取未被选择的图片ID列表"""
        all_pics = self.get_recommended_pics()
        return [pic_id for pic_id in all_pics if pic_id != self.choose_id]
    
    def is_valid(self) -> bool:
        """检查反馈数据是否有效"""
        if not self.query.strip():
            return False
        
        recommended_pics = self.get_recommended_pics()
        if len(set(recommended_pics)) != 4:  # 确保4张图片都不同
            return False
            
        if self.choose_id not in recommended_pics:  # 确保选择的图片在推荐列表中
            return False
            
        return True


@dataclass
class PairwiseTrainingSample:
    """Pair-wise训练样本"""
    query: str  # 查询文本
    query_vector: List[float]  # 查询向量
    pic_id_better: int  # 更好的图片ID
    pic_vector_better: List[float]  # 更好的图片向量
    pic_id_worse: int  # 更差的图片ID
    pic_vector_worse: List[float]  # 更差的图片向量
    label: int  # 标签：1表示better > worse
    feedback_id: int  # 原始反馈记录ID
    
    def get_feature_vector(self) -> List[float]:
        """提取简化的神经网络特征向量用于训练
        
        特征包括：
        - 原始向量特征: query_vec, better_vec, worse_vec (3d维)
        - 统计特征: 余弦相似度和欧氏距离 (6维)
        总计: 3d+6维 = 1542维 (d=512)
        """
        query_vec = np.array(self.query_vector)
        better_vec = np.array(self.pic_vector_better)
        worse_vec = np.array(self.pic_vector_worse)
        
        return compute_features(query_vec, better_vec, worse_vec)


def compute_features(query_vec, better_vec, worse_vec) -> List[float]:
    """
    简化的神经网络特征计算函数：3d+6维
    
    设计说明：
    - 该函数计算query、better、worse三个向量之间的神经网络特征
    - 训练时：better是用户选择的图片，worse是未选择的图片
    - 预测时：better是当前候选图片，worse是动态参考向量（候选集合的平均向量）
    
    简化特征设计理由：
    1. 原始向量特征：保留完整信息，让神经网络自动学习向量间的复杂交互关系
    2. 统计特征：经典相似度度量作为有价值的补充特征
    3. 移除冗余特征：去掉交互特征和对比特征，减少过拟合风险，提升训练效率
    
    Args:
        query_vec: 查询向量 (numpy array, 长度d)
        better_vec: 更好的图片向量 (numpy array, 长度d) 
        worse_vec: 更差的图片向量 (numpy array, 长度d)
        
    Returns:
        (3d+6)维特征向量列表，总计1542维 (d=512)
    """
    features = []
    
    # 1. 原始向量特征 (3d维) - 保留完整信息让神经网络自主学习
    features.extend(query_vec.tolist())   # d维
    features.extend(better_vec.tolist())  # d维
    features.extend(worse_vec.tolist())   # d维
    
    # 2. 统计特征 (6维) - 经典相似度度量作为补充
    # 余弦相似度
    cosine_sim_query_better = np.dot(query_vec, better_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(better_vec) + 1e-8)
    cosine_sim_query_worse = np.dot(query_vec, worse_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(worse_vec) + 1e-8)
    cosine_sim_better_worse = np.dot(better_vec, worse_vec) / (np.linalg.norm(better_vec) * np.linalg.norm(worse_vec) + 1e-8)
    
    # 欧氏距离
    l2_dist_query_better = np.linalg.norm(query_vec - better_vec)
    l2_dist_query_worse = np.linalg.norm(query_vec - worse_vec)
    l2_dist_better_worse = np.linalg.norm(better_vec - worse_vec)
    
    features.extend([
        cosine_sim_query_better,
        cosine_sim_query_worse,
        cosine_sim_better_worse,
        l2_dist_query_better,
        l2_dist_query_worse,
        l2_dist_better_worse
    ])
    
    return features  # 总计: 3*512 + 6 = 1542维




@dataclass
class TrainingDataset:
    """训练数据集"""
    samples: List[PairwiseTrainingSample]
    
    def get_features_and_labels(self):
        """获取特征和标签用于训练"""
        features = []
        labels = []
        
        for sample in self.samples:
            features.append(sample.get_feature_vector())
            labels.append(sample.label)
            
        return features, labels
    
    def __len__(self):
        return len(self.samples)
    
    def add_sample(self, sample: PairwiseTrainingSample):
        """添加训练样本"""
        self.samples.append(sample)