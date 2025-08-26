#!/usr/bin/env python3
"""
向量数据库演示脚本
"""
import os
import sys
import logging
from vector_db_utils import VectorDBManager, create_sample_database

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def main():
    print("=== 向量数据库演示 ===\n")
    
    # 获取当前脚本所在目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    try:
        # 创建数据库管理器
        print("1. 初始化向量数据库...")
        db_manager = VectorDBManager(db_path=os.path.join(current_dir, 'demo_vector_db'))
        
        # 索引当前目录的图片
        print("2. 索引当前目录的图片...")
        stats = db_manager.index_directory(current_dir)
        print(f"   索引结果: {stats}")
        
        # 显示数据库信息
        print("\n3. 数据库信息:")
        info = db_manager.get_database_info()
        for key, value in info.items():
            print(f"   {key}: {value}")
        
        if info['total_images'] == 0:
            print("\n注意: 当前目录没有找到图片文件，请添加一些图片文件后重试")
            return
        
        # 文本搜索示例
        print("\n4. 文本搜索示例:")
        search_queries = [
            "cute animal",
            "dog",
            "cartoon",
            "colorful image"
        ]
        
        for query in search_queries:
            print(f"\n   搜索: '{query}'")
            results = db_manager.search_by_description(query, k=3)
            if results:
                for i, result in enumerate(results, 1):
                    filename = result['metadata']['filename']
                    similarity = result['similarity']
                    print(f"     {i}. {filename} (相似度: {similarity:.3f})")
            else:
                print("     未找到匹配结果")
        
        # 图片相似搜索示例（如果有多张图片）
        if info['total_images'] > 1:
            print("\n5. 图片相似搜索示例:")
            
            # 获取第一张图片作为查询
            first_image_path = None
            for image_id, data in db_manager.db.metadata.items():
                first_image_path = data['image_path']
                break
            
            if first_image_path:
                print(f"   使用图片: {os.path.basename(first_image_path)}")
                similar_results = db_manager.search_similar_images(first_image_path, k=5)
                for i, result in enumerate(similar_results, 1):
                    filename = result['metadata']['filename']
                    similarity = result['similarity']
                    print(f"     {i}. {filename} (相似度: {similarity:.3f})")
        
        # 查找重复图片
        print("\n6. 查找重复图片:")
        duplicates = db_manager.find_duplicates(similarity_threshold=0.9)
        if duplicates:
            print(f"   找到 {len(duplicates)} 组相似图片:")
            for i, group in enumerate(duplicates, 1):
                print(f"   组 {i}:")
                for item in group:
                    filename = item['metadata']['filename']
                    similarity = item['similarity']
                    print(f"     - {filename} (相似度: {similarity:.3f})")
        else:
            print("   未找到重复图片")
        
        # 导出元数据
        print("\n7. 导出数据库元数据...")
        export_path = os.path.join(current_dir, 'database_metadata.json')
        db_manager.export_metadata(export_path)
        print(f"   元数据已导出到: {export_path}")
        
        print("\n=== 演示完成 ===")
        
    except ImportError as e:
        if "faiss" in str(e):
            print("错误: 缺少faiss库")
            print("请安装faiss库:")
            print("  CPU版本: pip install faiss-cpu")
            print("  GPU版本: pip install faiss-gpu")
        else:
            print(f"导入错误: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"运行错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()