import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Prototype contract check:
// keep this app offline and aligned with the real frontend surfaces we intentionally mirror,
// while rejecting production-only runtime/docs/widget artifacts that should not be copied here.
const root = new URL('..', import.meta.url).pathname
const srcRoot = join(root, 'src')

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (entry === 'node_modules' || entry === 'dist') return []
    if (statSync(path).isDirectory()) return walk(path)
    return [path]
  })
}

const failures = []
const sourceFiles = walk(srcRoot).filter((path) => /\.(ts|vue|css)$/.test(path))
const router = read('src/router.ts')
const communityHome = read('src/pages/community/home.vue')
const communityExplore = read('src/pages/community/explore.vue')
const communityProject = read('src/pages/community/project.vue')
const guestBanner = read('src/components/community/home/GuestBanner.vue')
const navbar = read('src/components/community/CommunityNavbar.vue')
const projectsSection = read('src/components/community/ProjectsSection.vue')
const projectCard = read('src/components/project/ProjectCard.vue')
const app = read('src/App.vue')
const styles = read('src/styles/app.css')
const mockData = read('src/data/mock.ts')
const editorPage = read('src/pages/editor/index.vue')
const quickConfigBackIcon = read('src/assets/editor/quick-config/back.svg')
const codeZoomInIcon = read('src/assets/editor/code-editor/zoom-in.svg')
const codeZoomOutIcon = read('src/assets/editor/code-editor/zoom-out.svg')
const codeZoomResetIcon = read('src/assets/editor/code-editor/zoom-reset.svg')
const codeCloseCircleIcon = read('src/assets/editor/code-editor/close-circle.svg')
const tutorialIcon = read('src/assets/editor/navbar-icons/tutorial.svg')
const editorTimerIcon = read('src/assets/editor/ui-icons/timer.svg')
const editorStatusIcon = read('src/assets/editor/ui-icons/status.svg')
const editorSoundIcon = read('src/assets/editor/ui-icons/sound.svg')
const editorAnimationStateDefaultIcon = read('src/assets/editor/animation-state/default.svg')
const editorAnimationStateDieIcon = read('src/assets/editor/animation-state/die.svg')
const editorAnimationStateStepIcon = read('src/assets/editor/animation-state/step.svg')
const editorArrowDownIcon = read('src/assets/editor/ui-icons/arrow-down.svg')
const editorProjectFileIcon = read('src/assets/editor/navbar-icons/file.svg')
const navbarArrowMiniIcon = read('src/assets/navbar-icons/arrow-mini.svg')
const editorEyeOffIcon = read('src/assets/editor/ui-icons/eye-off.svg')
const editorEyeIcon = read('src/assets/editor/ui-icons/eye.svg')
const editorEyeSlashIcon = read('src/assets/editor/ui-icons/eye-slash.svg')
const transformerLeftRightIcon = read('src/assets/editor/custom-transformer/left-right.svg')
const editorPlusIcon = read('src/assets/editor/ui-icons/plus.svg')
const editorPublishIcon = read('src/assets/editor/ui-icons/publish.svg')
const editorLoadingIcon = read('src/assets/editor/ui-icons/loading.svg')
const editorMonitorIcon = read('src/assets/editor/widget/monitor.svg')
const projectRunner = read('src/components/project/ProjectRunner.vue')
const prototypeButton = read('src/components/ui/UIButton.vue')
const prototypeButtonGroup = read('src/components/ui/UIButtonGroup.vue')
const prototypeButtonGroupItem = read('src/components/ui/UIButtonGroupItem.vue')
const prototypeCheckbox = read('src/components/ui/UICheckbox.vue')
const prototypeCheckboxGroup = read('src/components/ui/UICheckboxGroup.vue')
const prototypeModal = read('src/components/ui/UIModal.vue')
const prototypeModalClose = read('src/components/ui/UIModalClose.vue')
const prototypeFormModal = read('src/components/ui/UIFormModal.vue')
const copilot = read('src/components/copilot/Copilot.vue')
const communityApi = read('src/apis/community.ts')
const centeredWrapper = read('src/components/community/CenteredWrapper.vue')
const prototypeTag = read('src/components/ui/UITag.vue')
const prototypeTab = read('src/components/ui/UITab.vue')
const prototypeBlockItem = read('src/components/editor/UIBlockItem.vue')
const prototypeBlockItemTitle = read('src/components/editor/UIBlockItemTitle.vue')
const prototypeEditorSpriteItem = read('src/components/editor/UIEditorSpriteItem.vue')
const prototypeSpriteItem = read('src/components/editor/SpriteItem.vue')
const editorPreviewPanel = read('src/components/editor/PreviewPanel.vue')
const editorPreviewSurface = `${editorPage}\n${editorPreviewPanel}`
const prototypeCardHeader = read('src/components/ui/UICardHeader.vue')
const publishProjectModal = read('src/components/editor/PublishProjectModal.vue')
const spriteGeneratorModal = read('src/components/editor/SpriteGeneratorModal.vue')

if (
  !styles.includes('--ui-color-hint-1: var(--ui-color-grey-800);') ||
  !styles.includes('--ui-color-hint-2: var(--ui-color-grey-700);')
) {
  failures.push('prototype hint color tokens must match spx-gui hint-1/hint-2 mappings')
}

for (const route of [
  '/',
  '/explore',
  '/search',
  '/user/:nameInput',
  'projects',
  'likes',
  'followers',
  'following',
  '/project/:ownerInput/:nameInput',
  '/editor',
  '/editor/:ownerNameInput/:projectNameInput/:inEditorPath*',
  '/tutorials',
  '/course-series/:courseSeriesIdInput',
  '/course/:courseSeriesIdInput/:courseIdInput/start',
  '/sign-in/callback',
  '/sign-in/token',
  '/share/:owner/:name',
  '/:pathMatch(.*)*'
]) {
  if (!router.includes(route)) failures.push(`missing route: ${route}`)
}

for (const requiredFile of [
  'src/apis/community.ts',
  'src/apis/project.ts',
  'src/apis/tutorials.ts',
  'src/assets/projects/weathergggg/thumbnail.jpg',
  'src/assets/projects/niu-run/thumbnail.jpeg',
  'src/assets/editor/navbar-icons/tutorial.svg',
  'src/assets/editor/ui-icons/timer.svg',
  'src/assets/editor/ui-icons/status.svg',
  'src/assets/editor/ui-icons/sound.svg',
  'src/assets/editor/ui-icons/arrow-down.svg',
  'src/assets/editor/navbar-icons/file.svg',
  'src/assets/editor/ui-icons/plus.svg',
  'src/assets/editor/ui-icons/publish.svg',
  'src/assets/editor/ui-icons/loading.svg',
  'src/assets/editor/widget/monitor.svg',
  'src/components/project/ProjectRunner.vue',
  'src/components/editor/SpriteItem.vue',
  'src/components/editor/PublishProjectModal.vue',
  'src/components/editor/SpriteGeneratorModal.vue',
  'src/components/ui/UICardHeader.vue',
  'src/components/ui/UIModal.vue',
  'src/components/ui/UIModalClose.vue',
  'src/components/ui/UIFormModal.vue',
  'src/components/community/home/GuestBanner.vue',
  'src/pages/community/index.vue',
  'src/pages/community/project.vue',
  'src/pages/community/user/overview.vue',
  'src/pages/community/user/projects.vue',
  'src/pages/community/user/likes.vue',
  'src/pages/community/user/followers.vue',
  'src/pages/community/user/following.vue',
  'src/pages/editor/index.vue',
  'src/pages/sign-in/callback.vue',
  'src/pages/sign-in/token.vue',
  'src/pages/tutorials/course-series.vue',
  'src/pages/tutorials/course-start.vue'
]) {
  try {
    statSync(join(root, requiredFile))
  } catch {
    failures.push(`missing file: ${requiredFile}`)
  }
}

for (const forbiddenPath of [
  'public/spx_2.0.0',
  'src/assets/projects/weathergggg/Weathergggg.xbp',
  'src/assets/projects/niu-run/niu-run.xbp',
  'src/pages/docs',
  'src/widgets'
]) {
  try {
    statSync(join(root, forbiddenPath))
    failures.push(`production-only prototype artifact must not exist: ${forbiddenPath}`)
  } catch {
    // Expected: these surfaces are intentionally not copied into the prototype.
  }
}

