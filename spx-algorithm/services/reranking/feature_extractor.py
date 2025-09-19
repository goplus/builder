"""
LTR特征提取器：基于OpenCLIP向量生成pair-wise训练特征
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from ..image_matching.clip_service import CLIPService
from database.user_feedback.models import UserFeedback, PairwiseTrainingSample, TrainingDataset, compute_pairwise_features

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
    
    
    def extract_ranking_features(self, query_text: str, 
                               candidates: List[Dict[str, Any]]) -> List[List[float]]:
        """
        为排序预测提取pair-wise特征，使用动态参考向量方案
                
        Args:
            query_text: 查询文本
            candidates: 候选结果列表，每个包含id, vector等字段
            
        Returns:
            每个候选结果的pair-wise特征向量列表（10维）
        """
        try:
            query_vector = self._get_query_vector(query_text)
            if query_vector is None:
                logger.error(f"查询向量提取失败: {query_text}")
                return []
            
            if not candidates:
                logger.warning("候选列表为空")
                return []
            
            # 提取所有候选图片的向量
            candidate_vectors = []
            valid_candidates = []
            
            for candidate in candidates:
                pic_vector = candidate.get('vector', [])
                if len(pic_vector) == 0:
                    logger.warning(f"候选结果缺少向量: {candidate.get('id')}")
                    # 对于缺少向量的候选，返回零特征向量
                    continue
                else:
                    candidate_vectors.append(np.array(pic_vector))
                    valid_candidates.append(candidate)
            
            if not candidate_vectors:
                logger.error("所有候选结果都缺少向量数据")
                return [[0.0] * 10] * len(candidates)
            
            # 计算动态参考向量：候选集合的平均向量
            # 这个平均向量代表当前候选集合的"平均质量水平"
            reference_vector = np.mean(candidate_vectors, axis=0)
            
            query_vec = np.array(query_vector)
            features_list = []
            
            # 为每个候选图片计算pair-wise特征
            for i, candidate in enumerate(candidates):
                pic_vector = candidate.get('vector', [])
                if len(pic_vector) == 0:
                    # 对于缺少向量的候选，填充零特征向量
                    features_list.append([0.0] * 10)
                    continue
                
                pic_vec = np.array(pic_vector)
                
                # 使用统一的pair-wise特征计算函数
                # candidate作为"better"，reference_vector作为"worse"
                features = compute_pairwise_features(query_vec, pic_vec, reference_vector)
                features_list.append(features)
            
            logger.debug(f"成功提取{len(features_list)}个候选结果的pair-wise特征")
            return features_list
            
        except Exception as e:
            logger.error(f"排序特征提取失败: {e}")
            return [[0.0] * 10] * len(candidates)
    
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
        """获取排序特征名称列表（与训练时保持一致的pair-wise特征）"""
        return [
            'query_better_similarity',  # query与候选图片相似度
            'query_worse_similarity',   # query与参考向量相似度
            'better_worse_similarity',  # 候选图片与参考向量相似度
            'similarity_difference',    # 相似度差异（候选-参考）
            'query_better_distance',    # query与候选图片距离
            'query_worse_distance',     # query与参考向量距离
            'distance_difference',      # 距离差异（参考-候选）
            'query_norm',              # query向量长度
            'better_norm',             # 候选图片向量长度
            'worse_norm'               # 参考向量长度
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