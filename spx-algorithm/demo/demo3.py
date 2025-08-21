import open_clip
import torch
from PIL import Image
import os
from pathlib import Path
import json


# 批量图片搜索的高级版本


class ImageSearchEngine:
    def __init__(self, model_name='ViT-B-32', pretrained='laion2b_s34b_b79k'):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            model_name, pretrained=pretrained
        )
        self.tokenizer = open_clip.get_tokenizer(model_name)
        self.model = self.model.to(self.device)

        self.image_features_cache = {}
        self.image_paths = []

    def index_images(self, image_directory, extensions=['.jpg', '.jpeg', '.png', '.bmp']):
        """
        为目录中的所有图片建立索引
        """
        print("正在索引图片...")

        # 获取所有图片文件
        image_paths = []
        for ext in extensions:
            image_paths.extend(Path(image_directory).glob(f"**/*{ext}"))
            image_paths.extend(Path(image_directory).glob(f"**/*{ext.upper()}"))

        self.image_paths = [str(p) for p in image_paths]
        print(f"找到 {len(self.image_paths)} 张图片")

        # 批量提取图片特征
        batch_size = 32  # 根据显存调整
        all_features = []

        for i in range(0, len(self.image_paths), batch_size):
            batch_paths = self.image_paths[i:i+batch_size]
            batch_images = []
            valid_paths = []

            for img_path in batch_paths:
                try:
                    image = Image.open(img_path).convert('RGB')
                    batch_images.append(self.preprocess(image))
                    valid_paths.append(img_path)
                except Exception as e:
                    print(f"跳过损坏的图片: {img_path}")
                    continue

            if batch_images:
                images_tensor = torch.stack(batch_images).to(self.device)

                with torch.no_grad():
                    features = self.model.encode_image(images_tensor)
                    features /= features.norm(dim=-1, keepdim=True)

                all_features.append(features.cpu())

        # 合并所有特征
        if all_features:
            self.image_features = torch.cat(all_features, dim=0)
            print(f"成功索引 {len(self.image_features)} 张图片")
        else:
            print("没有找到有效的图片")

    def search(self, query_text, top_k=10):
        """
        根据文本查询搜索图片
        """
        if not hasattr(self, 'image_features'):
            raise ValueError("请先使用 index_images() 建立索引")

        # 编码查询文本
        text = self.tokenizer([query_text]).to(self.device)

        with torch.no_grad():
            text_features = self.model.encode_text(text)
            text_features /= text_features.norm(dim=-1, keepdim=True)

            # 计算相似度
            similarity = (text_features @self.image_features.T).squeeze(0)

            # 获取 top-k 结果
            top_k = min(top_k, len(self.image_paths))
            top_indices = similarity.topk(top_k).indices
            top_scores = similarity.topk(top_k).values

        # 构建结果
        results = []
        for i, (idx, score) in enumerate(zip(top_indices, top_scores)):
            results.append({
                'rank': i + 1,
                'image_path': self.image_paths[idx],
                'similarity': float(score),
                'filename': os.path.basename(self.image_paths[idx])
            })

        return results

    def save_index(self, index_path):
        """保存索引到文件"""
        index_data = {
            'image_paths': self.image_paths,
            'image_features': self.image_features.numpy().tolist()
        }
        with open(index_path, 'w') as f:
            json.dump(index_data, f)

    def load_index(self, index_path):
        """从文件加载索引"""
        with open(index_path, 'r') as f:
            index_data = json.load(f)

        self.image_paths = index_data['image_paths']
        self.image_features = torch.tensor(index_data['image_features'])

# 使用示例
if __name__ == "__main__":
    # 创建搜索引擎
    search_engine = ImageSearchEngine()

    # 为图片目录建立索引
    search_engine.index_images("./images")  # 替换为你的图片目录

    # 执行搜索
    queries = [
        "a dog playing in the park",
        "sunset over the ocean",
        "people eating at a restaurant",
        "red sports car"
    ]

    for query in queries:
        print(f"\n搜索: '{query}'")
        results = search_engine.search(query, top_k=5)

        for result in results:
            print(f"{result['rank']}. {result['filename']} (相似度: {result['similarity']:.4f})")

