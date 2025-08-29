#!/usr/bin/env python3
"""
Milvus向量数据库演示脚本
"""
import os
import sys
import logging
import requests
import json
from milvus_vector_database import MilvusVectorDatabase

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def demo_direct_usage():
    """直接使用数据库类的演示"""
    print("=== 直接使用MilvusVectorDatabase演示 ===\n")
    
    try:
        # 创建数据库实例
        print("1. 初始化Milvus向量数据库...")
        print("   注意：需要先启动Milvus服务")
        print("   Docker启动命令: docker run -p 19530:19530 milvusdb/milvus:latest")
        
        db = MilvusVectorDatabase(
            collection_name='demo_milvus_collection',
            host='localhost',
            port='19530'
        )
        
        # 测试SVG URL列表（这里使用示例URL，实际使用时需要替换为真实的SVG URL）
        test_data = [
            {"id": 1, "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f436.svg"},  # 狗
            {"id": 2, "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f431.svg"},  # 猫
            {"id": 3, "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f98b.svg"},  # 蝴蝶
        ]
        
        # 测试增量写入
        print("2. 测试增量写入接口...")
        for data in test_data:
            print(f"   添加图片: ID={data['id']}, URL={data['url']}")
            success = db.add_image_by_url(data['id'], data['url'])
            print(f"   结果: {'成功' if success else '失败'}")
            print()
        
        # 显示数据库统计
        print("3. 数据库统计信息:")
        stats = db.get_database_stats()
        for key, value in stats.items():
            print(f"   {key}: {value}")
        print()
        
        # 测试读取所有数据
        print("4. 读取所有数据:")
        all_data = db.get_all_data()
        print(f"   数据库中共有 {len(all_data)} 条记录")
        
        for data in all_data:
            print(f"   ID: {data['id']}")
            print(f"   URL: {data['url']}")
            print(f"   向量维度: {len(data['vector'])}")
            print(f"   添加时间: {data['added_at']}")
            print()
        
        # 测试文本搜索（如果有数据）
        if len(all_data) > 0:
            print("5. 测试文本搜索:")
            search_queries = ["dog", "cat", "animal", "butterfly"]
            
            for query in search_queries:
                print(f"   搜索: '{query}'")
                results = db.search_by_text(query, k=3)
                
                if results:
                    for result in results:
                        print(f"     ID: {result['id']}, 相似度: {result['similarity']:.4f}")
                else:
                    print("     未找到匹配结果")
                print()
        
        # 测试删除功能
        if len(all_data) > 0:
            print("6. 测试删除功能:")
            test_id = all_data[0]['id']
            print(f"   删除ID为 {test_id} 的记录")
            success = db.remove_by_id(test_id)
            print(f"   删除结果: {'成功' if success else '失败'}")
            
            # 再次查看数据
            remaining_data = db.get_all_data()
            print(f"   删除后剩余记录数: {len(remaining_data)}")
        
        print("=== 直接使用演示完成 ===\n")
        return True
        
    except Exception as e:
        print(f"演示过程中出错: {e}")
        print("\n可能的原因:")
        print("1. Milvus服务未启动")
        print("2. 网络连接问题")
        print("3. 依赖库未安装")
        return False


