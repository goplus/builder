"""
重构后的主应用入口
"""

import os
import logging
from flask import Flask

from config import get_flask_config, get_coordinator_config
from api.routes import resource_bp, internal_bp, health_bp, init_all_coordinators
from api.middlewares.logging_middleware import setup_logging_middleware

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app(config_name: str = None) -> Flask:
    """
    创建Flask应用
    
    Args:
        config_name: 配置环境名称（development/production/testing）
        
    Returns:
        Flask应用实例
    """
    # 获取配置名称
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    # 创建Flask应用
    app = Flask(__name__)
    
    # 加载配置
    flask_config = get_flask_config(config_name)
    app.config.update(flask_config)
    
    # 设置日志中间件
    setup_logging_middleware(app)
    
    # 注册蓝图
    app.register_blueprint(resource_bp) 
    app.register_blueprint(internal_bp)
    app.register_blueprint(health_bp)
    
    # 添加根路由
    @app.route('/')
    def index():
        """根路由，提供API信息"""
        return {
            "message": "SPX Algorithm API",
            "version": "2.0.0",
            "description": "重构后的图像搜索算法API - 基于资源管理",
            "endpoints": {
                "health": "/v1/health",
                "add_resource": "/v1/resource/add (POST)",
                "batch_add_resources": "/v1/resource/batch (POST)",
                "search_resources": "/v1/resource/search (POST)",
                "internal_debug": "/v1/internal/* (仅用于调试和管理)"
            }
        }
    
    # 初始化协调器
    coordinator_config = get_coordinator_config(config_name)
    
    with app.app_context():
        try:
            init_all_coordinators(coordinator_config)
            logger.info("协调器初始化成功")
        except Exception as e:
            logger.error(f"协调器初始化失败: {e}")
            # 在开发环境可以选择不抛出异常，继续运行
            if config_name != 'development':
                raise
    
    logger.info(f"Flask应用创建完成，配置环境: {config_name}")
    return app


if __name__ == '__main__':
    # 开发环境直接运行
    config_name = os.getenv('FLASK_ENV', 'development')
    app = create_app(config_name)
    
    # 获取运行参数
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    
    logger.info(f"启动SPX算法服务: http://{host}:{port}")
    
    app.run(
        host=host,
        port=port,
        debug=app.config.get('DEBUG', False),
        use_reloader=False
    )