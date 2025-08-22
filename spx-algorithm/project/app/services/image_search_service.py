import io
import logging
import os
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

import cairosvg
import open_clip
import requests
import torch
from PIL import Image

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
    
    def _process_image(self, image_source: str) -> Optional[torch.Tensor]:
        """
        处理单张图片，支持本地路径和网络URL
        
        Args:
            image_source: 图片路径或URL
            
        Returns:
            处理后的图片张量，失败返回None
        """
        try:
            # 判断是否为网络URL
            parsed = urlparse(image_source)
            is_url = bool(parsed.scheme and parsed.netloc)
            
            if is_url:
                # 处理网络图片
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/*, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                }
                response = requests.get(image_source, headers=headers, timeout=10)
                response.raise_for_status()
                
                # 从Content-Type或URL判断是否为SVG
                content_type = response.headers.get('content-type', '').lower()
                is_svg = 'svg' in content_type or image_source.lower().endswith('.svg')
                
                logger.info(f"处理网络图片: {image_source}")
                logger.info(f"Content-Type: {content_type}")
                logger.info(f"Content-Length: {len(response.content)}")
                
                if is_svg:
                    # 处理网络SVG
                    if len(response.content) == 0:
                        logger.info(f"SVG文件内容为空: {image_source}")
                        return None
                    # 添加白色背景，避免透明导致的问题
                    png_data = cairosvg.svg2png(
                        bytestring=response.content, 
                        output_width=224, 
                        output_height=224,
                        background_color='white'
                    )
                    image = Image.open(io.BytesIO(png_data)).convert('RGB')
                else:
                    # 处理其他格式网络图片
                    if len(response.content) == 0:
                        logger.error(f"图片文件内容为空: {image_source}")
                        return None
                    image = Image.open(io.BytesIO(response.content)).convert('RGB')
                
                logger.info(f"图片尺寸: {image.size}, 模式: {image.mode}")
                
                # 可选：保存调试图片（取消注释来启用）
                # debug_path = f"debug_{hash(image_source) % 10000}.png"
                # image.save(debug_path)
                # logger.debug(f"调试图片已保存: {debug_path}")
            else:
                # 处理本地文件
                if not os.path.exists(image_source):
                    logger.warning(f"图片文件不存在: {image_source}")
                    return None
                
                logger.info(f"处理本地图片: {image_source}")
                
                # 根据文件扩展名选择处理方式
                _, ext = os.path.splitext(image_source.lower())
                
                if ext == '.svg':
                    # 处理本地SVG文件
                    png_data = cairosvg.svg2png(
                        url=image_source, 
                        output_width=224, 
                        output_height=224,
                        background_color='white'
                    )
                    image = Image.open(io.BytesIO(png_data)).convert('RGB')
                else:
                    # 处理本地其他格式图片
                    image = Image.open(image_source).convert('RGB')
                
                logger.info(f"本地图片尺寸: {image.size}, 模式: {image.mode}")
            
            # 预处理前保存原始图片信息
            logger.info(f"预处理前图片: {image.size}, 模式: {image.mode}")
            
            # 检查图片是否为空或全黑/全白
            import numpy as np
            img_array = np.array(image)
            logger.info(f"图片数组形状: {img_array.shape}")
            logger.info(f"图片像素值范围: min={img_array.min()}, max={img_array.max()}, mean={img_array.mean():.2f}")
            
            # 检查图片是否为纯色
            unique_colors = len(np.unique(img_array.reshape(-1, img_array.shape[-1]), axis=0))
            logger.info(f"图片唯一颜色数量: {unique_colors}")
            
            # 如果图片是纯色或颜色过少，可能有问题
            if unique_colors < 5:
                logger.warning(f"图片颜色过少 ({unique_colors})，可能是空白图片")
            
            # 确保图片转换为RGB模式
            if image.mode != 'RGB':
                logger.info(f"转换图片模式从 {image.mode} 到 RGB")
                image = image.convert('RGB')
            
            processed_tensor = self.preprocess(image)
            logger.info(f"预处理后张量形状: {processed_tensor.shape}")
            logger.info(f"预处理后张量统计: min={processed_tensor.min().item():.4f}, max={processed_tensor.max().item():.4f}, mean={processed_tensor.mean().item():.4f}")
            
            return processed_tensor
            
        except Exception as e:
            logger.error(f"处理图片失败 {image_source}: {e}")
            return None
    
    def search_images(self, text_query: str, image_paths: List[str], top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        根据文本查询搜索图片
        
        Args:
            text_query: 查询文本
            image_paths: 图片路径列表（支持本地路径和网络URL）
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