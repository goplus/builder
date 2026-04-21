<template>
  <div :class="pageShellClass">
    <CommunityNavbar />

    <CenteredWrapper :class="pageContentClass">
      <header :class="pageIntroClass">
        <h1 :class="pageTitleClass">UI Design</h1>
        <p :class="pageDescriptionClass">
          {{
            $t({
              en: 'A local playground for checking component states, spacing, and interaction details.',
              zh: '用于本地检查组件状态、间距和交互细节的调试页。'
            })
          }}
        </p>
      </header>

      <div ref="directorySentinel" class="h-px" aria-hidden="true"></div>

      <nav
        :class="[directorySectionClass, isDirectoryPinned ? 'py-2.5' : 'pb-3.5 pt-3']"
        aria-label="Component directory"
      >
        <div :class="[directoryHeaderClass, isDirectoryPinned ? 'hidden' : '']">
          <h2 :class="sectionTitleClass">Directory</h2>
          <p class="text-(--ui-color-grey-700) text-xs leading-4.5">
            {{
              $t({
                en: 'Jump to a component section for quick style checks.',
                zh: '快速跳转到对应组件区域进行样式检查。'
              })
            }}
          </p>
        </div>
        <div :class="directoryGridClass">
          <a v-for="item in directoryItems" :key="item.id" :class="directoryLinkClass" :href="`#${item.id}`">
            {{ item.label }}
          </a>
        </div>
      </nav>

      <section id="ui-button" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">UIButton</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Compare icon-and-text buttons and icon-only buttons separately across different button types.',
                zh: '分别对比带图标文本按钮和纯图标按钮在不同按钮类型下的表现。'
              })
            }}
          </p>
        </div>

        <div :class="[demoPanelClass, 'gap-4']">
          <div :class="[controlRowClass, 'mb-0']">
            <label :class="controlFieldClass">
              <span :class="fieldLabelClass">size</span>
              <UISelect v-model:value="buttonSize">
                <UISelectOption value="small">small</UISelectOption>
                <UISelectOption value="medium">medium</UISelectOption>
                <UISelectOption value="large">large</UISelectOption>
              </UISelect>
            </label>
          </div>

          <div class="flex flex-col gap-4">
            <div :class="[surfaceCardClass, 'flex flex-col gap-3']">
              <div :class="groupLabelClass">Icon + Text</div>
              <div :class="wrapRowClass">
                <UIButton
                  v-for="buttonType in buttonTypes"
                  :key="`icon-text-${buttonType}`"
                  :size="buttonSize"
                  :type="buttonType"
                  icon="play"
                >
                  {{ buttonType }}
                </UIButton>
              </div>
              <div :class="wrapRowClass">
                <UIButton
                  v-for="buttonType in buttonTypes"
                  :key="`icon-text-disabled-${buttonType}`"
                  :size="buttonSize"
                  :type="buttonType"
                  icon="play"
                  disabled
                >
                  {{ buttonType }}
                </UIButton>
              </div>
              <div :class="wrapRowClass">
                <UIButton
                  v-for="buttonType in buttonTypes"
                  :key="`icon-text-loading-${buttonType}`"
                  :size="buttonSize"
                  :type="buttonType"
                  icon="play"
                  loading
                >
                  {{ buttonType }}
                </UIButton>
              </div>
            </div>

            <div :class="[surfaceCardClass, 'flex flex-col gap-3']">
              <div :class="groupLabelClass">Icon Only</div>
              <div :class="[controlRowClass, 'mb-1']">
                <label :class="controlFieldClass">
                  <span :class="fieldLabelClass">icon shape</span>
                  <UISelect v-model:value="buttonShape">
                    <UISelectOption value="circle">circle</UISelectOption>
                    <UISelectOption value="square">square</UISelectOption>
                  </UISelect>
                </label>
              </div>
              <div :class="wrapRowClass">
                <UIButton
                  v-for="buttonType in buttonTypes"
                  :key="`icon-only-${buttonType}`"
                  :shape="buttonShape"
                  :size="buttonSize"
                  :type="buttonType"
                  icon="play"
                ></UIButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ui-button-group" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">UIButtonGroup</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Compare text and icon groups across primary and secondary variants.',
                zh: '对比文字和图标按钮组在 primary 与 secondary 变体下的表现。'
              })
            }}
          </p>
        </div>

        <div :class="variantStackClass">
          <div :class="variantGroupClass">
            <div :class="variantLabelClass">{{ $t({ en: 'Primary', zh: 'Primary' }) }}</div>
            <div :class="nestedShowcaseGridClass">
              <div :class="surfaceCardClass">
                <div :class="groupLabelClass">{{ $t({ en: 'Text', zh: '文字' }) }}</div>
                <UIButtonGroup
                  type="text"
                  :value="primaryTextValue"
                  @update:value="(value) => (primaryTextValue = value)"
                >
                  <UIButtonGroupItem value="recent">{{ $t({ en: 'Recent', zh: '最近' }) }}</UIButtonGroupItem>
                  <UIButtonGroupItem value="popular">{{ $t({ en: 'Popular', zh: '热门' }) }}</UIButtonGroupItem>
                  <UIButtonGroupItem value="following">{{ $t({ en: 'Following', zh: '关注中' }) }}</UIButtonGroupItem>
                </UIButtonGroup>
              </div>
              <div :class="surfaceCardClass">
                <div :class="groupLabelClass">{{ $t({ en: 'Icon', zh: '图标' }) }}</div>
                <UIButtonGroup :value="primaryIconValue" @update:value="(value) => (primaryIconValue = value)">
                  <UIButtonGroupItem value="compact">
                    <div class="flex w-4 flex-col items-start gap-0.5">
                      <span class="h-0.5 w-1.5 rounded-full bg-current"></span>
                      <span class="h-0.5 w-2.5 rounded-full bg-current"></span>
                      <span class="h-0.5 w-3.5 rounded-full bg-current"></span>
                    </div>
                  </UIButtonGroupItem>
                  <UIButtonGroupItem value="balanced">
                    <div class="flex w-4 flex-col items-start gap-0.5">
                      <span class="h-0.5 w-2.5 rounded-full bg-current"></span>
                      <span class="h-0.5 w-3.5 rounded-full bg-current"></span>
                      <span class="h-0.5 w-2.5 rounded-full bg-current"></span>
                    </div>
                  </UIButtonGroupItem>
                  <UIButtonGroupItem value="spacious">
                    <div class="flex w-4 flex-col items-start gap-0.5">
                      <span class="h-0.5 w-3.5 rounded-full bg-current"></span>
                      <span class="h-0.5 w-2.5 rounded-full bg-current"></span>
                      <span class="h-0.5 w-1.5 rounded-full bg-current"></span>
                    </div>
                  </UIButtonGroupItem>
                </UIButtonGroup>
              </div>
            </div>
          </div>
          <div :class="variantGroupClass">
            <div :class="variantLabelClass">{{ $t({ en: 'Secondary', zh: 'Secondary' }) }}</div>
            <div :class="nestedShowcaseGridClass">
              <div :class="surfaceCardClass">
                <div :class="groupLabelClass">{{ $t({ en: 'Text', zh: '文字' }) }}</div>
                <UIButtonGroup
                  type="text"
                  variant="secondary"
                  :value="secondaryTextValue"
                  @update:value="(value) => (secondaryTextValue = value)"
                >
                  <UIButtonGroupItem value="grid">{{ $t({ en: 'Grid', zh: '网格' }) }}</UIButtonGroupItem>
                  <UIButtonGroupItem value="list">{{ $t({ en: 'List', zh: '列表' }) }}</UIButtonGroupItem>
                </UIButtonGroup>
              </div>
              <div :class="surfaceCardClass">
                <div :class="groupLabelClass">{{ $t({ en: 'Icon', zh: '图标' }) }}</div>
                <UIButtonGroup variant="secondary" :value="iconValue" @update:value="(value) => (iconValue = value)">
                  <UIButtonGroupItem value="left">
                    <div class="flex w-4 flex-col items-start gap-0.5">
                      <span class="h-0.5 w-4 rounded-full bg-current"></span>
                      <span class="h-0.5 w-3 rounded-full bg-current"></span>
                      <span class="h-0.5 w-2 rounded-full bg-current"></span>
                    </div>
                  </UIButtonGroupItem>
                  <UIButtonGroupItem value="center">
                    <div class="flex w-4 flex-col items-center gap-0.5">
                      <span class="h-0.5 w-4 rounded-full bg-current"></span>
                      <span class="h-0.5 w-3 rounded-full bg-current"></span>
                      <span class="h-0.5 w-2 rounded-full bg-current"></span>
                    </div>
                  </UIButtonGroupItem>
                  <UIButtonGroupItem value="right">
                    <div class="flex w-4 flex-col items-end gap-0.5">
                      <span class="h-0.5 w-4 rounded-full bg-current"></span>
                      <span class="h-0.5 w-3 rounded-full bg-current"></span>
                      <span class="h-0.5 w-2 rounded-full bg-current"></span>
                    </div>
                  </UIButtonGroupItem>
                </UIButtonGroup>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ui-inputs" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">Inputs And Select</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Common text, number, and select inputs for forms and filters.',
                zh: '表单和筛选中最常用的文本、数字和选择输入组件。'
              })
            }}
          </p>
        </div>

        <div :class="showcaseGridClass">
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UITextInput</div>
            <div :class="exampleStackClass">
              <UITextInput v-model:value="textInputValue" clearable placeholder="Project name" class="w-full" />
              <UITextInput v-model:value="searchInputValue" color="white" placeholder="Search assets" class="w-full">
                <template #prefix>
                  <UIIcon type="search" />
                </template>
              </UITextInput>
              <UITextInput value="Read only field" readonly disabled class="w-full" />
            </div>
          </div>
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UINumberInput</div>
            <div :class="exampleStackClass">
              <UINumberInput v-model:value="numberInputValue" :min="0" :max="100" class="w-full">
                <template #suffix>
                  <span class="text-xs text-(--ui-color-grey-800)">px</span>
                </template>
              </UINumberInput>
              <UINumberInput :value="24" disabled class="w-full">
                <template #suffix>
                  <span class="text-xs text-(--ui-color-grey-800)">px</span>
                </template>
              </UINumberInput>
            </div>
          </div>
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UISelect</div>
            <div :class="exampleStackClass">
              <UISelect v-model:value="selectValue" class="w-full">
                <UISelectOption value="recent">recent</UISelectOption>
                <UISelectOption value="popular">popular</UISelectOption>
                <UISelectOption value="following">following</UISelectOption>
              </UISelect>
            </div>
          </div>
        </div>
      </section>

      <section id="ui-choices" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">Choices</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Switches, radios, and checkboxes used for common state toggles.',
                zh: '常见状态切换里会用到的开关、单选和多选组件。'
              })
            }}
          </p>
        </div>

        <div :class="showcaseGridClass">
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UISwitch</div>
            <div :class="choiceColumnClass">
              <UISwitch v-model:value="switchValue">{{ switchValue ? 'Enabled' : 'Disabled' }}</UISwitch>
              <UISwitch :value="false" disabled>Disabled switch</UISwitch>
            </div>
          </div>
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UIRadioGroup</div>
            <UIRadioGroup :value="radioValue" @update:value="(value) => (radioValue = value ?? 'default')">
              <div :class="choiceColumnClass">
                <UIRadio value="default">Default</UIRadio>
                <UIRadio value="vertical">Vertical</UIRadio>
                <UIRadio value="manual">Manual</UIRadio>
              </div>
            </UIRadioGroup>
          </div>
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UICheckboxGroup</div>
            <UICheckboxGroup :value="checkboxValues" @update:value="(value) => (checkboxValues = value)">
              <div :class="choiceColumnClass">
                <UICheckbox value="physics">Physics</UICheckbox>
                <UICheckbox value="shadow">Shadow</UICheckbox>
                <UICheckbox value="particles">Particles</UICheckbox>
              </div>
            </UICheckboxGroup>
          </div>
        </div>
      </section>

      <section id="ui-tabs" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">UITabs</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Tabs for switching between related views or editors.',
                zh: '用于在相关视图或编辑器之间切换的标签页组件。'
              })
            }}
          </p>
        </div>

        <div class="flex flex-col gap-4">
          <UITabs :value="tabValue" @update:value="(value) => (tabValue = value)">
            <UITab value="assets">Assets</UITab>
            <UITab value="code">Code</UITab>
            <UITab value="settings">Settings</UITab>
          </UITabs>
          <div :class="tabsContentClass">
            {{
              tabValue === 'assets'
                ? 'Asset management content preview'
                : tabValue === 'code'
                  ? 'Code editing content preview'
                  : 'Settings content preview'
            }}
          </div>
        </div>
      </section>

      <section id="ui-card" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">UICard</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Use cards for grouped panels, editor sidebars, and content containers.',
                zh: '卡片适合用于分组面板、编辑器侧栏和内容容器。'
              })
            }}
          </p>
        </div>

        <div :class="showcaseGridClass">
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UICard</div>
            <UICard class="overflow-hidden">
              <UICardHeader>Asset Panel</UICardHeader>
              <div
                class="rounded-(--ui-border-radius-md) bg-(--ui-color-grey-100) p-4 text-(--ui-color-grey-900) text-sm leading-5.5"
              >
                {{
                  $t({
                    en: 'Use cards for grouped editor panels or community blocks.',
                    zh: '卡片适合承载编辑器面板或社区信息块。'
                  })
                }}
              </div>
            </UICard>
          </div>
        </div>
      </section>

      <section id="ui-block-items" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">UIBlockItem Wrappers</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Use the higher-level asset item components for sprite, sound, backdrop, and widget blocks.',
                zh: '精灵、声音、背景和控件等资源块更适合使用基于 block item 封装的上层组件。'
              })
            }}
          </p>
        </div>

        <div :class="[surfaceCardClass, 'mb-4']">
          <div :class="controlRowClass">
            <label :class="[controlFieldClass, compactFieldClass]">
              <span :class="fieldLabelClass">selectable</span>
              <UISwitch v-model:value="assetItemsSelectable"></UISwitch>
            </label>
            <label :class="[controlFieldClass, compactFieldClass]">
              <span :class="fieldLabelClass">selected</span>
              <UISwitch v-model:value="assetItemsSelected"></UISwitch>
            </label>
            <label :class="[controlFieldClass, compactFieldClass]">
              <span :class="fieldLabelClass">visible</span>
              <UISelect v-model:value="assetItemsVisibleMode">
                <UISelectOption value="default">default</UISelectOption>
                <UISelectOption value="visible">visible</UISelectOption>
                <UISelectOption value="hidden">hidden</UISelectOption>
              </UISelect>
            </label>
          </div>
          <div class="flex flex-wrap gap-2">
            <UITag :color="assetItemsSelectable ? 'primary' : 'default'">{{
              assetItemsSelectable ? 'Selectable' : 'Static'
            }}</UITag>
            <UITag :color="assetItemsActive ? 'primary' : 'default'">{{
              assetItemsActive ? 'Active' : 'Inactive'
            }}</UITag>
            <UITag color="default">{{ assetItemsVisibleLabel }}</UITag>
          </div>
        </div>

        <div :class="showcaseGridClass">
          <div :class="[surfaceCardClass, 'col-span-full']">
            <div :class="groupLabelClass">UIBlockItem Wrappers</div>
            <div class="flex flex-wrap gap-3">
              <div class="flex flex-col items-start gap-2">
                <div :class="controlLabelClass">UISpriteItem</div>
                <UISpriteItem name="Kiki" :selectable="assetItemsSelectableState">
                  <template #img="{ style }">
                    <UIImg :style="style" :src="sampleSpriteImg" :loading="false" />
                  </template>
                </UISpriteItem>
              </div>
              <div class="flex flex-col items-start gap-2">
                <div :class="controlLabelClass">UIEditorSpriteItem</div>
                <UIEditorSpriteItem
                  name="Kiki"
                  :selectable="assetItemsSelectableState"
                  :visible="assetItemsVisibleValue"
                >
                  <template #img="{ style }">
                    <UIImg :style="style" :src="sampleSpriteImg" :loading="false" />
                  </template>
                </UIEditorSpriteItem>
              </div>
              <div class="flex flex-col items-start gap-2">
                <div :class="controlLabelClass">UISoundItem</div>
                <UISoundItem name="Jump" duration="0.8s" :selectable="assetItemsSelectableState">
                  <template #player>
                    <PlayControl :playing="false" :progress="0" :play-handler="handleSoundDemoPlay" size="large" />
                  </template>
                </UISoundItem>
              </div>
              <div class="flex flex-col items-start gap-2">
                <div :class="controlLabelClass">UIEditorSoundItem</div>
                <UIEditorSoundItem name="Jump" :selectable="assetItemsSelectableState">
                  <template #player>
                    <div class="flex h-9 items-end justify-center gap-1">
                      <span class="h-3 w-1.5 rounded-full bg-[linear-gradient(180deg,#0bc0cf_0%,#67e0c2_100%)]"></span>
                      <span class="h-5 w-1.5 rounded-full bg-[linear-gradient(180deg,#0bc0cf_0%,#67e0c2_100%)]"></span>
                      <span class="h-4 w-1.5 rounded-full bg-[linear-gradient(180deg,#0bc0cf_0%,#67e0c2_100%)]"></span>
                      <span class="h-6 w-1.5 rounded-full bg-[linear-gradient(180deg,#0bc0cf_0%,#67e0c2_100%)]"></span>
                    </div>
                  </template>
                </UIEditorSoundItem>
              </div>
              <div class="flex flex-col items-start gap-2">
                <div :class="controlLabelClass">UIBackdropItem</div>
                <UIBackdropItem
                  name="Sunset"
                  :img-src="sampleBackdropImg"
                  :img-loading="false"
                  :selectable="assetItemsSelectableState"
                />
              </div>
              <div class="flex flex-col items-start gap-2">
                <div :class="controlLabelClass">UIEditorBackdropItem</div>
                <UIEditorBackdropItem
                  name="Sunset"
                  :img-src="sampleBackdropImg"
                  :img-loading="false"
                  :selectable="assetItemsSelectableState"
                />
              </div>
              <div class="flex flex-col items-start gap-2">
                <div :class="controlLabelClass">UIEditorWidgetItem</div>
                <UIEditorWidgetItem
                  name="Score"
                  :selectable="assetItemsSelectableState"
                  :visible="assetItemsVisibleValue"
                >
                  <template #icon>
                    <!-- eslint-disable vue/no-v-html -->
                    <div class="h-10 w-10 [&_svg]:block [&_svg]:h-full [&_svg]:w-full" v-html="monitorIcon"></div>
                    <!-- eslint-enable vue/no-v-html -->
                  </template>
                </UIEditorWidgetItem>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="gen-item" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">GenItem</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Generation item states used in asset generation flows.',
                zh: '资源生成流程中使用的生成项状态展示。'
              })
            }}
          </p>
        </div>

        <div :class="showcaseGridClass">
          <div :class="[surfaceCardClass, 'col-span-full']">
            <div class="flex flex-wrap gap-4">
              <GenItem :placeholder="spriteSvg">
                <UIBlockItemTitle size="medium">Default</UIBlockItemTitle>
              </GenItem>
              <GenItem highlight :placeholder="spriteSvg">
                <UIBlockItemTitle size="medium">Highlight</UIBlockItemTitle>
              </GenItem>
              <GenItem loading :placeholder="spriteSvg">
                <template #preview>
                  <div
                    class="relative h-10 w-10 rounded-[14px] bg-[linear-gradient(145deg,#5ab9ff_0%,#7de4ff_100%)] shadow-[0_8px_16px_rgba(64,195,211,0.2)]"
                  >
                    <div class="absolute inset-1.75 rounded-[12px] border-2 border-[rgba(255,255,255,0.72)]"></div>
                  </div>
                </template>
                <UIBlockItemTitle size="medium">Loading</UIBlockItemTitle>
              </GenItem>
              <GenItem active :placeholder="spriteSvg">
                <template #preview>
                  <div
                    class="relative h-10 w-10 rounded-[14px] bg-[linear-gradient(145deg,#0fb8a9_0%,#67e0c2_100%)] shadow-[0_8px_16px_rgba(64,195,211,0.2)]"
                  >
                    <div class="absolute inset-1.75 rounded-[12px] border-2 border-[rgba(255,255,255,0.72)]"></div>
                  </div>
                </template>
                <UIBlockItemTitle size="medium">Active</UIBlockItemTitle>
              </GenItem>
              <GenItem active loading :placeholder="spriteSvg">
                <template #preview>
                  <div
                    class="relative h-10 w-10 rounded-[14px] bg-[linear-gradient(145deg,#0fb8a9_0%,#67e0c2_100%)] shadow-[0_8px_16px_rgba(64,195,211,0.2)]"
                  >
                    <div class="absolute inset-1.75 rounded-[12px] border-2 border-[rgba(255,255,255,0.72)]"></div>
                  </div>
                </template>
                <UIBlockItemTitle size="medium">Active Loading</UIBlockItemTitle>
              </GenItem>
            </div>
          </div>
        </div>
      </section>

      <section id="ui-tag" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">UITag</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Check normal, closable, checkable, and disabled tag states.',
                zh: '检查普通、可关闭、可选中和禁用标签状态。'
              })
            }}
          </p>
        </div>

        <div :class="controlRowClass">
          <label :class="controlFieldClass">
            <span :class="fieldLabelClass">variant</span>
            <UISelect v-model:value="tagVariant">
              <UISelectOption value="stroke">stroke</UISelectOption>
              <UISelectOption value="none">none</UISelectOption>
            </UISelect>
          </label>
        </div>

        <div :class="demoPanelClass">
          <div :class="wrapRowClass">
            <UITag :variant="tagVariant" color="default">default</UITag>
            <UITag :variant="tagVariant" color="primary">primary</UITag>
            <UITag :variant="tagVariant" color="warning">warning</UITag>
            <UITag :variant="tagVariant" color="error">error</UITag>
          </div>
          <div :class="wrapRowClass">
            <UITag :variant="tagVariant" color="default" closable @close="message.success('default')">default</UITag>
            <UITag :variant="tagVariant" color="primary" closable @close="message.info('primary')">primary</UITag>
            <UITag :variant="tagVariant" color="warning" closable @close="message.warning('warning')">warning</UITag>
            <UITag :variant="tagVariant" color="error" closable @close="message.error('error')">error</UITag>
          </div>
          <div :class="wrapRowClass">
            <UITag
              v-for="value in tagDirections"
              :key="value"
              :variant="tagVariant"
              color="default"
              :checkable="{ checked: tagValue === value }"
              @click="tagValue = value"
              >{{ value }}</UITag
            >
          </div>
          <div :class="wrapRowClass">
            <UITag
              v-for="value in tagDirections"
              :key="value"
              :variant="tagVariant"
              color="default"
              :checkable="{ checked: tagsValue.has(value) }"
              closable
              @click="tagsValue.add(value)"
              @close="tagsValue.delete(value)"
              >{{ value }}</UITag
            >
          </div>
          <div :class="wrapRowClass">
            <UITag :variant="tagVariant" color="default" disabled>default</UITag>
            <UITag :variant="tagVariant" color="primary" disabled>primary</UITag>
            <UITag :variant="tagVariant" color="warning" disabled>warning</UITag>
            <UITag :variant="tagVariant" color="error" disabled>error</UITag>
          </div>
        </div>
      </section>

      <section id="ui-loading" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">UILoading And UIDetailedLoading</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Loading indicators for lightweight spinners and progress-aware blocking states.',
                zh: '用于轻量级等待态和带进度信息的阻塞加载态。'
              })
            }}
          </p>
        </div>

        <div :class="controlRowClass">
          <label :class="controlFieldClass">
            <span :class="fieldLabelClass">visible</span>
            <UISwitch v-model:value="loadingDemoVisible"></UISwitch>
          </label>
          <label :class="controlFieldClass">
            <span :class="fieldLabelClass">mask</span>
            <UISelect v-model:value="loadingDemoMask">
              <UISelectOption value="none">none</UISelectOption>
              <UISelectOption value="semi-transparent">semi-transparent</UISelectOption>
              <UISelectOption value="solid">solid</UISelectOption>
            </UISelect>
          </label>
        </div>

        <div :class="showcaseGridClass">
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UILoading</div>
            <div class="relative min-h-40 overflow-hidden rounded-(--ui-border-radius-md) bg-(--ui-color-grey-100) p-4">
              <div class="flex h-full min-h-32 items-center justify-center text-sm text-(--ui-color-grey-700)">
                Asset grid preview
              </div>
              <UILoading cover :visible="loadingDemoVisible" :mask="loadingDemoMask" />
            </div>
          </div>
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UIDetailedLoading</div>
            <div :class="[controlRowClass, 'mb-3']">
              <label :class="controlFieldClass">
                <span :class="fieldLabelClass">progress</span>
                <UINumberInput v-model:value="detailedLoadingProgress" :min="0" :max="100">
                  <template #suffix>
                    <span class="text-xs text-(--ui-color-grey-800)">%</span>
                  </template>
                </UINumberInput>
              </label>
            </div>
            <div class="relative min-h-55 overflow-hidden rounded-(--ui-border-radius-md) bg-(--ui-color-grey-100) p-4">
              <UIDetailedLoading
                cover
                :visible="loadingDemoVisible"
                :mask="detailedLoadingMask"
                :percentage="detailedLoadingPercentage"
              >
                {{ $t({ en: 'Generating animation frames', zh: '正在生成动画帧' }) }}
              </UIDetailedLoading>
            </div>
          </div>
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">GenLoading</div>
            <div :class="[controlRowClass, 'mb-3']">
              <label :class="controlFieldClass">
                <span :class="fieldLabelClass">variant</span>
                <UISelect v-model:value="genLoadingVariant">
                  <UISelectOption value="default">default</UISelectOption>
                  <UISelectOption value="bg-spin">bg-spin</UISelectOption>
                </UISelect>
              </label>
            </div>
            <div class="relative min-h-55 overflow-hidden rounded-(--ui-border-radius-md) bg-(--ui-color-grey-100) p-4">
              <GenLoading cover :visible="loadingDemoVisible" :variant="genLoadingVariant">
                {{ $t({ en: 'Generating sprite variations', zh: '正在生成精灵变体' }) }}
              </GenLoading>
            </div>
          </div>
        </div>
      </section>

      <section id="ui-feedback" :class="sectionClass">
        <div :class="sectionHeaderClass">
          <h2 :class="sectionTitleClass">UIEmpty And UIError</h2>
          <p :class="sectionDescriptionClass">
            {{
              $t({
                en: 'Feedback components for empty states and recoverable failures.',
                zh: '用于空状态和可恢复失败场景的反馈组件。'
              })
            }}
          </p>
        </div>

        <div :class="showcaseGridClass">
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UIEmpty</div>
            <div :class="feedbackSurfaceClass">
              <UIEmpty size="large" img="game">
                {{ $t({ en: 'No tutorials yet', zh: '还没有教程' }) }}
              </UIEmpty>
            </div>
          </div>
          <div :class="surfaceCardClass">
            <div :class="groupLabelClass">UIError</div>
            <div :class="feedbackSurfaceClass">
              <UIError :retry="handleRetry" :back="handleBack">
                {{ $t({ en: 'Failed to load assets', zh: '加载资源失败' }) }}
                <template #sub-message>
                  {{ $t({ en: 'Please try again or go back to the previous page.', zh: '请重试，或返回上一页。' }) }}
                </template>
              </UIError>
            </div>
          </div>
        </div>
      </section>
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { usePageTitle } from '@/utils/utils'
import {
  UIButton,
  UIButtonGroup,
  UIButtonGroupItem,
  UIBlockItemTitle,
  UIBackdropItem,
  UICard,
  UICardHeader,
  UICheckbox,
  UICheckboxGroup,
  UIEditorBackdropItem,
  UIEditorSoundItem,
  UIEditorSpriteItem,
  UIEditorWidgetItem,
  UIDetailedLoading,
  UIEmpty,
  UIError,
  UIIcon,
  UIImg,
  UILoading,
  UINumberInput,
  UIRadio,
  UIRadioGroup,
  UISelect,
  UISelectOption,
  UISoundItem,
  UISpriteItem,
  UISwitch,
  UITab,
  UITabs,
  UITag,
  UITextInput,
  useMessage
} from '@/components/ui'
import GenLoading from '@/components/asset/gen/common/GenLoading.vue'
import GenItem from '@/components/asset/gen/common/GenItem.vue'
import spriteSvg from '@/components/asset/gen/common/sprite.svg?raw'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import PlayControl from '@/components/editor/common/PlayControl.vue'
import monitorIcon from '@/components/editor/stage/widget/monitor.svg?raw'

