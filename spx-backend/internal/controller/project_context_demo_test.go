package controller

import (
	"fmt"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// TestSpaceProjectPromptEnhancementDemo 演示太空项目的提示词增强流程
func TestSpaceProjectPromptEnhancementDemo(t *testing.T) {
	ctrl := &Controller{}

	// 1. 模拟太空项目的LLM生成关联词（基于系统prompt）
	spaceProjectContext := &model.ProjectContext{
		ProjectID:   123,
		Name:        "太空探险游戏",
		Description: "玩家驾驶飞船探索外星球，与外星生物互动，收集星际资源",
		RelatedWords: model.WordsList{
			// 基于LLM可能生成的关联词（按重要性排序）
			"宇宙飞船", // 主要载具
			"外星人",  // 核心角色
			"星球",   // 探索目标
			"陨石",   // 障碍物
			"太空站",  // 补给点
			"宇航员",  // 角色形象
			"银河系",  // 背景环境
			"火箭",   // 推进器
			"外星生物", // 互动对象
			"星际",   // 环境描述
			"太空服",  // 装备
			"星空",   // 背景
			"科幻",   // 整体风格
			"探索",   // 核心玩法
			"冒险",   // 游戏类型
		},
	}

	// 2. 用户可能输入的各种提示词
	userPrompts := []string{
		"可爱的机器人",
		"神秘的角色",
		"飞行载具",
		"发光的建筑",
		"友好的生物",
		"科技装备",
		"美丽的风景",
		"战斗场面",
	}

	fmt.Println("=== 太空探险游戏项目 - 提示词增强演示 ===")
	fmt.Printf("项目信息: %s - %s\n", spaceProjectContext.Name, spaceProjectContext.Description)
	fmt.Printf("关联词库: %v\n", spaceProjectContext.RelatedWords.ToSlice())
	fmt.Println()

	// 3. 演示每个用户提示词的增强结果
	for i, userPrompt := range userPrompts {
		// 应用增强算法（选择前5个关联词）
		enhancedPrompt := ctrl.enhancePromptWithContext(userPrompt, spaceProjectContext.RelatedWords.ToSlice())

		fmt.Printf("示例 %d:\n", i+1)
		fmt.Printf("  用户输入: \"%s\"\n", userPrompt)
		fmt.Printf("  增强结果: \"%s\"\n", enhancedPrompt)
		fmt.Printf("  → 传递给推荐系统的最终prompt\n")
		fmt.Println()

		// 验证增强逻辑
		if enhancedPrompt == userPrompt {
			t.Errorf("Prompt should be enhanced, but remained the same: %s", userPrompt)
		}
	}

	// 4. 特殊情况演示
	fmt.Println("=== 特殊情况演示 ===")

	// 空关联词情况
	emptyContext := &model.ProjectContext{
		ProjectID:    456,
		Name:         "新建项目",
		Description:  "还没有生成关联词的项目",
		RelatedWords: model.WordsList{},
	}

	testPrompt := "可爱的角色"
	noEnhancement := ctrl.enhancePromptWithContext(testPrompt, emptyContext.RelatedWords.ToSlice())
	fmt.Printf("无关联词项目:\n")
	fmt.Printf("  用户输入: \"%s\"\n", testPrompt)
	fmt.Printf("  增强结果: \"%s\" (无变化，降级处理)\n", noEnhancement)
	fmt.Println()

	// 长关联词列表的处理
	longContext := model.WordsList{
		"word1", "word2", "word3", "word4", "word5",
		"word6", "word7", "word8", "word9", "word10",
	}
	limitedEnhancement := ctrl.enhancePromptWithContext(testPrompt, longContext.ToSlice())
	fmt.Printf("长关联词列表 (10个词):\n")
	fmt.Printf("  用户输入: \"%s\"\n", testPrompt)
	fmt.Printf("  增强结果: \"%s\" (限制到前5个)\n", limitedEnhancement)
	fmt.Println()
}

// TestRealWorldScenario 真实世界使用场景演示
func TestRealWorldScenario(t *testing.T) {
	ctrl := &Controller{}

	// 模拟不同类型项目的对比
	projects := []struct {
		name         string
		description  string
		relatedWords []string
		userPrompt   string
	}{
		{
			name:         "太空探险游戏",
			description:  "玩家驾驶飞船探索外星球",
			relatedWords: []string{"宇宙飞船", "外星人", "星球", "陨石", "太空站", "宇航员", "银河系"},
			userPrompt:   "可爱的角色",
		},
		{
			name:         "魔法学院",
			description:  "学习魔法的校园生活游戏",
			relatedWords: []string{"魔法", "法师", "魔法棒", "城堡", "药水", "咒语", "巫师"},
			userPrompt:   "可爱的角色",
		},
		{
			name:         "现代都市",
			description:  "现代城市背景的生活模拟",
			relatedWords: []string{"城市", "汽车", "建筑", "咖啡厅", "公园", "地铁", "摩天大楼"},
			userPrompt:   "可爱的角色",
		},
	}

	fmt.Println("=== 不同项目类型的prompt增强对比 ===")

	for _, project := range projects {
		enhanced := ctrl.enhancePromptWithContext(project.userPrompt, project.relatedWords)

		fmt.Printf("项目: %s\n", project.name)
		fmt.Printf("  描述: %s\n", project.description)
		fmt.Printf("  关联词: %v\n", project.relatedWords[:5]) // 显示前5个
		fmt.Printf("  用户输入: \"%s\"\n", project.userPrompt)
		fmt.Printf("  增强结果: \"%s\"\n", enhanced)
		fmt.Printf("  → 体现了项目的%s特色\n", project.name)
		fmt.Println()
	}
}

// BenchmarkSpaceProjectEnhancement 太空项目增强性能测试
func BenchmarkSpaceProjectEnhancement(b *testing.B) {
	ctrl := &Controller{}
	spaceWords := []string{"宇宙飞船", "外星人", "星球", "陨石", "太空站", "宇航员", "银河系", "火箭"}
	userPrompt := "可爱的机器人角色"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ctrl.enhancePromptWithContext(userPrompt, spaceWords)
	}
}
