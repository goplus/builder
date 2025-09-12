"""
用户反馈数据模型定义
"""

from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime


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
        """提取特征向量用于训练
        
        特征包括：
        - query向量与better图片向量的余弦相似度
        - query向量与worse图片向量的余弦相似度  
        - better图片向量与worse图片向量的余弦相似度
        - 向量间的点积、欧氏距离等交互特征
        """
        import numpy as np
        
        query_vec = np.array(self.query_vector)
        better_vec = np.array(self.pic_vector_better)
        worse_vec = np.array(self.pic_vector_worse)
        
        return compute_pairwise_features(query_vec, better_vec, worse_vec)


def compute_pairwise_features(query_vec, better_vec, worse_vec) -> List[float]:
    """
    统一的pair-wise特征计算函数，供训练和预测阶段共用
    
    设计说明：
    - 该函数计算query、better、worse三个向量之间的pair-wise特征
    - 训练时：better是用户选择的图片，worse是未选择的图片
    - 预测时：better是当前候选图片，worse是动态参考向量（候选集合的平均向量）
    
    特征设计理由：
    1. 相似度特征：衡量query与两个图片的语义匹配程度
    2. 距离特征：衡量向量空间中的几何距离关系
    3. 差异特征：直接比较better vs worse的相对优劣
    4. 长度特征：向量的模长反映了特征的激活强度
    
    Args:
        query_vec: 查询向量 (numpy array)
        better_vec: 更好的图片向量 (numpy array) 
        worse_vec: 更差的图片向量 (numpy array)
        
    Returns:
        10维特征向量列表
    """
    import numpy as np
    
    # 余弦相似度特征（假设向量已归一化）
    query_better_sim = np.dot(query_vec, better_vec)
    query_worse_sim = np.dot(query_vec, worse_vec)
    better_worse_sim = np.dot(better_vec, worse_vec)
    
    # 相似度差异特征 - 衡量better相对于worse的优势
    sim_diff = query_better_sim - query_worse_sim
    
    # 欧氏距离特征
    query_better_dist = np.linalg.norm(query_vec - better_vec)
    query_worse_dist = np.linalg.norm(query_vec - worse_vec)
    dist_diff = query_worse_dist - query_better_dist  # 距离越小越好，所以worse-better
    
    # 向量长度特征 - 反映特征激活强度
    query_norm = np.linalg.norm(query_vec)
    better_norm = np.linalg.norm(better_vec)
    worse_norm = np.linalg.norm(worse_vec)
    
    return [
        query_better_sim,      # query与better图片相似度
        query_worse_sim,       # query与worse图片相似度
        better_worse_sim,      # better与worse图片相似度
        sim_diff,              # 相似度差异（better - worse）
        query_better_dist,     # query与better图片距离
        query_worse_dist,      # query与worse图片距离
        dist_diff,             # 距离差异（worse - better）
        query_norm,            # query向量长度
        better_norm,           # better图片向量长度
        worse_norm,            # worse图片向量长度
    ]


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