import sampleBackdropImg from './sample-backdrop.svg'
import sampleSpriteImg from './sample-sprite.svg'

usePageTitle({
  en: 'UI Design',
  zh: 'UI设计'
})

const pageShellClass = 'flex h-full w-full flex-col overflow-y-auto bg-[var(--ui-color-grey-100)]'
const pageContentClass = 'my-[30px] flex flex-col gap-6'
const pageIntroClass =
  'rounded-[var(--ui-border-radius-lg)] bg-[radial-gradient(circle_at_top_right,rgba(64,195,211,0.14),transparent_30%),linear-gradient(180deg,#fff_0%,#f8fcfd_100%)] px-7 py-6 shadow-[inset_0_0_0_1px_rgba(226,234,238,0.95)]'
const pageTitleClass = 'text-[28px] leading-9 text-[var(--ui-color-grey-1000)]'
const pageDescriptionClass = 'mt-1.5 text-sm leading-[22px] text-[var(--ui-color-grey-800)]'
const sectionClass =
  'rounded-[var(--ui-border-radius-lg)] bg-white px-6 pb-6 pt-5 shadow-[inset_0_0_0_1px_rgba(226,234,238,0.95)] scroll-mt-6'
const sectionHeaderClass = 'mb-4'
const sectionTitleClass = 'text-[20px] leading-7 text-[var(--ui-color-grey-1000)]'
const sectionDescriptionClass = 'mt-1 text-[13px] leading-5 text-[var(--ui-color-grey-800)]'
const directorySectionClass =
  'sticky top-2 z-10 rounded-[var(--ui-border-radius-lg)] bg-[rgba(255,255,255,0.92)] px-4 shadow-[inset_0_0_0_1px_rgba(226,234,238,0.95)] backdrop-blur-[12px]'
