"""
用户反馈数据存储模块
"""

import logging
import sqlite3
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pathlib import Path

from .models import UserFeedback

logger = logging.getLogger(__name__)


class FeedbackStorage:
    """用户反馈数据存储类"""
    
    def __init__(self, db_path: str = "data/user_feedback.db"):
        """
        初始化反馈数据存储
        
        Args:
            db_path: SQLite数据库路径
        """
        self.db_path = db_path
        self._ensure_db_directory()
        self._init_database()
    
    def _ensure_db_directory(self):
        """确保数据库目录存在"""
        db_dir = Path(self.db_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)
    
    def _init_database(self):
        """初始化数据库表结构"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS user_feedback (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        query_id INTEGER UNIQUE NOT NULL,
                        query TEXT NOT NULL,
                        pic_id_1 INTEGER NOT NULL,
                        pic_id_2 INTEGER NOT NULL,
                        pic_id_3 INTEGER NOT NULL,
                        pic_id_4 INTEGER NOT NULL,
                        choose_id INTEGER NOT NULL,
                        date TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # 创建索引提升查询性能
                conn.execute('CREATE INDEX IF NOT EXISTS idx_query ON user_feedback(query)')
                conn.execute('CREATE INDEX IF NOT EXISTS idx_choose_id ON user_feedback(choose_id)')
                conn.execute('CREATE INDEX IF NOT EXISTS idx_date ON user_feedback(date)')
                
            logger.info(f"用户反馈数据库初始化完成: {self.db_path}")
            
        except Exception as e:
            logger.error(f"数据库初始化失败: {e}")
            raise
    
    def save_feedback(self, feedback: UserFeedback) -> bool:
        """
        保存用户反馈
        
        Args:
            feedback: 用户反馈数据
            
        Returns:
            是否保存成功
        """
        try:
            if not feedback.is_valid():
                logger.error(f"无效的反馈数据: {feedback}")
                return False
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    INSERT OR REPLACE INTO user_feedback 
                    (query_id, query, pic_id_1, pic_id_2, pic_id_3, pic_id_4, choose_id, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    feedback.id,
                    feedback.query,
                    feedback.pic_id_1,
                    feedback.pic_id_2,
                    feedback.pic_id_3,
                    feedback.pic_id_4,
                    feedback.choose_id,
                    feedback.date.strftime('%Y-%m-%d %H:%M:%S')
                ))
                
            logger.info(f"用户反馈保存成功: query_id={feedback.id}")
            return True
            
        except Exception as e:
            logger.error(f"保存用户反馈失败: {e}")
            return False
    
    def get_feedback_by_id(self, query_id: int) -> Optional[UserFeedback]:
        """根据查询ID获取反馈"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(
                    'SELECT * FROM user_feedback WHERE query_id = ?',
                    (query_id,)
                )
                row = cursor.fetchone()
                
                if row:
                    return self._row_to_feedback(row)
                return None
                
        except Exception as e:
            logger.error(f"获取反馈数据失败: {e}")
            return None
    
    def get_all_feedback(self, limit: Optional[int] = None, 
                        start_date: Optional[date] = None,
                        end_date: Optional[date] = None) -> List[UserFeedback]:
        """
        获取所有反馈数据
        
        Args:
            limit: 限制返回数量
            start_date: 开始日期过滤
            end_date: 结束日期过滤
            
        Returns:
            反馈数据列表
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                query = 'SELECT * FROM user_feedback WHERE 1=1'
                params = []
                
                if start_date:
                    query += ' AND date >= ?'
                    params.append(start_date.strftime('%Y-%m-%d'))
                
                if end_date:
                    query += ' AND date <= ?'
                    params.append(end_date.strftime('%Y-%m-%d 23:59:59'))
                
                query += ' ORDER BY created_at DESC'
                
                if limit:
                    query += ' LIMIT ?'
                    params.append(limit)
                
                cursor = conn.execute(query, params)
                rows = cursor.fetchall()
                
                return [self._row_to_feedback(row) for row in rows]
                
        except Exception as e:
            logger.error(f"获取所有反馈数据失败: {e}")
            return []
    
    def get_feedback_by_query(self, query_text: str, limit: Optional[int] = None) -> List[UserFeedback]:
        """根据查询文本获取反馈"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                sql = 'SELECT * FROM user_feedback WHERE query LIKE ? ORDER BY created_at DESC'
                params = [f'%{query_text}%']
                
                if limit:
                    sql += ' LIMIT ?'
                    params.append(limit)
                
                cursor = conn.execute(sql, params)
                rows = cursor.fetchall()
                
                return [self._row_to_feedback(row) for row in rows]
                
        except Exception as e:
            logger.error(f"根据查询获取反馈数据失败: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """获取反馈数据统计信息"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # 总反馈数
                total_count = conn.execute('SELECT COUNT(*) FROM user_feedback').fetchone()[0]
                
                # 最近7天反馈数
                recent_count = conn.execute('''
                    SELECT COUNT(*) FROM user_feedback 
                    WHERE date >= date('now', '-7 days')
                ''').fetchone()[0]
                
                # 最热门的查询
                popular_queries = conn.execute('''
                    SELECT query, COUNT(*) as count 
                    FROM user_feedback 
                    GROUP BY query 
                    ORDER BY count DESC 
                    LIMIT 10
                ''').fetchall()
                
                # 最受欢迎的图片
                popular_pics = conn.execute('''
                    SELECT choose_id, COUNT(*) as count 
                    FROM user_feedback 
                    GROUP BY choose_id 
                    ORDER BY count DESC 
                    LIMIT 10
                ''').fetchall()
                
                return {
                    'total_feedback_count': total_count,
                    'recent_7days_count': recent_count,
                    'popular_queries': [{'query': q[0], 'count': q[1]} for q in popular_queries],
                    'popular_pictures': [{'pic_id': p[0], 'count': p[1]} for p in popular_pics]
                }
                
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}
    
    def _row_to_feedback(self, row: sqlite3.Row) -> UserFeedback:
        """将数据库行转换为UserFeedback对象"""
        return UserFeedback(
            id=row['query_id'],
            query=row['query'],
            pic_id_1=row['pic_id_1'],
            pic_id_2=row['pic_id_2'],
            pic_id_3=row['pic_id_3'],
            pic_id_4=row['pic_id_4'],
            choose_id=row['choose_id'],
            date=datetime.strptime(row['date'], '%Y-%m-%d %H:%M:%S')
        )
    
    def delete_feedback(self, query_id: int) -> bool:
        """删除反馈数据"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute('DELETE FROM user_feedback WHERE query_id = ?', (query_id,))
                success = cursor.rowcount > 0
                
            if success:
                logger.info(f"反馈数据删除成功: query_id={query_id}")
            else:
                logger.warning(f"未找到要删除的反馈数据: query_id={query_id}")
                
            return success
            
        except Exception as e:
            logger.error(f"删除反馈数据失败: {e}")
            return False
    
    def clear_all_feedback(self) -> bool:
        """清空所有反馈数据（谨慎使用）"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('DELETE FROM user_feedback')
                
            logger.warning("所有反馈数据已清空")
            return True
            
        except Exception as e:
            logger.error(f"清空反馈数据失败: {e}")
            return False