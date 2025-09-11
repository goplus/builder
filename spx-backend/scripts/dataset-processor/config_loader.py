#!/usr/bin/env python3
"""
安全配置加载器 - 从环境变量和配置文件加载配置
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv


class ConfigLoader:
    """安全的配置加载器，支持环境变量和配置文件"""
    
    def __init__(self, config_path: str = "config.json", env_path: str = ".env"):
        self.config_path = Path(config_path)
        self.env_path = Path(env_path)
        
        # 加载环境变量
        if self.env_path.exists():
            load_dotenv(self.env_path)
        
        # 加载基础配置文件
        self.base_config = self._load_base_config()
        
        # 应用环境变量覆盖
        self.config = self._apply_env_overrides(self.base_config)
    
    def _load_base_config(self) -> Dict[str, Any]:
        """加载基础配置文件"""
        if not self.config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {self.config_path}")
        
        with open(self.config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _apply_env_overrides(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """应用环境变量覆盖"""
        # 深拷贝配置
        import copy
        result = copy.deepcopy(config)
        
        # GitHub配置
        if 'github' in result:
            result['github']['token'] = self._get_env_or_default(
                'GITHUB_TOKEN', 
                result['github'].get('token')
            )
        
        # 数据库配置
        if 'database' in result:
            result['database']['host'] = self._get_env_or_default(
                'DB_HOST', 
                result['database'].get('host', 'localhost')
            )
            result['database']['port'] = int(self._get_env_or_default(
                'DB_PORT', 
                str(result['database'].get('port', 3306))
            ))
            result['database']['username'] = self._get_env_or_default(
                'DB_USERNAME', 
                result['database'].get('username', 'root')
            )
            result['database']['password'] = self._get_env_or_default(
                'DB_PASSWORD', 
                result['database'].get('password', '')
            )
            result['database']['database'] = self._get_env_or_default(
                'DB_DATABASE', 
                result['database'].get('database')
            )
        
        # Kaggle配置（可选）
        kaggle_username = os.getenv('KAGGLE_USERNAME')
        kaggle_key = os.getenv('KAGGLE_KEY')
        
        if kaggle_username and kaggle_key:
            if 'kaggle' not in result:
                result['kaggle'] = {}
            result['kaggle']['username'] = kaggle_username
            result['kaggle']['key'] = kaggle_key
        
        return result
    
    def _get_env_or_default(self, env_key: str, default: Optional[str]) -> Optional[str]:
        """获取环境变量值，如果不存在则使用默认值"""
        env_value = os.getenv(env_key)
        
        # 如果环境变量存在且不是占位符，使用环境变量值
        if env_value and not self._is_placeholder(env_value):
            return env_value
        
        # 如果默认值不是占位符，使用默认值
        if default and not self._is_placeholder(default):
            return default
        
        # 否则返回None
        return None
    
    def _is_placeholder(self, value: str) -> bool:
        """检查值是否为占位符"""
        placeholders = [
            'your_github_token_here',
            'your_database_password_here',
            'your_kaggle_username_here',
            'your_kaggle_key_here'
        ]
        return value in placeholders
    
    def get_config(self) -> Dict[str, Any]:
        """获取完整配置"""
        return self.config
    
    def get_github_config(self) -> Dict[str, Any]:
        """获取GitHub配置"""
        return self.config.get('github', {})
    
    def get_database_config(self) -> Dict[str, Any]:
        """获取数据库配置"""
        return self.config.get('database', {})
    
    def get_kaggle_config(self) -> Optional[Dict[str, Any]]:
        """获取Kaggle配置（如果存在）"""
        return self.config.get('kaggle')
    
    def validate_config(self) -> tuple[bool, str]:
        """验证配置的完整性"""
        errors = []
        
        # 检查GitHub配置
        github_config = self.get_github_config()
        if not github_config.get('token'):
            errors.append("⚠️  GitHub token未配置，将使用有限的API访问")
        
        # 检查数据库配置
        db_config = self.get_database_config()
        required_db_fields = ['host', 'database']
        for field in required_db_fields:
            if not db_config.get(field):
                errors.append(f"❌ 数据库配置缺失: {field}")
        
        # 如果有严重错误（数据库配置不完整），返回失败
        critical_errors = [e for e in errors if e.startswith('❌')]
        if critical_errors:
            return False, '\n'.join(errors)
        
        # 如果只有警告，返回成功但显示警告
        if errors:
            return True, '\n'.join(errors)
        
        return True, "✅ 配置验证通过"
    
    def print_config_status(self):
        """打印配置状态"""
        print("📋 配置状态:")
        
        # GitHub配置状态
        github_token = self.get_github_config().get('token')
        if github_token:
            print(f"  🔑 GitHub Token: 已配置 ({github_token[:8]}...)")
        else:
            print("  🔑 GitHub Token: 未配置（将使用匿名访问）")
        
        # 数据库配置状态
        db_config = self.get_database_config()
        print(f"  🗄️  数据库: {db_config.get('username', 'N/A')}@{db_config.get('host', 'N/A')}:{db_config.get('port', 'N/A')}/{db_config.get('database', 'N/A')}")
        
        # Kaggle配置状态
        kaggle_config = self.get_kaggle_config()
        if kaggle_config:
            print(f"  📊 Kaggle: 已配置 ({kaggle_config.get('username', 'N/A')})")
        else:
            print("  📊 Kaggle: 未配置（将跳过Kaggle数据集）")


def load_config(config_path: str = "config.json", env_path: str = ".env") -> ConfigLoader:
    """便捷函数：加载配置"""
    return ConfigLoader(config_path, env_path)


if __name__ == "__main__":
    # 测试配置加载器
    try:
        config_loader = load_config()
        config_loader.print_config_status()
        
        is_valid, message = config_loader.validate_config()
        print(f"\n{message}")
        
        if is_valid:
            print("\n✅ 配置加载成功！")
        else:
            print("\n❌ 配置验证失败，请检查配置文件和环境变量")
            
    except Exception as e:
        print(f"❌ 配置加载失败: {e}")