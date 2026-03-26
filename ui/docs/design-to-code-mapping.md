# Design to Code Mapping Guide

This document describes the mapping between `.pen` design files and frontend Vue code implementation, using `community-explore.pen` as an example.

## Overview

| Design File | Frontend Code |
|-------------|---------------|
| `ui/pages/spx/community-explore.pen` | `spx-gui/src/pages/community/explore.vue` |

## Page Structure Mapping

### Design File Structure (community-explore.pen)

```
page (0hRWl)
├── Nav (H7k0g) → ref: 2:sKPE5 → Nav/Community/Sign in/1440 (2:832Oq)
└── content (t6rfA)
    ├── sub header (KAwBf)
    │   └── sub header content (S2MnU)
    │       ├── Results Text (zOVoc) - "Explore"
    │       └── Filter Wrapper (BLqmE)
    │           ├── Tab (KM7u0) - "Most recently liked" (Active)
    │           ├── Tab (xcECk) - "My following created"
    │           └── Tab (9Tee1) - "Most recently remixed"
    ├── Grid (4cSa8) - 4x Card/Project items
    └── Grid (WwD90) - 4x Card/Project items
```

### Frontend Code Structure (explore.vue)

```vue
<template>
  <CommunityHeader>           <!-- maps to: sub header (KAwBf) -->
    {{ $t({ en: 'Explore', zh: '发现' }) }}  <!-- maps to: Results Text (zOVoc) -->
    <template #options>
      <UIChipRadioGroup>      <!-- maps to: Filter Wrapper (BLqmE) -->
        <UIChipRadio />       <!-- maps to: Tab components (2:le3CV) -->
      </UIChipRadioGroup>
    </template>
  </CommunityHeader>
  <CenteredWrapper>           <!-- maps to: content width constraint -->
    <ListResultWrapper>
      <ul class="projects">   <!-- maps to: Grid (4cSa8, WwD90) -->
        <ProjectItem />       <!-- maps to: Card/Project item (2:pwk0c) -->
      </ul>
    </ListResultWrapper>
  </CenteredWrapper>
</template>
```

## Component Mapping Table

| Design Component (ID/Name) | Vue Component | File Path |
|---------------------------|---------------|-----------|
| `2:sKPE5` Nav | `CommunityNavbar` | `spx-gui/src/components/community/CommunityNavbar.vue` |
| `2:832Oq` Nav/Community/Sign in/1440 | `NavbarWrapper` | `spx-gui/src/components/navbar/NavbarWrapper.vue` |
| `KAwBf` sub header | `CommunityHeader` | `spx-gui/src/components/community/CommunityHeader.vue` |
| `S2MnU` sub header content | `CenteredWrapper` (inside CommunityHeader) | `spx-gui/src/components/community/CenteredWrapper.vue` |
| `zOVoc` Results Text | `<h1>` slot in CommunityHeader | - |
| `BLqmE` Filter Wrapper | `UIChipRadioGroup` | `spx-gui/src/components/ui/radio/UIChipRadioGroup.vue` |
| `2:le3CV` Tab | `UIChipRadio` | `spx-gui/src/components/ui/radio/UIChipRadio.vue` |
| `2:HuMs3` Tab/Boring/Active | `UIChip` (type="primary") | `spx-gui/src/components/ui/UIChip.vue` |
| `2:BRO5N` Tab/Boring/Default | `UIChip` (type="boring") | `spx-gui/src/components/ui/UIChip.vue` |
| `2:pwk0c` Card/Project item | `ProjectItem` | `spx-gui/src/components/project/ProjectItem.vue` |
| `2:rIuyc` Card/Project item/Default | ProjectItem default state | - |
| Grid (4cSa8, WwD90) | `<ul class="projects">` | In explore.vue |

## Style Mapping

### Layout

| Design Property | CSS Implementation |
|-----------------|-------------------|
| `layout: "vertical"` | `flex-direction: column` |
| `gap: 20` | `gap: 20px` |
| `justifyContent: "center"` | `justify-content: center` |
| `alignItems: "center"` | `align-items: center` |
| `width: 1440` (page) | Responsive width via `CenteredWrapper` (988px / 1240px) |
| `width: 988` (content) | `.centered { width: 988px }` |

### Colors (Design System Variables)

| Design Variable | CSS Variable |
|-----------------|--------------|
| `$grey100` | `--ui-color-grey-100` |
| `$grey300` | `--ui-color-grey-300` |
| `$grey1000` | `--ui-color-title` |

### Typography

| Design Property | CSS Implementation |
|-----------------|-------------------|
| `fontSize: 16` | `font-size: 16px` |
| `fontWeight: "medium"` | `font-weight: 500` |
| `lineHeight: 1.625` | `line-height: 26px` (16 * 1.625) |

## Key Design Patterns

### 1. Reusable Components (slot pattern)

Design files use `reusable: true` and `slot` arrays to define component variants:

```json
{
  "id": "2:le3CV",
  "name": "Tab",
  "reusable": true,
  "slot": ["2:HuMs3", "2:BRO5N", ...]  // Active, Default, Focus variants
}
```

In Vue, this maps to component props:

```vue
<UIChip :type="isActive ? 'primary' : 'boring'">
```

### 2. Component References (ref pattern)

Design files use `ref` to instantiate reusable components:

```json
{
  "id": "KM7u0",
  "ref": "2:le3CV",  // References Tab component
  "type": "ref"
}
```

In Vue, this is a component usage:

```vue
<UIChipRadio :value="Order.MostLikes">
  {{ $t(titles[Order.MostLikes]) }}
</UIChipRadio>
```

### 3. Grid Layout

Design uses multiple Grid frames with fixed gaps:

```json
{
  "id": "4cSa8",
  "name": "Grid",
  "gap": 16,
  "children": [/* Card/Project items */]
}
```

In Vue, this maps to flexbox with wrap:

```scss
.projects {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;  // Note: actual gap may differ from design
}
```

## File Naming Convention

| Design File Pattern | Code File Pattern |
|--------------------|-------------------|
| `ui/pages/spx/{page-name}.pen` | `spx-gui/src/pages/{category}/{page-name}.vue` |
| `community-explore.pen` | `community/explore.vue` |
| `community-home.pen` | `community/home.vue` |

## How to Sync Design to Code

### Step 1: Identify Changed Components

Use Pencil MCP tools to read design file:
```
batch_get(filePath, patterns=[{reusable: true}])
```

### Step 2: Find Corresponding Vue Files

1. Check `spx-gui/src/components/` for reusable UI components
2. Check `spx-gui/src/pages/` for page-level components
3. Use component name mapping table above

### Step 3: Update Style Values

1. Compare design properties (fill, fontSize, padding, gap, etc.)
2. Update corresponding CSS variables or inline styles
3. Ensure responsive breakpoints match design viewport variants

### Step 4: Verify Layout Structure

1. Check parent-child relationships in design
2. Ensure Vue template hierarchy matches
3. Verify flex/grid properties

## Common Gotchas

1. **Width differences**: Design uses fixed 1440px width, code uses responsive widths (988px/1240px)
2. **Gap values**: Design gap may not match code exactly, verify intentional differences
3. **Color naming**: Design uses `$grey100` format, code uses `--ui-color-grey-100` format
4. **Font family**: Design may specify different fonts than code's default font stack

## Related Files

- Design System Components: `ui/components/spx/builder-component.lib.pen`
- UI Component Library: `spx-gui/src/components/ui/`
- Community Components: `spx-gui/src/components/community/`
- Project Components: `spx-gui/src/components/project/`
