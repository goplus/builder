#!/usr/bin/env python3
"""
步骤1: 从GitHub获取Awesome Game Datasets数据
"""

import os
import json
import requests
import time
import csv
from pathlib import Path
from typing import List, Dict, Any
from github import Github
from tqdm import tqdm
import pandas as pd

class DatasetFetcher:
    def __init__(self, config_path: str = "config.json"):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.github_token = self.config['github']['token']
        self.repo_name = self.config['github']['awesome_datasets_repo']
        self.rate_limit_delay = self.config['github']['rate_limit_delay']
        
        self.data_dir = Path("data/raw")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        if self.github_token and self.github_token != "your_github_token_here":
            self.github = Github(self.github_token)
        else:
            self.github = Github()  # 无token模式，有API限制
            print("⚠️  Warning: No GitHub token provided, API rate limits apply")

    def fetch_awesome_datasets_repo(self) -> List[Dict[str, Any]]:
        """获取awesome-game-datasets仓库的数据集信息"""
        print("🔍 Fetching Awesome Game Datasets repository...")
        
        try:
            repo = self.github.get_repo(self.repo_name)
            readme_content = repo.get_readme().decoded_content.decode('utf-8')
            
            # 保存README内容用于后续解析
            readme_path = self.data_dir / "awesome_datasets_readme.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            print(f"✅ README saved to: {readme_path}")
            
            # 解析README中的数据集链接
            datasets = self._parse_datasets_from_readme(readme_content)
            return datasets
            
        except Exception as e:
            print(f"❌ Error fetching repository: {e}")
            return []

    def _parse_datasets_from_readme(self, readme_content: str) -> List[Dict[str, Any]]:
        """从README内容中解析数据集信息"""
        datasets = []
        lines = readme_content.split('\n')
        
        current_category = ""
        for line in lines:
            line = line.strip()
            
            # 检测分类标题
            if line.startswith('##') and not line.startswith('###'):
                current_category = line.replace('##', '').strip()
                continue
            
            # 检测数据集链接
            if '[' in line and '](' in line and ('github.com' in line or 'kaggle.com' in line):
                dataset_info = self._extract_dataset_info(line, current_category)
                if dataset_info:
                    datasets.append(dataset_info)
        
        print(f"📋 Found {len(datasets)} datasets in README")
        return datasets

    def _extract_dataset_info(self, line: str, category: str) -> Dict[str, Any]:
        """从一行文本中提取数据集信息"""
        try:
            # 解析markdown链接格式 [name](url)
            import re
            
            # 匹配 [text](url) 格式
            pattern = r'\[([^\]]+)\]\(([^)]+)\)'
            matches = re.findall(pattern, line)
            
            if not matches:
                return None
            
            name, url = matches[0]
            
            # 过滤掉明显不相关的数据集
            spx_keywords = self.config['data_filtering']['spx_keywords']
            exclude_keywords = self.config['data_filtering']['exclude_keywords']
            
            name_lower = name.lower()
            line_lower = line.lower()
            
            # 检查是否包含SPX相关关键词
            has_spx_keyword = any(keyword.lower() in name_lower or keyword.lower() in line_lower 
                                for keyword in spx_keywords)
            
            # 检查是否包含排除关键词
            has_exclude_keyword = any(keyword.lower() in name_lower or keyword.lower() in line_lower 
                                    for keyword in exclude_keywords)
            
            if not has_spx_keyword or has_exclude_keyword:
                return None
            
            return {
                'name': name.strip(),
                'url': url.strip(),
                'category': category,
                'description': line.strip(),
                'source': 'awesome-game-datasets'
            }
            
        except Exception as e:
            print(f"⚠️  Error parsing line: {line[:50]}... - {e}")
            return None

    def fetch_individual_datasets(self, datasets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """获取各个数据集的详细内容"""
        print("📥 Fetching individual datasets...")
        
        fetched_data = []
        
        for dataset in tqdm(datasets, desc="Downloading datasets"):
            try:
                data = self._fetch_single_dataset(dataset)
                if data:
                    fetched_data.extend(data)
                
                # 防止API限制
                time.sleep(self.rate_limit_delay)
                
            except Exception as e:
                print(f"⚠️  Error fetching {dataset['name']}: {e}")
                continue
        
        print(f"✅ Successfully fetched data from {len(fetched_data)} entries")
        return fetched_data

    def _fetch_single_dataset(self, dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        """获取单个数据集的内容"""
        url = dataset['url']
        name = dataset['name']
        
        # GitHub数据集处理
        if 'github.com' in url:
            return self._fetch_github_dataset(dataset)
        
        # Kaggle数据集处理  
        elif 'kaggle.com' in url:
            return self._fetch_kaggle_dataset(dataset)
        
        # 其他CSV/JSON直链
        else:
            return self._fetch_direct_dataset(dataset)

    def _fetch_github_dataset(self, dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        """获取GitHub仓库中的数据集"""
        try:
            url = dataset['url']
            # 从URL提取owner/repo
            parts = url.replace('https://github.com/', '').split('/')
            if len(parts) < 2:
                return []
            
            repo_name = f"{parts[0]}/{parts[1]}"
            repo = self.github.get_repo(repo_name)
            
            # 查找数据文件
            data_files = []
            try:
                contents = repo.get_contents("")
                for content in contents:
                    if content.name.endswith(('.csv', '.json', '.txt')) and content.size < 10*1024*1024:  # 限制10MB
                        data_files.append(content)
            except:
                pass
            
            # 下载并解析数据文件
            parsed_data = []
            for file in data_files[:3]:  # 限制每个仓库最多3个文件
                try:
                    file_content = file.decoded_content.decode('utf-8')
                    file_data = self._parse_data_file(file_content, file.name, dataset)
                    parsed_data.extend(file_data)
                except:
                    continue
            
            return parsed_data
            
        except Exception as e:
            print(f"⚠️  Error fetching GitHub dataset {dataset['name']}: {e}")
            return []

    def _fetch_kaggle_dataset(self, dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        """获取Kaggle数据集（需要API key）"""
        # 这里可以集成Kaggle API，目前先跳过
        print(f"⏭️  Skipping Kaggle dataset: {dataset['name']} (requires Kaggle API)")
        return []

    def _fetch_direct_dataset(self, dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        """获取直链数据集"""
        try:
            response = requests.get(dataset['url'], timeout=30)
            response.raise_for_status()
            
            file_name = dataset['url'].split('/')[-1]
            return self._parse_data_file(response.text, file_name, dataset)
            
        except Exception as e:
            print(f"⚠️  Error fetching direct dataset {dataset['name']}: {e}")
            return []

    def _parse_data_file(self, content: str, filename: str, dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        """解析数据文件内容"""
        parsed_data = []
        
        try:
            if filename.endswith('.json'):
                data = json.loads(content)
                parsed_data = self._extract_asset_names_from_json(data, dataset)
            
            elif filename.endswith('.csv'):
                # 保存CSV文件并用pandas读取
                csv_path = self.data_dir / f"{dataset['name']}_{filename}"
                with open(csv_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                df = pd.read_csv(csv_path)
                parsed_data = self._extract_asset_names_from_dataframe(df, dataset)
            
            elif filename.endswith('.txt'):
                lines = content.split('\n')
                parsed_data = self._extract_asset_names_from_text(lines, dataset)
        
        except Exception as e:
            print(f"⚠️  Error parsing file {filename}: {e}")
        
        return parsed_data

    def _extract_asset_names_from_json(self, data: Any, dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        """从JSON数据中提取素材名称"""
        asset_names = []
        
        def extract_names(obj, path=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if any(keyword in key.lower() for keyword in ['name', 'title', 'asset', 'item', 'sprite']):
                        if isinstance(value, str) and self._is_valid_asset_name(value):
                            asset_names.append({
                                'name': value,
                                'source_dataset': dataset['name'],
                                'source_url': dataset['url'],
                                'category': dataset['category'],
                                'path': f"{path}.{key}" if path else key
                            })
                    elif isinstance(value, (dict, list)):
                        extract_names(value, f"{path}.{key}" if path else key)
            
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    extract_names(item, f"{path}[{i}]")
        
        extract_names(data)
        return asset_names

    def _extract_asset_names_from_dataframe(self, df: pd.DataFrame, dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        """从DataFrame中提取素材名称"""
        asset_names = []
        
        # 查找可能包含素材名称的列
        name_columns = []
        for col in df.columns:
            if any(keyword in col.lower() for keyword in ['name', 'title', 'asset', 'item', 'sprite']):
                name_columns.append(col)
        
        for col in name_columns:
            for idx, value in df[col].items():
                if pd.notna(value) and isinstance(value, str) and self._is_valid_asset_name(value):
                    asset_names.append({
                        'name': value,
                        'source_dataset': dataset['name'],
                        'source_url': dataset['url'],
                        'category': dataset['category'],
                        'column': col,
                        'row': idx
                    })
        
        return asset_names

    def _extract_asset_names_from_text(self, lines: List[str], dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        """从文本行中提取素材名称"""
        asset_names = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line and self._is_valid_asset_name(line):
                asset_names.append({
                    'name': line,
                    'source_dataset': dataset['name'],
                    'source_url': dataset['url'],
                    'category': dataset['category'],
                    'line_number': i + 1
                })
        
        return asset_names

    def _is_valid_asset_name(self, name: str) -> bool:
        """检查是否是有效的素材名称"""
        if not isinstance(name, str):
            return False
        
        name = name.strip()
        min_length = self.config['data_filtering']['min_name_length']
        max_length = self.config['data_filtering']['max_name_length']
        
        if len(name) < min_length or len(name) > max_length:
            return False
        
        # 检查是否包含SPX相关关键词
        spx_keywords = self.config['data_filtering']['spx_keywords']
        exclude_keywords = self.config['data_filtering']['exclude_keywords']
        
        name_lower = name.lower()
        
        # 排除明显不相关的内容
        if any(keyword.lower() in name_lower for keyword in exclude_keywords):
            return False
        
        # 排除纯数字、URL等
        if name.isdigit() or 'http' in name_lower or '@' in name:
            return False
        
        return True

    def save_raw_data(self, datasets: List[Dict[str, Any]], fetched_data: List[Dict[str, Any]]):
        """保存原始数据"""
        # 保存数据集列表
        datasets_path = self.data_dir / "datasets_list.json"
        with open(datasets_path, 'w', encoding='utf-8') as f:
            json.dump(datasets, f, indent=2, ensure_ascii=False)
        
        # 保存获取的数据
        raw_data_path = self.data_dir / "raw_asset_data.json"
        with open(raw_data_path, 'w', encoding='utf-8') as f:
            json.dump(fetched_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Raw data saved:")
        print(f"   📋 Datasets list: {datasets_path}")
        print(f"   📄 Asset data: {raw_data_path}")
        print(f"   📊 Total assets found: {len(fetched_data)}")

def main():
    """主函数"""
    print("🚀 Starting dataset fetching process...")
    
    fetcher = DatasetFetcher()
    
    # 步骤1: 获取awesome-game-datasets仓库信息
    datasets = fetcher.fetch_awesome_datasets_repo()
    if not datasets:
        print("❌ No datasets found in repository")
        return
    
    # 步骤2: 获取各个数据集的内容
    fetched_data = fetcher.fetch_individual_datasets(datasets)
    
    # 步骤3: 保存原始数据
    fetcher.save_raw_data(datasets, fetched_data)
    
    print("✅ Dataset fetching completed successfully!")

if __name__ == "__main__":
    main()
