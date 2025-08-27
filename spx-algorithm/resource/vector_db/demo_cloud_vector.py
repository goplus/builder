#!/usr/bin/env python3
"""
云端向量数据库演示脚本
"""
import os
import sys
import logging
import requests
import json
from cloud_vector_database import CloudVectorDatabase

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def demo_direct_usage():
    """直接使用数据库类的演示"""
    print("=== 直接使用CloudVectorDatabase演示 ===\n")
    
    try:
        # 创建数据库实例
        print("1. 初始化云端向量数据库...")
        db = CloudVectorDatabase(db_path='demo_cloud_vector_db')
        
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
        
        print("=== 直接使用演示完成 ===\n")
        return True
        
    except Exception as e:
        print(f"演示过程中出错: {e}")
        return False


def demo_api_usage():
    """API接口使用演示"""
    print("=== API接口使用演示 ===\n")
    
    base_url = "http://localhost:5001/api/vector"
    
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
        
        # 测试添加图片
        print("3. 测试添加图片...")
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
        print("4. 获取所有数据...")
        response = requests.get(f"{base_url}/data?include_vectors=false&limit=5", timeout=10)
        if response.status_code == 200:
            data_response = response.json()
            print(f"   总记录数: {data_response['total_count']}")
            print(f"   返回记录数: {data_response['returned_count']}")
            
            for item in data_response['data'][:3]:  # 只显示前3个
                print(f"     ID: {item['id']}, URL: {item['url'][:50]}...")
        print()
        
        # 测试文本搜索
        print("5. 测试文本搜索...")
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
        print("6. 测试批量添加...")
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
        
        print("=== API接口演示完成 ===\n")
        return True
        
    except requests.exceptions.ConnectionError:
        print("无法连接到API服务器。请确保API服务器正在运行。")
        print("启动命令: python cloud_vector_api.py")
        return False
    except Exception as e:
        print(f"API演示过程中出错: {e}")
        return False


def print_usage_examples():
    """打印使用示例"""
    print("=== 使用示例 ===\n")
    
    print("1. 直接使用数据库类:")
    print("""
from cloud_vector_database import CloudVectorDatabase

# 创建数据库实例
db = CloudVectorDatabase(db_path='my_vector_db')

# 添加图片
success = db.add_image_by_url(1, 'https://example.com/image.svg')

# 读取所有数据
all_data = db.get_all_data()
print(f"共有 {len(all_data)} 条记录")

# 文本搜索
results = db.search_by_text('dog', k=5)
""")
    
    print("2. 使用API接口:")
    print("""
import requests

base_url = "http://localhost:5001/api/vector"

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
""")
    
    print("3. API端点列表:")
    endpoints = [
        ("GET", "/api/vector/health", "健康检查"),
        ("GET", "/api/vector/stats", "获取统计信息"),
        ("POST", "/api/vector/add", "添加单个图片"),
        ("GET", "/api/vector/data", "获取所有数据"),
        ("POST", "/api/vector/search", "文本搜索"),
        ("DELETE", "/api/vector/delete", "删除图片"),
        ("POST", "/api/vector/batch/add", "批量添加图片")
    ]
    
    for method, endpoint, description in endpoints:
        print(f"   {method:6} {endpoint:25} - {description}")
    
    print()


def main():
    """主函数"""
    print("云端向量数据库演示程序\n")
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    else:
        print("选择演示模式:")
        print("1. 直接使用数据库类")
        print("2. 使用API接口")
        print("3. 显示使用示例")
        print("4. 全部演示")
        
        choice = input("请输入选择 (1-4): ").strip()
        
        mode_map = {
            '1': 'direct',
            '2': 'api',
            '3': 'examples',
            '4': 'all'
        }
        
        mode = mode_map.get(choice, 'all')
    
    try:
        if mode in ['direct', 'all']:
            demo_direct_usage()
        
        if mode in ['api', 'all']:
            demo_api_usage()
        
        if mode in ['examples', 'all']:
            print_usage_examples()
        
        print("演示完成！")
        
    except KeyboardInterrupt:
        print("\n演示被用户中断")
    except Exception as e:
        print(f"演示过程中发生错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()