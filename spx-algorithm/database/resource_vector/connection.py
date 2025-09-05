"""
Milvus数据库连接管理模块
"""

import logging
from typing import Optional
from pymilvus import connections, utility

logger = logging.getLogger(__name__)


class MilvusConnection:
    """Milvus连接管理器"""
    
    def __init__(self, host: str = 'localhost', port: str = '19530', alias: str = 'default'):
        """
        初始化Milvus连接
        
        Args:
            host: Milvus服务器地址
            port: Milvus服务器端口
            alias: 连接别名
        """
        self.host = host
        self.port = port
        self.alias = alias
        self._is_connected = False
    
    def connect(self, max_retries: int = 3) -> bool:
        """
        连接到Milvus服务器
        
        Args:
            max_retries: 最大重试次数
            
        Returns:
            是否连接成功
        """
        if self._is_connected:
            logger.info("Milvus已经连接")
            return True
            
        for attempt in range(max_retries):
            try:
                connections.connect(
                    alias=self.alias,
                    host=self.host,
                    port=self.port
                )
                self._is_connected = True
                logger.info(f"Milvus连接成功: {self.host}:{self.port}")
                return True
                
            except Exception as e:
                logger.warning(f"Milvus连接尝试 {attempt + 1}/{max_retries} 失败: {e}")
                if attempt == max_retries - 1:
                    logger.error(f"Milvus连接最终失败: {e}")
                    return False
                import time
                time.sleep(2 ** attempt)  # 指数退避
        
        return False
    
    def disconnect(self):
        """断开Milvus连接"""
        try:
            if self._is_connected:
                connections.disconnect(self.alias)
                self._is_connected = False
                logger.info("Milvus连接已关闭")
        except Exception as e:
            logger.error(f"关闭Milvus连接失败: {e}")
    
    def is_connected(self) -> bool:
        """检查是否已连接"""
        return self._is_connected
    
    def health_check(self) -> bool:
        """健康检查"""
        try:
            if not self._is_connected:
                return False
            # 简单的健康检查：尝试列出集合
            utility.list_collections()
            return True
        except Exception as e:
            logger.error(f"Milvus健康检查失败: {e}")
            return False
    
    def __enter__(self):
        """上下文管理器入口"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        self.disconnect()
    
    def __del__(self):
        """析构函数"""
        try:
            self.disconnect()
        except:
            pass