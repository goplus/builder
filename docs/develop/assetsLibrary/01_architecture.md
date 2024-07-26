# 功能模块划分

![image-20240725160522955](./assets/image-20240725160522955.png)

[产品需求文档](https://ncuhomer.feishu.cn/docx/Ghg0dqLmRoPVrlxHmXzcbjgDnEf?from=from_copylink)

## fiama原型图

<https://www.figma.com/design/Q32DIEm4tpDsrk7sPZvRKX/go%2Bbuilder?node-id=0-1&t=5deNPJ3ceqI8wO3f-0>

# 风险分析

核心需求中，搜索与分类等皆为常规功能，AI生成部分整体风险较高，非常规功能+低延迟（搜索要求等），需要重点关注。

### **整体风险来源**

AI生成部分的不确定性

### **AI生成部分风险来源：**

1. **生成内容的质量**：AI生成的资产的质量和相关性必须符合用户期望。质量低劣或不相关的内容可能导致用户不满意。
2. **延迟**：开发和集成AI生成功能需要保证ai生成较低的延迟。此处的任何问题都可能影响用户体验。
3. **动画相关部分技术的不确定性**：动画相关部分的渲染和生成

### 风险预防

1. 及时与相关ai开发人员沟通
2. 及早调研动画渲染相关技术，明确后续思路
3. 安排好相关人员排期，留足突发情况处理时间
4. 对ai生成质量进行把控（？）

# 模块详细设计

![image-20240725160659326](./assets/image-20240725160659326.png)

# 时序图

### 搜索、AI素材预生成

![image-20240725161126697](./assets/image-20240725161126697.png)

### 搜索结果、详情页、收藏、添加到项目

![image-20240725161138034](./assets/image-20240725161138034.png)

### AI生成结果、AI素材生成（背景扣除、骨骼绑定等）

![image-20240725161150019](./assets/image-20240725161150019.png)

## 接口

## API文档

[后端服务API](https://fxj4kdez1kc.feishu.cn/wiki/Dqh4wBrXlisVenkM4SCcU62Hnvd)

<https://app.apifox.com/invite/project?token=069BkUW4OItXzhb3mHho4>

<https://app.apifox.com/project/4854588>

<https://apifox.com/apidoc/shared-cef04b18-6c83-4c6a-9466-1ac66acfdff3/api-195901658>
