import type { CourseSeries } from '@/apis/course-series'

export type TutorialChapter = {
  id: string
  number: number
  shortTitle: { en: string; zh: string }
  title: { en: string; zh: string }
  start: number
  end: number
}

// Temporary presentation data for Code: Lita. The API does not expose chapter metadata yet, so
// keep this isolated until the series-management model is ready to own it.
const litaChapters: TutorialChapter[] = [
  {
    id: 'unit-1',
    number: 1,
    shortTitle: { en: 'Unit 1', zh: '单元一' },
    title: { en: 'Moving and route planning', zh: '运行、移动与路线规划' },
    start: 1,
    end: 13
  },
  {
    id: 'unit-2',
    number: 2,
    shortTitle: { en: 'Unit 2', zh: '单元二' },
    title: { en: 'Targets and object names', zh: '指定目标与对象名称' },
    start: 14,
    end: 18
  },
  {
    id: 'unit-3',
    number: 3,
    shortTitle: { en: 'Unit 3', zh: '单元三' },
    title: { en: 'Controlling scene objects', zh: '在 Lita 代码中控制场景对象' },
    start: 19,
    end: 23
  },
  {
    id: 'unit-4',
    number: 4,
    shortTitle: { en: 'Unit 4', zh: '单元四' },
    title: { en: 'Repetition and repeat', zh: '发现重复与 repeat' },
    start: 24,
    end: 30
  },
  {
    id: 'unit-5',
    number: 5,
    shortTitle: { en: 'Unit 5', zh: '单元五' },
    title: { en: 'Start, state, conditions and wait', zh: '启动、状态、条件与等待' },
    start: 31,
    end: 42
  },
  {
    id: 'unit-6',
    number: 6,
    shortTitle: { en: 'Unit 6', zh: '单元六' },
    title: { en: 'Variables, measuring and counting', zh: '变量、测量与计数' },
    start: 43,
    end: 56
  },
  {
    id: 'unit-7',
    number: 7,
    shortTitle: { en: 'Unit 7', zh: '单元七' },
    title: { en: 'Arrays and indexing', zh: '数组与索引' },
    start: 57,
    end: 62
  },
  {
    id: 'unit-8',
    number: 8,
    shortTitle: { en: 'Unit 8', zh: '单元八' },
    title: { en: 'Iteration and for in', zh: '逐个处理与 for in' },
    start: 63,
    end: 68
  },
  {
    id: 'unit-9',
    number: 9,
    shortTitle: { en: 'Unit 9', zh: '单元九' },
    title: { en: 'Keyboard events and interaction', zh: '按键事件与交互程序' },
    start: 69,
    end: 72
  },
  {
    id: 'unit-10',
    number: 10,
    shortTitle: { en: 'Unit 10', zh: '单元十' },
    title: { en: 'Final project', zh: '第一阶段毕业设计' },
    start: 73,
    end: 73
  }
]

const litaSeriesDescription =
  'Lita 来到一片充满变化的森林，为即将到来的冬天收集松果、蘑菇和各种果实。一路上，她会遇到不同的挑战和竞争对手，也会得到新朋友的帮助。通过代码学习，Lita 将学会规划路线、控制小船、判断目标、记录收获、整理物资，并逐步完成一场充满探索与挑战的森林冒险，迎来属于自己的大丰收。'

export function getTutorialChapters(series: CourseSeries | null | undefined): TutorialChapter[] {
  if (series == null) return []
  const key = `${series.id} ${series.title}`.toLowerCase()
  return key.includes('lita') ? litaChapters : []
}

export function getTutorialSeriesDescription(series: CourseSeries): string {
  const key = `${series.id} ${series.title}`.toLowerCase()
  return key.includes('lita') ? litaSeriesDescription : series.description
}

export function getTutorialChapter(chapters: TutorialChapter[], sequence: number) {
  return chapters.find((chapter) => sequence >= chapter.start && sequence <= chapter.end) ?? null
}

const chineseChapterNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

export function getTutorialChapterTitle(chapter: TutorialChapter, locale: 'en' | 'zh') {
  if (locale === 'zh') {
    return `${chineseChapterNumbers[chapter.number] ?? chapter.number}、${chapter.title.zh}`
  }
  return `Unit ${chapter.number}: ${chapter.title.en}`
}
