# import open_clip
# import torch
# from PIL import Image

# # 加载模型
# model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
# tokenizer = open_clip.get_tokenizer('ViT-B-32')

# # 处理数据
# image = preprocess(Image.open("images.jpg")).unsqueeze(0)
# text = tokenizer(["a dog", "a cat", "a white cat", "a grew cat", "a black cat", "a fat cat", "a thin cat"])

# #推理
# with torch.no_grad():
#     image_features = model.encode_image(image)
#     text_features = model.encode_text(text)

#     # 计算相似度
#     image_features /= image_features.norm(dim=-1, keepdim=True)
#     text_features /= text_features.norm(dim=-1, keepdim=True)
#     similarity = (100.0 * image_features @text_features.T).softmax(dim=-1)
#     print(similarity)

import cairosvg
from PIL import Image
import io
import open_clip
import torch

def process_svg_with_clip(svg_path, texts):
    # 转换 SVG
    png_data = cairosvg.svg2png(url=svg_path, output_width=224, output_height=224)
    image = Image.open(io.BytesIO(png_data))

    # 加载模型
    model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
    tokenizer = open_clip.get_tokenizer('ViT-B-32')

    # 处理
    processed_image = preprocess(image).unsqueeze(0)
    processed_text = tokenizer(texts)

    # 推理
    with torch.no_grad():
        image_features = model.encode_image(processed_image)
        text_features = model.encode_text(processed_text)
        similarity = (image_features @ text_features.T).softmax(dim=-1)

    return similarity

# 使用
result = process_svg_with_clip("cute2.svg", ["a dog", "a cat", "a white cat", "a grew cat", "a black cat", "a fat cat", "a thin cat"])
print(result)