if (router.includes('/docs') || router.includes('docs-api') || router.includes('docs-ui-design')) {
  failures.push('prototype router must not include docs routes because docs are not end-user UI')
}

if (mockData.includes('.xbp') || mockData.includes('Local XBP')) {
  failures.push('mock project data must not depend on bundled XBP files')
}

for (const renamedComponent of [
  'PrototypeCopilot.vue',
  'PrototypeProjectRunner.vue',
  'PrototypeSpriteItem.vue',
  'PrototypeButton.vue',
  'PrototypeCard.vue',
  'PrototypeCardHeader.vue',
  'PrototypeTab.vue',
  'PrototypeTabs.vue',
  'PrototypeTag.vue'
]) {
  for (const sourceFile of sourceFiles) {
    const rel = relative(root, sourceFile)
    const text = readFileSync(sourceFile, 'utf8')
    if (text.includes(renamedComponent)) failures.push(`component filename must not keep Prototype prefix: ${rel}`)
  }
}

if (communityHome.includes('Build, play, and remix games') || communityHome.includes('ai-boy.png')) {
  failures.push('community home must mirror real community home, not render a standalone marketing hero')
}

for (const bannerToken of ['Join XBuilder', 'Build and share your projects', 'Join now', 'guest-banner-bg.png']) {
  if (!guestBanner.includes(bannerToken)) failures.push(`guest home banner must mirror real token: ${bannerToken}`)
}

if (!guestBanner.includes('<UIButton class="mt-7" type="primary" size="large"')) {
  failures.push('guest banner Join now CTA must use the largest UIButton size')
}

for (const signedInOnlyToken of ['Your projects', '/explore?o=following']) {
  if (communityHome.includes(signedInOnlyToken)) failures.push(`default community home must render guest state, not signed-in token: ${signedInOnlyToken}`)
}

if (navbar.includes('to="/explore"')) {
  failures.push('community navbar must mirror dev branch and avoid a standalone explore icon entry')
}

if (communityExplore.includes('Browse fake local projects')) {
  failures.push('community explore header must not render prototype-only helper copy')
}

if (
  !communityExplore.includes('border-b border-grey-400 bg-grey-100') ||
  !communityExplore.includes('rounded-md border px-4') ||
  !communityExplore.includes("'border-primary-main bg-primary-main text-grey-100'")
) {
  failures.push('community explore header filters must mirror the real CommunityHeader chip radio styling')
}

if (projectCard.includes('remixes')) {
  failures.push('project card must mirror dev branch metadata and show updated time instead of remix count')
}

if (communityProject.includes('Remixed from {{ project.remixedFrom.title }}')) {
  failures.push('project page remixed-from copy must mirror real text/link structure')
}

if (!communityProject.includes('type="primary"') || !communityProject.includes('type="secondary"') || communityProject.includes('!rounded-md')) {
  failures.push('project page action buttons must use prototype button variants instead of ad-hoc overrides')
}

if (!communityProject.includes('release-timeline') || !communityProject.includes('group/timeline-item')) {
  failures.push('project page release history must render timeline-style release notes')
}

if (!projectCard.includes('updatedAt')) {
  failures.push('project card must render updatedAt metadata')
}

for (const route of ['/explore?o=likes', '/explore?o=remix']) {
  if (!communityHome.includes(route)) failures.push(`community home must use real explore route: ${route}`)
}

if (!navbar.includes('Sign in') || !navbar.includes('openSignInModal') || !navbar.includes('role="dialog"')) {
  failures.push('community navbar must expose the real guest sign-in entry')
}

if (
  !navbar.includes('placeholder="Search project"') ||
  !navbar.includes('community-search-input') ||
  !navbar.includes('.community-search-input {\n  font-size: 14px;\n  line-height: 22px;') ||
  navbar.includes('pl-7.5 text-base leading-[22px] text-text') ||
  navbar.includes('pl-7.5 text-sm leading-[22px] text-text') ||
  navbar.includes('pl-7.5 text-[14px]/[22px] text-text')
) {
  failures.push('community navbar search input text must render at 14px')
}

if (!projectsSection.includes('link-primary flex items-center text-lg')) {
  failures.push('projects section more link must mirror real RouterUILink/link-primary styling')
}

if (projectsSection.includes('stroke="currentColor"')) {
  failures.push('projects section more link must use real arrowRightSmall icon, not chevron stroke icon')
}

if (!app.includes('Copilot')) {
  failures.push('prototype must mount the offline Copilot surface globally')
}

for (const previewToken of ['stage-frame', 'selected-sprite', 'ProjectRunner']) {
  if (!editorPreviewPanel.includes(previewToken)) {
    failures.push(`editor PreviewPanel must own preview functionality token: ${previewToken}`)
  }
}

for (const flipToken of [
  'switchSelectedSpriteDirection',
  '@click.stop="ctx.switchSelectedSpriteDirection',
  'Set direction left',
  'Set direction right',
  'getStageSpriteImageStyle',
  ':style="ctx.selectedSpriteImageStyle"',
  '<span v-if="ctx.selectedSprite != null" class="coordinate">{{ ctx.selectedSpriteCoordinate }}</span>',
  'transform: translateX(-50%);'
]) {
  if (!editorPreviewSurface.includes(flipToken)) {
    failures.push(`editor selected sprite side handles must switch left/right direction token: ${flipToken}`)
  }
}

for (const apiDragToken of [
  "const ddiDragFormat = 'application/builder-definition-documentation-item'",
  'draggable="true"',
  '@dragstart="handleSnippetDragStart($event, item)"',
  '@dragover.prevent="handleCodeEditorDragOver"',
  '@drop.prevent="handleCodeEditorDrop"',
  'insertSnippetIntoCode'
]) {
  if (!editorPage.includes(apiDragToken)) {
    failures.push(`editor API Reference snippets must support drag-and-drop insertion token: ${apiDragToken}`)
  }
}

for (const resizeToken of [
  'snippetSidebarWidth',
  'snippetResizeHandleRef',
  'startSnippetSidebarResize',
  'Resize API Reference sidebar',
  'grid-template-columns: 60px var(--prototype-snippet-sidebar-width) minmax(0, 1fr)'
]) {
  if (!editorPage.includes(resizeToken)) {
    failures.push(`editor API Reference sidebar must support horizontal resizing token: ${resizeToken}`)
  }
}

if (!prototypeButton.includes("size === 'medium' && 'h-8 gap-1 px-4 text-[14px]/[22px]'")) {
  failures.push('prototype medium UIButton text must match spx-gui Format button typography at 14px/22px')
}

if (!editorPage.includes('.format-button {\n  margin-left: auto;\n  margin-bottom: 7px;\n  font-size: 14px;\n  line-height: 22px;')) {
  failures.push('editor Format button must render at 14px/22px like spx-gui UIButton medium')
}

if (
  !editorPage.includes(':title="costume.name"') ||
  !editorPage.includes(':title="animation.name"') ||
  !editorPage.includes(':title="backdrop.name"') ||
  !editorPage.includes(':title="sound.name"') ||
  !editorPage.includes(':title="widget.name"') ||
  !editorPage.includes('.editor-asset-item .asset-item-title {\n  width: 100%;\n  min-height: 16px;') ||
  !editorPage.includes('line-height: 16px;')
) {
  failures.push('editor asset item titles must use the shared non-clipped title treatment')
}

if (
  !editorPage.includes("id: 'niu-run'") ||
  !editorPage.includes("id: 'niu-idle'") ||
  !editorPage.includes("id: 'niu-jump'") ||
  !editorPage.includes("name: '待机'") ||
  !editorPage.includes("name: '跳跃'")
) {
  failures.push('niu-run prototype must show multiple local animations in the animation list')
}

for (const hoverToken of [
  'const apiHoverDocs',
  'function showCodeApiHover',
  'function getSnippetApiName',
  'class="code-hover-card"',
  'Listen to specific message broadcasted',
  'Listen to touching a specific sprite',
  '@mouseenter="showCodeApiHover($event, line[0])"',
  '@mouseenter="showCodeApiHover($event, getSnippetApiName(item))"',
  '@focus="showCodeApiHover($event, getSnippetApiName(item))"'
]) {
  if (!editorPage.includes(hoverToken)) {
    failures.push(`editor code API hover must show definition documentation token: ${hoverToken}`)
  }
}

