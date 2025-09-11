#!/usr/bin/env python3
"""
步骤4: 批量导入数据库，将处理好的数据导入SPX后端数据库
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any
import mysql.connector
from mysql.connector import Error
import time
from tqdm import tqdm

class DatabaseImporter:
    def __init__(self, config_path: str = "config.json"):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.db_config = self.config['database']
        self.batch_size = self.config['output']['batch_size']
        self.output_dir = Path("output")
        
        self.connection = None

    def connect_to_database(self) -> bool:
        """连接到数据库"""
        try:
            print("🔌 Connecting to database...")
            
            self.connection = mysql.connector.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['username'],
                password=self.db_config['password'],
                database=self.db_config['database'],
                charset='utf8mb4',
                autocommit=False
            )
            
            if self.connection.is_connected():
                db_info = self.connection.get_server_info()
                print(f"✅ Connected to MySQL Server version {db_info}")
                return True
            
        except Error as e:
            print(f"❌ Error connecting to database: {e}")
            return False

    def load_converted_data(self) -> List[Dict[str, Any]]:
        """加载转换后的数据"""
        json_path = self.output_dir / "game_assets.json"
        
        if not json_path.exists():
            print(f"❌ Converted data file not found: {json_path}")
            print("Please run 3_convert_format.py first")
            return []
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"📥 Loaded {len(data)} converted assets")
        return data

    def prepare_database(self) -> bool:
        """准备数据库表结构"""
        try:
            cursor = self.connection.cursor()
            
            table_name = self.db_config['table']
            
            # 检查表是否存在
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = '{self.db_config['database']}' 
                AND table_name = '{table_name}'
            """)
            
            table_exists = cursor.fetchone()[0] > 0
            
            if table_exists:
                print(f"📋 Table '{table_name}' already exists")
                
                # 检查现有数据
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                existing_count = cursor.fetchone()[0]
                
                if existing_count > 0:
                    print(f"⚠️  Table contains {existing_count} existing records")
                    
                    # 询问是否清空现有数据
                    response = input("Do you want to clear existing data? (y/n): ").lower()
                    if response == 'y':
                        print("🗑️  Clearing existing data...")
                        cursor.execute(f"DELETE FROM {table_name}")
                        self.connection.commit()
                        print("✅ Existing data cleared")
                    else:
                        print("📝 Will append new data to existing records")
            else:
                # 创建表
                print(f"🏗️  Creating table '{table_name}'...")
                
                create_table_sql = f"""
                CREATE TABLE {table_name} (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    deleted_at TIMESTAMP NULL,
                    
                    INDEX idx_name (name),
                    INDEX idx_deleted_at (deleted_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
                
                cursor.execute(create_table_sql)
                self.connection.commit()
                print("✅ Table created successfully")
            
            cursor.close()
            return True
            
        except Error as e:
            print(f"❌ Error preparing database: {e}")
            return False

    def import_data_batch(self, assets: List[Dict[str, Any]]) -> bool:
        """批量导入数据"""
        try:
            cursor = self.connection.cursor()
            table_name = self.db_config['table']
            
            print(f"📊 Starting batch import of {len(assets)} assets...")
            
            # 准备批量插入SQL
            insert_sql = f"""
                INSERT INTO {table_name} (name, created_at, updated_at) 
                VALUES (%s, %s, %s)
            """
            
            # 分批处理
            successful_imports = 0
            failed_imports = 0
            
            for i in tqdm(range(0, len(assets), self.batch_size), desc="Importing batches"):
                batch = assets[i:i + self.batch_size]
                
                # 准备批量数据
                batch_data = []
                for asset in batch:
                    batch_data.append((
                        asset['name'],
                        asset['created_at'],
                        asset['updated_at']
                    ))
                
                try:
                    # 执行批量插入
                    cursor.executemany(insert_sql, batch_data)
                    self.connection.commit()
                    
                    successful_imports += len(batch)
                    
                except Error as e:
                    print(f"⚠️  Error in batch {i//self.batch_size + 1}: {e}")
                    failed_imports += len(batch)
                    self.connection.rollback()
                    continue
            
            cursor.close()
            
            print(f"✅ Import completed:")
            print(f"   📈 Successful: {successful_imports}")
            print(f"   ❌ Failed: {failed_imports}")
            
            return failed_imports == 0
            
        except Error as e:
            print(f"❌ Error during import: {e}")
            return False

    def verify_import(self, expected_count: int) -> bool:
        """验证导入结果"""
        try:
            cursor = self.connection.cursor()
            table_name = self.db_config['table']
            
            # 检查总数
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            actual_count = cursor.fetchone()[0]
            
            print(f"🔍 Verification results:")
            print(f"   Expected: {expected_count}")
            print(f"   Actual: {actual_count}")
            
            if actual_count >= expected_count:
                print("✅ Import verification passed")
                
                # 显示样本数据
                cursor.execute(f"SELECT name FROM {table_name} LIMIT 5")
                samples = cursor.fetchall()
                
                print(f"📋 Sample imported data:")
                for i, (name,) in enumerate(samples, 1):
                    print(f"   {i}. {name}")
                
                cursor.close()
                return True
            else:
                print("❌ Import verification failed")
                cursor.close()
                return False
                
        except Error as e:
            print(f"❌ Error during verification: {e}")
            return False

    def create_indexes(self) -> bool:
        """创建额外的索引以优化查询"""
        try:
            cursor = self.connection.cursor()
            table_name = self.db_config['table']
            
            print("🔧 Creating additional indexes...")
            
            # 为自动补全优化的前缀索引
            indexes = [
                f"CREATE INDEX idx_{table_name}_name_prefix ON {table_name} (name(10))",
                f"CREATE INDEX idx_{table_name}_created_at ON {table_name} (created_at)",
            ]
            
            for index_sql in indexes:
                try:
                    cursor.execute(index_sql)
                    print(f"   ✅ Created index")
                except Error as e:
                    if "Duplicate key name" in str(e):
                        print(f"   ⏭️  Index already exists")
                    else:
                        print(f"   ⚠️  Index creation failed: {e}")
            
            self.connection.commit()
            cursor.close()
            return True
            
        except Error as e:
            print(f"❌ Error creating indexes: {e}")
            return False

    def generate_import_report(self, assets: List[Dict[str, Any]], success: bool):
        """生成导入报告"""
        report_path = self.output_dir / "import_report.md"
        
        # 获取数据库统计
        stats = {}
        if self.connection and self.connection.is_connected():
            try:
                cursor = self.connection.cursor()
                table_name = self.db_config['table']
                
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                stats['total_records'] = cursor.fetchone()[0]
                
                cursor.execute(f"""
                    SELECT COUNT(DISTINCT name) FROM {table_name}
                """)
                stats['unique_names'] = cursor.fetchone()[0]
                
                cursor.execute(f"""
                    SELECT name, COUNT(*) as count 
                    FROM {table_name} 
                    GROUP BY name 
                    HAVING count > 1 
                    LIMIT 10
                """)
                duplicates = cursor.fetchall()
                stats['duplicates'] = duplicates
                
                cursor.close()
                
            except Error as e:
                print(f"⚠️  Error collecting stats: {e}")
        
        # 生成报告
        report_content = f"""# 数据库导入报告

