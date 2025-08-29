import os
import logging
import io
from typing import List, Dict, Any, Optional
import numpy as np
import torch
import open_clip
from PIL import Image
import requests
from urllib.parse import urlparse
try:
    import cairosvg
    HAS_CAIROSVG = True
except ImportError:
    cairosvg = None
    HAS_CAIROSVG = False
    import warnings
    warnings.warn("cairosvg not installed. SVG support will be limited. Install with: pip install cairosvg")
from datetime import datetime


def get_current_timestamp() -> str:
    """获取当前时间戳的统一格式"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

try:
    from pymilvus import (
        connections, 
        Collection, 
        CollectionSchema, 
        FieldSchema, 
        DataType,
        utility
    )
except ImportError:
    print("请安装pymilvus: pip install pymilvus>=2.3.0")
    raise

logger = logging.getLogger(__name__)


class VectorDatabaseService:
    """向量数据库服务类，基于Milvus的云端向量数据库"""
    
    def __init__(self, 
                 model_name: str = 'ViT-B-32', 
                 pretrained: str = 'laion2b_s34b_b79k',
                 collection_name: str = 'spx_vector_collection',
                 dimension: int = 512,
                 host: str = 'localhost',
                 port: str = '19530',
                 alias: str = 'default'):
        """
        初始化向量数据库服务
        
        Args:
            model_name: CLIP模型名称
            pretrained: 预训练权重
            collection_name: Milvus集合名称
            dimension: 向量维度
            host: Milvus服务器地址
            port: Milvus服务器端口
            alias: Milvus连接别名
        """
        self.model_name = model_name
        self.pretrained = pretrained
        self.collection_name = collection_name
        self.dimension = dimension
        self.host = host
        self.port = port
        self.alias = alias
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # 模型相关
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        
        # Milvus相关
        self.collection = None
        
        self._init_model()
        self._init_milvus()
    
    def _init_model(self):
        """初始化CLIP模型"""
        try:
            self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                self.model_name, pretrained=self.pretrained
            )
            self.tokenizer = open_clip.get_tokenizer(self.model_name)
            self.model = self.model.to(self.device)
            self.model.eval()
            logger.info(f"向量数据库模型加载成功: {self.model_name} on {self.device}")
        except Exception as e:
            logger.error(f"向量数据库模型加载失败: {e}")
            raise
    
    def _init_milvus(self):
        """初始化Milvus连接和集合"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # 连接到Milvus
                connections.connect(
                    alias=self.alias,
                    host=self.host,
                    port=self.port
                )
                logger.info(f"Milvus连接成功: {self.host}:{self.port}")
                
                # 创建或加载集合
                self._create_or_load_collection()
                return
                
            except Exception as e:
                logger.warning(f"Milvus连接尝试 {attempt + 1}/{max_retries} 失败: {e}")
                if attempt == max_retries - 1:
                    logger.error(f"Milvus初始化最终失败: {e}")
                    raise
                import time
                time.sleep(2 ** attempt)  # 指数退避
    
    def _create_or_load_collection(self):
        """创建或加载Milvus集合"""
        try:
            # 检查集合是否存在
            if utility.has_collection(self.collection_name):
                # 加载已存在的集合
                self.collection = Collection(self.collection_name)
                logger.info(f"加载已存在的集合: {self.collection_name}")
            else:
                # 创建新集合
                self._create_collection()
                logger.info(f"创建新集合: {self.collection_name}")
            
            # 加载集合到内存
            self.collection.load()
            
        except Exception as e:
            logger.error(f"集合操作失败: {e}")
            raise
    
    def _create_collection(self):
        """创建Milvus集合"""
        try:
            # 定义字段
            fields = [
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=False),
                FieldSchema(name="url", dtype=DataType.VARCHAR, max_length=2000),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=self.dimension),
                FieldSchema(name="added_at", dtype=DataType.VARCHAR, max_length=50),
                FieldSchema(name="updated_at", dtype=DataType.VARCHAR, max_length=50)
            ]
            
            # 创建集合schema
            schema = CollectionSchema(
                fields=fields,
                description=f"SPX算法向量数据库集合"
            )
            
            # 创建集合
            self.collection = Collection(
                name=self.collection_name,
                schema=schema
            )
            
            # 创建索引
            self._create_index()
            
        except Exception as e:
            logger.error(f"创建集合失败: {e}")
            raise
    
    def _create_index(self):
        """为向量字段创建索引"""
        try:
            # 创建IVF_FLAT索引
            index_params = {
                "metric_type": "IP",  # 内积相似度
                "index_type": "IVF_FLAT",
                "params": {"nlist": 1024}
            }
            
            self.collection.create_index(
                field_name="vector",
                index_params=index_params
            )
            
            logger.info("向量索引创建成功")
            
        except Exception as e:
            logger.error(f"创建索引失败: {e}")
            raise
    
    def _convert_svg_to_vector(self, svg_data: bytes, source_info: str = "") -> Optional[np.ndarray]:
        """
        将SVG数据转换为向量
        
        Args:
            svg_data: SVG文件字节数据
            source_info: 数据源信息（用于日志）
            
        Returns:
            图片特征向量，失败返回None
        """
        try:
            # 检查SVG内容是否为空
            if len(svg_data) == 0:
                logger.error(f"SVG内容为空: {source_info}")
                return None
            
            # 检查是否安装了cairosvg
            if not HAS_CAIROSVG:
                logger.error("SVG支持需要安装cairosvg库: pip install cairosvg")
                return None
            
            # 将SVG转换为PNG
            logger.info(f"开始转换SVG: {source_info}")
            png_data = cairosvg.svg2png(
                bytestring=svg_data, 
                output_width=224, 
                output_height=224,
                background_color='white'
            )
            
            # 转换为PIL图像
            image = Image.open(io.BytesIO(png_data)).convert('RGB')
            logger.info(f"SVG转换完成，图片尺寸: {image.size}, 模式: {image.mode}")
            
            # 检查图片内容
            img_array = np.array(image)
            unique_colors = len(np.unique(img_array.reshape(-1, img_array.shape[-1]), axis=0))
            logger.info(f"图片唯一颜色数量: {unique_colors}")
            
            if unique_colors < 5:
                logger.warning(f"图片颜色过少 ({unique_colors})，可能是空白图片")
            
            # 预处理图片
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                # 编码图片
                image_features = self.model.encode_image(image_tensor)
                # 归一化
                image_features /= image_features.norm(dim=-1, keepdim=True)
                
                vector = image_features.cpu().numpy().astype('float32').flatten()
                logger.info(f"向量编码完成，形状: {vector.shape}, 范围: [{vector.min():.4f}, {vector.max():.4f}]")
                
                return vector
                
        except Exception as e:
            logger.error(f"转换SVG为向量失败 {source_info}: {e}")
            return None

    def _download_svg_from_url(self, url: str) -> Optional[bytes]:
        """
        从URL下载SVG内容
        
        Args:
            url: SVG文件的URL
            
        Returns:
            SVG文件内容字节，失败返回None
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/svg+xml,image/*,*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # 检查内容类型
            content_type = response.headers.get('content-type', '').lower()
            if 'svg' not in content_type and not url.lower().endswith('.svg'):
                logger.warning(f"URL可能不是SVG文件: {url}, Content-Type: {content_type}")
            
            logger.info(f"成功下载SVG: {url}, 大小: {len(response.content)} bytes")
            return response.content
            
        except requests.exceptions.RequestException as e:
            logger.error(f"下载SVG失败 {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"处理SVG下载时出错 {url}: {e}")
            return None
    
    def _encode_svg_from_url(self, url: str) -> Optional[np.ndarray]:
        """
        从URL下载SVG并编码为向量
        
        Args:
            url: SVG文件URL
            
        Returns:
            图片特征向量，失败返回None
        """
        try:
            # 下载SVG内容
            svg_content = self._download_svg_from_url(url)
            if svg_content is None:
                return None
            
            # 使用统一的SVG转换方法
            return self._convert_svg_to_vector(svg_content, url)
                
        except Exception as e:
            logger.error(f"编码SVG失败 {url}: {e}")
            return None
    
    def _encode_svg_content(self, svg_content: str) -> Optional[np.ndarray]:
        """
        直接处理SVG内容并编码为向量
        
        Args:
            svg_content: SVG文件内容字符串
            
        Returns:
            图片特征向量，失败返回None
        """
        try:
            # 检查SVG内容是否为空
            if not svg_content or len(svg_content.strip()) == 0:
                logger.error("SVG内容为空")
                return None
            
            # 将SVG字符串转换为字节
            if isinstance(svg_content, str):
                svg_bytes = svg_content.encode('utf-8')
            else:
                svg_bytes = svg_content
            
            # 使用统一的SVG转换方法
            return self._convert_svg_to_vector(svg_bytes, "SVG内容")
                
        except Exception as e:
            logger.error(f"编码SVG内容失败: {e}")
            return None
    
    def add_image_by_url(self, id: int, url: str) -> bool:
        """
        增量式写入接口：根据URL下载SVG图片并添加到向量数据库
        
        Args:
            id: 图片唯一标识ID
            url: SVG图片的云端URL
            
        Returns:
            是否成功添加
        """
        try:
            logger.info(f"开始处理图片: ID={id}, URL={url}")
            
            # 检查ID是否已存在
            if self._record_exists(id):
                logger.warning(f"ID {id} 已存在，将更新现有记录")
                return self._update_existing_image(id, url)
            
            # 从URL编码图片
            vector = self._encode_svg_from_url(url)
            if vector is None:
                logger.error(f"无法编码图片: ID={id}, URL={url}")
                return False
            
            # 准备插入数据
            current_time = get_current_timestamp()
            entities = [
                [id],                    # id
                [url],                   # url
                [vector.tolist()],       # vector
                [current_time],          # added_at
                [current_time]           # updated_at
            ]
            
            # 插入数据到Milvus
            self.collection.insert(entities)
            
            # 刷新数据到磁盘
            self.collection.flush()
            
            logger.info(f"图片成功添加到数据库: ID={id}")
            return True
            
        except Exception as e:
            logger.error(f"添加图片失败: ID={id}, URL={url}, 错误: {e}")
            return False
    
    def add_image_with_svg(self, id: int, url: str, svg_content: str) -> bool:
        """
        增量式写入接口：直接处理SVG内容并添加到向量数据库
        
        Args:
            id: 图片唯一标识ID
            url: SVG图片的URL（用于记录，不会实际访问）
            svg_content: SVG图片内容字符串
            
        Returns:
            是否成功添加
        """
        try:
            logger.info(f"开始处理图片: ID={id}, URL={url}")
            
            # 检查ID是否已存在
            if self._record_exists(id):
                logger.warning(f"ID {id} 已存在，将更新现有记录")
                return self._update_existing_image_with_svg(id, url, svg_content)
            
            # 直接处理SVG内容编码图片
            vector = self._encode_svg_content(svg_content)
            if vector is None:
                logger.error(f"SVG内容编码失败: ID={id}")
                return False
            
            # 准备插入数据
            current_time = get_current_timestamp()
            entities = [
                [id],                    # id
                [url],                   # url
                [vector.tolist()],       # vector
                [current_time],          # added_at
                [current_time]           # updated_at
            ]
            
            # 插入数据到Milvus
            self.collection.insert(entities)
            
            # 刷新数据到磁盘
            self.collection.flush()
            
            logger.info(f"图片成功添加到数据库: ID={id}")
            return True
            
        except Exception as e:
            logger.error(f"添加图片失败: ID={id}, URL={url}, 错误: {e}")
            return False
    
    def _record_exists(self, id: int) -> bool:
        """检查记录是否存在"""
        try:
            expr = f"id == {id}"
            result = self.collection.query(
                expr=expr,
                output_fields=["id"],
                limit=1
            )
            return len(result) > 0
        except Exception as e:
            logger.error(f"检查记录存在性失败: {e}")
            return False
    
    def _update_existing_image(self, id: int, url: str) -> bool:
        """更新已存在的图片记录"""
        try:
            # 先删除旧记录
            self.remove_by_id(id)
            
            # 重新添加
            return self.add_image_by_url(id, url)
            
        except Exception as e:
            logger.error(f"更新图片失败: ID={id}, URL={url}, 错误: {e}")
            return False
    
    def _update_existing_image_with_svg(self, id: int, url: str, svg_content: str) -> bool:
        """更新已存在的图片记录（使用SVG内容）"""
        try:
            # 先删除旧记录
            self.remove_by_id(id)
            
            # 重新添加
            return self.add_image_with_svg(id, url, svg_content)
            
        except Exception as e:
            logger.error(f"更新图片失败: ID={id}, URL={url}, 错误: {e}")
            return False
    
    def get_all_data(self) -> List[Dict[str, Any]]:
        """
        读取所有数据接口：返回数据库中的所有图片信息
        
        Returns:
            包含所有图片信息的列表，每个元素包含id、url和向量数据
        """
        try:
            # 查询所有数据
            result = self.collection.query(
                expr="id >= 0",  # 查询所有记录
                output_fields=["id", "url", "vector", "added_at", "updated_at"]
            )
            
            all_data = []
            for item in result:
                record = {
                    'id': item['id'],
                    'url': item['url'],
                    'vector': item['vector'],  # 已经是列表格式
                    'added_at': item['added_at']
                }
                
                # 如果有更新时间，也包含进去
                if 'updated_at' in item and item['updated_at'] != item['added_at']:
                    record['updated_at'] = item['updated_at']
                
                all_data.append(record)
            
            # 按ID排序
            all_data.sort(key=lambda x: x['id'])
            
            logger.info(f"返回所有数据，共 {len(all_data)} 条记录")
            return all_data
            
        except Exception as e:
            logger.error(f"获取所有数据失败: {e}")
            return []
    
    def get_database_stats(self) -> Dict[str, Any]:
        """获取数据库统计信息"""
        try:
            # 获取集合统计信息
            stats = self.collection.num_entities
            
            return {
                'total_images': stats,
                'dimension': self.dimension,
                'model_name': self.model_name,
                'pretrained': self.pretrained,
                'collection_name': self.collection_name,
                'device': self.device,
                'host': self.host,
                'port': self.port
            }
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {
                'total_images': 0,
                'dimension': self.dimension,
                'model_name': self.model_name,
                'pretrained': self.pretrained,
                'collection_name': self.collection_name,
                'device': self.device,
                'host': self.host,
                'port': self.port
            }
    
    def search_by_text(self, query_text: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        通过文本搜索相似图片
        
        Args:
            query_text: 查询文本
            k: 返回结果数量
            
        Returns:
            相似图片列表
        """
        try:
            # 编码文本
            text_tokens = self.tokenizer([query_text]).to(self.device)
            
            with torch.no_grad():
                text_features = self.model.encode_text(text_tokens)
                text_features /= text_features.norm(dim=-1, keepdim=True)
                query_vector = text_features.cpu().numpy().astype('float32').flatten()
            
            # 在Milvus中搜索
            search_params = {
                "metric_type": "IP",
                "params": {"nprobe": 10}
            }
            
            search_result = self.collection.search(
                data=[query_vector.tolist()],
                anns_field="vector",
                param=search_params,
                limit=k,
                output_fields=["id", "url", "added_at", "updated_at"]
            )
            
            results = []
            for i, hit in enumerate(search_result[0]):
                result = {
                    'rank': i + 1,
                    'similarity': float(hit.score),
                    'id': hit.entity.get('id'),
                    'url': hit.entity.get('url'),
                    'added_at': hit.entity.get('added_at')
                }
                
                # 添加更新时间（如果存在）
                updated_at = hit.entity.get('updated_at')
                if updated_at and updated_at != result['added_at']:
                    result['updated_at'] = updated_at
                
                results.append(result)
            
            logger.info(f"文本搜索完成: '{query_text}', 返回 {len(results)} 个结果")
            return results
            
        except Exception as e:
            logger.error(f"文本搜索失败: {e}")
            return []
    
    def remove_by_id(self, id: int) -> bool:
        """
        根据ID删除图片记录
        
        Args:
            id: 要删除的图片ID
            
        Returns:
            是否成功删除
        """
        try:
            # 检查记录是否存在
            if not self._record_exists(id):
                logger.warning(f"ID {id} 不存在")
                return False
            
            # 删除记录
            expr = f"id == {id}"
            self.collection.delete(expr)
            
            # 刷新删除操作
            self.collection.flush()
            
            logger.info(f"成功删除图片: ID={id}")
            return True
            
        except Exception as e:
            logger.error(f"删除图片失败: ID={id}, 错误: {e}")
            return False
    
    def close_connection(self):
        """关闭Milvus连接"""
        try:
            connections.disconnect(self.alias)
            logger.info("Milvus连接已关闭")
        except Exception as e:
            logger.error(f"关闭连接失败: {e}")
    
    def __del__(self):
        """析构函数，确保连接被正确关闭"""
        try:
            self.close_connection()
        except:
            pass