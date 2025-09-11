#!/usr/bin/env python3
"""
步骤2: 数据清洗和筛选，过滤出适合SPX平台的轻量化素材
"""

import json
import re
import os
from pathlib import Path
from typing import List, Dict, Any, Set
from collections import Counter
import pandas as pd
from tqdm import tqdm

class DataCleaner:
    def __init__(self, config_path: str = "config.json"):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.spx_keywords = set(keyword.lower() for keyword in self.config['data_filtering']['spx_keywords'])
        self.exclude_keywords = set(keyword.lower() for keyword in self.config['data_filtering']['exclude_keywords'])
        self.min_length = self.config['data_filtering']['min_name_length']
        self.max_length = self.config['data_filtering']['max_name_length']
        
        self.data_dir = Path("data")
        self.cleaned_dir = self.data_dir / "cleaned"
        self.cleaned_dir.mkdir(parents=True, exist_ok=True)

    def load_raw_data(self) -> List[Dict[str, Any]]:
        """加载原始数据"""
        raw_data_path = self.data_dir / "raw" / "raw_asset_data.json"
        
        if not raw_data_path.exists():
            print(f"❌ Raw data file not found: {raw_data_path}")
            print("Please run 1_fetch_datasets.py first")
            return []
        
        with open(raw_data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"📥 Loaded {len(data)} raw asset entries")
        return data

    def clean_asset_names(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """清洗素材名称"""
        print("🧹 Cleaning asset names...")
        
        cleaned_assets = []
        
        for item in tqdm(raw_data, desc="Cleaning assets"):
            name = item.get('name', '').strip()
            
            if not name:
                continue
            
            # 基础清洗
            cleaned_name = self._basic_clean(name)
            if not cleaned_name:
                continue
            
            # SPX适配性检查
            if not self._is_spx_compatible(cleaned_name):
                continue
            
            # 去重和规范化
            normalized_name = self._normalize_name(cleaned_name)
            
            cleaned_item = {
                'name': normalized_name,
                'original_name': name,
                'source_dataset': item.get('source_dataset', ''),
                'source_url': item.get('source_url', ''),
                'category': item.get('category', ''),
                'confidence_score': self._calculate_confidence_score(normalized_name)
            }
            
            cleaned_assets.append(cleaned_item)
        
        print(f"✅ Cleaned {len(cleaned_assets)} assets from {len(raw_data)} raw entries")
        return cleaned_assets

    def _basic_clean(self, name: str) -> str:
        """基础清洗操作"""
        if not isinstance(name, str):
            return ""
        
        # 移除HTML标签
        name = re.sub(r'<[^>]+>', '', name)
        
        # 移除特殊字符，保留中文、英文、数字、空格、连字符
        name = re.sub(r'[^\w\s\-\u4e00-\u9fff]', ' ', name)
        
        # 合并多个空格
        name = re.sub(r'\s+', ' ', name).strip()
        
        # 长度检查
        if len(name) < self.min_length or len(name) > self.max_length:
            return ""
        
        return name

    def _is_spx_compatible(self, name: str) -> bool:
        """检查是否适合SPX平台"""
        name_lower = name.lower()
        
        # 排除不适合的内容
        if any(keyword in name_lower for keyword in self.exclude_keywords):
            return False
        
        # 排除明显的非素材内容
        exclude_patterns = [
            r'^\d+$',  # 纯数字
            r'^[a-f0-9]{8,}$',  # 看起来像hash
            r'(test|debug|temp|tmp)',  # 测试用内容
            r'(error|exception|null|undefined)',  # 错误相关
            r'(admin|user|login|password)',  # 系统相关
            r'(http|www|\.com|\.org)',  # 网址相关
        ]
        
        for pattern in exclude_patterns:
            if re.search(pattern, name_lower):
                return False
        
        # 检查是否包含游戏素材相关关键词
        game_asset_keywords = [
            # 中文关键词
            '角色', '背景', '道具', '平台', '图标', '按钮', '界面', '音效', '动画', '特效',
            '像素', '卡通', '动漫', '游戏', '精灵', '怪物', '英雄', '武器', '宝石', '金币',
            '森林', '城市', '太空', '海洋', '山脉', '建筑', '房屋', '树木', '云朵', '星星',
            
            # 英文关键词
            'character', 'sprite', 'hero', 'player', 'enemy', 'monster', 'npc',
            'background', 'backdrop', 'scene', 'level', 'stage', 'world', 'map',
            'item', 'prop', 'tool', 'weapon', 'armor', 'coin', 'gem', 'key',
            'platform', 'tile', 'block', 'ground', 'wall', 'obstacle',
            'ui', 'button', 'icon', 'menu', 'hud', 'interface',
            'pixel', 'cartoon', 'anime', 'game', 'gaming',
            'forest', 'city', 'space', 'ocean', 'mountain', 'building', 'house'
        ]
        
        has_game_keyword = any(keyword in name_lower for keyword in game_asset_keywords)
        
        # 或者名称结构看起来像素材名称
        looks_like_asset = any([
            'background' in name_lower,
            'character' in name_lower,
            re.search(r'\w+\s+(sprite|icon|tile|background|character)', name_lower),
            len(name.split()) >= 2 and any(word in name_lower for word in ['pixel', 'cartoon', '2d'])
        ])
        
        return has_game_keyword or looks_like_asset

    def _normalize_name(self, name: str) -> str:
        """规范化名称"""
        # 统一常见词汇
        replacements = {
            # 英文规范化
            'bg': 'background',
            'char': 'character',
            'btn': 'button',
            'ico': 'icon',
            'img': 'image',
            
            # 风格词汇规范化
            'pixelart': 'pixel art',
            'pixel-art': 'pixel art',
            '2d': '2D',
            '3d': '3D',
        }
        
        name_lower = name.lower()
        for old, new in replacements.items():
            name_lower = name_lower.replace(old, new)
        
        # 重新组织大小写
        words = name_lower.split()
        normalized_words = []
        
        for word in words:
            # 特殊词汇保持特定格式
            if word in ['2d', '2D']:
                normalized_words.append('2D')
            elif word in ['3d', '3D']:
                normalized_words.append('3D')
            elif word in ['ui', 'UI']:
                normalized_words.append('UI')
            elif word in ['rpg', 'RPG']:
                normalized_words.append('RPG')
            else:
                # 一般词汇首字母大写
                normalized_words.append(word.capitalize())
        
        return ' '.join(normalized_words)

    def _calculate_confidence_score(self, name: str) -> float:
        """计算置信度分数"""
        score = 0.5  # 基础分数
        name_lower = name.lower()
        
        # SPX关键词匹配加分
        for keyword in self.spx_keywords:
            if keyword in name_lower:
                score += 0.1
        
        # 长度合理性加分
        if 10 <= len(name) <= 50:
            score += 0.1
        
        # 包含多个有意义词汇加分
        meaningful_words = len([word for word in name.split() if len(word) > 2])
        if meaningful_words >= 2:
            score += 0.1
        if meaningful_words >= 3:
            score += 0.1
        
        # 看起来像专业命名加分
        if any(pattern in name_lower for pattern in ['pixel', 'cartoon', 'character', 'background']):
            score += 0.2
        
        return min(score, 1.0)

    def remove_duplicates(self, assets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """去除重复项"""
        print("🔄 Removing duplicates...")
        
        # 按名称去重，保留置信度最高的
        name_to_asset = {}
        
        for asset in assets:
            name = asset['name']
            if name not in name_to_asset or asset['confidence_score'] > name_to_asset[name]['confidence_score']:
                name_to_asset[name] = asset
        
        unique_assets = list(name_to_asset.values())
        
        print(f"🗑️  Removed {len(assets) - len(unique_assets)} duplicates")
        return unique_assets

    def filter_by_quality(self, assets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """按质量筛选"""
        print("⭐ Filtering by quality...")
        
        # 按置信度排序
        assets.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        # 只保留高质量的素材
        min_confidence = 0.6
        high_quality_assets = [asset for asset in assets if asset['confidence_score'] >= min_confidence]
        
        # 限制数量
        max_assets = self.config['output']['max_assets']
        if len(high_quality_assets) > max_assets:
            high_quality_assets = high_quality_assets[:max_assets]
        
        print(f"📊 Kept {len(high_quality_assets)} high-quality assets (confidence >= {min_confidence})")
        return high_quality_assets

    def add_spx_enhancements(self, assets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """添加SPX平台增强信息"""
        print("🎮 Adding SPX platform enhancements...")
        
        for asset in tqdm(assets, desc="Enhancing"):
            name = asset['name']
            
            # 自动分类
            category = self._auto_categorize(name)
            asset['spx_category'] = category
            
            # 生成标签
            tags = self._generate_tags(name)
            asset['spx_tags'] = tags
            
            # 添加平台适配说明
            asset['spx_compatible'] = True
            asset['spx_description'] = f"适合SPX平台的{category}素材"
        
        return assets

    def _auto_categorize(self, name: str) -> str:
        """自动分类"""
        name_lower = name.lower()
        
        # 角色类
        if any(keyword in name_lower for keyword in ['character', 'hero', 'player', 'enemy', 'monster', 'npc', '角色', '英雄', '怪物']):
            return '角色'
        
        # 背景类
        elif any(keyword in name_lower for keyword in ['background', 'backdrop', 'scene', 'level', 'world', '背景', '场景']):
            return '背景'
        
        # 道具类
        elif any(keyword in name_lower for keyword in ['item', 'prop', 'tool', 'weapon', 'coin', 'gem', '道具', '物品', '武器', '金币']):
            return '道具'
        
        # UI类
        elif any(keyword in name_lower for keyword in ['ui', 'button', 'icon', 'menu', 'interface', '按钮', '图标', '界面']):
            return 'UI'
        
        # 平台类
        elif any(keyword in name_lower for keyword in ['platform', 'tile', 'block', 'ground', '平台', '方块']):
            return '平台'
        
        else:
            return '其他'

    def _generate_tags(self, name: str) -> List[str]:
        """生成标签"""
        tags = []
        name_lower = name.lower()
        
        # 风格标签
        if 'pixel' in name_lower:
            tags.append('像素')
        if 'cartoon' in name_lower:
            tags.append('卡通')
        if '2d' in name_lower:
            tags.append('2D')
        
        # 颜色标签
        colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white']
        for color in colors:
            if color in name_lower:
                tags.append(color)
        
        # 主题标签
        themes = ['forest', 'city', 'space', 'ocean', 'mountain', 'fantasy', 'sci-fi']
        for theme in themes:
            if theme in name_lower:
                tags.append(theme)
        
        return tags

    def generate_statistics(self, assets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """生成统计信息"""
        print("📊 Generating statistics...")
        
        total_count = len(assets)
        
        # 按类别统计
        categories = Counter(asset['spx_category'] for asset in assets)
        
        # 按来源统计
        sources = Counter(asset['source_dataset'] for asset in assets)
        
        # 按置信度统计
        confidence_ranges = {
            '0.9-1.0': 0,
            '0.8-0.9': 0,
            '0.7-0.8': 0,
            '0.6-0.7': 0,
            '0.5-0.6': 0
        }
        
        for asset in assets:
            score = asset['confidence_score']
            if score >= 0.9:
                confidence_ranges['0.9-1.0'] += 1
            elif score >= 0.8:
                confidence_ranges['0.8-0.9'] += 1
            elif score >= 0.7:
                confidence_ranges['0.7-0.8'] += 1
            elif score >= 0.6:
                confidence_ranges['0.6-0.7'] += 1
            else:
                confidence_ranges['0.5-0.6'] += 1
        
        stats = {
            'total_assets': total_count,
            'categories': dict(categories),
            'sources': dict(sources),
            'confidence_distribution': confidence_ranges,
            'average_confidence': sum(asset['confidence_score'] for asset in assets) / total_count if total_count > 0 else 0
        }
        
        return stats

    def save_cleaned_data(self, assets: List[Dict[str, Any]], stats: Dict[str, Any]):
        """保存清洗后的数据"""
        # 保存清洗后的数据
        cleaned_data_path = self.cleaned_dir / "cleaned_assets.json"
        with open(cleaned_data_path, 'w', encoding='utf-8') as f:
            json.dump(assets, f, indent=2, ensure_ascii=False)
        
        # 保存统计信息
        stats_path = self.cleaned_dir / "cleaning_stats.json"
        with open(stats_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        
        # 生成CSV格式（便于查看）
        csv_path = self.cleaned_dir / "cleaned_assets.csv"
        df = pd.DataFrame(assets)
        df.to_csv(csv_path, index=False, encoding='utf-8')
        
        print(f"✅ Cleaned data saved:")
        print(f"   📄 JSON: {cleaned_data_path}")
        print(f"   📊 Stats: {stats_path}")
        print(f"   📋 CSV: {csv_path}")
        
        # 打印统计摘要
        print(f"\n📈 Cleaning Summary:")
        print(f"   Total assets: {stats['total_assets']}")
        print(f"   Average confidence: {stats['average_confidence']:.2f}")
        print(f"   Categories: {stats['categories']}")

def main():
    """主函数"""
    print("🧹 Starting data cleaning process...")
    
    cleaner = DataCleaner()
    
    # 步骤1: 加载原始数据
    raw_data = cleaner.load_raw_data()
    if not raw_data:
        return
    
    # 步骤2: 清洗素材名称
    cleaned_assets = cleaner.clean_asset_names(raw_data)
    
    # 步骤3: 去除重复项
    unique_assets = cleaner.remove_duplicates(cleaned_assets)
    
    # 步骤4: 按质量筛选
    quality_assets = cleaner.filter_by_quality(unique_assets)
    
    # 步骤5: 添加SPX增强信息
    enhanced_assets = cleaner.add_spx_enhancements(quality_assets)
    
    # 步骤6: 生成统计信息
    stats = cleaner.generate_statistics(enhanced_assets)
    
    # 步骤7: 保存清洗后的数据
    cleaner.save_cleaned_data(enhanced_assets, stats)
    
    print("✅ Data cleaning completed successfully!")

if __name__ == "__main__":
    main()
