"""
日志中间件
"""

import time
import logging
from flask import request, g

logger = logging.getLogger(__name__)


def setup_logging_middleware(app):
    """设置日志中间件"""
    
    @app.before_request
    def before_request():
        """请求开始前的处理"""
        g.start_time = time.time()
        logger.info(f"请求开始: {request.method} {request.path}")
    
    @app.after_request
    def after_request(response):
        """请求结束后的处理"""
        duration = time.time() - g.start_time if hasattr(g, 'start_time') else 0
        logger.info(f"请求完成: {request.method} {request.path} - "
                   f"状态码: {response.status_code}, 耗时: {duration:.3f}s")
        return response
    
    @app.teardown_request
    def teardown_request(error):
        """请求清理"""
        if error:
            logger.error(f"请求异常: {error}")
    
    return app