#!/usr/bin/env python3
"""
测试向量数据库搜图功能
"""
import requests
import json

# 配置
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

def test_vector_db_health():
    """测试向量数据库健康检查"""
    print("=== 测试向量数据库健康检查 ===")
    try:
        response = requests.get(f"{API_BASE}/vector/health")
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def test_vector_db_stats():
    """测试向量数据库统计信息"""
    print("\n=== 测试向量数据库统计信息 ===")
    try:
        response = requests.get(f"{API_BASE}/vector/stats")
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def test_add_sample_images():
    """添加示例图片到向量数据库"""
    print("\n=== 添加示例图片到向量数据库 ===")
    
    sample_images = [
        {
            "id": 1001,
            "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f436.svg",  # 狗
        },
        {
            "id": 1002,
            "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f431.svg",  # 猫
        },
        {
            "id": 1003,
            "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f98b.svg",  # 蝴蝶
        }
    ]
    
    success_count = 0
    for img_data in sample_images:
        try:
            print(f"添加图片 ID={img_data['id']}, URL={img_data['url']}")
            response = requests.post(
                f"{API_BASE}/vector/add",
                json=img_data,
                timeout=30
            )
            
            if response.status_code == 200:
                print(f"✓ 添加成功")
                success_count += 1
            else:
                print(f"✗ 添加失败: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"✗ 添加失败: {e}")
    
    print(f"成功添加 {success_count}/{len(sample_images)} 张图片")
    return success_count > 0

def test_vector_search():
    """测试向量数据库搜索功能"""
    print("\n=== 测试向量数据库搜索功能 ===")
    
    search_queries = [
        {"text": "dog", "top_k": 3},
        {"text": "cat", "top_k": 3},
        {"text": "animal", "top_k": 5},
        {"text": "butterfly", "top_k": 2}
    ]
    
    success_count = 0
    for query in search_queries:
        try:
            print(f"\n搜索: '{query['text']}'")
            response = requests.post(
                f"{API_BASE}/vector/search",
                json=query,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ 搜索成功，找到 {result['results_count']} 个结果")
                
                for i, item in enumerate(result['results']):
                    print(f"  {i+1}. ID={item['id']}, 相似度={item['similarity']:.4f}")
                    
                success_count += 1
            else:
                print(f"✗ 搜索失败: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"✗ 搜索失败: {e}")
    
    return success_count > 0

def test_resource_search():
    """测试新的 /search/resource 接口（现在使用向量数据库）"""
    print("\n=== 测试 /search/resource 接口（向量数据库版本） ===")
    
    search_queries = [
        {"text": "dog", "top_k": 3},
        {"text": "cat", "top_k": 3, "threshold": 0.1},
        {"text": "animal", "top_k": 5}
    ]
    
    success_count = 0
    for query in search_queries:
        try:
            print(f"\n搜索: '{query['text']}' (top_k={query.get('top_k', 10)}, threshold={query.get('threshold', 0.0)})")
            response = requests.post(
                f"{API_BASE}/search/resource",
                json=query,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ 搜索成功，找到 {result['results_count']} 个结果")
                
                for i, item in enumerate(result['results']):
                    print(f"  {i+1}. ID={item['id']}, 相似度={item['similarity']:.4f}, URL={item['url'][:60]}...")
                    
                success_count += 1
            else:
                print(f"✗ 搜索失败: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"✗ 搜索失败: {e}")
    
    return success_count > 0

def main():
    """主测试函数"""
    print("开始测试向量数据库搜图功能")
    print("请确保:")
    print("1. Flask应用正在运行 (http://localhost:5000)")
    print("2. Milvus服务正在运行 (localhost:19530)")
    print()
    
    tests = [
        ("向量数据库健康检查", test_vector_db_health),
        ("向量数据库统计信息", test_vector_db_stats),
        ("添加示例图片", test_add_sample_images),
        ("向量数据库搜索", test_vector_search),
        ("Resource搜索接口（向量数据库版本）", test_resource_search)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                print(f"\n✓ {test_name} - 通过")
                passed += 1
            else:
                print(f"\n✗ {test_name} - 失败")
        except Exception as e:
            print(f"\n✗ {test_name} - 异常: {e}")
    
    print(f"\n=== 测试结果 ===")
    print(f"通过: {passed}/{total}")
    
    if passed == total:
        print("🎉 所有测试通过！向量数据库搜图功能正常工作。")
    else:
        print("❌ 部分测试失败，请检查配置和服务状态。")

if __name__ == "__main__":
    main()