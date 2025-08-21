import pytest
import json
import os
from app import create_app


@pytest.fixture
def app():
    """创建测试应用"""
    app = create_app('testing')
    return app


@pytest.fixture
def client(app):
    """创建测试客户端"""
    return app.test_client()


def test_health_check(client):
    """测试健康检查接口"""
    response = client.get('/api/health')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert data['service'] == 'image-search-api'


def test_index_route(client):
    """测试根路由"""
    response = client.get('/')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'message' in data
    assert 'endpoints' in data


def test_search_missing_text(client):
    """测试缺少查询文本的情况"""
    response = client.post('/api/search', data={})
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert data['code'] == 'MISSING_TEXT_QUERY'


def test_search_no_files(client):
    """测试没有上传文件的情况"""
    response = client.post('/api/search', data={'text': 'test query'})
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert data['code'] == 'NO_FILES_UPLOADED'


def test_search_url_invalid_json(client):
    """测试无效JSON请求"""
    response = client.post('/api/search/url', 
                          data='invalid json',
                          content_type='application/json')
    assert response.status_code == 400


def test_search_url_missing_text(client):
    """测试URL搜索缺少文本"""
    response = client.post('/api/search/url',
                          json={'image_urls': ['http://example.com/img.jpg']})
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert data['code'] == 'MISSING_TEXT_QUERY'


def test_search_url_invalid_urls(client):
    """测试无效的URL列表"""
    response = client.post('/api/search/url',
                          json={'text': 'test', 'image_urls': 'not a list'})
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert data['code'] == 'INVALID_IMAGE_URLS'