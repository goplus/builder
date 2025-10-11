"""
Milvus数据库基础CRUD操作模块
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pymilvus import (
    Collection, 
    CollectionSchema, 
    FieldSchema, 
    DataType,
    utility
)
from .connection import MilvusConnection
from .config import MilvusConfig

logger = logging.getLogger(__name__)


def get_current_timestamp() -> str:
    """获取当前时间戳的统一格式"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class MilvusOperations:
    """Milvus数据库操作类"""
    
    def __init__(self, config: MilvusConfig, connection: Optional[MilvusConnection] = None):
        """
        初始化Milvus操作
        
        Args:
            config: Milvus配置
            connection: Milvus连接（可选，如果不提供则自动创建）
        """
        self.config = config
        self.connection = connection or MilvusConnection(
            host=config.host,
            port=config.port,
            alias=config.alias
        )
        self.collection: Optional[Collection] = None
        self._init_collection()
    
    def _init_collection(self):
        """初始化集合"""
        try:
            if not self.connection.is_connected():
                self.connection.connect()
            
            if utility.has_collection(self.config.collection_name):
                # 加载已存在的集合
                self.collection = Collection(self.config.collection_name)
                logger.info(f"加载已存在的集合: {self.config.collection_name}")
            else:
                # 创建新集合
                self._create_collection()
                logger.info(f"创建新集合: {self.config.collection_name}")
            
            # 加载集合到内存
            self.collection.load()
            
        except Exception as e:
            logger.error(f"初始化集合失败: {e}")
            raise
    
    def _create_collection(self):
        """创建Milvus集合"""
        try:
            # 定义字段
            fields = [
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=False),
                FieldSchema(name="url", dtype=DataType.VARCHAR, max_length=2000),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=self.config.dimension),
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
                name=self.config.collection_name,
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
            index_params = {
                "metric_type": self.config.metric_type,
                "index_type": self.config.index_type,
                "params": self.config.index_params
            }
            
            self.collection.create_index(
                field_name="vector",
                index_params=index_params
            )
            
            logger.info("向量索引创建成功")
            
        except Exception as e:
            logger.error(f"创建索引失败: {e}")
            raise
    
    def upsert(self, id: int, url: str, vector: List[float], auto_flush: bool = True) -> bool:
        """
        插入或更新数据（如果记录已存在则更新，否则插入）
        
        Args:
            id: 图片ID
            url: 图片URL
            vector: 特征向量
            auto_flush: 是否自动刷新到磁盘
            
        Returns:
            是否操作成功
        """
        try:
            current_time = get_current_timestamp()
            entities = [
                [id],                    # id
                [url],                   # url
                [vector],                # vector
                [current_time],          # added_at
                [current_time]           # updated_at
            ]
            
            # 使用Milvus原生的upsert方法
            self.collection.upsert(entities)
            
            # 条件性刷新数据到磁盘
            if auto_flush:
                self.collection.flush()
            
            logger.info(f"数据成功upsert: ID={id}")
            return True
            
        except Exception as e:
            logger.error(f"数据upsert失败: ID={id}, 错误: {e}")
            return False
    
    def delete_by_id(self, id: int) -> bool:
        """
        根据ID删除数据
        
        Args:
            id: 要删除的图片ID
            
        Returns:
            是否删除成功
        """
        try:
            # 检查记录是否存在
            if not self.record_exists(id):
                logger.warning(f"ID {id} 不存在")
                return False
            
            # 删除记录
            expr = f"id == {id}"
            self.collection.delete(expr)
            
            # 刷新删除操作
            self.collection.flush()
            
            logger.info(f"成功删除数据: ID={id}")
            return True
            
        except Exception as e:
            logger.error(f"删除数据失败: ID={id}, 错误: {e}")
            return False
    
    def record_exists(self, id: int) -> bool:
        """
        检查记录是否存在
        
        Args:
            id: 图片ID
            
        Returns:
            记录是否存在
        """
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
    
    def search_by_vector(self, query_vector: List[float], limit: int = 10) -> List[Dict[str, Any]]:
        """
        通过向量搜索相似数据
        
        Args:
            query_vector: 查询向量
            limit: 返回结果数量
            
        Returns:
            搜索结果列表
        """
        try:
            search_params = {
                "metric_type": self.config.metric_type,
                "params": self.config.search_params
            }
            
            search_result = self.collection.search(
                data=[query_vector],
                anns_field="vector",
                param=search_params,
                limit=limit,
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
                
                # 添加更新时间（如果存在且不同于添加时间）
                updated_at = hit.entity.get('updated_at')
                if updated_at and updated_at != result['added_at']:
                    result['updated_at'] = updated_at
                
                results.append(result)
            
            logger.info(f"向量搜索完成，返回 {len(results)} 个结果")
            return results
            
        except Exception as e:
            logger.error(f"向量搜索失败: {e}")
            return []
    
    def get_all_data(self, include_vectors: bool = False, limit: Optional[int] = None, 
                    offset: int = 0) -> List[Dict[str, Any]]:
        """
        获取所有数据
        
        Args:
            include_vectors: 是否包含向量数据
            limit: 限制返回数量
            offset: 偏移量
            
        Returns:
            数据列表
        """
        try:
            output_fields = ["id", "url", "added_at", "updated_at"]
            if include_vectors:
                output_fields.append("vector")
            
            # 查询所有数据
            result = self.collection.query(
                expr="id >= 0",  # 查询所有记录
                output_fields=output_fields,
                limit=limit,
                offset=offset
            )
            
            all_data = []
            for item in result:
                record = {
                    'id': item['id'],
                    'url': item['url'],
                    'added_at': item['added_at']
                }
                
                # 添加向量数据（如果需要）
                if include_vectors:
                    record['vector'] = item['vector']
                
                # 添加更新时间（如果存在且不同于添加时间）
                if 'updated_at' in item and item['updated_at'] != item['added_at']:
                    record['updated_at'] = item['updated_at']
                
                all_data.append(record)
            
            # 按ID排序
            all_data.sort(key=lambda x: x['id'])
            
            logger.info(f"返回数据，共 {len(all_data)} 条记录")
            return all_data
            
        except Exception as e:
            logger.error(f"获取数据失败: {e}")
            return []
    
    def get_count(self) -> int:
        """
        获取总记录数
        
        Returns:
            记录总数
        """
        try:
            return self.collection.num_entities
        except Exception as e:
            logger.error(f"获取记录数失败: {e}")
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取数据库统计信息
        
        Returns:
            统计信息字典
        """
        try:
            return {
                'total_images': self.get_count(),
                'dimension': self.config.dimension,
                'collection_name': self.config.collection_name,
                'host': self.config.host,
                'port': self.config.port,
                'index_type': self.config.index_type,
                'metric_type': self.config.metric_type
            }
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {
                'total_images': 0,
                'dimension': self.config.dimension,
                'collection_name': self.config.collection_name,
                'host': self.config.host,
                'port': self.config.port,
                'index_type': self.config.index_type,
                'metric_type': self.config.metric_type
            }
    
    def batch_flush(self) -> bool:
        """
        批量刷新数据到磁盘
        
        Returns:
            是否刷新成功
        """
        try:
            self.collection.flush()
            logger.info("批量flush完成")
            return True
        except Exception as e:
            logger.error(f"批量flush失败: {e}")
            return False
