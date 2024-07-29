import type { LocaleMessage } from '@/utils/i18n'

export type Category = {
  value: string
  message: LocaleMessage
  children?: Category[]
}

export const categories: Category[] = [
  {
    value: 'roles',
    message: { en: 'Roles', zh: '角色' },
    children: [
      {
        value: 'cartoon_characters',
        message: { en: 'Cartoon Characters', zh: '卡通角色' },
        children: [
          { value: 'boy', message: { en: 'Boy', zh: '男孩' } },
          { value: 'girl', message: { en: 'Girl', zh: '女孩' } },
          { value: 'animal_characters', message: { en: 'Animal Characters', zh: '动物角色' } },
          { value: 'superhero', message: { en: 'Superhero', zh: '超级英雄' } },
          { value: 'villain', message: { en: 'Villain', zh: '反派角色' } },
          { value: 'sci_fi_characters', message: { en: 'Sci-Fi Characters', zh: '科幻角色（机器人、外星人等）' } }
        ]
      },
      {
        value: 'realistic_characters',
        message: { en: 'Realistic Characters', zh: '现实角色' },
        children: [
          { value: 'teenager', message: { en: 'Teenager', zh: '青少年' } },
          { value: 'adult', message: { en: 'Adult', zh: '成人' } },
          { value: 'elderly', message: { en: 'Elderly', zh: '老人' } },
          { value: 'student', message: { en: 'Student', zh: '学生' } },
          { value: 'teacher', message: { en: 'Teacher', zh: '教师' } },
          { value: 'professional_characters', message: { en: 'Professional Characters', zh: '职业角色（医生、警察、消防员等）' } }
        ]
      },
      {
        value: 'historical_characters',
        message: { en: 'Historical Characters', zh: '历史角色' },
        children: [
          { value: 'king', message: { en: 'King', zh: '国王' } },
          { value: 'prince', message: { en: 'Prince', zh: '王子' } },
          { value: 'pharaoh', message: { en: 'Pharaoh', zh: '法老' } }
        ]
      },
      {
        value: 'fantasy_characters',
        message: { en: 'Fantasy Characters', zh: '幻想角色' },
        children: [
          { value: 'mage', message: { en: 'Mage', zh: '魔法师' } },
          { value: 'dragon', message: { en: 'Dragon', zh: '龙' } },
          { value: 'elf', message: { en: 'Elf', zh: '精灵' } },
          { value: 'monster', message: { en: 'Monster', zh: '怪兽' } },
          { value: 'robot', message: { en: 'Robot', zh: '机器人' } }
        ]
      }
    ]
  },
  {
    value: 'backgrounds',
    message: { en: 'Backgrounds', zh: '背景' },
    children: [
      {
        value: 'natural_scenery',
        message: { en: 'Natural Scenery', zh: '自然场景' },
        children: [
          { value: 'forest', message: { en: 'Forest', zh: '森林' } },
          { value: 'beach', message: { en: 'Beach', zh: '沙滩' } },
          { value: 'mountain', message: { en: 'Mountain', zh: '山脉' } },
          { value: 'ocean', message: { en: 'Ocean', zh: '海洋' } },
          { value: 'desert', message: { en: 'Desert', zh: '沙漠' } }
        ]
      },
      {
        value: 'urban_landscape',
        message: { en: 'Urban Landscape', zh: '城市景观' },
        children: [
          { value: 'street', message: { en: 'Street', zh: '街道' } },
          { value: 'park', message: { en: 'Park', zh: '公园' } },
          { value: 'school', message: { en: 'School', zh: '学校' } },
          { value: 'mall', message: { en: 'Mall', zh: '商场' } },
          { value: 'museum', message: { en: 'Museum', zh: '博物馆' } }
        ]
      },
      {
        value: 'fantasy_scenery',
        message: { en: 'Fantasy Scenery', zh: '幻想场景' },
        children: [
          { value: 'magical_world', message: { en: 'Magical World', zh: '魔法世界' } },
          { value: 'space', message: { en: 'Space', zh: '太空' } },
          { value: 'future_city', message: { en: 'Future City', zh: '未来城市' } },
          { value: 'medieval_castle', message: { en: 'Medieval Castle', zh: '中世纪城堡' } },
          { value: 'dungeon', message: { en: 'Dungeon', zh: '地下城' } }
        ]
      },
      {
        value: 'indoor_scene',
        message: { en: 'Indoor Scene', zh: '室内场景' },
        children: [
          { value: 'bedroom', message: { en: 'Bedroom', zh: '卧室' } },
          { value: 'classroom', message: { en: 'Classroom', zh: '教室' } },
          { value: 'laboratory', message: { en: 'Laboratory', zh: '实验室' } },
          { value: 'library', message: { en: 'Library', zh: '图书馆' } },
          { value: 'game_hall', message: { en: 'Game Hall', zh: '游戏厅' } }
        ]
      }
    ]
  },
  {
    value: 'audio',
    message: { en: 'Audio', zh: '音频' },
    children: [
      {
        value: 'music',
        message: { en: 'Music', zh: '音乐' },
        children: [
          { value: 'pop_music', message: { en: 'Pop Music', zh: '流行音乐' } },
          { value: 'rock_music', message: { en: 'Rock Music', zh: '摇滚音乐' } },
          { value: 'classical_music', message: { en: 'Classical Music', zh: '古典音乐' } },
          { value: 'electronic_music', message: { en: 'Electronic Music', zh: '电子音乐' } },
          { value: 'hip_hop_music', message: { en: 'Hip-Hop Music', zh: '嘻哈音乐' } }
        ]
      },
      {
        value: 'sound_effects',
        message: { en: 'Sound Effects', zh: '音效' },
        children: [
          { value: 'natural_sounds', message: { en: 'Natural Sounds', zh: '自然声音' } },
          { value: 'animal_sounds', message: { en: 'Animal Sounds', zh: '动物声音' } },
          { value: 'mechanical_sounds', message: { en: 'Mechanical Sounds', zh: '机械声音' } },
          { value: 'magic_sound_effects', message: { en: 'Magic Sound Effects', zh: '魔法音效' } },
          { value: 'traffic_sound_effects', message: { en: 'Traffic Sound Effects', zh: '交通音效' } }
        ]
      },
      {
        value: 'dialogue',
        message: { en: 'Dialogue', zh: '对白' },
        children: [
          { value: 'movie_dialogue', message: { en: 'Movie Dialogue', zh: '电影对白' } },
          { value: 'game_dialogue', message: { en: 'Game Dialogue', zh: '游戏对白' } },
          { value: 'anime_dialogue', message: { en: 'Anime Dialogue', zh: '动漫对白' } },
          { value: 'character_lines', message: { en: 'Character Lines', zh: '角色台词' } },
          { value: 'educational_content', message: { en: 'Educational Content', zh: '教学内容' } }
        ]
      },
      {
        value: 'ambient_sounds',
        message: { en: 'Ambient Sounds', zh: '环境音' },
        children: [
          { value: 'street_background', message: { en: 'Street Background', zh: '街头背景音' } },
          { value: 'school_background', message: { en: 'School Background', zh: '学校背景音' } },
          { value: 'natural_background', message: { en: 'Natural Background', zh: '自然背景音' } },
          { value: 'restaurant_background', message: { en: 'Restaurant Background', zh: '餐厅背景音' } },
          { value: 'amusement_park_background', message: { en: 'Amusement Park Background', zh: '游乐场背景音' } }
        ]
      }
    ]
  }
]

export const categoryAll: Category = { value: '*', message: { en: 'All', zh: '所有' } }