const directoryHeaderClass = 'mb-[10px] flex items-baseline justify-between gap-3'
const directoryGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2'
const directoryLinkClass =
  'rounded-[var(--ui-border-radius-md)] bg-[radial-gradient(circle_at_top_right,rgba(64,195,211,0.08),transparent_40%),#f9fcfd] px-[10px] py-2 text-xs leading-[18px] text-[var(--ui-color-grey-900)] no-underline shadow-[inset_0_0_0_1px_rgba(213,226,232,0.9)] transition-[color,box-shadow,transform] duration-200 hover:-translate-y-px hover:text-[var(--ui-color-grey-1000)] hover:shadow-[inset_0_0_0_1px_rgba(64,195,211,0.45)]'
const showcaseGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'
const nestedShowcaseGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4'
const surfaceCardClass =
  'rounded-[var(--ui-border-radius-md)] bg-[radial-gradient(circle_at_top_right,rgba(64,195,211,0.08),transparent_36%),#f9fcfd] p-4 shadow-[inset_0_0_0_1px_rgba(213,226,232,0.9)]'
const controlRowClass = 'mb-4 flex flex-wrap items-center gap-x-4 gap-y-3'
const controlFieldClass = 'inline-flex max-w-full items-center gap-3 align-middle'
const compactFieldClass = ''
const fieldLabelClass = 'shrink-0 text-left text-xs leading-[18px] text-[var(--ui-color-grey-800)]'
const controlLabelClass = 'text-xs leading-[18px] text-[var(--ui-color-grey-800)]'
const groupLabelClass = 'mb-[10px] text-xs leading-[18px] text-[var(--ui-color-grey-800)]'
const demoPanelClass = 'flex flex-col gap-3'
const exampleStackClass = 'flex flex-col gap-3'
const wrapRowClass = 'flex flex-wrap gap-2'
const variantStackClass = 'flex flex-col gap-5'
const variantGroupClass = 'flex flex-col gap-3'
const variantLabelClass = 'text-sm font-semibold leading-[22px] text-[var(--ui-color-grey-1000)]'
const choiceColumnClass = 'flex flex-col gap-3'
const tabsContentClass =
  'rounded-[var(--ui-border-radius-md)] bg-[var(--ui-color-grey-100)] p-4 text-sm leading-[22px] text-[var(--ui-color-grey-900)]'
