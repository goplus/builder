# Image Search API 客户端

这个目录包含了调用Image Search API的客户端示例代码。

## 文件说明

- `image_search_client.py` - 完整的客户端类，包含所有API调用功能
- `simple_client.py` - 简单的API调用示例
- `README.md` - 本说明文件

## 使用方法

### 1. 安装依赖

```bash
pip install requests
```

### 2. 启动API服务

首先确保API服务正在运行：

```bash
cd ../project
python run.py
```

### 3. 运行客户端

#### 使用完整客户端类：

```bash
python image_search_client.py
```

#### 使用简单示例：

```bash
python simple_client.py
```

## API调用示例

### 文件上传搜索

```python
import requests

url = "http://localhost:5000/api/search"
files = [
    ('images', open('image1.jpg', 'rb')),
    ('images', open('image2.png', 'rb')),
]
data = {
    'text': 'a cute cat',
    'top_k': 3
}

response = requests.post(url, files=files, data=data)
result = response.json()
```

### URL搜索

```python
import requests

url = "http://localhost:5000/api/search/url"
data = {
    "text": "beautiful landscape",
    "image_urls": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.png"
    ],
    "top_k": 5
}

response = requests.post(url, json=data)
result = response.json()
```

### 健康检查

```python
import requests

response = requests.get("http://localhost:5000/api/health")
health = response.json()
```

## 注意事项

1. 确保API服务正在运行（默认端口5000）
2. 文件搜索需要提供实际存在的图片文件路径
3. URL搜索需要提供可访问的图片URL
4. 所有API调用都应该包含适当的错误处理