for (const apiSpacingToken of [
  '.event-group {\n  min-width: 0;\n  border-bottom: 1px dashed var(--ui-color-grey-500);\n  padding-bottom: 20px;',
  '.event-group h3 {\n  position: sticky;\n  top: 0;\n  z-index: 1;\n  margin: 0;\n  padding: 12px 0;',
  '.event-snippet + .event-snippet {\n  margin-top: 8px;',
  'padding: 2px 6px 1px;'
]) {
  if (!editorPage.includes(apiSpacingToken)) {
    failures.push(`editor API Reference spacing must mirror spx-gui token: ${apiSpacingToken}`)
  }
}

if (
  !editorPage.includes("overflow-x: auto;") ||
  !editorPage.includes('max-width: 100%;\n  min-width: 100%;') ||
  !editorPage.includes('overflow: hidden;\n  text-overflow: ellipsis;') ||
  !editorPage.includes("{ text: ', => {}', type: 'operator' }") ||
  editorPage.includes("{ text: ',...', type: 'operator' }") ||
  editorPage.includes(`{ text: '"牛小...', type: 'string' }`) ||
  editorPage.includes(`{ text: '["牛...', type: 'string' }`) ||
  editorPage.includes(`{ text: '"p...', type: 'string' }`) ||
  editorPage.includes(`{ text: '"backdr...', type: 'string' }`)
) {
  failures.push('editor API Reference snippets must keep full text and let CSS ellipsize only on actual overflow')
}

if (
  !editorPage.includes('assetPendingRename') ||
  !editorPage.includes('startAssetRename') ||
  !editorPage.includes('submitAssetRename') ||
  !editorPage.includes("import UIFormModal from '@/components/ui/UIFormModal.vue'") ||
  !editorPage.includes('class="asset-detail-rename-trigger"') ||
  !editorPage.includes('function renameBackdrop(backdrop: AssetItem)') ||
  !editorPage.includes('function renameSound(sound: SoundItem)') ||
  !editorPage.includes('function renameWidget(widget: WidgetItem)') ||
  !editorPage.includes('function getAssetRenameTip(kind: AssetRenameKind)') ||
  !editorPage.includes('The ${kind} name should be non-empty string with length no longer than 100.') ||
  !editorPage.includes('<UIFormModal') ||
  !editorPage.includes('getAssetRenameTip(assetPendingRename.kind)') ||
  !editorPage.includes('.prototype-field-tip {\n  color: var(--ui-color-hint-1);') ||
  !editorPage.includes('style="width: 512px"') ||
  editorPage.includes('<span>Name</span>') ||
  editorPage.includes('Use a unique name for this') ||
  editorPage.includes("window.prompt('Rename costume'") ||
  editorPage.includes("window.prompt('Rename animation'")
) {
  failures.push('editor asset Rename menu/header actions must open a local rename modal with spx-gui tip copy/color and without a visible key label or window.prompt')
}

if (
  !editorPage.includes('.animation-setting {\n  min-width: 118px;') ||
  !editorPage.includes('.animation-settings {\n  align-self: center;\n  display: flex;\n  align-items: center;') ||
  !editorPage.includes('color: var(--ui-color-grey-900);')
) {
  failures.push('editor animation settings must stay horizontally arranged and use the spx-gui inactive text/icon color token')
}

if (
  !editorPage.includes("type AnimationSetting = 'duration' | 'binding' | 'sound'") ||
  !editorPage.includes('const activeAnimationSetting = ref<AnimationSetting | null>(null)') ||
  !editorPage.includes('function openAnimationSetting(setting: AnimationSetting)') ||
  !editorPage.includes('function confirmAnimationSetting()') ||
  !editorPage.includes('class="animation-setting-popover"') ||
  !editorPage.includes('aria-label="Animation duration"') ||
  !editorPage.includes("import animationStateDefaultIcon from '@/assets/editor/animation-state/default.svg?raw'") ||
  !editorPage.includes("import animationStateStepIcon from '@/assets/editor/animation-state/step.svg?raw'") ||
  !editorPage.includes("import animationStateDieIcon from '@/assets/editor/animation-state/die.svg?raw'") ||
  !editorPage.includes('const animationBoundStateOptions = [') ||
  !editorPage.includes('v-for="state in animationBoundStateOptions"') ||
  !editorPage.includes('v-html="state.icon"') ||
  !editorPage.includes('.bound-state-icon {\n  width: 56px;\n  height: 56px;') ||
  !editorPage.includes('toggleAnimationBoundState(state.id)') ||
  !editorPage.includes('selectAnimationSound(sound.id)') ||
  !editorPage.includes('.animation-bound-state-editor {\n  overflow: visible;\n}')
) {
  failures.push('editor animation settings must support local duration, binding, and sound editing popovers')
}

if (
  !editorAnimationStateDefaultIcon.includes('<svg width="56" height="56"') ||
  !editorAnimationStateStepIcon.includes('<svg width="56" height="56"') ||
  !editorAnimationStateDieIcon.includes('<svg width="56" height="56"') ||
  editorAnimationStateDefaultIcon === editorAnimationStateStepIcon ||
  editorAnimationStateDefaultIcon === editorAnimationStateDieIcon ||
  editorAnimationStateStepIcon === editorAnimationStateDieIcon
) {
  failures.push('editor animation binding popover must use distinct local spx-gui state icons for Default, Step, and Die')
}

if (copilot.includes('const isOpen = ref(true)')) {
  failures.push('offline Copilot must default to collapsed so it does not cover editor panels')
}

if (
  projectRunner.includes('<iframe') ||
  projectRunner.includes('initEngine') ||
  projectRunner.includes('loadProjectFiles') ||
  projectRunner.includes('fetch(') ||
  projectRunner.includes('spx_2.0.0') ||
  projectRunner.includes('fflate')
) {
  failures.push('project runner must be a static offline placeholder, not a copied SPX runtime')
}

if (
  !projectRunner.includes("const state = ref<'initial' | 'loading' | 'running'>('initial')") ||
  !projectRunner.includes('const loading = computed(() => state.value === \'loading\')') ||
  !projectRunner.includes('window.setTimeout') ||
  !projectRunner.includes(':loading="loading"') ||
  !prototypeButton.includes("import loadingIcon from '@/assets/editor/ui-icons/loading.svg?raw'") ||
  !prototypeButton.includes('loading?: boolean') ||
  !prototypeButton.includes('v-if="loading"') ||
  !prototypeButton.includes('animate-spin') ||
  !editorLoadingIcon.includes('M6.99975 1.74999')
) {
  failures.push('project runner Run button must expose a local UIButton loading animation before running')
}

if (copilot.includes('const panelHeight =')) {
  failures.push('copilot drag clamp must not compute unused panelHeight on every move')
}

if (!copilot.includes('let resizeTimer') || !copilot.includes('setTimeout(persistPanelPosition, 100)')) {
  failures.push('copilot resize persistence must be debounced')
}

if (
  !copilot.includes("const panelState = ref<'left' | 'right'>('right')") ||
  !copilot.includes("handleDragStart(targetName: 'trigger' | 'panel', event: PointerEvent)") ||
  !copilot.includes("panelState.value = event.clientX < window.innerWidth / 2 ? 'left' : 'right'") ||
  !copilot.includes('class="copilot-trigger visible group') ||
  !copilot.includes("@pointerdown.prevent=\"handleDragStart('trigger', $event)\"") ||
  !copilot.includes("@pointerdown.prevent=\"handleDragStart('panel', $event)\"") ||
  !copilot.includes("-translate-x-full") ||
  !copilot.includes('translate-x-full') ||
  !copilot.includes("h-[62px]") ||
  !copilot.includes("bg-[linear-gradient(90deg,#c390ff_0%,#72bbff_100%)]") ||
  copilot.includes('<style scoped>') ||
  copilot.includes('.copilot-panel.closed .footer-wrapper') ||
  copilot.includes('width: 64px') ||
  copilot.includes('height: 64px')
) {
  failures.push('copilot launcher must use Tailwind utilities and mirror the real side-attached trigger')
}

if (/if \(normalized === ''\) return projects\s*(?:\n|;)/.test(communityApi)) {
  failures.push('empty community search must return a defensive copy of mock projects')
}

if (communityApi.includes('Math.max(4, offset + 4)')) {
  failures.push('user likes pagination must clamp missing users before slicing')
}

