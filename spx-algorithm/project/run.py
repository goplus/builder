#!/usr/bin/env python3
"""
Image Search API 启动文件
"""
import os
from app import create_app
from app.api.routes import init_search_service

# 获取配置环境
config_name = os.getenv('FLASK_ENV', 'development')

# 创建应用实例
app = create_app(config_name)

# 初始化搜索服务
with app.app_context():
    init_search_service(
        model_name=app.config['CLIP_MODEL_NAME'],
        pretrained=app.config['CLIP_PRETRAINED']
    )

if __name__ == '__main__':
    # 开发环境配置
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    
    app.run(
        host=host,
        port=port,
        debug=app.config['DEBUG']
    )