import type { APICategoryViewInfo, APIReferenceItem } from '.'
import type { APIReferenceListData, MainCategory, SubCategory } from './APIReferenceListContent.vue'

export function groupItems(
  items: APIReferenceItem[],
  categories: APICategoryViewInfo[],
  /** Place each item in all matching categories or only the first valid path in the item's category order. */
  placement: 'all' | 'first'
): APIReferenceListData {
  if (items.length === 0) return { groups: [], ungroupedItems: [] }
  const groups: MainCategory[] = categories.map((category) => ({
    ...category,
    subCategories: category.subCategories.map((subCategory) => ({ ...subCategory, items: [] }))
  }))
  const ungroupedItems: APIReferenceItem[] = []
  for (const item of items) {
    const matches = new Set<SubCategory>()
    for (const [mainId, subId] of item.categories) {
      const subCategory = groups.find((group) => group.id === mainId)?.subCategories.find((sub) => sub.id === subId)
      if (subCategory == null) continue
      matches.add(subCategory)
      if (placement === 'first') break
    }
    if (matches.size === 0) ungroupedItems.push(item)
    for (const subCategory of matches) subCategory.items.push(item)
  }
  return {
    groups: groups
      .map((group) => ({ ...group, subCategories: group.subCategories.filter((sub) => sub.items.length > 0) }))
      .filter((group) => group.subCategories.length > 0),
    ungroupedItems
  }
}
