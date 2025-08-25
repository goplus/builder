#!/usr/bin/env python3
"""
简单的API调用示例
"""
import requests
import os


def search_with_files_example():
    """文件上传搜索示例"""
    url = "http://localhost:5000/api/search"
    
    # 准备图片文件（请替换为实际的图片路径）
    image_files = ["../resource/dog.svg", "../resource/cute.svg", "../resource/cute2.svg"]
    files = []
    
    for img_path in image_files:
        if os.path.exists(img_path):
            files.append(('images', open(img_path, 'rb')))
    
    if not files:
        print("没有找到图片文件，请确保图片路径正确")
        return
    
    data = {
        'text': 'a cute cat',
        'top_k': 3
    }
    
    try:
        response = requests.post(url, files=files, data=data)
        if response.status_code == 200:
            result = response.json()
            print("文件搜索结果:")
            print(f"查询: {result['query']}")
            for item in result['results']:
                print(f"  排名{item['rank']}: {item['filename']} (相似度: {item['similarity']:.4f})")
        else:
            print(f"请求失败: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"请求错误: {e}")
    finally:
        # 关闭文件
        for _, file in files:
            file.close()


def search_with_urls_example():
    """URL搜索示例"""
    url = "http://localhost:5000/api/search/url"
    
    data = {
        "text": "a cute cat",
        "image_urls": [
            "https://svgsilh.com/svg/1801287.svg",
            "https://svgsilh.com/svg/1790711.svg",
            "https://svgsilh.com/svg/1300187.svg",
            "https://svgsilh.com/svg/1295198-e91e63.svg"
        ],
        "top_k": 4
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            print("URL搜索结果:")
            print(f"查询: {result['query']}")
            for item in result['results']:
                print(f"  排名{item['rank']}: {item['image_path']} (相似度: {item['similarity']:.4f})")
        else:
            print(f"请求失败: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"请求错误: {e}")


def health_check():
    """健康检查"""
    url = "http://localhost:5000/api/health"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("服务健康状态:", response.json())
        else:
            print(f"健康检查失败: {response.status_code}")
    except Exception as e:
        print(f"健康检查错误: {e}")


if __name__ == "__main__":
    print("=== 健康检查 ===")
    health_check()
    print()
    
    print("=== 文件上传搜索 ===")
    search_with_files_example()
    print()
    
    print("=== URL搜索 ===")
    search_with_urls_example()