const feedbackSurfaceClass =
  'relative min-h-[220px] rounded-[var(--ui-border-radius-md)] bg-[var(--ui-color-grey-100)] p-4'

const directoryItems = [
  { id: 'ui-button', label: 'UIButton' },
  { id: 'ui-button-group', label: 'UIButtonGroup' },
  { id: 'ui-inputs', label: 'Inputs And Select' },
  { id: 'ui-choices', label: 'Choices' },
  { id: 'ui-tabs', label: 'UITabs' },
  { id: 'ui-card', label: 'UICard' },
  { id: 'ui-block-items', label: 'UIBlockItem Wrappers' },
  { id: 'gen-item', label: 'GenItem' },
  { id: 'ui-tag', label: 'UITag' },
  { id: 'ui-loading', label: 'UILoading And UIDetailedLoading' },
  { id: 'ui-feedback', label: 'UIEmpty And UIError' }
] as const

const buttonTypes = ['primary', 'secondary', 'neutral', 'white', 'red', 'green', 'blue', 'purple'] as const
const tagDirections = ['up', 'right', 'down', 'left'] as const

const buttonShape = ref<'circle' | 'square'>('circle')
const buttonSize = ref<'small' | 'medium' | 'large'>('medium')

const primaryTextValue = ref('recent')
const secondaryTextValue = ref('grid')
const iconValue = ref('center')
const primaryIconValue = ref('balanced')