if (!/function handleKeydown\(event: KeyboardEvent\) \{\s*if \(event\.key === 'Escape'\) \{\s*closeProjectMenu\(\)/.test(navbar)) {
  failures.push('community navbar Escape handler must close the project menu')
}

if (centeredWrapper.includes('w-310') || centeredWrapper.includes('w-247')) {
  failures.push('centered wrapper must use explicit arbitrary width classes instead of undefined numeric widths')
}

if (!styles.includes('--ui-font-size-lg: 15px;')) {
  failures.push('prototype typography tokens must mirror real frontend lg size at 15px')
}

for (const localProject of ['weathergggg', 'niu-run']) {
  if (!mockData.includes(`name: '${localProject}'`)) {
    failures.push(`mock data must register local project: ${localProject}`)
  }
}

if (editorPage.includes('Inspector') || editorPage.includes('Editor sprite prototype surface')) {
  failures.push('editor page must mirror the real dev editor, not the old simplified inspector prototype')
}

if (!editorPage.includes("back.svg?raw") || quickConfigBackIcon.includes('M15 18l-6-6')) {
  failures.push('editor quick config back control must use the real back icon asset')
}

if (!editorPage.includes("import UIButton from '@/components/ui/UIButton.vue'") || !editorPage.includes('<UIButton') || editorPage.includes('class="format-button" type="button"')) {
  failures.push('editor format action must use the prototype UI Button component')
}

if (
  !editorPage.includes("import UITag from '@/components/ui/UITag.vue'") ||
  !editorPage.includes('<UITag') ||
  editorPage.includes('project-menu-badge') ||
  editorPage.includes('.profile-menu-item span + span')
) {
  failures.push('editor labels must use the prototype UI Tag component instead of ad-hoc label styles')
}

if (!prototypeTag.includes('--ui-color-grey-900') || !prototypeTag.includes('--ui-color-grey-300') || !prototypeTag.includes('--ui-color-grey-400')) {
  failures.push('prototype tag must mirror the real default tag grey tokens')
}

if (
  !editorPage.includes("import UITabs from '@/components/ui/UITabs.vue'") ||
  !editorPage.includes("import UITab from '@/components/ui/UITab.vue'") ||
  !editorPage.includes('<UITabs') ||
  !editorPage.includes('code-tabs flex h-[47px] items-end overflow-hidden') ||
  !editorPage.includes('class="h-full flex-1 gap-6"') ||
  !editorPage.includes('<UITab value="costumes">Costumes</UITab>') ||
  editorPage.includes('class="tab" :class') ||
  !prototypeTab.includes('h-full min-w-0') ||
  !prototypeTab.includes('overflow-hidden') ||
  !prototypeTab.includes('whitespace-nowrap') ||
  !read('src/components/ui/UITabs.vue').includes('m-0 flex min-w-0 list-none overflow-hidden') ||
  !prototypeTab.includes('text-xl/8') ||
  !prototypeTab.includes('text-grey-800 hover:text-grey-1000') ||
  !prototypeTab.includes('border-grey-1000 text-grey-1000')
) {
  failures.push('editor tabs must use the local prototype tab component mirroring UITab states and typography')
}

if (
  !editorPreviewSurface.includes("import UICardHeader from '@/components/ui/UICardHeader.vue'") ||
  !editorPreviewPanel.includes('<UICardHeader class="gap-3">') ||
  !editorPreviewPanel.includes('<div class="preview-title">Preview</div>') ||
  !editorPage.includes('<UICardHeader class="asset-header justify-between">') ||
  !editorPage.includes('<UICardHeader class="stage-panel-header justify-center">Stage</UICardHeader>') ||
  !editorPage.includes('<UICardHeader class="map-card-header justify-between">') ||
  !prototypeCardHeader.includes('h-12 items-center border-b border-grey-400 px-3 text-xl text-title') ||
  editorPage.includes('.panel-header h2') ||
  editorPage.includes('.asset-header h2') ||
  editorPage.includes('.map-card-header h2')
) {
  failures.push('editor module headers must mirror UICardHeader typography with local UICardHeader and text-title tokens')
}

if (
  !editorPage.includes('.stage-thumb.active {') ||
  !editorPage.includes('background: var(--ui-color-primary-200);') ||
  !editorPage.includes('width: 56px;') ||
  !editorPage.includes('height: 56px;') ||
  !editorPage.includes('margin: 12px 0;') ||
  !editorPage.includes('width: 44px;') ||
  !editorPage.includes('height: 44px;') ||
  !editorPage.includes('.stage-thumb:hover:not(.active)') ||
  !editorPage.includes('<div class="stage-divider" aria-hidden="true"></div>') ||
  !editorPage.includes('.stage-divider {') ||
  !editorPage.includes('width: 40px;') ||
  !editorPage.includes('height: 1px;') ||
  !editorPage.includes('background: var(--ui-color-dividing-line-2);') ||
  !editorPage.includes('.stage-entry.active {\n  color: var(--ui-color-primary-main);') ||
  !editorPage.includes('.stage-entry:hover:not(.active)') ||
  !editorPage.includes('.stage-entry-icon {\n  width: 24px;\n  height: 24px;') ||
  editorPage.includes('.stage-entry.active {\n  color: var(--ui-color-grey-800);') ||
  editorPage.includes('.stage-entry:hover {\n  background: var(--ui-color-grey-300);')
) {
  failures.push('stage panel entries must mirror StagePanel transparent entry states and UIIcon sizing')
}

if (
  !editorPage.includes('class="editor-asset-item sound-asset-item"') ||
  !editorPage.includes('class="sound-wave-icon"') ||
  !editorPage.includes('class="asset-item-title" :title="sound.name"') ||
  !editorPage.includes('.editor-asset-item .asset-item-title') ||
  /\\.editor-asset-item\\s+span\\s*\\{/.test(editorPage)
) {
  failures.push('editor sound asset item must preserve the UIEditorSoundItem player size and scope text styles to the title only')
}

if (
  !editorPage.includes('type SoundEditState = {') ||
  !editorPage.includes('const selectedSoundEdit = computed') ||
  !editorPage.includes('const selectedSoundEditing = computed') ||
  !editorPage.includes('const selectedSoundDuration = computed') ||
  !editorPage.includes('function startSoundRangeDrag') ||
  !editorPage.includes('function updateSelectedSoundGain') ||
  !editorPage.includes('function resetSelectedSoundEdit') ||
  !editorPage.includes('function saveSelectedSoundEdit') ||
  !editorPage.includes('aria-label="Sound waveform trim editor"') ||
  !editorPage.includes('aria-label="Trim sound start"') ||
  !editorPage.includes('aria-label="Trim sound end"') ||
  !editorPage.includes('role="slider" aria-label="Sound volume"') ||
  !editorPage.includes('v-if="selectedSoundEditing" class="sound-edit-actions"') ||
  !editorPage.includes('>Cancel</UIButton>') ||
  !editorPage.includes('>Save</UIButton>') ||
  !editorPage.includes('--sound-range-left') ||
  !editorPage.includes('--sound-gain')
) {
  failures.push('editor sound detail must expose local waveform trim, volume editing, and Cancel/Save actions')
}

if (
  !editorPage.includes("import monitorWidgetIcon from '@/assets/editor/widget/monitor.svg?raw'") ||
  !editorPage.includes('class="editor-asset-item widget-asset-item"') ||
  !editorPage.includes('class="widget-icon" v-html="monitorWidgetIcon"') ||
  !editorPage.includes('class="asset-item-title" :title="widget.name"') ||
  !editorPage.includes('.widget-icon {\n  width: 40px;\n  height: 40px;') ||
  !editorPage.includes('margin: 10px 0 12px;') ||
  !editorPage.includes('.widget-icon :deep(svg) {\n  width: 100%;\n  height: 100%;') ||
  editorPage.includes('.widget-icon {\n  width: 44px;') ||
  /\\.widget-icon\\s*\\{[^}]*background: var\\(--ui-color-primary-100\\);/s.test(editorPage) ||
  !editorMonitorIcon.includes('M27.8989 5.90625')
) {
  failures.push('editor widget asset item must mirror UIEditorWidgetItem with the monitor icon and component icon sizing')
}

if (
  !editorPage.includes('category-rail flex flex-none flex-col gap-3 border-r border-grey-400 px-1 py-3') ||
  !editorPage.includes('category flex h-13 w-13 cursor-pointer flex-col items-center justify-center rounded-md') ||
  !editorPage.includes('text-center text-[10px]/4') ||
  !editorPage.includes("category-icons/event.svg?raw") ||
  !editorPage.includes('v-html="category.icon"') ||
  !editorPage.includes("'bg-grey-400 text-grey-1000'") ||
  !editorPage.includes("'bg-transparent text-grey-800 hover:bg-grey-300'") ||
  editorPage.includes(':src="category.icon"') ||
  editorPage.includes('.category-rail {') ||
  editorPage.includes('.category.active')
) {
  failures.push('editor code category rail must mirror APIReferenceUI spacing and states with Tailwind utilities')
}

if (
  !editorPage.includes("function: 'text-[#b08a01]'") ||
  !editorPage.includes("identifier: 'text-[#0774cd]'") ||
  !editorPage.includes("number: 'text-[#139707]'") ||
  !editorPage.includes("string: 'text-[#9c2c2c]'") ||
  !editorPage.includes("keyword: 'text-[#892ba8]'") ||
  !editorPage.includes("getSourceParts(line[1])") ||
  editorPage.includes("class=\"token-") ||
  editorPage.includes("`token-${part.type}`") ||
  editorPage.includes("{ text: 'KeyA', type: 'custom' }")
) {
  failures.push('editor code snippets must follow the local XBuilder code theme mapping instead of ad-hoc token classes')
}

if (
  !editorPage.includes('function startSnippetHorizontalDrag(event: PointerEvent)') ||
  !editorPage.includes('function moveSnippetHorizontalDrag(event: PointerEvent)') ||
  !editorPage.includes('function endSnippetHorizontalDrag(event: PointerEvent)') ||
  (editorPage.match(/@pointerdown="startSnippetHorizontalDrag"/g) ?? []).length < 2 ||
  !editorPage.includes('overflow-x: auto;') ||
  !editorPage.includes('scrollbar-width: none;') ||
  !editorPage.includes('.events-list::-webkit-scrollbar') ||
  !editorPage.includes('min-width: 0;') ||
  !editorPage.includes('width: max-content;') ||
  !editorPage.includes('max-width: 100%;') ||
  !editorPage.includes('text-overflow: ellipsis;')
) {
  failures.push('editor snippets panel must keep full snippet text and ellipsize only when it overflows the current container')
}

if (
  !editorPage.includes('.editor-navbar') ||
  !editorPage.includes('background: inherit;') ||
  editorPage.includes('.editor-navbar {\n  height: 56px;\n  display: grid;\n  grid-template-columns: minmax(210px, 1fr) auto minmax(210px, 1fr);\n  align-items: center;\n  background: inherit;\n  border-bottom:')
) {
  failures.push('editor navbar must inherit page background without a bottom border')
}

if (
  !editorPage.includes('<Teleport to="body">') ||
  !editorPage.includes('spriteMenuPosition') ||
  !editorPage.includes('position: fixed;') ||
  !editorPage.includes('toggleSpriteVisibility') ||
  !editorPage.includes('duplicateSprite') ||
  !editorPage.includes('removeSprite')
) {
  failures.push('editor sprite options dropdown must escape panel clipping and keep local menu actions')
}

if (!editorPage.includes('grid-template-columns: repeat(4, 88px);') || !editorPage.includes('grid-auto-rows: 88px;')) {
  failures.push('editor sprites panel must keep fixed 4-column sprite item rows')
}

if (
  !editorPage.includes("import SpriteItem from '@/components/editor/SpriteItem.vue'") ||
  (editorPage.match(/<SpriteItem/g) ?? []).length < 2 ||
  editorPage.includes('class="sprite-card"') ||
  !prototypeSpriteItem.includes("import UIEditorSpriteItem from '@/components/editor/UIEditorSpriteItem.vue'") ||
  !prototypeSpriteItem.includes('<UIEditorSpriteItem') ||
  prototypeSpriteItem.includes("import eyeOffIcon from '@/assets/editor/ui-icons/eye-off.svg?raw'")
) {
  failures.push('editor and map sprite lists must share the prototype sprite item component and reuse UIEditorSpriteItem')
}

if (
  !editorPage.includes('.map-sprite-config') ||
  !editorPage.includes('position: absolute;') ||
  !editorPage.includes('bottom: 0;') ||
  !editorPage.includes('box-shadow: 0 -12px 24px')
) {
  failures.push('map sprite config must render as an overlay drawer above the sprite list')
}

if (
  !editorPage.includes('.map-config-name') ||
  !editorPage.includes('font-size: 14px;') ||
  !editorPage.includes('font-weight: 400;') ||
  !editorPage.includes('line-height: 22px;')
) {
  failures.push('map sprite config name must match frontend AssetName typography at 14px/400')
}

if (
  !prototypeButtonGroup.includes('ui-button-group') ||
  !prototypeButtonGroup.includes('provide(selectedValueInjectionKey') ||
  !prototypeButtonGroupItem.includes('ui-button-group-item') ||
  !prototypeButtonGroupItem.includes('aria-pressed') ||
  !prototypeCheckbox.includes('class="ui-checkbox"') ||
  !prototypeCheckbox.includes('class="box"') ||
  !prototypeCheckbox.includes('M9.46967 2.46967') ||
  !prototypeCheckbox.includes('border: 1px solid var(--ui-color-grey-600);') ||
  !prototypeCheckbox.includes('background: var(--ui-color-primary-main);') ||
  !prototypeCheckboxGroup.includes('ui-checkbox-group') ||
  !editorPage.includes("import UIButtonGroup from '@/components/ui/UIButtonGroup.vue'") ||
  !editorPage.includes("import UIButtonGroupItem from '@/components/ui/UIButtonGroupItem.vue'") ||
  !editorPage.includes("import UICheckbox from '@/components/ui/UICheckbox.vue'") ||
  !editorPage.includes("import UICheckboxGroup from '@/components/ui/UICheckboxGroup.vue'") ||
  !editorPage.includes("import eyeIcon from '@/assets/editor/ui-icons/eye.svg?raw'") ||
  !editorPage.includes("import eyeSlashIcon from '@/assets/editor/ui-icons/eye-slash.svg?raw'") ||
  !editorEyeIcon.includes('M7.99857 3.12598') ||
  !editorEyeSlashIcon.includes('M1.4564 1.45775') ||
  !editorPage.includes('<UIButtonGroup') ||
  !editorPage.includes('<UIButtonGroupItem value="normal"') ||
  !editorPage.includes('<UIButtonGroupItem value="visible" aria-label="Show sprite">') ||
  !editorPage.includes('<UIButtonGroupItem value="hidden" aria-label="Hide sprite">') ||
  !editorPage.includes('Map sprite rotation style') ||
  !editorPage.includes('Map sprite visibility') ||
  !editorPage.includes('<UICheckboxGroup class="map-checkbox-group"') ||
  !editorPage.includes('<UICheckbox class="map-checkbox" value="Collision"') ||
  editorPage.includes('class="map-button-group-item"') ||
  editorPage.includes('Visible\n                </UIButtonGroupItem>') ||
  editorPage.includes('Hidden\n                </UIButtonGroupItem>') ||
  editorPage.includes('<button type="button">Normal</button>') ||
  editorPage.includes('<button type="button">Visible</button>') ||
  editorPage.includes('<button type="button">No physics</button>')
) {
  failures.push('map sprite basic config must use local UIButtonGroup tab controls and checkboxes')
}

if (
  !editorPage.includes('<span class="project-name-edit-icon" v-html="editIcon"></span>') ||
  editorPage.includes('✎') ||
  !editorPage.includes('.map-config-icon.collapse :deep(svg)') ||
  !editorPage.includes("import arrowDownIcon from '@/assets/editor/ui-icons/arrow-down.svg?raw'") ||
  !editorPage.includes('aria-label="Collapse global config" v-html="arrowDownIcon"') ||
  !editorPage.includes('aria-label="Collapse sprite config" @click="mapSpriteConfigExpanded = false" v-html="arrowDownIcon"') ||
  !editorArrowDownIcon.includes('M7.13182 10.2639') ||
  editorPage.includes('.map-config-icon svg {\n  width: 16px;\n  height: 16px;\n  fill: none;')
) {
  failures.push('editor edit icons must use the component-library edit SVG without ad-hoc stroke styling')
}

if (
  !editorPage.includes("import settingTimerIcon from '@/assets/editor/ui-icons/timer.svg?raw'") ||
  !editorPage.includes("import settingStatusIcon from '@/assets/editor/ui-icons/status.svg?raw'") ||
  !editorPage.includes("import settingSoundIcon from '@/assets/editor/ui-icons/sound.svg?raw'") ||
  !editorPage.includes('<span class="setting-icon" v-html="settingTimerIcon"></span>') ||
  !editorPage.includes('<span class="setting-icon" v-html="settingStatusIcon"></span>') ||
  !editorPage.includes('<span class="setting-icon" v-html="settingSoundIcon"></span>') ||
  !editorPage.includes('color: currentColor;') ||
  !editorTimerIcon.includes('M5.49996 2') ||
  !editorStatusIcon.includes('M14.9163 11.0909') ||
  !editorSoundIcon.includes('M6.66665 14.6666') ||
  /[◷●♪⌄▣]/.test(editorPage)
) {
  failures.push('editor animation and panel icons must use copied UIIcon SVG assets with component token sizing and color')
}

if (
  !editorPage.includes("import plusIcon from '@/assets/editor/ui-icons/plus.svg?raw'") ||
  !editorPage.includes('<span aria-hidden="true" v-html="plusIcon"></span>') ||
  !editorPage.includes('.asset-header button > span,\n.asset-header button > span :deep(svg)') ||
  !editorPage.includes('color: var(--ui-color-grey-800);') ||
  !editorPage.includes('.asset-header button:active') ||
  !editorPage.includes('background: var(--ui-color-grey-500);') ||
  !editorPage.includes('.asset-header button:focus-visible') ||
  !editorPlusIcon.includes('M12 2.125C12.4832 2.125') ||
  editorPage.includes('aria-label="Add sprite"\n                  :aria-expanded="addSpriteMenuOpen"\n                  aria-haspopup="menu"\n                  @click.stop="toggleAddSpriteMenu"\n                >\n                  +')
) {
  failures.push('editor add sprite trigger must use the copied UIIcon plus asset with PanelHeader icon button states')
}

if (
  !editorPage.includes("import publishActionIcon from '@/assets/editor/ui-icons/publish.svg?raw'") ||
  !editorPreviewSurface.includes('<span class="preview-button-icon" aria-hidden="true" v-html="ctx.publishActionIcon"></span>') ||
  !editorPreviewSurface.includes('@click="ctx.openPublishModal"') ||
  !editorPreviewPanel.includes('.preview-button-icon,\n.preview-button-icon :deep(svg),\n.preview-button-icon svg') ||
  !editorPreviewPanel.includes('width: 16px;\n  height: 16px;') ||
  !editorPublishIcon.includes('M12.0458 1.81972') ||
  editorPage.includes('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7 18-4-8-8-4 19-6Z" /></svg>')
) {
  failures.push('editor publish action must use the copied UIIcon publish asset without hand-drawn stroke SVG')
}

if (
  !editorPage.includes("import PublishProjectModal from '@/components/editor/PublishProjectModal.vue'") ||
  !editorPage.includes('const publishModalOpen = ref(false)') ||
  !editorPage.includes('const publishSubmitting = ref(false)') ||
  !editorPage.includes('function openPublishModal()') ||
  !editorPage.includes('function submitPublishProject()') ||
  !editorPage.includes("action: openPublishModal") ||
  !editorPage.includes('<PublishProjectModal') ||
  !editorPage.includes('@publish="submitPublishProject"') ||
  !publishProjectModal.includes("import UIFormModal from '@/components/ui/UIFormModal.vue'") ||
  !publishProjectModal.includes('<UIFormModal') ||
  !publishProjectModal.includes(':title="`Publish ${projectDisplayName}`"') ||
  !publishProjectModal.includes('aria-label="Release description"') ||
  !publishProjectModal.includes('aria-label="Project description"') ||
  !publishProjectModal.includes('aria-label="Play instructions"') ||
  !publishProjectModal.includes(':loading="submitting"') ||
  !editorPreviewSurface.includes('class="publish-toast" role="status"') ||
  !publishProjectModal.includes('Published projects will be visible to all XBuilder users.') ||
  !publishProjectModal.includes('.publish-modal {') ||
  !publishProjectModal.includes('.publish-preview {')
) {
  failures.push('editor publish action must open a local project publish modal and complete with feedback')
}

if (
  !editorPage.includes('const addAnimationMenuOpen = ref(false)') ||
  !editorPage.includes('function toggleAddAnimationMenu(event: MouseEvent)') ||
  !editorPage.includes('function handleGroupCostumesAsAnimation()') ||
  !editorPage.includes('class="animation-add-menu"') ||
  !editorPage.includes('Group costumes as animation') ||
  !editorPage.includes('@click.stop="toggleAddAnimationMenu"') ||
  !editorPage.includes('role="menuitem" @click="handleGroupCostumesAsAnimation"') ||
  !editorPage.includes('.animation-add-menu {') ||
  !editorPage.includes("target.closest('.animation-add-menu')")
) {
  failures.push('editor add animation button must expose the real add-options menu and trigger group-costumes behavior')
}

if (
  !editorPage.includes('.project-menu,\n.profile-menu,\n.animation-add-menu,\n.asset-add-menu,\n.animation-options-menu,\n.asset-options-menu,\n.quick-layer-menu,\n.add-sprite-menu,\n.sprite-options-menu') ||
  !editorPage.includes('box-shadow: var(--ui-box-shadow-sm);') ||
  !editorPage.includes('overflow: hidden;') ||
  !editorPage.includes('.project-menu-item,\n.profile-menu-user,\n.profile-menu-item,\n.animation-add-menu-item,\n.asset-add-menu-item,\n.animation-options-item,\n.asset-options-item,\n.quick-layer-menu button,\n.asset-header .add-sprite-menu-item,\n.map-card-header .add-sprite-menu-item,\n.sprite-options-item') ||
  !editorPage.includes('padding: 8px 40px 8px 8px;') ||
  !editorPage.includes('margin-top: 13px;') ||
  !editorPage.includes('border-top: 1px solid var(--ui-color-dividing-line-2);') ||
  editorPage.includes('box-shadow: var(--ui-box-shadow-md);\n}\n\n.hidden-mark')
) {
  failures.push('editor dropdown menus must share the local UIMenu/UIMenuItem style contract')
}

if (
  !editorPage.includes('const animationMenuOpenFor = ref<string | null>(null)') ||
  !editorPage.includes('const animationPendingRemoval = ref<AssetItem | null>(null)') ||
  !editorPage.includes('function toggleAnimationMenu(animationId: string, event: MouseEvent)') ||
  !editorPage.includes('function duplicateAnimation(animation: AssetItem)') ||
  !editorPage.includes('function renameAnimation(animation: AssetItem)') ||
  !editorPage.includes('function requestRemoveAnimation(animation: AssetItem)') ||
  !editorPage.includes('function confirmRemoveAnimation()') ||
  !editorPage.includes('class="animation-options-menu"') ||
  !editorPage.includes('Duplicate') ||
  !editorPage.includes('Rename') ||
  !editorPage.includes('Remove') ||
  !editorPage.includes('aria-label="Animation options"') ||
  !editorPage.includes('title="Remove animation"') ||
  !editorPage.includes('style="width: 560px"') ||
  !editorPage.includes('Preserve (the costumes will be moved to the sprite') ||
  !editorPage.includes('@click="renameAnimation(selectedAnimation)"') ||
  !editorPage.includes(':aria-label="`Rename animation ${selectedAnimation.name}`"')
) {
  failures.push('editor animation list items must support duplicate, rename, and remove through the local item menu')
}

if (
  !editorPage.includes('const addCostumeMenuOpen = ref(false)') ||
  !editorPage.includes('const costumeMenuOpenFor = ref<string | null>(null)') ||
  !editorPage.includes('function toggleAddCostumeMenu(event: MouseEvent)') ||
  !editorPage.includes('function addCostumeFromLocalFile()') ||
  !editorPage.includes('function toggleCostumeMenu(costumeId: string, event: MouseEvent)') ||
  !editorPage.includes('function duplicateCostume(costume: AssetItem)') ||
  !editorPage.includes('function renameCostume(costume: AssetItem)') ||
  !editorPage.includes('function removeCostume(costume: AssetItem)') ||
  !editorPage.includes('class="costume-options-menu asset-options-menu"') ||
  !editorPage.includes('aria-label="Costume options"') ||
  !editorPage.includes('Select local file') ||
  !editorPage.includes(':disabled="costumes.length <= 1"') ||
  !editorPage.includes('@click="renameCostume(selectedCostume)"') ||
  !editorPage.includes(':aria-label="`Rename costume ${selectedCostume.name}`"') ||
  !editorPage.includes("target.closest('.costume-options-menu')") ||
  !editorPage.includes("target.closest('.costume-add-menu')")
) {
  failures.push('editor costume list must support add-options plus duplicate, rename, and guarded remove actions')
}

if (
  !editorPage.includes('const spritePendingRename = ref<SpriteCard | null>(null)') ||
  !editorPage.includes('const draftSpriteRenameName = ref') ||
  !editorPage.includes('const spriteRenameError = ref') ||
  !editorPage.includes('async function renameSprite(sprite: SpriteCard)') ||
  !editorPage.includes('function submitSpriteRename()') ||
  !editorPage.includes('title="Rename"') ||
  !editorPage.includes('style="width: 512px"') ||
  !editorPage.includes('aria-label="Sprite name"') ||
  !editorPage.includes('The sprite name can only contain letters, digits, and the character _.') ||
  !editorPage.includes('A sprite with this name already exists.') ||
  editorPage.includes('<span>Name</span>') ||
  editorPage.includes('Use letters, numbers, spaces, hyphens, or underscores.') ||
  editorPage.includes("window.prompt('Rename sprite'")
) {
  failures.push('editor sprite rename action must use the local rename modal with spx-gui tip copy and without a visible key label or browser prompt')
}

if (
  !prototypeModal.includes('export type ModalSize') ||
  !prototypeModal.includes('role="dialog"') ||
  !prototypeModal.includes('aria-modal="true"') ||
  !prototypeModal.includes('class="ui-modal-mask"') ||
  !prototypeModal.includes('class="ui-modal-surface"') ||
  !prototypeModal.includes('.ui-modal-enter-active') ||
  !prototypeModal.includes('transform: scale(0.5);') ||
  !prototypeModal.includes("emit('update:visible', false)") ||
  !prototypeModalClose.includes("import closeIcon from '@/assets/editor/ui-icons/close.svg?raw'") ||
  !prototypeFormModal.includes('import UIModal from') ||
  !prototypeFormModal.includes('import UIModalClose from') ||
  !prototypeFormModal.includes('class="ui-form-modal-header"') ||
  !prototypeFormModal.includes('class="ui-form-modal-divider"') ||
  !prototypeFormModal.includes('class="ui-form-modal-body"')
) {
  failures.push('prototype modal components must locally mirror the spx-gui UIModal/UIFormModal structure')
}

if (
  prototypeBlockItem.includes('<button') ||
  !prototypeBlockItem.includes('<div') ||
  !prototypeBlockItem.includes('.ui-block-item-active::before') ||
  !prototypeBlockItem.includes('border-width: 2px;')
) {
  failures.push('prototype UIBlockItem must mirror the real block item root and keep a 2px active pseudo-border')
}

if (
  !prototypeBlockItemTitle.includes('w-full') ||
  !prototypeBlockItemTitle.includes('px-1.5') ||
  !prototypeEditorSpriteItem.includes('<UIBlockItemTitle class="gap-0.5 px-1"') ||
  prototypeEditorSpriteItem.includes('w-[76px]') ||
  prototypeEditorSpriteItem.includes('width: 76px') ||
  prototypeEditorSpriteItem.includes('width: calc(100% - 8px)') ||
  prototypeEditorSpriteItem.includes('px-0') ||
  prototypeEditorSpriteItem.includes('title="Invisible"')
) {
  failures.push('prototype UIEditorSpriteItem title row must use width 100% with 4px padding and no hidden-icon tooltip override')
}

if (
  !editorPage.includes("import SpriteGeneratorModal, { type SpriteGeneratorResult } from '@/components/editor/SpriteGeneratorModal.vue'") ||
  !editorPage.includes('const spriteGenModalOpen = ref(false)') ||
  !editorPage.includes('function openSpriteGenModal()') ||
  !editorPage.includes('function addGeneratedSprite(result: SpriteGeneratorResult)') ||
  !editorPage.includes('<SpriteGeneratorModal') ||
  !editorPage.includes('@add-sprite="addGeneratedSprite"') ||
  !editorPage.includes('@click="openSpriteGenModal"') ||
  !prototypeModal.includes('role="dialog"') ||
  !prototypeModal.includes('aria-modal="true"') ||
  !spriteGeneratorModal.includes('aria-labelledby="sprite-gen-title"') ||
  !spriteGeneratorModal.includes('Sprite Generator') ||
  !spriteGeneratorModal.includes('aria-label="Sprite description"') ||
  !spriteGeneratorModal.includes('Generated sprite candidates') ||
  !spriteGeneratorModal.includes('class="sprite-gen-body"') ||
  !spriteGeneratorModal.includes(":class=\"{ 'has-preview': generated }\"") ||
  !spriteGeneratorModal.includes('class="sprite-gen-main-panel"') ||
  !spriteGeneratorModal.includes('class="sprite-gen-preview-panel"') ||
  !spriteGeneratorModal.includes('Generated sprite content editor') ||
  !spriteGeneratorModal.includes('Costume') ||
  !spriteGeneratorModal.includes('Animation') ||
  !spriteGeneratorModal.includes('Minimize') ||
  !spriteGeneratorModal.includes('openParamMenu') ||
  !spriteGeneratorModal.includes('class="sprite-gen-param-menu"') ||
  !spriteGeneratorModal.includes('role="menuitemradio"') ||
  !spriteGeneratorModal.includes('height: 32px;') ||
  !spriteGeneratorModal.includes('width: 24px;') ||
  !spriteGeneratorModal.includes('height: 24px;') ||
  spriteGeneratorModal.includes('<select') ||
  spriteGeneratorModal.includes('Generated sprite candidates will appear here.') ||
  !spriteGeneratorModal.includes("import UIModal from '@/components/ui/UIModal.vue'") ||
  !spriteGeneratorModal.includes("import UIModalClose from '@/components/ui/UIModalClose.vue'") ||
  !spriteGeneratorModal.includes('<UIModal') ||
  !spriteGeneratorModal.includes('class="sprite-gen-modal"') ||
  !spriteGeneratorModal.includes('style="width: 1076px; height: 800px"') ||
  !spriteGeneratorModal.includes('selectedIndex') ||
  editorPage.includes("addLocalSprite('ai')")
) {
  failures.push('editor Generate with AI menu item must open a local sprite generator modal and add a generated sprite')
}

if (
  !editorPreviewSurface.includes("activeQuickConfig === 'position'") ||
  !editorPreviewSurface.includes('X position input') ||
  !editorPreviewSurface.includes('Y position input') ||
  !editorPreviewSurface.includes('updateSelectedSpriteX') ||
  !editorPreviewSurface.includes('selectedSpriteCoordinate') ||
  !editorPreviewSurface.includes('getStageSpriteFrameStyle') ||
  !editorPreviewSurface.includes('startStageSpriteDrag') ||
  !editorPreviewSurface.includes('@pointerdown.stop.prevent="ctx.startStageSpriteDrag')
) {
  failures.push('editor sprite quick config must support coordinate display plus direct stage positioning and dragging')
}

if (
  !editorPage.includes('getMapSpriteFrameStyle') ||
  !editorPage.includes('selectedMapSpriteCoordinate') ||
  !editorPage.includes('updateSelectedMapSpriteX') ||
  !editorPage.includes('@pointerdown.stop.prevent="startMapSpriteDrag') ||
  !editorPage.includes('class="map-number-input"') ||
  !editorPage.includes('aria-label="X position"') ||
  !editorPage.includes('.map-config-grid label:focus-within') ||
  !editorPage.includes('.map-number-input span {\n  flex: 0 0 auto;') ||
  editorPage.includes('class="map-sprite-coordinate">-224, 74</span>') ||
  editorPage.includes('<label><span>X</span><input value="-224" readonly /></label>') ||
  editorPage.includes('.map-sprite-jaime {\n  left: 41%;') ||
  editorPage.includes('.map-sprite-kai {\n  left: 68%;')
) {
  failures.push('map editor sprite positions and coordinate controls must be data-driven with input-internal prefix keys')
}

if (
  !editorPreviewPanel.includes("ctx.activeQuickConfig === 'default' || ctx.activeQuickConfig === 'layer'") ||
  !editorPreviewPanel.includes('handleQuickConfigToolClick(tool)') ||
  !editorPreviewPanel.includes("ctx.activeQuickConfig !== 'default' && ctx.activeQuickConfig !== 'layer'") ||
  !editorPreviewSurface.includes("activeQuickConfig === 'layer'") ||
  !editorPreviewSurface.includes('Layer order options') ||
  !editorPreviewSurface.includes('moveSelectedSpriteLayer') ||
  !editorPreviewSurface.includes('Bring to front')
) {
  failures.push('editor sprite quick config must support layer order actions without replacing the other default quick-config entries')
}

if (
  !editorPreviewPanel.includes('.quick-layer-menu button + button {\n  margin-top: 13px;') ||
  !editorPreviewPanel.includes('.quick-layer-menu button + button::before') ||
  !editorPreviewPanel.includes('border-top: 1px solid var(--ui-color-dividing-line-2);')
) {
  failures.push('editor PreviewPanel layer order menu must keep UIMenuItem-style dividers between actions')
}

if (
  !editorPage.includes("import UICard from '@/components/ui/UICard.vue'") ||
  !editorPage.includes('<UICard class="map-card">') ||
  !editorPage.includes('<UICard class="map-card map-sprites-card">')
) {
  failures.push('editor map side cards must use the prototype card component instead of hand-rolled sections')
}

if (
  !editorPage.includes("zoom-in.svg?raw") ||
  !editorPage.includes("zoom-out.svg?raw") ||
  !editorPage.includes("zoom-reset.svg?raw") ||
  !editorPage.includes('zoomCodeEditor') ||
  editorPage.includes('>⌕<') ||
  editorPage.includes('>⌔<') ||
  editorPage.includes('>⊜<')
) {
  failures.push('editor code zoom controls must use real zoom icons and local zoom actions')
}

if (!codeZoomInIcon.includes('11.6667 8.54167H9.79167') || !codeZoomOutIcon.includes('11.6667 8.54167H6.66667') || !codeZoomResetIcon.includes('11.6667 7.29167H6.66667')) {
  failures.push('editor code zoom icon assets must mirror the real code editor zoom icons')
}

if (
  !editorPage.includes("close-circle.svg?raw") ||
  !editorPage.includes('mainCodeDocumentTab') ||
  !editorPage.includes('tempCodeDocumentTabs') ||
  !editorPage.includes('openCodeDocumentTab') ||
  !editorPage.includes('Close temporary code previews') ||
  !editorPage.includes('code-document-tab active')
) {
  failures.push('editor code panel must include real document preview tabs above zoom controls')
}

if (!codeCloseCircleIcon.includes('M9.99984 1.0415') || !codeCloseCircleIcon.includes('fill="currentColor"')) {
  failures.push('editor code document close icon must mirror the real close-circle icon asset')
}

if (
  !editorPage.includes("import projectFileIcon from '@/assets/editor/navbar-icons/file.svg?raw'") ||
  !editorPage.includes("import arrowMiniIcon from '@/assets/navbar-icons/arrow-mini.svg?raw'") ||
  !editorPage.includes('class="project-file-icon"') ||
  !editorPage.includes('class="project-menu-arrow"') ||
  editorPage.includes('<span class="caret"></span>') ||
  !editorProjectFileIcon.includes('M6.6084 1.77051') ||
  !navbarArrowMiniIcon.includes('M5.66107 2.46085')
) {
  failures.push('editor project menu trigger must use the real file and arrowMini icons')
}

if (
  !editorPage.includes('.project-menu-trigger {\n  height: 100%;\n  width: auto;\n  padding: 0 12px;\n  color: var(--ui-color-grey-1000);') ||
  !editorPage.includes('.project-menu-trigger svg {\n  color: inherit;')
) {
  failures.push('editor project menu trigger icon color must use the real title token')
}

if (
  !editorPage.includes("import tutorialIcon from '@/assets/editor/navbar-icons/tutorial.svg?raw'") ||
  !editorPage.includes('to="/tutorials" aria-label="Tutorials"') ||
  !editorPage.includes('flex h-full items-center px-3 text-grey-1000 hover:bg-grey-400') ||
  !tutorialIcon.includes('M10.9023 2.19043')
) {
  failures.push('editor navbar must include the real tutorials entry after the project menu')
}

if (!editorPreviewPanel.includes('.stage-tools button') || !editorPreviewPanel.includes('color: var(--ui-color-grey-1000);')) {
  failures.push('editor quick config controls must use the real grey-1000 icon token')
}

if (!editorPreviewPanel.includes('.stage-tools button:hover') || !editorPreviewPanel.includes('color: var(--ui-color-turquoise-500);')) {
  failures.push('editor quick config controls must use the real hover icon token')
}

if (
  !transformerLeftRightIcon.includes('<svg') ||
  !transformerLeftRightIcon.includes('fill="currentColor"') ||
  !editorPreviewPanel.includes("import leftRightIcon from '@/assets/editor/custom-transformer/left-right.svg?raw'") ||
  !editorPreviewPanel.includes('class="handle left"') ||
  !editorPreviewPanel.includes('class="handle right"') ||
  !editorPreviewPanel.includes('ctx.switchSelectedSpriteDirection') ||
  !editorPreviewPanel.includes('class="handle-arrow"') ||
  !editorPreviewPanel.includes('class="handle-arrow disabled"') ||
  !editorPreviewPanel.includes('v-html="leftRightIcon"') ||
  !editorPreviewPanel.includes('width: 20px;') ||
  !editorPreviewPanel.includes('.selected-sprite .handle-arrow {') ||
  !editorPreviewPanel.includes("v-for=\"corner in ['top-left', 'top-right', 'bottom-left', 'bottom-right']\"") ||
  !editorPreviewPanel.includes('ctx.startSelectedSpriteResize(corner, $event)') ||
  !editorPreviewPanel.includes('ctx.moveSelectedSpriteResize') ||
  !editorPreviewPanel.includes('ctx.endSelectedSpriteResize') ||
  !editorPreviewPanel.includes('.corner.bottom-right') ||
  !editorPage.includes("type StageSpriteResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'") ||
  !editorPage.includes('function startSelectedSpriteResize') ||
  !editorPage.includes('function moveSelectedSpriteResize') ||
  !editorPage.includes("activeQuickConfig.value = 'size'")
) {
  failures.push('editor selected preview sprite must support four-corner drag resize')
}

if (
  !editorPreviewPanel.includes('<style scoped>') ||
  !editorPreviewPanel.includes('<UICardHeader class="gap-3">') ||
  !editorPreviewPanel.includes('class="preview-title"') ||
  !editorPreviewPanel.includes('type="primary" size="medium"') ||
  !editorPreviewPanel.includes('type="secondary" size="medium"') ||
  !editorPreviewPanel.includes('.preview-card {') ||
  !editorPreviewPanel.includes('.stage-frame {') ||
  !editorPreviewPanel.includes('height: 354px;') ||
  !editorPreviewPanel.includes('margin: 13px;') ||
  !editorPreviewPanel.includes('.stage-backdrop {') ||
  !editorPreviewPanel.includes('object-fit: cover;') ||
  !editorPreviewPanel.includes('.quick-config-input input {\n  width: 44px;') ||
  !editorPreviewPanel.includes('background: transparent;')
) {
  failures.push('editor PreviewPanel must own its scoped preview layout styles')
}

for (const editorToken of ['Code', 'Costumes', 'Animations', 'Preview', 'Sprites', 'Stage']) {
  if (!editorPage.includes(editorToken)) failures.push(`editor page must include real editor surface token: ${editorToken}`)
}

for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  const rel = relative(root, file)
  if (text.includes('spx-gui')) failures.push(`forbidden real frontend reference: ${rel}`)
  if (/\baxios\b/.test(text)) failures.push(`forbidden server call primitive: ${rel}`)
  if (/\bfetch\s*\(\s*['"`]https?:\/\//.test(text)) failures.push(`forbidden remote fetch call: ${rel}`)
  if (text.includes('@scalar/api-reference')) failures.push(`forbidden docs runtime reference: ${rel}`)
}

if (failures.length > 0) {
  console.error(`Prototype contract check failed with ${failures.length} issue(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Prototype contract check passed.')
