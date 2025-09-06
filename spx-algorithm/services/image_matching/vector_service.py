"""
向量处理服务模块
"""

import io
import logging
import requests
from typing import Optional, List
from urllib.parse import urlparse
from PIL import Image
import numpy as np

try:
    import cairosvg
    HAS_CAIROSVG = True
except ImportError:
    cairosvg = None
    HAS_CAIROSVG = False
    import warnings
    warnings.warn("cairosvg not installed. SVG support will be limited. Install with: pip install cairosvg")

from .clip_service import CLIPService

logger = logging.getLogger(__name__)


class VectorService:
    """向量化服务类"""
    
    def __init__(self, clip_service: CLIPService):
        """
        初始化向量化服务
        
        Args:
            clip_service: CLIP服务实例
        """
        self.clip_service = clip_service
    
    def vectorize_image_from_url(self, url: str) -> Optional[np.ndarray]:
        """
        从URL下载并向量化图片
        
        Args:
            url: 图片URL
            
        Returns:
            特征向量，失败返回None
        """
        try:
            # 下载图片
            image = self._download_image_from_url(url)
            if image is None:
                return None
            
            # 向量化
            return self.clip_service.encode_image(image)
            
        except Exception as e:
            logger.error(f"从URL向量化图片失败 {url}: {e}")
            return None
    
    def vectorize_image_from_svg_content(self, svg_content: str) -> Optional[np.ndarray]:
        """
        从SVG内容向量化图片
        
        Args:
            svg_content: SVG内容字符串
            
        Returns:
            特征向量，失败返回None
        """
        try:
            # 转换SVG为图片
            image = self._convert_svg_to_image(svg_content)
            if image is None:
                return None
            
            # 向量化
            return self.clip_service.encode_image(image)
            
        except Exception as e:
            logger.error(f"从SVG内容向量化图片失败: {e}")
            return None
    
    def vectorize_text(self, text: str) -> Optional[np.ndarray]:
        """
        向量化文本
        
        Args:
            text: 输入文本
            
        Returns:
            文本特征向量，失败返回None
        """
        return self.clip_service.encode_text(text)
    
    def _download_image_from_url(self, url: str) -> Optional[Image.Image]:
        """
        从URL下载图片
        
        Args:
            url: 图片URL
            
        Returns:
            PIL图像对象，失败返回None
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/*, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # 检查内容类型
            content_type = response.headers.get('content-type', '').lower()
            is_svg = 'svg' in content_type or url.lower().endswith('.svg')
            
            logger.info(f"下载图片: {url}, Content-Type: {content_type}, 大小: {len(response.content)} bytes")
            
            if is_svg:
                # 处理SVG
                if len(response.content) == 0:
                    logger.warning(f"SVG文件内容为空: {url}")
                    return None
                
                return self._convert_svg_to_image(response.content.decode('utf-8'))
            else:
                # 处理其他格式图片
                if len(response.content) == 0:
                    logger.error(f"图片文件内容为空: {url}")
                    return None
                
                image = Image.open(io.BytesIO(response.content)).convert('RGB')
                logger.info(f"图片加载成功: {image.size}")
                return image
                
        except Exception as e:
            logger.error(f"下载图片失败 {url}: {e}")
            return None
    
    def _convert_svg_to_image(self, svg_content: str) -> Optional[Image.Image]:
        """
        将SVG内容转换为PIL图像
        
        Args:
            svg_content: SVG内容字符串
            
        Returns:
            PIL图像对象，失败返回None
        """
        try:
            # 检查SVG内容是否为空
            if not svg_content or len(svg_content.strip()) == 0:
                logger.error("SVG内容为空")
                return None
            
            # 检查是否安装了cairosvg
            if not HAS_CAIROSVG:
                logger.error("SVG支持需要安装cairosvg库: pip install cairosvg")
                return None
            
            # 将SVG字符串转换为字节
            if isinstance(svg_content, str):
                svg_bytes = svg_content.encode('utf-8')
            else:
                svg_bytes = svg_content
            
            # 将SVG转换为PNG
            logger.debug("开始转换SVG为PNG")
            png_data = cairosvg.svg2png(
                bytestring=svg_bytes,
                output_width=224,
                output_height=224,
                background_color='white'
            )
            
            # 转换为PIL图像
            image = Image.open(io.BytesIO(png_data)).convert('RGB')
            logger.info(f"SVG转换完成，图片尺寸: {image.size}")
            
            # 检查图片内容
            img_array = np.array(image)
            unique_colors = len(np.unique(img_array.reshape(-1, img_array.shape[-1]), axis=0))
            logger.debug(f"图片唯一颜色数量: {unique_colors}")
            
            if unique_colors < 5:
                logger.warning(f"图片颜色过少 ({unique_colors})，可能是空白图片")
            
            return image
            
        except Exception as e:
            logger.error(f"SVG转换失败: {e}")
            return None
    
    def batch_vectorize_images_from_urls(self, urls: List[str]) -> List[Optional[np.ndarray]]:
        """
        批量从URL向量化图片
        
        Args:
            urls: 图片URL列表
            
        Returns:
            特征向量列表
        """
        try:
            images = []
            for url in urls:
                image = self._download_image_from_url(url)
                images.append(image)
            
            # 过滤有效图片
            valid_images = [img for img in images if img is not None]
            
            if not valid_images:
                logger.warning("没有有效的图片可以处理")
                return [None] * len(urls)
            
            # 批量编码
            vectors = self.clip_service.batch_encode_images(valid_images)
            
            # 重新映射结果
            results = []
            valid_idx = 0
            for image in images:
                if image is not None:
                    results.append(vectors[valid_idx])
                    valid_idx += 1
                else:
                    results.append(None)
            
            return results
            
        except Exception as e:
            logger.error(f"批量向量化图片失败: {e}")
            return [None] * len(urls)
    
    def calculate_similarity(self, vector1: np.ndarray, vector2: np.ndarray) -> float:
        """
        计算两个向量的相似度
        
        Args:
            vector1: 向量1
            vector2: 向量2
            
        Returns:
            相似度分数
        """
        return self.clip_service.calculate_similarity(vector1, vector2)