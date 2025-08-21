import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).parent.parent.parent


class Config:
    """基础配置类"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 文件上传配置
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32MB
    
    # 日志配置
    LOG_FOLDER = os.path.join(BASE_DIR, 'logs')
    
    # CLIP模型配置
    CLIP_MODEL_NAME = os.environ.get('CLIP_MODEL_NAME') or 'ViT-B-32'
    CLIP_PRETRAINED = os.environ.get('CLIP_PRETRAINED') or 'laion2b_s34b_b79k'
    
    # API配置
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    ENV = 'development'


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    ENV = 'production'
    
    # 生产环境应该使用更强的密钥
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'production-secret-key-must-be-set'


class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    DEBUG = True
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'test_uploads')


# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}