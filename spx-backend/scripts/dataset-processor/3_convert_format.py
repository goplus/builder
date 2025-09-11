#!/usr/bin/env python3
"""
步骤3: 格式转换，将清洗后的数据转换为GameAsset模型格式
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timezone
import uuid

class FormatConverter:
    def __init__(self, config_path: str = "config.json"):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.data_dir = Path("data")
        self.output_dir = Path("output")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def load_cleaned_data(self) -> List[Dict[str, Any]]:
        """加载清洗后的数据"""
        cleaned_data_path = self.data_dir / "cleaned" / "cleaned_assets.json"
        
        if not cleaned_data_path.exists():
            print(f"❌ Cleaned data file not found: {cleaned_data_path}")
            print("Please run 2_clean_data.py first")
            return []
        
        with open(cleaned_data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"📥 Loaded {len(data)} cleaned assets")
        return data

    def convert_to_game_asset_format(self, cleaned_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """转换为GameAsset模型格式"""
        print("🔄 Converting to GameAsset format...")
        
        converted_assets = []
        current_time = datetime.now(timezone.utc).isoformat()
        
        for i, asset in enumerate(cleaned_data, 1):
            # 根据Go模型结构创建记录
            game_asset = {
                # 模拟数据库ID (实际导入时会自动生成)
                "id": i,
                
                # 核心字段：只保留name字段用于自动补全
                "name": asset['name'],
                
                # 时间戳字段
                "created_at": current_time,
                "updated_at": current_time,
                "deleted_at": None,
                
                # 元数据（用于验证和调试，不会存入数据库）
                "_metadata": {
                    "original_name": asset.get('original_name', ''),
                    "source_dataset": asset.get('source_dataset', ''),
                    "source_url": asset.get('source_url', ''),
                    "confidence_score": asset.get('confidence_score', 0),
                    "spx_category": asset.get('spx_category', ''),
                    "spx_tags": asset.get('spx_tags', [])
                }
            }
            
            converted_assets.append(game_asset)
        
        print(f"✅ Converted {len(converted_assets)} assets to GameAsset format")
        return converted_assets

    def generate_json_output(self, assets: List[Dict[str, Any]]) -> str:
        """生成JSON格式输出"""
        json_path = self.output_dir / "game_assets.json"
        
        # 清理元数据，只保留数据库字段
        clean_assets = []
        for asset in assets:
            clean_asset = {k: v for k, v in asset.items() if not k.startswith('_')}
            clean_assets.append(clean_asset)
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(clean_assets, f, indent=2, ensure_ascii=False)
        
        print(f"📄 JSON output saved: {json_path}")
        return str(json_path)

    def generate_sql_output(self, assets: List[Dict[str, Any]]) -> str:
        """生成SQL插入语句"""
        sql_path = self.output_dir / "game_assets.sql"
        
        table_name = self.config['database']['table']
        
        sql_statements = []
        
        # 创建表结构
        create_table_sql = f"""
