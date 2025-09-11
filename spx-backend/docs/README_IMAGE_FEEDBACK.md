# 图片推荐与用户反馈功能

## 概述

本功能实现了图片推荐和用户反馈数据收集的完整流程，包括：

1. **RecommendImages 接口** - 为用户推荐图片并生成唯一的 query_id
2. **SubmitImageFeedback 接口** - 收集用户选择反馈并传递给算法服务

## API 接口

### 1. 图片推荐接口

**POST** `/images/recommend`

**请求参数：**
```json
{
  "prompt": "dog running in park",
  "top_k": 4,
  "theme": "cartoon"
}
```

**返回数据：**
```json
{
  "query_id": "a1b2c3d4e5f6g7h8",
  "query": "优化后的提示词",
  "results_count": 4,
  "results": [
    {
      "id": 1001,
      "image_path": "https://example.com/image1.png",
      "similarity": 0.95,
      "rank": 1,
      "source": "search"
    },
    {
      "id": 1002,
      "image_path": "https://example.com/image2.png", 
      "similarity": 0.90,
      "rank": 2,
      "source": "generated"
    }
  ]
}
```

### 2. 用户反馈接口

**POST** `/images/feedback`

**请求参数：**
```json
{
  "query_id": "a1b2c3d4e5f6g7h8",
  "chosen_pic": 1002
}
```

**返回数据：**
```json
{
  "status": "success",
  "message": "Feedback submitted successfully"
}
```

## 数据流程

1. **前端调用推荐接口**
   - 发送推荐请求到 `/images/recommend`
   - 后端返回推荐结果包含 `query_id` 和推荐图片列表

2. **用户选择图片**
   - 用户从推荐列表中选择一张图片
   - 前端记录用户选择的图片 ID

3. **提交用户反馈**
   - 前端调用 `/images/feedback` 接口
   - 传递 `query_id` 和用户选择的 `chosen_pic`

4. **算法服务接收反馈**
   - 后端自动调用算法服务的 `/v1/feedback/submit` 接口
   - 传递完整的反馈数据供算法优化使用

## 实现细节

### 缓存机制
- 使用内存缓存存储推荐结果 24 小时
- 支持根据 `query_id` 快速查找原始推荐数据
- 自动清理过期缓存条目

### 数据验证
- 验证 `query_id` 的有效性
- 确保 `chosen_pic` 在原推荐列表中
- 参数格式和范围检查

### 错误处理
- 推荐结果未找到 - 返回相应错误信息
- 选择的图片不在推荐列表中 - 返回验证错误
- 算法服务调用失败 - 记录日志并返回错误

## 前端集成示例

```javascript
// 1. 获取推荐图片
async function getRecommendations(prompt) {
  const response = await fetch('/images/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      top_k: 4,
      theme: 'cartoon'
    })
  });
  
  const result = await response.json();
  
  // 保存 query_id 供后续反馈使用
  localStorage.setItem('current_query_id', result.query_id);
  
  return result;
}

// 2. 提交用户选择反馈
async function submitFeedback(chosenPicId) {
  const queryId = localStorage.getItem('current_query_id');
  
  const response = await fetch('/images/feedback', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_id: queryId,
      chosen_pic: chosenPicId
    })
  });
  
  return await response.json();
}
```

## 注意事项

1. **query_id 有效期**: 缓存的推荐结果有 24 小时有效期，超期后无法提交反馈
2. **算法服务地址**: 目前配置为 `localhost:5000`，生产环境需要修改 `getAlgorithmServiceURL()` 方法
3. **内存缓存**: 当前使用内存缓存，重启服务会丢失缓存数据，生产环境建议使用 Redis
4. **并发安全**: 缓存操作使用读写锁确保并发安全

## 算法服务接口规范

本功能会调用算法服务的反馈接口：

**POST** `http://localhost:5000/v1/feedback/submit`

**请求数据：**
```json
{
  "query_id": "a1b2c3d4e5f6g7h8",
  "query": "dog running in park", 
  "recommended_pics": [1001, 1002, 1003, 1004],
  "chosen_pic": 1002
}
```

算法服务需要实现这个接口来接收和处理用户反馈数据。