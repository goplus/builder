"""
响应模式定义
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional


@dataclass
class SearchResult:
    """单个搜索结果"""
    rank: int
    similarity: float
    id: int
    url: str
    image_path: str
    added_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class SearchResponse:
    """搜索响应模式"""
    success: bool
    query: str
    top_k: int
    threshold: float
    results_count: int
    results: List[SearchResult]
    error: Optional[str] = None
    code: Optional[str] = None


@dataclass
class HealthResponse:
    """健康检查响应模式"""
    status: str
    service: str
    version: str


@dataclass
class StatsResponse:
    """统计信息响应模式"""
    success: bool
    stats: Dict[str, Any]
    error: Optional[str] = None