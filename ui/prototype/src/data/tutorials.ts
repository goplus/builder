export type TutorialCard = {
  id: string
  title: string
  total: string
  updatedAt: string
}

export const tutorials: TutorialCard[] = Array.from({ length: 12 }, (_, index) => ({
  id: `code-kiko-${index + 1}`,
  title: 'Code Kiko:  XBuilder Usage',
  total: '10 Total',
  updatedAt: '1 weeks ago'
}))
