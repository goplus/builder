#!/usr/bin/env python3
"""
Image Search API 客户端
"""
import requests
import json
from typing import List, Optional, Dict, Any
import os


class ImageSearchClient:
    """图像搜索API客户端"""
    
    def __init__(self, base_url: str = "http://localhost:5000"):
        """
        初始化客户端
        
        Args:
            base_url: API服务器地址
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            健康状态响应
        """
        response = self.session.get(f"{self.base_url}/api/health")
        response.raise_for_status()
        return response.json()
    
    def search_with_files(
        self, 
        text: str, 
        image_paths: List[str], 
        top_k: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        使用本地文件进行搜索
        
        Args:
            text: 查询文本
            image_paths: 本地图片文件路径列表
            top_k: 返回前k个结果
            
        Returns:
            搜索结果
        """
        # 准备文件
        files = []
        for path in image_paths:
            if not os.path.exists(path):
                raise FileNotFoundError(f"图片文件不存在: {path}")
            files.append(('images', open(path, 'rb')))
        
        # 准备数据
        data = {'text': text}
        if top_k is not None:
            data['top_k'] = top_k
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/search",
                files=files,
                data=data
            )
            response.raise_for_status()
            return response.json()
        finally:
            # 关闭文件
            for _, file in files:
                file.close()
    
    def search_with_urls(
        self, 
        text: str, 
        image_urls: List[str], 
        top_k: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        使用图片URL进行搜索
        
        Args:
            text: 查询文本
            image_urls: 图片URL列表
            top_k: 返回前k个结果
            
        Returns:
            搜索结果
        """
        data = {
            "text": text,
            "image_urls": image_urls
        }
        if top_k is not None:
            data["top_k"] = top_k
        
        response = self.session.post(
            f"{self.base_url}/api/search/url",
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()
        return response.json()
    
    def print_results(self, results: Dict[str, Any]):
        """
        格式化打印搜索结果
        
        Args:
            results: 搜索结果
        """
        print(f"查询文本: '{results['query']}'")
        print(f"总图片数: {results['total_images']}")
        print(f"结果数量: {results['results_count']}")
        print("-" * 60)
        
        for result in results['results']:
            print(f"排名 {result['rank']}: {result.get('filename', result.get('image_path', 'N/A'))}")
            print(f"相似度: {result['similarity']:.4f}")
            print("-" * 30)


def main():
    """示例使用"""
    # 创建客户端
    client = ImageSearchClient()
    
    # 健康检查
    try:
        health = client.health_check()
        print("服务状态:", health)
        print()
    except requests.exceptions.RequestException as e:
        print(f"服务不可用: {e}")
        return
    
    # 示例1: 使用本地文件搜索
    print("=== 使用本地文件搜索 ===")
    try:
        # 这里需要替换为实际的图片路径
        image_files = [
            "../dog.svg",
            "../cute.svg",
            "../cute2.svg",
            "../image.svg"
        ]
        
        # 过滤存在的文件
        existing_files = [f for f in image_files if os.path.exists(f)]
        
        if existing_files:
            results = client.search_with_files(
                text="a cute cat",
                image_paths=existing_files,
                top_k=3
            )
            client.print_results(results)
        else:
            print("没有找到示例图片文件")
    except Exception as e:
        print(f"文件搜索错误: {e}")
    
    print()
    
    # 示例2: 使用URL搜索
    print("=== 使用URL搜索 ===")
    try:
        results = client.search_with_urls(
            text="beautiful landscape",
            image_urls=[
                "https://via.placeholder.com/300x200.png?text=Landscape1",
                "https://via.placeholder.com/300x200.png?text=Landscape2"
            ],
            top_k=2
        )
        client.print_results(results)
    except Exception as e:
        print(f"URL搜索错误: {e}")


if __name__ == "__main__":
    main()