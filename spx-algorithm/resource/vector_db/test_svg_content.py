#!/usr/bin/env python3
"""
测试直接处理SVG内容的功能
"""
import requests
import json

# 简单的SVG内容示例
test_svg_content = """
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
    <text x="50" y="50" text-anchor="middle" fill="white" font-size="12">TEST</text>
</svg>
"""

def test_add_with_svg_content():
    """测试使用SVG内容添加图片"""
    url = "http://localhost:5002/api/milvus/add"
    
    # 测试数据
    test_data = {
        "id": 9001,
        "url": "https://example.com/test-svg.svg",
        "svg_content": test_svg_content.strip()
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print("=== 测试直接使用SVG内容添加图片 ===")
    print(f"URL: {url}")
    print(f"数据: {json.dumps(test_data, indent=2)}")
    
    try:
        response = requests.post(url, json=test_data, headers=headers)
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            print("✅ SVG内容处理成功!")
            return True
        else:
            print("❌ SVG内容处理失败!")
            return False
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def test_search_svg_image():
    """测试搜索刚添加的SVG图片"""
    url = "http://localhost:5002/api/milvus/search"
    
    test_data = {
        "text": "red circle",
        "k": 5
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print("\n=== 测试搜索SVG图片 ===")
    print(f"搜索关键词: {test_data['text']}")
    
    try:
        response = requests.post(url, json=test_data, headers=headers)
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200 and result.get('success'):
            results = result.get('results', [])
            for item in results:
                if item.get('id') == 9001:
                    print(f"✅ 找到测试图片! ID: {item['id']}, 相似度: {item['similarity']:.4f}")
                    return True
            print("⚠️ 未找到测试图片在搜索结果中")
            return False
        else:
            print("❌ 搜索失败!")
            return False
            
    except Exception as e:
        print(f"❌ 搜索请求失败: {e}")
        return False

def test_batch_add_with_svg():
    """测试批量添加SVG内容"""
    url = "http://localhost:5002/api/milvus/batch/add"
    
    # 另一个SVG示例
    svg_content_2 = """
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="80" height="80" fill="blue" />
        <text x="50" y="55" text-anchor="middle" fill="yellow" font-size="14">BLUE</text>
    </svg>
    """
    
    test_data = {
        "images": [
            {
                "id": 9002,
                "url": "https://example.com/test-svg-2.svg",
                "svg_content": svg_content_2.strip()
            },
            {
                "id": 9003,
                "url": "https://example.com/test-svg-3.svg",
                "svg_content": test_svg_content.strip()  # 重复使用第一个SVG
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print("\n=== 测试批量添加SVG内容 ===")
    print(f"批量添加 {len(test_data['images'])} 个SVG图片")
    
    try:
        response = requests.post(url, json=test_data, headers=headers)
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200 and result.get('success'):
            success_count = result.get('success_count', 0)
            total = result.get('total', 0)
            print(f"✅ 批量添加成功: {success_count}/{total}")
            return True
        else:
            print("❌ 批量添加失败!")
            return False
            
    except Exception as e:
        print(f"❌ 批量添加请求失败: {e}")
        return False

def cleanup_test_data():
    """清理测试数据"""
    print("\n=== 清理测试数据 ===")
    
    for test_id in [9001, 9002, 9003]:
        url = "http://localhost:5002/api/milvus/delete"
        test_data = {"id": test_id}
        headers = {"Content-Type": "application/json"}
        
        try:
            response = requests.delete(url, json=test_data, headers=headers)
            if response.status_code == 200:
                print(f"✅ 删除测试数据 ID={test_id}")
            else:
                print(f"⚠️ 删除测试数据失败 ID={test_id}: {response.status_code}")
        except Exception as e:
            print(f"❌ 删除请求失败 ID={test_id}: {e}")

if __name__ == "__main__":
    print("开始测试SVG内容直接处理功能...")
    
    # 检查API服务是否运行
    try:
        health_response = requests.get("http://localhost:5002/api/milvus/health")
        if health_response.status_code != 200:
            print("❌ Milvus API服务未运行，请先启动服务:")
            print("python3 milvus_vector_api.py")
            exit(1)
    except Exception:
        print("❌ 无法连接到Milvus API服务，请先启动服务:")
        print("python3 milvus_vector_api.py")
        exit(1)
    
    # 运行测试
    success = True
    success &= test_add_with_svg_content()
    success &= test_search_svg_image()
    success &= test_batch_add_with_svg()
    
    # 清理测试数据
    cleanup_test_data()
    
    if success:
        print("\n🎉 所有测试通过!")
        print("\n新功能总结:")
        print("✅ 支持直接处理SVG内容，无需通过URL下载")
        print("✅ 单个添加接口支持svg_content参数")
        print("✅ 批量添加接口支持svg_content参数")
        print("✅ 保持URL参数用于记录，但不会实际访问")
    else:
        print("\n❌ 部分测试失败，请检查日志")