"""
配置管理模块
"""

import os
from .base import BaseConfig
from .development import DevelopmentConfig
from .production import ProductionConfig
from .testing import TestingConfig

# 配置映射
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name: str = None) -> BaseConfig:
    """
    获取配置实例
    
    Args:
        config_name: 配置名称（development/production/testing）
                    如果不指定，会从环境变量FLASK_ENV获取，默认为development
    
    Returns:
        配置实例
    """
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    config_class = config_map.get(config_name, config_map['default'])
    return config_class()


def get_flask_config(config_name: str = None) -> dict:
    """
    获取Flask应用配置字典
    
    Args:
        config_name: 配置名称
        
    Returns:
        Flask配置字典
    """
    config = get_config(config_name)
    return config.to_dict()


def get_orchestrator_config(config_name: str = None) -> dict:
    """
    获取编排器配置
    
    Args:
        config_name: 配置名称
        
    Returns:
        编排器配置字典
    """
    config = get_config(config_name)
    return config.get_orchestrator_config()


__all__ = [
    'BaseConfig', 'DevelopmentConfig', 'ProductionConfig', 'TestingConfig',
    'get_config', 'get_flask_config', 'get_orchestrator_config'
]