const textInputValue = ref('Builder Project')
const searchInputValue = ref('Search assets')
const numberInputValue = ref<number | null>(24)
const selectValue = ref('recent')

const switchValue = ref(true)
const radioValue = ref('default')
const checkboxValues = ref(['physics', 'shadow'])
const tabValue = ref('assets')
const loadingDemoVisible = ref(true)
const loadingDemoMask = ref<'none' | 'semi-transparent' | 'solid'>('semi-transparent')
const detailedLoadingProgress = ref<number | null>(42)
const genLoadingVariant = ref<'default' | 'bg-spin'>('default')
const assetItemsSelectable = ref(true)
const assetItemsSelected = ref(false)
const assetItemsVisibleMode = ref<'default' | 'visible' | 'hidden'>('default')

const detailedLoadingMask = computed<'none' | 'semi-transparent'>(() => {
  return loadingDemoMask.value === 'solid' ? 'semi-transparent' : loadingDemoMask.value
})

const detailedLoadingPercentage = computed(() => {
  const progress = detailedLoadingProgress.value ?? 0
  return Math.min(Math.max(progress / 100, 0), 1)
})

const assetItemsSelectableState = computed<false | { selected: boolean }>(() => {
  return assetItemsSelectable.value ? { selected: assetItemsSelected.value } : false
})

