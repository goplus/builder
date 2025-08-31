"""
请求模式定义
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class SearchRequest:
    """搜索请求模式"""
    text: str
    top_k: int = 10
    threshold: float = 0.0
    coarse_k: Optional[int] = None
    
    def __post_init__(self):
        """验证参数"""
        if not self.text or not self.text.strip():
            raise ValueError("查询文本不能为空")
        
        if self.top_k <= 0:
            raise ValueError("top_k必须大于0")
        
        if not (0 <= self.threshold <= 1):
            raise ValueError("threshold必须在0-1之间")
        
        if self.coarse_k is not None and self.coarse_k <= 0:
            raise ValueError("coarse_k必须大于0")


@dataclass
class AddImageRequest:
    """添加图片请求模式"""
    id: int
    url: str
    svg_content: Optional[str] = None
    
    def __post_init__(self):
        """验证参数"""
        if not isinstance(self.id, int):
            raise ValueError("id必须是整数")
        
        if not self.url or not self.url.strip():
            raise ValueError("url不能为空")
        
        if self.svg_content is not None and not self.svg_content.strip():
            raise ValueError("svg_content不能为空字符串")