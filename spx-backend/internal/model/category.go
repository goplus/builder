package model

// Category defines the category.
type Category struct {
	Value    string     `json:"value"`
	Children []Category `json:"children,omitempty"`
}

// Categories defines the categories.
var Categories = []Category{
	{
		Value: "sprite",
		Children: []Category{
			{
				Value: "cartoon_characters",
				Children: []Category{
					{Value: "boy"},
					{Value: "girl"},
					{Value: "animal_characters"},
					{Value: "superhero"},
					{Value: "villain"},
					{Value: "sci_fi_characters"},
				},
			},
			{
				Value: "realistic_characters",
				Children: []Category{
					{Value: "teenager"},
					{Value: "adult"},
					{Value: "elderly"},
					{Value: "student"},
					{Value: "teacher"},
					{Value: "professional_characters"},
				},
			},
			{
				Value: "historical_characters",
				Children: []Category{
					{Value: "king"},
					{Value: "prince"},
					{Value: "pharaoh"},
				},
			},
			{
				Value: "fantasy_characters",
				Children: []Category{
					{Value: "mage"},
					{Value: "dragon"},
					{Value: "elf"},
					{Value: "monster"},
					{Value: "robot"},
				},
			},
		},
	},
	{
		Value: "backdrop",
		Children: []Category{
			{
				Value: "natural_scenery",
				Children: []Category{
					{Value: "forest"},
					{Value: "beach"},
					{Value: "mountain"},
					{Value: "ocean"},
					{Value: "desert"},
				},
			},
			{
				Value: "urban_landscape",
				Children: []Category{
					{Value: "street"},
					{Value: "park"},
					{Value: "school"},
					{Value: "mall"},
					{Value: "museum"},
				},
			},
			{
				Value: "fantasy_scenery",
				Children: []Category{
					{Value: "magical_world"},
					{Value: "space"},
					{Value: "future_city"},
					{Value: "medieval_castle"},
					{Value: "dungeon"},
				},
			},
			{
				Value: "indoor_scene",
				Children: []Category{
					{Value: "bedroom"},
					{Value: "classroom"},
					{Value: "laboratory"},
					{Value: "library"},
					{Value: "game_hall"},
				},
			},
		},
	},
	{
		Value: "sound",
		Children: []Category{
			{
				Value: "music",
				Children: []Category{
					{Value: "pop_music"},
					{Value: "rock_music"},
					{Value: "classical_music"},
					{Value: "electronic_music"},
					{Value: "hip_hop_music"},
				},
			},
			{
				Value: "sound_effects",
				Children: []Category{
					{Value: "natural_sounds"},
					{Value: "animal_sounds"},
					{Value: "mechanical_sounds"},
					{Value: "magic_sound_effects"},
					{Value: "traffic_sound_effects"},
				},
			},
			{
				Value: "dialogue",
				Children: []Category{
					{Value: "movie_dialogue"},
					{Value: "game_dialogue"},
					{Value: "anime_dialogue"},
					{Value: "character_lines"},
					{Value: "educational_content"},
				},
			},
			{
				Value: "ambient_sounds",
				Children: []Category{
					{Value: "street_background"},
					{Value: "school_background"},
					{Value: "natural_background"},
					{Value: "restaurant_background"},
					{Value: "amusement_park_background"},
				},
			},
		},
	},
}

// GetLeafCategories gets the leaf categories of a category.
func GetLeafCategories(category *Category) []string {
	if category == nil {
		return nil
	}

	if len(category.Children) == 0 {
		return []string{category.Value}
	}

	var leaves []string
	for _, child := range category.Children {
		leaves = append(leaves, GetLeafCategories(&child)...)
	}
	return leaves
}

// 查找分类信息
func findCategoryByValue(value string, categories []Category) *Category {
	for _, category := range categories {
		if category.Value == value {
			return &category
		}
		if len(category.Children) > 0 {
			if child := findCategoryByValue(value, category.Children); child != nil {
				return child
			}
		}
	}
	return nil
}

// FindLeafCategories finds the leaf categories of a value.
func FindLeafCategories(value string) []string {
	categories := Categories
	category := findCategoryByValue(value, categories)
	return GetLeafCategories(category)
}