-- GameAsset表结构 (与Go model保持一致)
CREATE TABLE IF NOT EXISTS {table_name} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_name (name),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""
        sql_statements.append(create_table_sql.strip())
        
        # 清空现有数据 (可选)
        sql_statements.append(f"-- 清空现有数据")
        sql_statements.append(f"DELETE FROM {table_name};")
        sql_statements.append("")
        
        # 生成INSERT语句
        sql_statements.append(f"-- 插入游戏素材数据")
        
        batch_size = self.config['output']['batch_size']
        
        for i in range(0, len(assets), batch_size):
            batch = assets[i:i + batch_size]
            
            values_list = []
            for asset in batch:
                name = asset['name'].replace("'", "''")  # 转义单引号
                created_at = asset['created_at']
                updated_at = asset['updated_at']
                
                values = f"('{name}', '{created_at}', '{updated_at}')"
                values_list.append(values)
            
            insert_sql = f"""INSERT INTO {table_name} (name, created_at, updated_at) VALUES
{',\n'.join(values_list)};"""
            
            sql_statements.append(insert_sql)
            sql_statements.append("")
        
        # 写入文件
        with open(sql_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql_statements))
        
        print(f"📄 SQL output saved: {sql_path}")
        return str(sql_path)

    def generate_go_sample_data(self, assets: List[Dict[str, Any]]) -> str:
        """生成Go代码格式的样本数据"""
        go_path = self.output_dir / "sample_game_assets.go"
        
        # 只取前50个作为样本
        sample_assets = assets[:50]
        
        go_code = '''package controller

import "github.com/goplus/builder/spx-backend/internal/model"

// SampleGameAssets provides real game asset names from Awesome Game Datasets
var SampleGameAssets = []model.GameAsset{
'''
        
        for asset in sample_assets:
            name = asset['name'].replace('"', '\\"')  # 转义双引号
            metadata = asset.get('_metadata', {})
            category = metadata.get('spx_category', '')
            
            go_code += f'\t{{Name: "{name}"}}, // {category}\n'
        
        go_code += '}\n'
        
        with open(go_path, 'w', encoding='utf-8') as f:
            f.write(go_code)
        
        print(f"📄 Go sample data saved: {go_path}")
        return str(go_path)

    def generate_csv_output(self, assets: List[Dict[str, Any]]) -> str:
        """生成CSV格式输出"""
        csv_path = self.output_dir / "game_assets.csv"
        
        import csv
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # 写入表头
            writer.writerow(['id', 'name', 'created_at', 'updated_at', 'source_dataset', 'category', 'confidence_score'])
            
            # 写入数据
            for asset in assets:
                metadata = asset.get('_metadata', {})
                writer.writerow([
                    asset['id'],
                    asset['name'],
                    asset['created_at'],
                    asset['updated_at'],
                    metadata.get('source_dataset', ''),
                    metadata.get('spx_category', ''),
                    metadata.get('confidence_score', 0)
                ])
        
        print(f"📄 CSV output saved: {csv_path}")
        return str(csv_path)

    def generate_summary_report(self, assets: List[Dict[str, Any]]) -> str:
        """生成汇总报告"""
        report_path = self.output_dir / "conversion_report.md"
        
        # 统计信息
        total_count = len(assets)
        categories = {}
        sources = {}
        
        for asset in assets:
            metadata = asset.get('_metadata', {})
            category = metadata.get('spx_category', '未分类')
            source = metadata.get('source_dataset', '未知')
            
            categories[category] = categories.get(category, 0) + 1
            sources[source] = sources.get(source, 0) + 1
        
        # 生成报告内容
        report_content = f"""# 游戏素材数据转换报告

## 转换概览

- **总素材数量**: {total_count}
- **转换时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **数据来源**: Awesome Game Datasets

## 分类统计

| 类别 | 数量 | 占比 |
|------|------|------|
"""
        
        for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total_count) * 100
            report_content += f"| {category} | {count} | {percentage:.1f}% |\n"
        
        report_content += f"""
## 数据源统计

| 数据源 | 数量 | 占比 |
|--------|------|------|
"""
        
        for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total_count) * 100
            report_content += f"| {source} | {count} | {percentage:.1f}% |\n"
        
        report_content += f"""
## 输出文件

- `game_assets.json` - JSON格式数据
- `game_assets.sql` - SQL插入语句
- `game_assets.csv` - CSV格式数据
- `sample_game_assets.go` - Go代码样本数据

## 数据格式

每个游戏素材包含以下字段：

```json
{{
  "id": 1,
  "name": "素材名称",
  "created_at": "2025-01-09T12:00:00Z",
  "updated_at": "2025-01-09T12:00:00Z",
  "deleted_at": null
}}
```

## 使用说明

1. **JSON格式**: 可直接用于API测试或前端展示
2. **SQL文件**: 可直接导入MySQL数据库
3. **Go样本**: 可替换现有的sample_game_assets.go文件
4. **CSV文件**: 便于数据分析和审查

## 质量保证

- 所有素材名称已经过清洗和验证
- 去除了重复项和低质量数据
- 符合SPX平台的轻量化要求
- 支持中英文自动补全功能
"""
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"📊 Summary report saved: {report_path}")
        return str(report_path)

    def validate_output(self, assets: List[Dict[str, Any]]) -> bool:
        """验证输出数据的质量"""
        print("✅ Validating output data...")
        
        issues = []
        
        # 检查必要字段
        for i, asset in enumerate(assets):
            if not asset.get('name'):
                issues.append(f"Asset {i+1}: Missing name field")
            
            if len(asset.get('name', '')) < 2:
                issues.append(f"Asset {i+1}: Name too short: '{asset.get('name')}'")
        
        # 检查重复
        names = [asset['name'] for asset in assets]
        duplicates = set([name for name in names if names.count(name) > 1])
        if duplicates:
            issues.append(f"Found {len(duplicates)} duplicate names")
        
        # 报告结果
        if issues:
            print(f"⚠️  Found {len(issues)} validation issues:")
            for issue in issues[:10]:  # 只显示前10个问题
                print(f"   - {issue}")
            if len(issues) > 10:
                print(f"   ... and {len(issues) - 10} more issues")
            return False
        else:
            print("✅ All validation checks passed!")
            return True

def main():
    """主函数"""
    print("🔄 Starting format conversion process...")
    
    converter = FormatConverter()
    
    # 步骤1: 加载清洗后的数据
    cleaned_data = converter.load_cleaned_data()
    if not cleaned_data:
        return
    
    # 步骤2: 转换为GameAsset格式
    converted_assets = converter.convert_to_game_asset_format(cleaned_data)
    
    # 步骤3: 验证数据质量
    if not converter.validate_output(converted_assets):
        print("❌ Data validation failed, please check the cleaning process")
        return
    
    # 步骤4: 生成各种格式的输出
    outputs = []
    
    if 'json' in converter.config['output']['formats']:
        outputs.append(converter.generate_json_output(converted_assets))
    
    if 'sql' in converter.config['output']['formats']:
        outputs.append(converter.generate_sql_output(converted_assets))
    
    outputs.append(converter.generate_go_sample_data(converted_assets))
    outputs.append(converter.generate_csv_output(converted_assets))
    outputs.append(converter.generate_summary_report(converted_assets))
    
    print(f"\n✅ Format conversion completed successfully!")
    print(f"📁 Output files generated:")
    for output_file in outputs:
        print(f"   📄 {output_file}")

if __name__ == "__main__":
    main()
