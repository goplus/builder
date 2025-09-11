#!/usr/bin/env python3
"""
主执行脚本：运行完整的数据处理管道
"""

import sys
import subprocess
import os
from pathlib import Path

def run_command(script_name, description):
    """运行Python脚本"""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run([sys.executable, script_name], check=True, capture_output=False)
        print(f"✅ {description} 完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} 失败: {e}")
        return False
    except KeyboardInterrupt:
        print(f"⏹️ {description} 被用户中断")
        return False

def check_config():
    """检查配置文件"""
    config_path = Path("config.json")
    if not config_path.exists():
        print("❌ config.json 文件不存在，请先配置！")
        return False
    
    import json
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 检查GitHub token
    if config['github']['token'] == "your_github_token_here":
        print("⚠️  警告: GitHub token 未配置，将使用有限的API访问")
    
    # 检查数据库配置
    db_config = config['database']
    if not db_config['host'] or not db_config['database']:
        print("❌ 数据库配置不完整，请检查config.json")
        return False
    
    print("✅ 配置文件检查通过")
    return True

def main():
    """主函数"""
    print("🎮 SPX Backend - Game Assets Dataset Processor")
    print("=" * 60)
    
    # 检查当前目录
    if not Path("1_fetch_datasets.py").exists():
        print("❌ 请在dataset-processor目录下运行此脚本")
        return
    
    # 检查配置
    if not check_config():
        return
    
    # 询问用户要运行的步骤
    print("\n请选择要执行的步骤:")
    print("1. 🔍 获取数据集 (步骤1)")
    print("2. 🧹 清洗数据 (步骤2)")
    print("3. 🔄 格式转换 (步骤3)")
    print("4. 📊 导入数据库 (步骤4)")
    print("5. 🚀 运行完整管道 (步骤1-4)")
    print("6. ⚡ 快速模式 (跳过步骤1，从步骤2开始)")
    
    try:
        choice = input("\n请输入选择 (1-6): ").strip()
    except KeyboardInterrupt:
        print("\n👋 再见!")
        return
    
    steps = []
    
    if choice == "1":
        steps = [("1_fetch_datasets.py", "获取数据集")]
    elif choice == "2":
        steps = [("2_clean_data.py", "清洗数据")]
    elif choice == "3":
        steps = [("3_convert_format.py", "格式转换")]
    elif choice == "4":
        steps = [("4_import_to_db.py", "导入数据库")]
    elif choice == "5":
        steps = [
            ("1_fetch_datasets.py", "获取数据集"),
            ("2_clean_data.py", "清洗数据"),
            ("3_convert_format.py", "格式转换"),
            ("4_import_to_db.py", "导入数据库")
        ]
    elif choice == "6":
        steps = [
            ("2_clean_data.py", "清洗数据"),
            ("3_convert_format.py", "格式转换"),
            ("4_import_to_db.py", "导入数据库")
        ]
    else:
        print("❌ 无效选择")
        return
    
    # 执行选定的步骤
    success_count = 0
    total_steps = len(steps)
    
    for script, description in steps:
        if run_command(script, description):
            success_count += 1
        else:
            print(f"\n❌ 管道在 '{description}' 步骤失败")
            break
    
    # 结果汇总
    print(f"\n{'='*60}")
    print("📊 执行结果汇总")
    print(f"{'='*60}")
    
    if success_count == total_steps:
        print(f"🎉 所有 {total_steps} 个步骤都执行成功!")
        
        if choice in ["4", "5", "6"]:
            print("\n✨ 数据已成功导入数据库!")
            print("💡 接下来可以:")
            print("   1. 重启SPX后端服务")
            print("   2. 测试自动补全API接口")
            print("   3. 查看output/目录下的报告文件")
    else:
        print(f"⚠️  只有 {success_count}/{total_steps} 个步骤成功")
        print("💡 请检查错误信息并修复问题后重试")
    
    print(f"\n📁 输出文件位置:")
    print(f"   📊 数据文件: ./data/")
    print(f"   📄 输出文件: ./output/")
    print(f"   📋 日志信息: 控制台输出")

if __name__ == "__main__":
    main()
