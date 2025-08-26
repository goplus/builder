import os
import logging
from typing import List, Dict, Any, Optional
from vector_database import VectorDatabase

logger = logging.getLogger(__name__)


class VectorDBManager:
    """向量数据库管理工具类"""
    
    def __init__(self, db_path: str = 'vector_db'):
        """
        初始化管理器
        
        Args:
            db_path: 数据库路径
        """
        self.db_path = db_path
        self.db = VectorDatabase(db_path=db_path)
    
    def index_directory(self, directory_path: str, 
                       supported_extensions: List[str] = None) -> Dict[str, Any]:
        """
        索引目录下的所有图片
        
        Args:
            directory_path: 目录路径
            supported_extensions: 支持的文件扩展名
            
        Returns:
            索引结果统计
        """
        if supported_extensions is None:
            supported_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.svg']
        
        if not os.path.exists(directory_path):
            logger.error(f"目录不存在: {directory_path}")
            return {'success': False, 'error': '目录不存在'}
        
        # 收集所有图片文件
        image_files = []
        for root, dirs, files in os.walk(directory_path):
            for file in files:
                _, ext = os.path.splitext(file.lower())
                if ext in supported_extensions:
                    image_path = os.path.join(root, file)
                    image_files.append(image_path)
        
        if not image_files:
            logger.warning(f"目录中未找到支持的图片文件: {directory_path}")
            return {'success': True, 'indexed': 0, 'failed': 0, 'total': 0}
        
        logger.info(f"找到 {len(image_files)} 个图片文件，开始索引...")
        
        # 准备元数据
        metadatas = []
        for image_path in image_files:
            metadata = {
                'filename': os.path.basename(image_path),
                'directory': os.path.dirname(image_path),
                'file_size': os.path.getsize(image_path),
                'relative_path': os.path.relpath(image_path, directory_path)
            }
            metadatas.append(metadata)
        
        # 批量添加到数据库
        results = self.db.add_images_batch(image_files, metadatas)
        
        # 统计结果
        indexed = sum(1 for r in results if r is not None)
        failed = len(results) - indexed
        
        stats = {
            'success': True,
            'total': len(image_files),
            'indexed': indexed,
            'failed': failed,
            'directory': directory_path
        }
        
        logger.info(f"索引完成: {stats}")
        return stats
    
    def search_similar_images(self, query_path: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        搜索相似图片
        
        Args:
            query_path: 查询图片路径
            k: 返回结果数量
            
        Returns:
            相似图片列表
        """
        return self.db.search_by_image(query_path, k)
    
    def search_by_description(self, description: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        通过文本描述搜索图片
        
        Args:
            description: 文本描述
            k: 返回结果数量
            
        Returns:
            匹配的图片列表
        """
        return self.db.search_by_text(description, k)
    
    def get_database_info(self) -> Dict[str, Any]:
        """获取数据库信息"""
        return self.db.get_stats()
    
    def export_metadata(self, output_file: str = None) -> Dict[str, Any]:
        """
        导出数据库元数据
        
        Args:
            output_file: 输出文件路径（可选）
            
        Returns:
            元数据字典
        """
        metadata_export = {
            'database_stats': self.db.get_stats(),
            'images': {}
        }
        
        for image_id, data in self.db.metadata.items():
            metadata_export['images'][image_id] = data
        
        if output_file:
            import json
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(metadata_export, f, indent=2, ensure_ascii=False)
            logger.info(f"元数据已导出到: {output_file}")
        
        return metadata_export
    
    def find_duplicates(self, similarity_threshold: float = 0.95) -> List[List[Dict[str, Any]]]:
        """
        查找重复或相似的图片
        
        Args:
            similarity_threshold: 相似度阈值
            
        Returns:
            重复图片组列表
        """
        duplicates = []
        processed_ids = set()
        
        for image_id, data in self.db.metadata.items():
            if image_id in processed_ids:
                continue
            
            # 搜索相似图片
            similar_images = self.db.search_by_image(data['image_path'], k=10)
            
            # 过滤高相似度图片
            duplicate_group = []
            for similar in similar_images:
                if similar['similarity'] >= similarity_threshold and similar['id'] not in processed_ids:
                    duplicate_group.append(similar)
                    processed_ids.add(similar['id'])
            
            if len(duplicate_group) > 1:
                duplicates.append(duplicate_group)
        
        logger.info(f"找到 {len(duplicates)} 组重复图片")
        return duplicates


def create_sample_database(resource_dir: str = 'resource') -> VectorDBManager:
    """
    创建示例数据库
    
    Args:
        resource_dir: 资源目录路径
        
    Returns:
        数据库管理器实例
    """
    db_manager = VectorDBManager(db_path=os.path.join(resource_dir, 'sample_vector_db'))
    
    # 如果资源目录存在图片，则索引它们
    if os.path.exists(resource_dir):
        logger.info(f"索引资源目录: {resource_dir}")
        stats = db_manager.index_directory(resource_dir)
        logger.info(f"索引统计: {stats}")
    
    return db_manager


if __name__ == "__main__":
    # 设置日志
    logging.basicConfig(level=logging.INFO)
    
    # 创建示例数据库
    manager = create_sample_database()
    
    # 显示数据库信息
    info = manager.get_database_info()
    print(f"数据库信息: {info}")
    
    # 示例搜索
    if info['total_images'] > 0:
        # 文本搜索示例
        results = manager.search_by_description("cute animal", k=3)
        print(f"文本搜索结果: {len(results)} 张图片")
        for result in results:
            print(f"  {result['metadata']['filename']}: {result['similarity']:.3f}")