def demo_api_usage():
    """API接口使用演示"""
    print("=== API接口使用演示 ===\n")
    
    base_url = "http://localhost:5002/api/milvus"
    
    try:
        # 测试健康检查
        print("1. 健康检查...")
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("   API服务正常运行")
            print(f"   响应: {response.json()}")
        else:
            print(f"   API服务异常: {response.status_code}")
            return False
        print()
        
        # 测试统计信息
        print("2. 获取统计信息...")
        response = requests.get(f"{base_url}/stats", timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print("   统计信息:")
            for key, value in stats['stats'].items():
                print(f"     {key}: {value}")
        print()
        
        # 测试集合信息（Milvus特有）
        print("3. 获取集合信息...")
        response = requests.get(f"{base_url}/collection/info", timeout=10)
        if response.status_code == 200:
            collection_info = response.json()
            print("   集合信息:")
            print(f"     集合名称: {collection_info['collection_info']['collection_name']}")
            print("     字段信息:")
            for field in collection_info['collection_info']['schema']['fields']:
                print(f"       - {field['name']}: {field['type']}")
        print()
        
        # 测试添加图片
        print("4. 测试添加图片...")
        test_images = [
            {"id": 101, "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f436.svg"},
            {"id": 102, "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f431.svg"},
        ]
        
        for img_data in test_images:
            response = requests.post(
                f"{base_url}/add",
                json=img_data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   添加成功: ID={img_data['id']}")
            else:
                print(f"   添加失败: ID={img_data['id']}, 状态码={response.status_code}")
                print(f"   错误信息: {response.text}")
        print()
        
        # 测试获取所有数据
        print("5. 获取所有数据...")
        response = requests.get(f"{base_url}/data?include_vectors=false&limit=5", timeout=10)
        if response.status_code == 200:
            data_response = response.json()
            print(f"   总记录数: {data_response['total_count']}")
            print(f"   返回记录数: {data_response['returned_count']}")
            
            for item in data_response['data'][:3]:  # 只显示前3个
                print(f"     ID: {item['id']}, URL: {item['url'][:50]}...")
        print()
        
        # 测试文本搜索
        print("6. 测试文本搜索...")
        search_data = {"text": "dog", "k": 3}
        response = requests.post(
            f"{base_url}/search",
            json=search_data,
            timeout=10
        )
        
        if response.status_code == 200:
            search_results = response.json()
            print(f"   搜索 '{search_data['text']}' 的结果:")
            print(f"   找到 {search_results['results_count']} 个结果")
            
            for result in search_results['results']:
                print(f"     ID: {result['id']}, 相似度: {result['similarity']:.4f}")
        print()
        
        # 测试批量添加
        print("7. 测试批量添加...")
        batch_data = {
            "images": [
                {"id": 201, "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f98b.svg"},
                {"id": 202, "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f41d.svg"},
            ]
        }
        
        response = requests.post(
            f"{base_url}/batch/add",
            json=batch_data,
            timeout=60
        )
        
        if response.status_code == 200:
            batch_results = response.json()
            print(f"   批量添加结果: 成功 {batch_results['success_count']}/{batch_results['total']}")
        print()
        
        # 测试删除功能
        print("8. 测试删除功能...")
        delete_data = {"id": 201}
        response = requests.delete(
            f"{base_url}/delete",
            json=delete_data,
            timeout=10
        )
        
        if response.status_code == 200:
            delete_result = response.json()
            print(f"   删除结果: {delete_result['message']}")
        print()
        
        print("=== API接口演示完成 ===\n")
        return True
        
    except requests.exceptions.ConnectionError:
        print("无法连接到API服务器。请确保API服务器正在运行。")
        print("启动命令: python milvus_vector_api.py")
        return False
    except Exception as e:
        print(f"API演示过程中出错: {e}")
        return False


def print_usage_examples():
    """打印使用示例"""
    print("=== 使用示例 ===\n")
    
    print("1. 启动Milvus服务:")
    print("""
# 使用Docker启动Milvus (推荐)
docker run -d --name milvus-standalone -p 19530:19530 -p 9091:9091 \\
  milvusdb/milvus:latest

# 或使用docker-compose
# 参考：https://milvus.io/docs/install_standalone-docker.md
""")
    
    print("2. 直接使用数据库类:")
    print("""
from milvus_vector_database import MilvusVectorDatabase

# 创建数据库实例
db = MilvusVectorDatabase(
    collection_name='my_collection',
    host='localhost',
    port='19530'
)

# 添加图片
success = db.add_image_by_url(1, 'https://example.com/image.svg')

# 读取所有数据
all_data = db.get_all_data()
print(f"共有 {len(all_data)} 条记录")

# 文本搜索
results = db.search_by_text('dog', k=5)

# 关闭连接
db.close_connection()
""")
    
    print("3. 使用API接口:")
    print("""
import requests

base_url = "http://localhost:5002/api/milvus"

# 添加图片
response = requests.post(f"{base_url}/add", json={
    "id": 1,
    "url": "https://example.com/image.svg"
})

# 获取所有数据
response = requests.get(f"{base_url}/data")
data = response.json()

# 文本搜索
response = requests.post(f"{base_url}/search", json={
    "text": "dog",
    "k": 5
})

# 获取集合信息
response = requests.get(f"{base_url}/collection/info")
""")
    
    print("4. API端点列表:")
    endpoints = [
        ("GET", "/api/milvus/health", "健康检查"),
        ("GET", "/api/milvus/stats", "获取统计信息"),
        ("POST", "/api/milvus/add", "添加单个图片"),
        ("GET", "/api/milvus/data", "获取所有数据"),
        ("POST", "/api/milvus/search", "文本搜索"),
        ("DELETE", "/api/milvus/delete", "删除图片"),
        ("POST", "/api/milvus/batch/add", "批量添加图片"),
        ("GET", "/api/milvus/collection/info", "获取集合信息")
    ]
    
    for method, endpoint, description in endpoints:
        print(f"   {method:6} {endpoint:30} - {description}")
    
    print()


def print_migration_guide():
    """打印从Faiss迁移的指南"""
    print("=== 从Faiss迁移到Milvus指南 ===\n")
    
    print("1. 环境准备:")
    print("   - 安装Milvus: docker run milvusdb/milvus:latest")
    print("   - 安装依赖: pip install -r requirements_milvus.txt")
    print()
    
    print("2. 代码迁移:")
    print("   - 替换导入: from milvus_vector_database import MilvusVectorDatabase")
    print("   - 修改初始化参数: 添加host和port配置")
    print("   - API接口完全兼容，无需修改调用方式")
    print()
    
    print("3. 配置差异:")
    print("   - Faiss: 本地文件存储")
    print("   - Milvus: 分布式数据库存储")
    print("   - Milvus支持更大规模数据和更高并发")
    print()
    
    print("4. 性能优势:")
    print("   - 分布式架构，支持水平扩展")
    print("   - 更高的查询性能和并发处理能力")
    print("   - 数据持久化和高可用保证")
    print()
    
    print("5. 注意事项:")
    print("   - 需要独立部署Milvus服务")
    print("   - 网络延迟可能略高于本地Faiss")
    print("   - 建议在生产环境使用集群模式")
    print()


def main():
    """主函数"""
    print("Milvus向量数据库演示程序\n")
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    else:
        print("选择演示模式:")
        print("1. 直接使用数据库类")
        print("2. 使用API接口")
        print("3. 显示使用示例")
        print("4. 显示迁移指南")
        print("5. 全部演示")
        
        choice = input("请输入选择 (1-5): ").strip()
        
        mode_map = {
            '1': 'direct',
            '2': 'api',
            '3': 'examples',
            '4': 'migration',
            '5': 'all'
        }
        
        mode = mode_map.get(choice, 'all')
    
    try:
        if mode in ['direct', 'all']:
            demo_direct_usage()
        
        if mode in ['api', 'all']:
            demo_api_usage()
        
        if mode in ['examples', 'all']:
            print_usage_examples()
        
        if mode in ['migration', 'all']:
            print_migration_guide()
        
        print("演示完成！")
        
    except KeyboardInterrupt:
        print("\n演示被用户中断")
    except Exception as e:
        print(f"演示过程中发生错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()