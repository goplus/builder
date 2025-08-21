import open_clip
import torch
from PIL import Image
import numpy as np
import cairosvg
import io
import os
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class ImageSearchService:
    """图像搜索服务类"""
    
    def __init__(self, model_name: str = 'ViT-B-32', pretrained: str = 'laion2b_s34b_b79k'):
        """
        初始化图像搜索服务
        
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
                self.model_name, pretrained=self.pretrained
            )
            self.tokenizer = open_clip.get_tokenizer(self.model_name)
            self.model = self.model.to(self.device)
            logger.info(f"模型加载成功: {self.model_name} on {self.device}")
        except Exception as e:
            logger.error(f"模型加载失败: {e}")
            raise
    
    def _process_image(self, image_path: str) -> Optional[torch.Tensor]:
        """
        处理单张图片
        
        Args:
            image_path: 图片路径
            
        Returns:
            处理后的图片张量，失败返回None
        """
        try:
            # 检查文件是否存在
            if not os.path.exists(image_path):
                logger.warning(f"图片文件不存在: {image_path}")
                return None
            
            # 根据文件扩展名选择处理方式
            _, ext = os.path.splitext(image_path.lower())
            
            if ext == '.svg':
                # 处理SVG文件
                png_data = cairosvg.svg2png(url=image_path, output_width=224, output_height=224)
                image = Image.open(io.BytesIO(png_data))
            else:
                # 处理其他格式图片
                image = Image.open(image_path).convert('RGB')
            
            return self.preprocess(image)
            
        except Exception as e:
            logger.error(f"处理图片失败 {image_path}: {e}")
            return None
    
    def search_images(self, text_query: str, image_paths: List[str], top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        根据文本查询搜索图片
        
        Args:
            text_query: 查询文本
            image_paths: 图片路径列表
            top_k: 返回前k张图片，None则返回所有
            
        Returns:
            排序后的结果列表，包含图片路径和相似度分数
        """
        if not text_query.strip():
            raise ValueError("查询文本不能为空")
        
        if not image_paths:
            raise ValueError("图片路径列表不能为空")
        
        # 处理文本
        text = self.tokenizer([text_query]).to(self.device)
        
        # 处理所有图片
        images = []
        valid_paths = []
        
        for img_path in image_paths:
            processed_image = self._process_image(img_path)
            if processed_image is not None:
                images.append(processed_image)
                valid_paths.append(img_path)
        
        if not images:
            logger.warning("没有有效的图片可以处理")
            return []
        
        # 批量处理图片
        images_tensor = torch.stack(images).to(self.device)
        
        with torch.no_grad():
            # 编码文本和图片
            text_features = self.model.encode_text(text)
            image_features = self.model.encode_image(images_tensor)
            
            # 归一化特征
            text_features /= text_features.norm(dim=-1, keepdim=True)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            
            # 计算相似度
            similarity = (text_features @ image_features.T).squeeze(0)
            
            # 转换为 numpy 并排序
            similarity_scores = similarity.cpu().numpy()
        
        # 创建结果列表
        results = []
        for i, score in enumerate(similarity_scores):
            results.append({
                'image_path': valid_paths[i],
                'similarity': float(score),
                'rank': i + 1
            })
        
        # 按相似度降序排序
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        # 更新排名
        for i, result in enumerate(results):
            result['rank'] = i + 1
        
        # 返回前k个结果
        if top_k is not None and top_k > 0:
            results = results[:top_k]
        
        logger.info(f"搜索完成，查询: '{text_query}', 找到 {len(results)} 个结果")
        return results