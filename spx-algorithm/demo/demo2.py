
import open_clip
import torch
from PIL import Image
import numpy as np
import cairosvg
import io


# 文本匹配多张图片的代码示例

def text_to_images_search(text_query, image_paths, model_name='ViT-B-32', pretrained='laion2b_s34b_b79k'):
    """
    用文本查询匹配多张图片
    
    Args:
        text_query: 查询文本
        image_paths: 图片路径列表
        model_name: 模型名称
        pretrained: 预训练权重
    
    Returns:
        排序后的结果列表，包含图片路径和相似度分数
    """
    # 加载模型
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
    tokenizer = open_clip.get_tokenizer(model_name)

    model = model.to(device)

    # 处理文本
    text = tokenizer([text_query]).to(device)

    # 处理所有图片
    images = []
    valid_paths = []

    for img_path in image_paths:
        try:
            # 转换 SVG
            png_data = cairosvg.svg2png(url=img_path, output_width=224, output_height=224)
            image = Image.open(io.BytesIO(png_data))
            # image = Image.open(img_path).convert('RGB')
            images.append(preprocess(image))
            valid_paths.append(img_path)
        except Exception as e:
            print(f"无法加载图片 {img_path}: {e}")
            continue

    if not images:
        return []

    # 批量处理图片
    images_tensor = torch.stack(images).to(device)

    with torch.no_grad():
        # 编码文本和图片
        text_features = model.encode_text(text)
        image_features = model.encode_image(images_tensor)

        # 归一化特征
        text_features /= text_features.norm(dim=-1, keepdim=True)
        image_features /= image_features.norm(dim=-1, keepdim=True)

        # 计算相似度
        similarity = (text_features @ image_features.T).squeeze(0)

        # 转换为 numpy 并排序
        similarity_scores = similarity.cpu().numpy()

    # 创建结果列表
    results = []
    for i, score in enumerate(similarity_scores):
        results.append({
            'image_path': valid_paths[i],
            'similarity': float(score),
            'rank': i + 1
        })

    # 按相似度降序排序
    results.sort(key=lambda x: x['similarity'], reverse=True)

    # 更新排名
    for i, result in enumerate(results):
        result['rank'] = i + 1

    return results

# 使用示例
if __name__ == "__main__":
    # 文本查询
    query = "a cute cat"

    # 图片路径列表
    image_list = [
        "dog.svg",
        "cute.svg",
        "cute2.svg",
        "image.svg"
    ]

    # 执行搜索
    results = text_to_images_search(query, image_list)

    # 显示结果
    print(f"查询文本: '{query}'")
    print("匹配结果（按相似度排序）:")
    print("-" * 60)

    for result in results:
        print(f"排名 {result['rank']}: {result['image_path']}")
        print(f"相似度: {result['similarity']:.4f}")
        print("-" * 30)

