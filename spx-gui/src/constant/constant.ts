export enum AssetType {
  Sprite = 0,
  Backdrop = 1,
  Sounds = 2
}

export enum ThemeStyleType {
  Pink = 0,
  Yellow = 1,
  Blue = 2
}

export const categoryOptions = [
  { label: 'ALL', value: 'ALL' },
  { label: 'Animals', value: 'Animals' },
  { label: 'People', value: 'People' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Food', value: 'Food' },
  { label: 'Fantasy', value: 'Fantasy' }
]

export const publicOptions = [
  { label: 'not public', value: 0 },
  { label: 'publish to private asset library', value: 1 },
  { label: 'publish to public asset library', value: 2 },
  { label: 'publish to both', value: 3 },
]