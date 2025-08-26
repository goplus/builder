#!/usr/bin/env python3
"""
简单的向量数据库使用示例
展示如何在其他项目中集成和使用向量数据库
"""
import os
from vector_database import VectorDatabase
from vector_db_utils import VectorDBManager

def example_basic_usage():
    """基本使用示例"""
    print("=== 基本使用示例 ===")
    
    # 1. 创建向量数据库实例
    db = VectorDatabase(db_path='example_db')
    
    # 2. 添加单张图片
    current_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(current_dir, 'cute.svg')
    
    if os.path.exists(image_path):
        image_id = db.add_image(image_path, metadata={'category': 'cute', 'type': 'svg'})
        print(f"添加图片成功，ID: {image_id}")
    
    # 3. 文本搜索
    results = db.search_by_text('cute animal', k=3)
    print(f"搜索 'cute animal' 的结果：")
    for result in results:
        print(f"  - {os.path.basename(result['image_path'])}: {result['similarity']:.3f}")
    
    print()

def example_batch_processing():
    """批量处理示例"""
    print("=== 批量处理示例 ===")
    
    # 使用管理器进行批量操作
    manager = VectorDBManager(db_path='batch_example_db')
    
    # 索引当前目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    stats = manager.index_directory(current_dir)
    print(f"索引统计: 总计 {stats['total']} 个文件，成功 {stats['indexed']} 个")
    
    # 搜索示例
    results = manager.search_by_description('dog', k=2)
    print(f"搜索 'dog' 的结果：")
    for result in results:
        print(f"  - {result['metadata']['filename']}: {result['similarity']:.3f}")
    
    print()

def example_integration_with_existing_service():
    """与现有服务集成的示例"""
    print("=== 与现有服务集成示例 ===")
    
    # 模拟与现有ImageSearchService的集成
    print("1. 可以复用相同的模型配置")
    print("   - 模型: ViT-B-32")
    print("   - 预训练权重: laion2b_s34b_b79k")
    print("   - 支持相同的图片格式（包括SVG）")
    
    print("\n2. 向量数据库的优势:")
    print("   - 预计算图片向量，搜索更快")
    print("   - 支持大规模图片集合")
    print("   - 持久化存储，无需重复计算")
    
    print("\n3. 使用场景:")
    print("   - 图片库管理系统")
    print("   - 相似图片推荐")
    print("   - 重复图片检测")
    print("   - 基于内容的图片搜索")
    
    print()

def main():
    """主函数"""
    try:
        example_basic_usage()
        example_batch_processing()
        example_integration_with_existing_service()
        
        print("=== 所有示例运行完成 ===")
        
    except Exception as e:
        print(f"运行出错: {e}")
        print("请确保已安装所需依赖: pip install -r requirements_vector_db.txt")

if __name__ == "__main__":
    main()