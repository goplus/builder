import os
import pickle
import logging
import io
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import torch
import open_clip
from PIL import Image
import requests
from urllib.parse import urlparse
try:
    import faiss
except ImportError:
    faiss = None
try:
    import cairosvg
except ImportError:
    cairosvg = None
from datetime import datetime

logger = logging.getLogger(__name__)


class CloudVectorDatabase:
    """基于云端URL的向量数据库，提供简化的增量写入和读取接口"""
    
    def __init__(self, 
                 model_name: str = 'ViT-B-32', 
                 pretrained: str = 'laion2b_s34b_b79k',
                 db_path: str = 'cloud_vector_db',
                 dimension: int = 512):
        """
        初始化云端向量数据库
        
        Args:
            model_name: CLIP模型名称
            pretrained: 预训练权重
            db_path: 数据库存储路径
            dimension: 向量维度
        """
        self.model_name = model_name
        self.pretrained = pretrained
        self.db_path = db_path
        self.dimension = dimension
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # 模型相关
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        
        # 数据库相关
        self.index = None
        self.data_store = {}  # 存储 {faiss_index: {'id': id, 'url': url, 'vector': vector}}
        self.id_to_faiss_index = {}  # 存储 {id: faiss_index} 的映射
        self.faiss_index_counter = 0
        
        self._init_model()
        self._init_database()
    
    def _init_model(self):
        """初始化CLIP模型"""
        try:
            self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                self.model_name, pretrained=self.pretrained
            )
            self.tokenizer = open_clip.get_tokenizer(self.model_name)
            self.model = self.model.to(self.device)
            self.model.eval()
            logger.info(f"模型加载成功: {self.model_name} on {self.device}")
        except Exception as e:
            logger.error(f"模型加载失败: {e}")
            raise
    
    def _init_database(self):
        """初始化向量数据库"""
        if faiss is None:
            raise ImportError("faiss库未安装，请运行: pip install faiss-cpu 或 pip install faiss-gpu")
        
        os.makedirs(self.db_path, exist_ok=True)
        
        # 初始化Faiss索引
        self.index = faiss.IndexFlatIP(self.dimension)  # 内积相似度
        
        # 加载已有数据
        self._load_database()
    
    def _save_database(self):
        """保存数据库到文件"""
        try:
            # 保存索引
            index_path = os.path.join(self.db_path, 'index.faiss')
            faiss.write_index(self.index, index_path)
            
            # 保存数据存储
            data_path = os.path.join(self.db_path, 'data_store.pkl')
            with open(data_path, 'wb') as f:
                pickle.dump({
                    'data_store': self.data_store,
                    'id_to_faiss_index': self.id_to_faiss_index,
                    'faiss_index_counter': self.faiss_index_counter,
                    'dimension': self.dimension,
                    'model_name': self.model_name,
                    'created_at': datetime.now().isoformat()
                }, f)
            
            logger.info(f"数据库已保存到: {self.db_path}")
        except Exception as e:
            logger.error(f"保存数据库失败: {e}")
            raise
    
    def _load_database(self):
        """从文件加载数据库"""
        try:
            index_path = os.path.join(self.db_path, 'index.faiss')
            data_path = os.path.join(self.db_path, 'data_store.pkl')
            
            if os.path.exists(index_path) and os.path.exists(data_path):
                # 加载索引
                self.index = faiss.read_index(index_path)
                
                # 加载数据存储
                with open(data_path, 'rb') as f:
                    data = pickle.load(f)
                    self.data_store = data['data_store']
                    self.id_to_faiss_index = data['id_to_faiss_index']
                    self.faiss_index_counter = data['faiss_index_counter']
                
                logger.info(f"数据库加载成功，包含 {len(self.data_store)} 个向量")
            else:
                logger.info("未找到已有数据库，创建新的数据库")
        except Exception as e:
            logger.error(f"加载数据库失败: {e}")
            # 重新初始化
            self.index = faiss.IndexFlatIP(self.dimension)
            self.data_store = {}
            self.id_to_faiss_index = {}
            self.faiss_index_counter = 0
    
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
            
            # 检查SVG内容是否为空
            if len(svg_content) == 0:
                logger.error(f"下载的SVG内容为空: {url}")
                return None
            
            # 检查是否安装了cairosvg
            if cairosvg is None:
                logger.error("SVG支持需要安装cairosvg库: pip install cairosvg")
                return None
            
            # 将SVG转换为PNG
            logger.info(f"开始转换SVG: {url}")
            png_data = cairosvg.svg2png(
                bytestring=svg_content, 
                output_width=224, 
                output_height=224,
                background_color='white'
            )
            
            # 转换为PIL图像
            image = Image.open(io.BytesIO(png_data)).convert('RGB')
            logger.info(f"SVG转换完成，图片尺寸: {image.size}, 模式: {image.mode}")
            
            # 检查图片内容
            import numpy as np
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
                
                vector = image_features.cpu().numpy().astype('float32')
                logger.info(f"向量编码完成，形状: {vector.shape}, 范围: [{vector.min():.4f}, {vector.max():.4f}]")
                
                return vector
                
        except Exception as e:
            logger.error(f"编码SVG失败 {url}: {e}")
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
            if id in self.id_to_faiss_index:
                logger.warning(f"ID {id} 已存在，将更新现有记录")
                # 可以选择更新或跳过，这里选择更新
                return self._update_existing_image(id, url)
            
            # 从URL编码图片
            vector = self._encode_svg_from_url(url)
            if vector is None:
                logger.error(f"无法编码图片: ID={id}, URL={url}")
                return False
            
            # 添加到Faiss索引
            self.index.add(vector)
            
            # 存储数据
            faiss_index = self.faiss_index_counter
            self.data_store[faiss_index] = {
                'id': id,
                'url': url,
                'vector': vector.flatten(),
                'added_at': datetime.now().isoformat()
            }
            self.id_to_faiss_index[id] = faiss_index
            self.faiss_index_counter += 1
            
            # 保存数据库
            self._save_database()
            
            logger.info(f"图片成功添加到数据库: ID={id}, Faiss索引={faiss_index}")
            return True
            
        except Exception as e:
            logger.error(f"添加图片失败: ID={id}, URL={url}, 错误: {e}")
            return False
    
    def _update_existing_image(self, id: int, url: str) -> bool:
        """更新已存在的图片记录"""
        try:
            # 获取现有的faiss索引
            faiss_index = self.id_to_faiss_index[id]
            
            # 从URL重新编码图片
            vector = self._encode_svg_from_url(url)
            if vector is None:
                logger.error(f"无法重新编码图片: ID={id}, URL={url}")
                return False
            
            # 更新数据存储
            self.data_store[faiss_index].update({
                'url': url,
                'vector': vector.flatten(),
                'updated_at': datetime.now().isoformat()
            })
            
            # 注意: Faiss不支持直接更新向量，需要重建索引
            self._rebuild_faiss_index()
            
            # 保存数据库
            self._save_database()
            
            logger.info(f"图片记录已更新: ID={id}")
            return True
            
        except Exception as e:
            logger.error(f"更新图片失败: ID={id}, URL={url}, 错误: {e}")
            return False
    
    def _rebuild_faiss_index(self):
        """重建Faiss索引（用于更新操作）"""
        try:
            # 创建新索引
            new_index = faiss.IndexFlatIP(self.dimension)
            
            # 重新添加所有向量
            vectors = []
            for faiss_idx in sorted(self.data_store.keys()):
                vector = self.data_store[faiss_idx]['vector'].reshape(1, -1)
                vectors.append(vector)
            
            if vectors:
                all_vectors = np.vstack(vectors)
                new_index.add(all_vectors)
            
            self.index = new_index
            logger.info("Faiss索引重建完成")
            
        except Exception as e:
            logger.error(f"重建索引失败: {e}")
            raise
    
    def get_all_data(self) -> List[Dict[str, Any]]:
        """
        读取所有数据接口：返回数据库中的所有图片信息
        
        Returns:
            包含所有图片信息的列表，每个元素包含id、url和向量数据
        """
        try:
            all_data = []
            
            for faiss_index, data in self.data_store.items():
                record = {
                    'id': data['id'],
                    'url': data['url'],
                    'vector': data['vector'].tolist(),  # 转换为列表以便JSON序列化
                    'faiss_index': faiss_index,
                    'added_at': data['added_at']
                }
                
                # 如果有更新时间，也包含进去
                if 'updated_at' in data:
                    record['updated_at'] = data['updated_at']
                
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
        return {
            'total_images': len(self.data_store),
            'faiss_total': self.index.ntotal,
            'dimension': self.dimension,
            'model_name': self.model_name,
            'pretrained': self.pretrained,
            'db_path': self.db_path,
            'device': self.device,
            'next_faiss_index': self.faiss_index_counter
        }
    
    def search_by_text(self, query_text: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        通过文本搜索相似图片（额外提供的搜索功能）
        
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
                query_vector = text_features.cpu().numpy().astype('float32')
            
            # 搜索
            if self.index.ntotal == 0:
                logger.warning("数据库为空")
                return []
            
            k = min(k, self.index.ntotal)
            similarities, indices = self.index.search(query_vector, k)
            
            results = []
            for i, (similarity, faiss_idx) in enumerate(zip(similarities[0], indices[0])):
                if faiss_idx in self.data_store:
                    data = self.data_store[faiss_idx]
                    result = {
                        'rank': i + 1,
                        'similarity': float(similarity),
                        'id': data['id'],
                        'url': data['url'],
                        'faiss_index': int(faiss_idx),
                        'added_at': data['added_at']
                    }
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
            if id not in self.id_to_faiss_index:
                logger.warning(f"ID {id} 不存在")
                return False
            
            # 获取faiss索引
            faiss_index = self.id_to_faiss_index[id]
            
            # 删除数据
            del self.data_store[faiss_index]
            del self.id_to_faiss_index[id]
            
            # 重建Faiss索引
            self._rebuild_faiss_index()
            
            # 保存数据库
            self._save_database()
            
            logger.info(f"成功删除图片: ID={id}")
            return True
            
        except Exception as e:
            logger.error(f"删除图片失败: ID={id}, 错误: {e}")
            return False


if __name__ == "__main__":
    # 设置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 创建数据库实例
    db = CloudVectorDatabase()
    
    # 示例：添加图片
    test_urls = [
        "https://example.com/dog.svg",
        "https://example.com/cat.svg",
        "https://example.com/bird.svg"
    ]
    
    # 测试增量写入
    for i, url in enumerate(test_urls, 1):
        success = db.add_image_by_url(i, url)
        print(f"添加图片 {i}: {'成功' if success else '失败'}")
    
    # 测试读取所有数据
    all_data = db.get_all_data()
    print(f"\n数据库中共有 {len(all_data)} 条记录:")
    for data in all_data:
        print(f"ID: {data['id']}, URL: {data['url']}, 向量维度: {len(data['vector'])}")
    
    # 显示统计信息
    stats = db.get_database_stats()
    print(f"\n数据库统计信息: {stats}")