const assetItemsActive = computed(() => assetItemsSelectable.value && assetItemsSelected.value)

const assetItemsVisibleValue = computed<boolean | null>(() => {
  if (assetItemsVisibleMode.value === 'default') return null
  return assetItemsVisibleMode.value === 'visible'
})

const assetItemsVisibleLabel = computed(() => {
  if (assetItemsVisibleMode.value === 'default') return 'Visible: default'
  if (assetItemsVisibleMode.value === 'visible') return 'Visible: true'
  return 'Visible: false'
})

async function handleSoundDemoPlay() {}

const tagVariant = ref<'stroke' | 'none'>('stroke')
const message = useMessage()
const tagValue = ref('up')
const tagsValue = ref(new Set<string>())

const directorySentinel = ref<HTMLDivElement | null>(null)
const isDirectoryPinned = ref(false)

let directoryObserver: IntersectionObserver | null = null

onMounted(() => {
  if (directorySentinel.value == null) return

  directoryObserver = new IntersectionObserver(
    ([entry]) => {
      isDirectoryPinned.value = !entry.isIntersecting
    },
    {
      threshold: 0,
      rootMargin: '-8px 0px 0px 0px'
    }
  )

  directoryObserver.observe(directorySentinel.value)
})

onBeforeUnmount(() => {
  directoryObserver?.disconnect()
})

function handleRetry() {
  message.info('retry')
}

function handleBack() {
  message.info('back')
}
</script>
