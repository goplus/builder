# AI资源模型集成说明

## 概述

本文档说明了如何在spx-backend项目中集成和使用AI资源相关的数据模型。

## 新增模型

已在 `internal/model/ai_resource.go` 中新增了以下4个模型：

### 1. AIResource (AI资源表)
```go
type AIResource struct {
    Model
    URL string `gorm:"column:url;type:varchar(255);not null" json:"url"`
}
```
- **用途**: 存储AI生成的资源信息
- **表名**: `aiResource`
- **主要字段**: URL (资源访问地址)

### 2. Label (标签表)
```go
type Label struct {
    Model
    LabelName string `gorm:"column:labelName;type:varchar(50);not null;uniqueIndex" json:"labelName"`
}
```
- **用途**: 存储用于分类AI资源的标签
- **表名**: `label`
- **主要字段**: LabelName (标签名称，唯一)

### 3. ResourceLabel (资源标签关联表)
```go
type ResourceLabel struct {
    Model
    AIResourceID int64 `gorm:"column:aiResourceId;not null;index" json:"aiResourceId"`
    LabelID      int64 `gorm:"column:labelId;not null;index" json:"labelId"`
}
```
- **用途**: AI资源与标签的多对多关联
- **表名**: `resource_label`
- **主要字段**: AIResourceID, LabelID

### 4. ResourceUsageStats (资源使用统计表)
```go
type ResourceUsageStats struct {
    ID             int64     `gorm:"column:id;autoIncrement;primaryKey" json:"id"`
    AIResourceID   int64     `gorm:"column:ai_resource_id;not null;uniqueIndex" json:"ai_resource_id"`
    ViewCount      int64     `gorm:"column:view_count;default:0" json:"view_count"`
    SelectionCount int64     `gorm:"column:selection_count;default:0" json:"selection_count"`
    LastUsedAt     time.Time `gorm:"column:last_used_at" json:"last_used_at"`
    CreatedAt      time.Time `gorm:"column:created_at;not null" json:"created_at"`
    UpdatedAt      time.Time `gorm:"column:updated_at;not null" json:"updated_at"`
}
```
- **用途**: 记录AI资源的使用统计信息
- **表名**: `resource_usage_stats`
- **主要字段**: ViewCount, SelectionCount, LastUsedAt

## 数据库表创建

由于项目不使用自动迁移，需要手动执行SQL创建表：

```bash
# 在MySQL中执行以下SQL文件
mysql -u username -p database_name < sql/create_tables.sql
```

或者直接执行 `sql/create_tables.sql` 中的SQL语句。

## 模型使用示例

### 创建AI资源
```go
import "github.com/goplus/builder/spx-backend/internal/model"

// 创建新的AI资源
resource := model.AIResource{
    URL: "https://storage.example.com/images/generated-001.svg",
}
err := db.Create(&resource).Error
```

### 为资源添加标签
```go
// 创建标签
label := model.Label{
    LabelName: "cat",
}
err := db.Create(&label).Error

// 关联资源和标签
resourceLabel := model.ResourceLabel{
    AIResourceID: resource.ID,
    LabelID:      label.ID,
}
err = db.Create(&resourceLabel).Error
```

### 查询带标签的资源
```go
var resources []model.AIResource
err := db.Joins("JOIN resource_label rl ON aiResource.id = rl.aiResourceId").
    Joins("JOIN label l ON rl.labelId = l.id").
    Where("l.labelName = ?", "cat").
    Find(&resources).Error
```

### 更新使用统计
```go
var stats model.ResourceUsageStats
err := db.Where("ai_resource_id = ?", resourceID).First(&stats).Error
if err != nil {
    // 创建新的统计记录
    stats = model.ResourceUsageStats{
        AIResourceID: resourceID,
        ViewCount:    1,
        LastUsedAt:   time.Now(),
    }
    err = db.Create(&stats).Error
} else {
    // 更新现有统计
    stats.ViewCount++
    stats.LastUsedAt = time.Now()
    err = db.Save(&stats).Error
}
```

## 与现有系统的集成

### 在控制器中使用
```go
// 在controller中查询AI资源
func (ctrl *Controller) GetAIResources(ctx context.Context) ([]model.AIResource, error) {
    var resources []model.AIResource
    err := ctrl.db.WithContext(ctx).Find(&resources).Error
    return resources, err
}
```

### 关联查询示例
```go
// 获取资源及其标签
type ResourceWithLabels struct {
    model.AIResource
    Labels []model.Label `gorm:"many2many:resource_label;foreignKey:ID;joinForeignKey:AIResourceID;References:ID;JoinReferences:LabelID"`
}

var resourcesWithLabels []ResourceWithLabels
err := db.Preload("Labels").Find(&resourcesWithLabels).Error
```

## 测试

已创建测试文件 `ai_resource_test.go`，包含基本的模型测试：

```bash
# 运行AI资源模型测试
go test ./internal/model -run TestAIResource
```

## API集成

这些模型已经被图片推荐API使用：
- `POST /images/recommend` - 使用AIResource和ResourceUsageStats
- 自动统计资源查看次数
- 支持基于标签的资源分类

## 注意事项

1. **数据库表需要手动创建**: 项目不使用自动迁移，需要执行SQL脚本创建表
2. **外键约束**: ResourceLabel表包含外键约束，删除资源或标签时会级联删除关联记录  
3. **软删除**: AIResource、Label、ResourceLabel支持软删除功能
4. **时间戳**: 所有模型都包含创建和更新时间戳
5. **索引优化**: 已为常用查询字段添加了适当的索引

## 后续扩展

1. **添加更多字段**: 可以为AIResource添加尺寸、格式等元数据字段
2. **标签层次**: Label模型可以扩展支持标签层级关系
3. **使用统计扩展**: ResourceUsageStats可以添加更多使用行为统计
4. **缓存优化**: 对热门资源的统计数据进行缓存优化