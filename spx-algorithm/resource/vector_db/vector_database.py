import os
import pickle
import logging
import io
from typing import List, Dict, Any, Optional
import numpy as np
import torch
import open_clip
from PIL import Image
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


class VectorDatabase:
    """基于open-clip的图像向量数据库"""
    
    def __init__(self, 
                 model_name: str = 'ViT-B-32', 
                 pretrained: str = 'laion2b_s34b_b79k',
                 db_path: str = 'vector_db',
                 dimension: int = 512):
        """
        初始化向量数据库
        
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
        self.metadata = {}
        self.id_counter = 0
        
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
            
            # 保存元数据
            metadata_path = os.path.join(self.db_path, 'metadata.pkl')
            with open(metadata_path, 'wb') as f:
                pickle.dump({
                    'metadata': self.metadata,
                    'id_counter': self.id_counter,
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
            metadata_path = os.path.join(self.db_path, 'metadata.pkl')
            
            if os.path.exists(index_path) and os.path.exists(metadata_path):
                # 加载索引
                self.index = faiss.read_index(index_path)
                
                # 加载元数据
                with open(metadata_path, 'rb') as f:
                    data = pickle.load(f)
                    self.metadata = data['metadata']
                    self.id_counter = data['id_counter']
                
                logger.info(f"数据库加载成功，包含 {len(self.metadata)} 个向量")
            else:
                logger.info("未找到已有数据库，创建新的数据库")
        except Exception as e:
            logger.error(f"加载数据库失败: {e}")
            # 重新初始化
            self.index = faiss.IndexFlatIP(self.dimension)
            self.metadata = {}
            self.id_counter = 0
    
    def _encode_image(self, image_path: str) -> Optional[np.ndarray]:
        """
        编码单张图片为向量，支持SVG格式
        
        Args:
            image_path: 图片路径
            
        Returns:
            图片特征向量，失败返回None
        """
        try:
            if not os.path.exists(image_path):
                logger.warning(f"图片文件不存在: {image_path}")
                return None
            
            logger.info(f"处理本地图片: {image_path}")
            
            # 根据文件扩展名选择处理方式
            _, ext = os.path.splitext(image_path.lower())
            
            if ext == '.svg':
                # 处理SVG文件
                if cairosvg is None:
                    logger.error("SVG支持需要安装cairosvg库: pip install cairosvg")
                    return None
                
                png_data = cairosvg.svg2png(
                    url=image_path, 
                    output_width=224, 
                    output_height=224,
                    background_color='white'
                )
                image = Image.open(io.BytesIO(png_data)).convert('RGB')
            else:
                # 处理其他格式图片
                image = Image.open(image_path).convert('RGB')
            
            logger.info(f"图片尺寸: {image.size}, 模式: {image.mode}")
            
            # 预处理图片
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                # 编码图片
                image_features = self.model.encode_image(image_tensor)
                # 归一化
                image_features /= image_features.norm(dim=-1, keepdim=True)
                
                return image_features.cpu().numpy().astype('float32')
                
        except Exception as e:
            logger.error(f"编码图片失败 {image_path}: {e}")
            return None
    
    def _encode_text(self, text: str) -> Optional[np.ndarray]:
        """
        编码文本为向量
        
        Args:
            text: 文本内容
            
        Returns:
            文本特征向量，失败返回None
        """
        try:
            text_tokens = self.tokenizer([text]).to(self.device)
            
            with torch.no_grad():
                text_features = self.model.encode_text(text_tokens)
                text_features /= text_features.norm(dim=-1, keepdim=True)
                
                return text_features.cpu().numpy().astype('float32')
                
        except Exception as e:
            logger.error(f"编码文本失败 {text}: {e}")
            return None
    
    def add_image(self, image_path: str, metadata: Optional[Dict[str, Any]] = None) -> Optional[int]:
        """
        添加图片到向量数据库
        
        Args:
            image_path: 图片路径
            metadata: 图片元数据
            
        Returns:
            图片ID，失败返回None
        """
        vector = self._encode_image(image_path)
        if vector is None:
            return None
        
        # 添加到索引
        self.index.add(vector)
        
        # 保存元数据
        image_id = self.id_counter
        self.metadata[image_id] = {
            'image_path': image_path,
            'metadata': metadata or {},
            'added_at': datetime.now().isoformat()
        }
        self.id_counter += 1
        
        # 保存数据库
        self._save_database()
        
        logger.info(f"图片已添加到数据库: {image_path} (ID: {image_id})")
        return image_id
    
    def add_images_batch(self, image_paths: List[str], 
                        metadatas: Optional[List[Dict[str, Any]]] = None) -> List[Optional[int]]:
        """
        批量添加图片到向量数据库
        
        Args:
            image_paths: 图片路径列表
            metadatas: 图片元数据列表
            
        Returns:
            图片ID列表
        """
        if metadatas is None:
            metadatas = [None] * len(image_paths)
        
        results = []
        vectors = []
        valid_indices = []
        
        # 批量编码
        for i, (image_path, metadata) in enumerate(zip(image_paths, metadatas)):
            vector = self._encode_image(image_path)
            if vector is not None:
                vectors.append(vector)
                valid_indices.append(i)
                
                # 准备元数据
                image_id = self.id_counter + len(vectors) - 1
                self.metadata[image_id] = {
                    'image_path': image_path,
                    'metadata': metadata or {},
                    'added_at': datetime.now().isoformat()
                }
                results.append(image_id)
            else:
                results.append(None)
        
        if vectors:
            # 批量添加到索引
            vectors_array = np.vstack(vectors)
            self.index.add(vectors_array)
            self.id_counter += len(vectors)
            
            # 保存数据库
            self._save_database()
            
            logger.info(f"批量添加 {len(vectors)} 张图片到数据库")
        
        return results
    
    def search_by_image(self, query_image_path: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        通过图片搜索相似图片
        
        Args:
            query_image_path: 查询图片路径
            k: 返回结果数量
            
        Returns:
            相似图片列表
        """
        query_vector = self._encode_image(query_image_path)
        if query_vector is None:
            return []
        
        return self._search_by_vector(query_vector, k)
    
    def search_by_text(self, query_text: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        通过文本搜索相似图片
        
        Args:
            query_text: 查询文本
            k: 返回结果数量
            
        Returns:
            相似图片列表
        """
        query_vector = self._encode_text(query_text)
        if query_vector is None:
            return []
        
        return self._search_by_vector(query_vector, k)
    
    def _search_by_vector(self, query_vector: np.ndarray, k: int) -> List[Dict[str, Any]]:
        """
        通过向量搜索
        
        Args:
            query_vector: 查询向量
            k: 返回结果数量
            
        Returns:
            搜索结果列表
        """
        if self.index.ntotal == 0:
            logger.warning("数据库为空")
            return []
        
        k = min(k, self.index.ntotal)
        similarities, indices = self.index.search(query_vector, k)
        
        results = []
        for i, (similarity, idx) in enumerate(zip(similarities[0], indices[0])):
            if idx in self.metadata:
                result = {
                    'id': int(idx),
                    'similarity': float(similarity),
                    'rank': i + 1,
                    **self.metadata[idx]
                }
                results.append(result)
        
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """获取数据库统计信息"""
        return {
            'total_images': self.index.ntotal,
            'dimension': self.dimension,
            'model_name': self.model_name,
            'pretrained': self.pretrained,
            'db_path': self.db_path,
            'device': self.device
        }
    
    def remove_image(self, image_id: int) -> bool:
        """
        删除图片（注意：Faiss不支持直接删除，需要重建索引）
        
        Args:
            image_id: 图片ID
            
        Returns:
            是否成功删除
        """
        if image_id not in self.metadata:
            logger.warning(f"图片ID不存在: {image_id}")
            return False
        
        # 删除元数据
        del self.metadata[image_id]
        
        # 重建索引（仅包含剩余的图片）
        self._rebuild_index()
        
        logger.info(f"图片已删除: {image_id}")
        return True
    
    def _rebuild_index(self):
        """重建索引（用于删除操作后）"""
        if not self.metadata:
            self.index = faiss.IndexFlatIP(self.dimension)
            self._save_database()
            return
        
        # 重新编码所有剩余的图片
        vectors = []
        for image_id, data in self.metadata.items():
            vector = self._encode_image(data['image_path'])
            if vector is not None:
                vectors.append(vector)
            else:
                # 如果重新编码失败，从元数据中删除
                del self.metadata[image_id]
        
        # 重建索引
        self.index = faiss.IndexFlatIP(self.dimension)
        if vectors:
            vectors_array = np.vstack(vectors)
            self.index.add(vectors_array)
        
        self._save_database()