## 导入概览

- **导入状态**: {'✅ 成功' if success else '❌ 失败'}
- **导入时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}
- **数据库**: {self.db_config['host']}:{self.db_config['port']}/{self.db_config['database']}
- **表名**: {self.db_config['table']}

## 数据统计

- **准备导入**: {len(assets)} 条记录
- **实际导入**: {stats.get('total_records', 'N/A')} 条记录
- **唯一名称**: {stats.get('unique_names', 'N/A')} 个

## 数据质量检查

"""
        
        if stats.get('duplicates'):
            report_content += "### ⚠️ 发现重复数据\n\n"
            report_content += "| 名称 | 重复次数 |\n|------|----------|\n"
            for name, count in stats['duplicates']:
                report_content += f"| {name} | {count} |\n"
        else:
            report_content += "### ✅ 无重复数据\n"
        
        report_content += f"""
## 性能优化

- 已创建名称索引用于快速查询
- 已创建前缀索引用于自动补全
- 批量大小: {self.batch_size}

## 测试查询

可以使用以下SQL语句测试自动补全功能:

```sql
-- 测试前缀补全
SELECT name FROM {self.db_config['table']} 
WHERE LOWER(name) LIKE '像素%' 
ORDER BY name ASC 
LIMIT 5;

-- 测试模糊搜索
SELECT name FROM {self.db_config['table']} 
WHERE LOWER(name) LIKE '%角色%' 
ORDER BY name ASC 
LIMIT 10;

-- 统计数据
SELECT COUNT(*) as total_count FROM {self.db_config['table']};
```

## 下一步

1. 重启SPX后端服务以应用新数据
2. 测试自动补全API接口
3. 根据使用情况调整索引策略
"""
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"📊 Import report saved: {report_path}")

    def close_connection(self):
        """关闭数据库连接"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("🔌 Database connection closed")

def main():
    """主函数"""
    print("📊 Starting database import process...")
    
    importer = DatabaseImporter()
    
    try:
        # 步骤1: 连接数据库
        if not importer.connect_to_database():
            return
        
        # 步骤2: 加载转换后的数据
        assets = importer.load_converted_data()
        if not assets:
            return
        
        # 步骤3: 准备数据库
        if not importer.prepare_database():
            return
        
        # 步骤4: 批量导入数据
        import_success = importer.import_data_batch(assets)
        
        # 步骤5: 验证导入结果
        verification_success = False
        if import_success:
            verification_success = importer.verify_import(len(assets))
        
        # 步骤6: 创建优化索引
        if verification_success:
            importer.create_indexes()
        
        # 步骤7: 生成报告
        final_success = import_success and verification_success
        importer.generate_import_report(assets, final_success)
        
        if final_success:
            print("✅ Database import completed successfully!")
            print("🎉 You can now test the auto-completion API!")
        else:
            print("❌ Database import failed. Please check the errors above.")
            
    except KeyboardInterrupt:
        print("\n⏹️  Import process interrupted by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        importer.close_connection()

if __name__ == "__main__":
    main()
