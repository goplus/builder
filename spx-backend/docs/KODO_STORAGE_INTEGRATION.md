# Kodo存储集成功能文档

## 概述

为svggen图片生成功能添加了Kodo对象存储支持，AI生成的图片现在会自动存储到Kodo云存储中，并在响应中返回存储URL。

## 功能特性

### 自动存储
- **SVG文件存储**：生成的SVG图片自动上传到Kodo存储
- **智能命名**：使用文件哈希和图片ID生成唯一文件名
- **容错机制**：存储失败不会影响正常的图片生成流程

### 存储路径规范
- **文件前缀**：`ai-generated/`
- **命名格式**：`{hash前8位}-{图片ID}.{扩展名}`
- **示例路径**：`ai-generated/a1b2c3d4-img_12345.svg`

## API响应增强

### SVG生成接口 (`POST /image/svg`)

**响应头新增字段**：
```http
X-Kodo-URL: kodo://bucket/ai-generated/a1b2c3d4-img_12345.svg
```

**响应结构**：
```json
{
  "kodo_url": "kodo://bucket/ai-generated/a1b2c3d4-img_12345.svg"
}
```

### 图片元数据接口 (`POST /image`) 

**响应结构新增字段**：
```json
{
  "id": "img_12345",
  "svg_url": "https://provider.com/image.svg",
  "png_url": "https://provider.com/image.png",
  "kodo_svg_url": "kodo://bucket/ai-generated/a1b2c3d4-img_12345.svg",
  // ... 其他字段
}
```

## 技术实现

### 核心组件

#### 1. Kodo客户端扩展
**文件**: `internal/controller/controller.go:220-274`

新增上传方法：
```go
func (k *kodoClient) UploadFile(ctx context.Context, data []byte, filename string) (*UploadFileResult, error)
```

**功能**：
- 生成文件MD5哈希用于去重和命名
- 自动配置上传区域
- 返回Kodo内部URL格式

#### 2. 上传结果结构
```go
type UploadFileResult struct {
    Key      string `json:"key"`      // 存储键名
    Hash     string `json:"hash"`     // 文件哈希
    Size     int64  `json:"size"`     // 文件大小
    KodoURL  string `json:"kodo_url"` // kodo://格式URL
}
```

#### 3. 响应结构增强
- `SVGResponse`：添加 `KodoURL` 字段
- `ImageResponse`：添加 `KodoSVGURL` 字段

### 存储流程

#### SVG存储流程：
1. AI生成SVG图片
2. 下载SVG内容到内存
3. 使用文件哈希生成唯一文件名
4. 上传到Kodo存储的 `ai-generated/` 目录
5. 在响应中返回Kodo URL

### 区域配置

支持七牛云的多个存储区域：
- `z0`, `cn-east-1` → 华东
- `z1`, `cn-north-1` → 华北  
- `z2`, `cn-south-1` → 华南
- `na0`, `us-north-1` → 北美
- `as0`, `ap-southeast-1` → 新加坡

## 配置要求

确保以下环境变量已正确配置：
```bash
KODO_AK=your-access-key          # 七牛云访问密钥
KODO_SK=your-secret-key          # 七牛云私密密钥
KODO_BUCKET=your-bucket-name     # 存储桶名称
KODO_BUCKET_REGION=your-region   # 存储区域
KODO_BASE_URL=https://your-domain.com  # 访问域名
```

## 使用示例

### 前端调用生成SVG
```javascript
const response = await fetch('/image/svg', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '一只可爱的小猫',
    theme: 'cartoon',
    provider: 'svgio'
  })
});

// 检查响应头中的Kodo URL
const kodoUrl = response.headers.get('X-Kodo-URL');
console.log('存储URL:', kodoUrl);
```

### 前端调用生成图片元数据
```javascript
const response = await fetch('/image', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '一座美丽的城堡',
    theme: 'fantasy'
  })
});

const data = await response.json();
console.log('SVG存储URL:', data.kodo_svg_url);
```

### 访问存储的文件
使用现有的文件URL转换接口：
```javascript
const response = await fetch('/util/fileurls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    objects: ['kodo://bucket/ai-generated/a1b2c3d4-img_12345.svg']
  })
});

const data = await response.json();
const publicUrl = data.objectUrls['kodo://bucket/ai-generated/a1b2c3d4-img_12345.svg'];
```

## 容错和监控

### 错误处理
- **上传失败**：不影响图片生成流程，仅记录日志
- **网络超时**：自动重试机制（由七牛SDK处理）
- **权限错误**：记录详细错误信息

### 日志记录
```
SVG generation successful - ID: img_12345
SVG uploaded to Kodo: kodo://bucket/ai-generated/a1b2c3d4-img_12345.svg
```

### 存储失败日志
```
Failed to upload SVG to Kodo: network timeout
Failed to get SVG content for Kodo storage: invalid URL format
```

## 性能考虑

### 优化策略
- **内存优化**：文件内容直接在内存中处理，不写入磁盘
- **哈希去重**：相同内容的文件会有相同的存储键名
- **快速上传**：SVG文件轻量化，上传速度快

### 存储成本
- **智能命名**：基于内容哈希，避免重复存储
- **路径组织**：按类型分目录，便于管理和统计

## 扩展性

### 支持更多功能
可以轻松扩展支持其他功能：
```go
// 示例：添加文件压缩
compressedSVG, err := compressSVG(svgBytes)
if err == nil {
    svgBytes = compressedSVG
}
```

### 自定义存储路径
可以根据用户、主题或其他维度自定义存储路径：
```go
key := fmt.Sprintf("ai-generated/%s/%s-%s", userID, hash[:8], filename)
```

## 注意事项

1. **存储空间**：生成的图片会占用Kodo存储空间，需要考虑成本
2. **访问权限**：存储的文件需要通过现有的URL转换接口获取公网访问URL
3. **数据一致性**：存储失败时，原始的第三方URL仍然可用
4. **清理策略**：可能需要定期清理过期或无用的存储文件

这个功能为AI图片生成系统提供了可靠的存储后端，确保生成的内容得到持久化保存，同时保持了系统的稳定性和扩展性。