"""
用户反馈数据存储模块
"""

import logging
import pymysql
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pathlib import Path

from .models import UserFeedback
from config.base import BaseConfig

logger = logging.getLogger(__name__)


class FeedbackStorage:
    """用户反馈数据存储类"""
    
    def __init__(self, config: Optional[BaseConfig] = None):
        """
        初始化反馈数据存储
        
        Args:
            config: 配置对象，如果为None则使用默认配置
        """
        if config is None:
            config = BaseConfig()
            
        self.db_config = {
            'host': config.MYSQL_HOST,
            'port': config.MYSQL_PORT,
            'user': config.MYSQL_USER,
            'password': config.MYSQL_PASSWORD,
            'database': config.MYSQL_DATABASE,
            'charset': 'utf8mb4',
            'autocommit': True
        }
        self._init_database()
    
    def _get_connection(self):
        """获取数据库连接"""
        return pymysql.connect(**self.db_config)
    
    def _init_database(self):
        """初始化数据库表结构"""
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS user_feedback (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            query_id INT UNIQUE NOT NULL,
                            query TEXT NOT NULL,
                            pic_id_1 INT NOT NULL,
                            pic_id_2 INT NOT NULL,
                            pic_id_3 INT NOT NULL,
                            pic_id_4 INT NOT NULL,
                            choose_id INT NOT NULL,
                            date DATETIME NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    ''')
                    
                    # 创建索引提升查询性能 (MySQL语法，TEXT字段需要指定长度)
                    try:
                        cursor.execute('CREATE INDEX idx_query ON user_feedback(query(255))')
                    except pymysql.Error as e:
                        if e.args[0] != 1061:  # 1061: Duplicate key name
                            raise
                    
                    try:
                        cursor.execute('CREATE INDEX idx_choose_id ON user_feedback(choose_id)')
                    except pymysql.Error as e:
                        if e.args[0] != 1061:
                            raise
                            
                    try:
                        cursor.execute('CREATE INDEX idx_date ON user_feedback(date)')
                    except pymysql.Error as e:
                        if e.args[0] != 1061:
                            raise
                
            logger.info(f"用户反馈数据库初始化完成: {self.db_config['host']}:{self.db_config['port']}")
            
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
            
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO user_feedback 
                        (query_id, query, pic_id_1, pic_id_2, pic_id_3, pic_id_4, choose_id, date)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                        query = VALUES(query),
                        pic_id_1 = VALUES(pic_id_1),
                        pic_id_2 = VALUES(pic_id_2),
                        pic_id_3 = VALUES(pic_id_3),
                        pic_id_4 = VALUES(pic_id_4),
                        choose_id = VALUES(choose_id),
                        date = VALUES(date)
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
            with self._get_connection() as conn:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute(
                        'SELECT * FROM user_feedback WHERE query_id = %s',
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
            with self._get_connection() as conn:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    query = 'SELECT * FROM user_feedback WHERE 1=1'
                    params = []
                    
                    if start_date:
                        query += ' AND date >= %s'
                        params.append(start_date.strftime('%Y-%m-%d'))
                    
                    if end_date:
                        query += ' AND date <= %s'
                        params.append(end_date.strftime('%Y-%m-%d 23:59:59'))
                    
                    query += ' ORDER BY created_at DESC'
                    
                    if limit:
                        query += ' LIMIT %s'
                        params.append(limit)
                    
                    cursor.execute(query, params)
                    rows = cursor.fetchall()
                    
                    return [self._row_to_feedback(row) for row in rows]
                
        except Exception as e:
            logger.error(f"获取所有反馈数据失败: {e}")
            return []
    
    def get_feedback_by_query(self, query_text: str, limit: Optional[int] = None) -> List[UserFeedback]:
        """根据查询文本获取反馈"""
        try:
            with self._get_connection() as conn:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    sql = 'SELECT * FROM user_feedback WHERE query LIKE %s ORDER BY created_at DESC'
                    params = [f'%{query_text}%']
                    
                    if limit:
                        sql += ' LIMIT %s'
                        params.append(limit)
                    
                    cursor.execute(sql, params)
                    rows = cursor.fetchall()
                    
                    return [self._row_to_feedback(row) for row in rows]
                
        except Exception as e:
            logger.error(f"根据查询获取反馈数据失败: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """获取反馈数据统计信息"""
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    # 总反馈数
                    cursor.execute('SELECT COUNT(*) FROM user_feedback')
                    total_count = cursor.fetchone()[0]
                    
                    # 最近7天反馈数
                    cursor.execute('''
                        SELECT COUNT(*) FROM user_feedback 
                        WHERE date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                    ''')
                    recent_count = cursor.fetchone()[0]
                    
                    # 最热门的查询
                    cursor.execute('''
                        SELECT query, COUNT(*) as count 
                        FROM user_feedback 
                        GROUP BY query 
                        ORDER BY count DESC 
                        LIMIT 10
                    ''')
                    popular_queries = cursor.fetchall()
                    
                    # 最受欢迎的图片
                    cursor.execute('''
                        SELECT choose_id, COUNT(*) as count 
                        FROM user_feedback 
                        GROUP BY choose_id 
                        ORDER BY count DESC 
                        LIMIT 10
                    ''')
                    popular_pics = cursor.fetchall()
                    
                    return {
                        'total_feedback_count': total_count,
                        'recent_7days_count': recent_count,
                        'popular_queries': [{'query': q[0], 'count': q[1]} for q in popular_queries],
                        'popular_pictures': [{'pic_id': p[0], 'count': p[1]} for p in popular_pics]
                    }
                
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}
    
    def _row_to_feedback(self, row: dict) -> UserFeedback:
        """将数据库行转换为UserFeedback对象"""
        # 处理MySQL返回的datetime对象
        date_value = row['date']
        if isinstance(date_value, str):
            date_value = datetime.strptime(date_value, '%Y-%m-%d %H:%M:%S')
        elif isinstance(date_value, datetime):
            pass  # 已经是datetime对象
        
        return UserFeedback(
            id=row['query_id'],
            query=row['query'],
            pic_id_1=row['pic_id_1'],
            pic_id_2=row['pic_id_2'],
            pic_id_3=row['pic_id_3'],
            pic_id_4=row['pic_id_4'],
            choose_id=row['choose_id'],
            date=date_value
        )
    
    def delete_feedback(self, query_id: int) -> bool:
        """删除反馈数据"""
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('DELETE FROM user_feedback WHERE query_id = %s', (query_id,))
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
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('DELETE FROM user_feedback')
                
            logger.warning("所有反馈数据已清空")
            return True
            
        except Exception as e:
            logger.error(f"清空反馈数据失败: {e}")
            return False