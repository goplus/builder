"""
LTR特征提取器：基于OpenCLIP向量生成pair-wise训练特征
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from ..image_matching.clip_service import CLIPService
from database.user_feedback.models import UserFeedback, PairwiseTrainingSample, TrainingDataset

logger = logging.getLogger(__name__)


class LTRFeatureExtractor:
    """LTR特征提取器"""
    
    def __init__(self, clip_service: CLIPService):
        """
        初始化特征提取器
        
        Args:
            clip_service: CLIP服务实例，复用现有的模型
        """
        self.clip_service = clip_service
        self.vector_cache = {}  # 缓存向量避免重复计算
        
        logger.info("LTR特征提取器初始化完成")
    
    def build_training_dataset(self, feedback_list: List[UserFeedback],
                             image_vectors: Dict[int, List[float]]) -> TrainingDataset:
        """
        从用户反馈构建pair-wise训练数据集
        
        Args:
            feedback_list: 用户反馈列表
            image_vectors: 图片ID到向量的映射 {pic_id: vector}
            
        Returns:
            训练数据集
        """
        dataset = TrainingDataset(samples=[])
        
        logger.info(f"开始构建训练数据集，反馈记录数: {len(feedback_list)}")
        
        valid_feedback_count = 0
        total_samples = 0
        
        for feedback in feedback_list:
            try:
                if not feedback.is_valid():
                    logger.warning(f"无效的反馈数据: {feedback.id}")
                    continue
                
                # 提取查询向量
                query_vector = self._get_query_vector(feedback.query)
                if query_vector is None:
                    logger.warning(f"查询向量提取失败: {feedback.query}")
                    continue
                
                # 检查所有推荐图片的向量是否存在
                recommended_pics = feedback.get_recommended_pics()
                missing_pics = [pic_id for pic_id in recommended_pics if pic_id not in image_vectors]
                
                if missing_pics:
                    logger.warning(f"缺失图片向量: {missing_pics}, 跳过反馈 {feedback.id}")
                    continue
                
                # 生成pair-wise训练样本
                samples = self._generate_pairwise_samples(
                    feedback, query_vector.tolist(), image_vectors
                )
                
                for sample in samples:
                    dataset.add_sample(sample)
                
                valid_feedback_count += 1
                total_samples += len(samples)
                
                if valid_feedback_count % 100 == 0:
                    logger.info(f"已处理 {valid_feedback_count} 条反馈，生成 {total_samples} 个训练样本")
                
            except Exception as e:
                logger.error(f"处理反馈数据异常 {feedback.id}: {e}")
                continue
        
        logger.info(f"训练数据集构建完成: 有效反馈={valid_feedback_count}, 训练样本={len(dataset)}")
        return dataset
    
    def _generate_pairwise_samples(self, feedback: UserFeedback, 
                                 query_vector: List[float],
                                 image_vectors: Dict[int, List[float]]) -> List[PairwiseTrainingSample]:
        """
        为单条反馈生成pair-wise训练样本
        
        Args:
            feedback: 用户反馈
            query_vector: 查询向量
            image_vectors: 图片向量映射
            
        Returns:
            pair-wise样本列表
        """
        samples = []
        chosen_id = feedback.choose_id
        non_chosen_ids = feedback.get_non_chosen_pics()
        
        chosen_vector = image_vectors[chosen_id]
        
        # 为每个未选择的图片生成一个正样本（chosen > non_chosen）
        for non_chosen_id in non_chosen_ids:
            non_chosen_vector = image_vectors[non_chosen_id]
            
            sample = PairwiseTrainingSample(
                query=feedback.query,
                query_vector=query_vector,
                pic_id_better=chosen_id,
                pic_vector_better=chosen_vector,
                pic_id_worse=non_chosen_id,
                pic_vector_worse=non_chosen_vector,
                label=1,  # chosen优于non_chosen
                feedback_id=feedback.id
            )
            
            samples.append(sample)
        
        return samples
    
    def _get_query_vector(self, query_text: str) -> Optional[np.ndarray]:
        """
        获取查询文本的向量表示（带缓存）
        
        Args:
            query_text: 查询文本
            
        Returns:
            查询向量，失败返回None
        """
        if query_text in self.vector_cache:
            return self.vector_cache[query_text]
        
        try:
            vector = self.clip_service.encode_text(query_text)
            if vector is not None:
                self.vector_cache[query_text] = vector
            return vector
            
        except Exception as e:
            logger.error(f"查询向量提取失败: {query_text}, 错误: {e}")
            return None
    
    def extract_prediction_features(self, query_text: str, 
                                  candidate_pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]]) -> List[List[float]]:
        """
        为预测阶段提取特征
        
        Args:
            query_text: 查询文本
            candidate_pairs: 候选图片对列表 [(pic_a, pic_b), ...]
                           每个元素是包含id和vector字段的字典对
            
        Returns:
            特征向量列表
        """
        try:
            query_vector = self._get_query_vector(query_text)
            if query_vector is None:
                logger.error(f"查询向量提取失败: {query_text}")
                return []
            
            features_list = []
            
            for pic_a, pic_b in candidate_pairs:
                # 构造临时的pair-wise样本来复用特征提取逻辑
                temp_sample = PairwiseTrainingSample(
                    query=query_text,
                    query_vector=query_vector.tolist(),
                    pic_id_better=pic_a['id'],
                    pic_vector_better=pic_a['vector'],
                    pic_id_worse=pic_b['id'],
                    pic_vector_worse=pic_b['vector'],
                    label=1,  # 占位符
                    feedback_id=-1  # 占位符
                )
                
                features = temp_sample.get_feature_vector()
                features_list.append(features)
            
            return features_list
            
        except Exception as e:
            logger.error(f"预测特征提取失败: {e}")
            return []
    
    def extract_ranking_features(self, query_text: str, 
                               candidates: List[Dict[str, Any]]) -> List[List[float]]:
        """
        为排序预测提取特征
        
        Args:
            query_text: 查询文本
            candidates: 候选结果列表，每个包含id, vector等字段
            
        Returns:
            每个候选结果的特征向量列表
        """
        try:
            query_vector = self._get_query_vector(query_text)
            if query_vector is None:
                return []
            
            features_list = []
            query_vec = np.array(query_vector)
            
            for candidate in candidates:
                pic_vector = np.array(candidate.get('vector', []))
                if len(pic_vector) == 0:
                    logger.warning(f"候选结果缺少向量: {candidate.get('id')}")
                    features_list.append([0.0] * 10)  # 填充零向量
                    continue
                
                # 计算单个候选结果的特征
                similarity = np.dot(query_vec, pic_vector)
                distance = np.linalg.norm(query_vec - pic_vector)
                query_norm = np.linalg.norm(query_vec)
                pic_norm = np.linalg.norm(pic_vector)
                
                # 原始相似度分数（来自粗排）
                original_score = candidate.get('similarity', 0.0)
                
                features = [
                    similarity,           # query-pic相似度
                    distance,            # query-pic欧氏距离
                    query_norm,          # query向量长度
                    pic_norm,            # pic向量长度
                    original_score,      # 原始相似度分数
                    len(query_text),     # 查询长度
                    len(query_text.split()),  # 查询词数
                    candidate.get('rank', 0),  # 原始排序位置
                    # 预留更多特征位
                    0.0,
                    0.0
                ]
                
                features_list.append(features)
            
            return features_list
            
        except Exception as e:
            logger.error(f"排序特征提取失败: {e}")
            return []
    
    def get_feature_names(self) -> List[str]:
        """获取特征名称列表"""
        return [
            'query_better_similarity',
            'query_worse_similarity', 
            'better_worse_similarity',
            'similarity_difference',
            'query_better_distance',
            'query_worse_distance',
            'distance_difference',
            'query_norm',
            'better_norm',
            'worse_norm'
        ]
    
    def get_ranking_feature_names(self) -> List[str]:
        """获取排序特征名称列表"""
        return [
            'query_pic_similarity',
            'query_pic_distance',
            'query_norm',
            'pic_norm',
            'original_score',
            'query_length',
            'query_word_count',
            'original_rank',
            'reserved_1',
            'reserved_2'
        ]
    
    def clear_cache(self):
        """清空向量缓存"""
        self.vector_cache.clear()
        logger.info("特征提取器缓存已清空")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        return {
            'cache_size': len(self.vector_cache),
            'cached_queries': list(self.vector_cache.keys())[:10]  # 显示前10个
        }