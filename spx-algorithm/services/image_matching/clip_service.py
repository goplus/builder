"""
CLIP模型服务模块
"""

import logging
import torch
import open_clip
from typing import List, Optional
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class CLIPService:
    """CLIP模型服务类"""
    
    def __init__(self, model_name: str = 'ViT-B-32', pretrained: str = 'laion2b_s34b_b79k'):
        """
        初始化CLIP服务
        
        Args:
            model_name: CLIP模型名称
            pretrained: 预训练权重
        """
        self.model_name = model_name
        self.pretrained = pretrained
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        
        self._load_model()
    
    def _load_model(self):
        """加载CLIP模型"""
        try:
            self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                self.model_name, 
                pretrained=self.pretrained
            )
            self.tokenizer = open_clip.get_tokenizer(self.model_name)
            self.model = self.model.to(self.device)
            self.model.eval()
            logger.info(f"CLIP模型加载成功: {self.model_name} on {self.device}")
        except Exception as e:
            logger.error(f"CLIP模型加载失败: {e}")
            raise
    
    def encode_image(self, image: Image.Image) -> Optional[np.ndarray]:
        """
        编码单张图片
        
        Args:
            image: PIL图像对象
            
        Returns:
            图片特征向量，失败返回None
        """
        try:
            # 确保图片为RGB模式
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # 预处理图片
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                # 编码图片
                image_features = self.model.encode_image(image_tensor)
                # 归一化
                image_features /= image_features.norm(dim=-1, keepdim=True)
                
                vector = image_features.cpu().numpy().astype('float32').flatten()
                logger.debug(f"图像编码完成，向量形状: {vector.shape}")
                
                return vector
        except Exception as e:
            logger.error(f"图像编码失败: {e}")
            return None
    
    def encode_text(self, text: str) -> Optional[np.ndarray]:
        """
        编码文本
        
        Args:
            text: 输入文本
            
        Returns:
            文本特征向量，失败返回None
        """
        try:
            # 分词
            text_tokens = self.tokenizer([text]).to(self.device)
            
            with torch.no_grad():
                # 编码文本
                text_features = self.model.encode_text(text_tokens)
                # 归一化
                text_features /= text_features.norm(dim=-1, keepdim=True)
                
                vector = text_features.cpu().numpy().astype('float32').flatten()
                logger.debug(f"文本编码完成，向量形状: {vector.shape}")
                
                return vector
        except Exception as e:
            logger.error(f"文本编码失败: {e}")
            return None
    
    def batch_encode_images(self, images: List[Image.Image]) -> List[Optional[np.ndarray]]:
        """
        批量编码图片
        
        Args:
            images: PIL图像对象列表
            
        Returns:
            特征向量列表
        """
        try:
            if not images:
                return []
            
            # 预处理所有图片
            processed_images = []
            valid_indices = []
            
            for i, image in enumerate(images):
                try:
                    if image.mode != 'RGB':
                        image = image.convert('RGB')
                    
                    processed_tensor = self.preprocess(image)
                    processed_images.append(processed_tensor)
                    valid_indices.append(i)
                except Exception as e:
                    logger.warning(f"预处理图片 {i} 失败: {e}")
            
            if not processed_images:
                logger.error("没有有效的图片可以处理")
                return [None] * len(images)
            
            # 批量处理
            images_tensor = torch.stack(processed_images).to(self.device)
            
            with torch.no_grad():
                # 编码图片
                image_features = self.model.encode_image(images_tensor)
                # 归一化
                image_features /= image_features.norm(dim=-1, keepdim=True)
                
                vectors = image_features.cpu().numpy().astype('float32')
            
            # 构建结果列表
            results = [None] * len(images)
            for i, valid_idx in enumerate(valid_indices):
                results[valid_idx] = vectors[i]
            
            logger.info(f"批量图像编码完成，处理 {len(images)} 张图片，成功 {len(valid_indices)} 张")
            return results
            
        except Exception as e:
            logger.error(f"批量图像编码失败: {e}")
            return [None] * len(images)
    
    def calculate_similarity(self, vector1: np.ndarray, vector2: np.ndarray) -> float:
        """
        计算两个向量的相似度
        
        Args:
            vector1: 向量1
            vector2: 向量2
            
        Returns:
            相似度分数
        """
        try:
            # 使用内积计算相似度（向量已经归一化）
            similarity = np.dot(vector1, vector2)
            return float(similarity)
        except Exception as e:
            logger.error(f"计算相似度失败: {e}")
            return 0.0
    
    def get_model_info(self) -> dict:
        """
        获取模型信息
        
        Returns:
            模型信息字典
        """
        return {
            'model_name': self.model_name,
            'pretrained': self.pretrained,
            'device': self.device,
            'vector_dimension': 512  # 根据模型确定
        }