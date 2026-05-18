import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

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
const editorArrowDownIcon = read('src/assets/editor/ui-icons/arrow-down.svg')
const editorEyeOffIcon = read('src/assets/editor/ui-icons/eye-off.svg')
const projectRunner = read('src/components/project/PrototypeProjectRunner.vue')
const copilot = read('src/components/copilot/PrototypeCopilot.vue')
const communityApi = read('src/apis/community.ts')
const centeredWrapper = read('src/components/community/CenteredWrapper.vue')
const prototypeTag = read('src/components/ui/PrototypeTag.vue')
const prototypeTab = read('src/components/ui/PrototypeTab.vue')
const prototypeSpriteItem = read('src/components/editor/PrototypeSpriteItem.vue')
const prototypeCardHeader = read('src/components/ui/PrototypeCardHeader.vue')

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
  '/docs',
  'api/:pathMatch(.*)?',
  'ui-design',
  '/:pathMatch(.*)*'
]) {
  if (!router.includes(route)) failures.push(`missing route: ${route}`)
}

for (const requiredFile of [
  'src/apis/community.ts',
  'src/apis/project.ts',
  'src/apis/tutorials.ts',
  'src/assets/projects/weathergggg/Weathergggg.xbp',
  'src/assets/projects/weathergggg/thumbnail.jpg',
  'src/assets/projects/niu-run/niu-run.xbp',
  'src/assets/projects/niu-run/thumbnail.jpeg',
  'src/assets/editor/navbar-icons/tutorial.svg',
  'src/assets/editor/ui-icons/timer.svg',
  'src/assets/editor/ui-icons/status.svg',
  'src/assets/editor/ui-icons/sound.svg',
  'src/assets/editor/ui-icons/arrow-down.svg',
  'src/components/project/PrototypeProjectRunner.vue',
  'src/components/editor/PrototypeSpriteItem.vue',
  'src/components/ui/PrototypeCardHeader.vue',
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
  'src/pages/docs/api.vue',
  'src/pages/docs/ui-design/index.vue',
  'src/pages/tutorials/course-series.vue',
  'src/pages/tutorials/course-start.vue',
  'src/widgets/spx-runner/SpxRunner.ce.vue',
  'src/widgets/spx-runner/index.ts',
  'src/widgets/xgo-code-editor/XGoCodeEditor.ce.vue',
  'src/widgets/xgo-code-editor/index.ts'
]) {
  try {
    statSync(join(root, requiredFile))
  } catch {
    failures.push(`missing file: ${requiredFile}`)
  }
}

if (communityHome.includes('Build, play, and remix games') || communityHome.includes('ai-boy.png')) {
  failures.push('community home must mirror real community home, not render a standalone marketing hero')
}

for (const bannerToken of ['Join XBuilder', 'Build and share your projects', 'Join now', 'guest-banner-bg.png']) {
  if (!guestBanner.includes(bannerToken)) failures.push(`guest home banner must mirror real token: ${bannerToken}`)
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

if (!projectsSection.includes('link-primary flex items-center text-lg')) {
  failures.push('projects section more link must mirror real RouterUILink/link-primary styling')
}

if (projectsSection.includes('stroke="currentColor"')) {
  failures.push('projects section more link must use real arrowRightSmall icon, not chevron stroke icon')
}

if (!app.includes('PrototypeCopilot')) {
  failures.push('prototype must mount the offline Copilot surface globally')
}

if (copilot.includes('const isOpen = ref(true)')) {
  failures.push('offline Copilot must default to collapsed so it does not cover editor panels')
}

if (!projectRunner.includes('sandbox="allow-scripts allow-same-origin"')) {
  failures.push('project runner iframe must be sandboxed while preserving local runner script access')
}

if (projectRunner.includes("'engineres.zip'")) {
  failures.push('project runner assetURLs must not include the redundant engineres.zip alias')
}

if (!projectRunner.includes('let fflateLoadPromise')) {
  failures.push('project runner must share an in-flight fflate loader promise across concurrent runs')
}

if (!projectRunner.includes("engineInitialized = false\n    state.value = 'failed'")) {
  failures.push('project runner must reset engineInitialized when run fails')
}

if (!projectRunner.includes("engineInitialized = false\n  state.value = 'initial'")) {
  failures.push('project runner must reset engineInitialized after stop')
}

if (copilot.includes('const panelHeight =')) {
  failures.push('copilot drag clamp must not compute unused panelHeight on every move')
}

if (!copilot.includes('let resizeTimer') || !copilot.includes('setTimeout(persistPanelPosition, 100)')) {
  failures.push('copilot resize persistence must be debounced')
}

if (
  !copilot.includes("right: isOpen.value ? `${panelPosition.value.right}px` : '-340px'") ||
  !copilot.includes('class="copilot-trigger right visible group') ||
  !copilot.includes("-translate-x-full") ||
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
    failures.push(`mock data must register local xbp project: ${localProject}`)
  }
}

for (const expectedToken of ['projectFile', 'weatherggggProjectFile', 'niuRunProjectFile']) {
  if (!mockData.includes(expectedToken)) {
    failures.push(`mock data must expose local project asset token: ${expectedToken}`)
  }
}

if (editorPage.includes('Inspector') || editorPage.includes('Editor sprite prototype surface')) {
  failures.push('editor page must mirror the real dev editor, not the old simplified inspector prototype')
}

if (!editorPage.includes("back.svg?raw") || quickConfigBackIcon.includes('M15 18l-6-6')) {
  failures.push('editor quick config back control must use the real back icon asset')
}

if (!editorPage.includes("import PrototypeButton from '@/components/ui/PrototypeButton.vue'") || !editorPage.includes('<PrototypeButton') || editorPage.includes('class="format-button" type="button"')) {
  failures.push('editor format action must use the prototype UI Button component')
}

if (
  !editorPage.includes("import PrototypeTag from '@/components/ui/PrototypeTag.vue'") ||
  !editorPage.includes('<PrototypeTag') ||
  editorPage.includes('project-menu-badge') ||
  editorPage.includes('.profile-menu-item span + span')
) {
  failures.push('editor labels must use the prototype UI Tag component instead of ad-hoc label styles')
}

if (!prototypeTag.includes('--ui-color-grey-900') || !prototypeTag.includes('--ui-color-grey-300') || !prototypeTag.includes('--ui-color-grey-400')) {
  failures.push('prototype tag must mirror the real default tag grey tokens')
}

if (
  !editorPage.includes("import PrototypeTabs from '@/components/ui/PrototypeTabs.vue'") ||
  !editorPage.includes("import PrototypeTab from '@/components/ui/PrototypeTab.vue'") ||
  !editorPage.includes('<PrototypeTabs') ||
  !editorPage.includes('<PrototypeTab value="costumes">Costumes</PrototypeTab>') ||
  editorPage.includes('class="tab" :class') ||
  !prototypeTab.includes('text-xl/8') ||
  !prototypeTab.includes('text-grey-800 hover:text-grey-1000') ||
  !prototypeTab.includes('border-grey-1000 text-grey-1000')
) {
  failures.push('editor tabs must use the local prototype tab component mirroring UITab states and typography')
}

if (
  !editorPage.includes("import PrototypeCardHeader from '@/components/ui/PrototypeCardHeader.vue'") ||
  !editorPage.includes('<PrototypeCardHeader class="panel-header justify-between gap-3">') ||
  !editorPage.includes('<h2 class="m-0 flex-1 text-xl font-normal text-title">Preview</h2>') ||
  !editorPage.includes('<PrototypeCardHeader class="asset-header justify-between">') ||
  !editorPage.includes('<PrototypeCardHeader class="stage-panel-header justify-center">Stage</PrototypeCardHeader>') ||
  !editorPage.includes('<PrototypeCardHeader class="map-card-header justify-between">') ||
  !prototypeCardHeader.includes('h-12 items-center border-b border-grey-400 px-3 text-xl text-title') ||
  editorPage.includes('.panel-header h2') ||
  editorPage.includes('.asset-header h2') ||
  editorPage.includes('.map-card-header h2')
) {
  failures.push('editor module headers must mirror UICardHeader typography with local PrototypeCardHeader and text-title tokens')
}

if (
  !editorPage.includes('category-rail flex flex-none flex-col gap-3 border-r border-grey-400 px-1 py-3') ||
  !editorPage.includes('category flex h-13 w-13 cursor-pointer flex-col items-center justify-center rounded-md') ||
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

if (!editorPage.includes('.editor-navbar') || !editorPage.includes('background: var(--ui-color-grey-300);')) {
  failures.push('editor navbar must use the real grey-300 background token')
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
  !editorPage.includes("import PrototypeSpriteItem from '@/components/editor/PrototypeSpriteItem.vue'") ||
  (editorPage.match(/<PrototypeSpriteItem/g) ?? []).length < 2 ||
  editorPage.includes('class="sprite-card"') ||
  !prototypeSpriteItem.includes('.prototype-sprite-item.active::before') ||
  !prototypeSpriteItem.includes('width: 88px;') ||
  !prototypeSpriteItem.includes('height: 88px;')
) {
  failures.push('editor and map sprite lists must share the prototype sprite item component')
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
  !editorPage.includes('map-button-group') ||
  !editorPage.includes('Map sprite rotation style') ||
  !editorPage.includes('Map sprite visibility') ||
  !editorPage.includes('map-checkbox-group') ||
  editorPage.includes('<button type="button">Normal</button>') ||
  editorPage.includes('<button type="button">Visible</button>') ||
  editorPage.includes('<button type="button">No physics</button>')
) {
  failures.push('map sprite basic config must use component-library style button groups and checkboxes')
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
  !editorPage.includes('role="dialog" aria-modal="true" aria-labelledby="remove-animation-title"') ||
  !editorPage.includes('Preserve (the costumes will be moved to the sprite') ||
  !editorPage.includes('@click="renameAnimation(selectedAnimation)"')
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
  !editorPage.includes('role="dialog" aria-modal="true" aria-labelledby="rename-sprite-title"') ||
  !editorPage.includes('aria-label="Sprite name"') ||
  !editorPage.includes('A sprite with this name already exists.') ||
  editorPage.includes("window.prompt('Rename sprite'")
) {
  failures.push('editor sprite rename action must use the local rename modal instead of a browser prompt')
}

if (
  !prototypeSpriteItem.includes("import eyeOffIcon from '@/assets/editor/ui-icons/eye-off.svg?raw'") ||
  !prototypeSpriteItem.includes('v-html="eyeOffIcon"') ||
  !prototypeSpriteItem.includes('width: 16px;') ||
  !prototypeSpriteItem.includes('height: 16px;') ||
  !prototypeSpriteItem.includes('color: var(--ui-color-grey-700);') ||
  prototypeSpriteItem.includes('⌁') ||
  !editorEyeOffIcon.includes('M20.1133 7.53809')
) {
  failures.push('prototype sprite hidden state must use the copied UIIcon eyeOff asset at component icon size')
}

if (
  !editorPage.includes('const spriteGenModalOpen = ref(false)') ||
  !editorPage.includes('const spriteGenDescription = ref') ||
  !editorPage.includes('const generatedSpriteCandidates = [') ||
  !editorPage.includes('function openSpriteGenModal()') ||
  !editorPage.includes('function generateSpriteCandidates()') ||
  !editorPage.includes('function useGeneratedSprite()') ||
  !editorPage.includes('@click="openSpriteGenModal"') ||
  !editorPage.includes('role="dialog" aria-modal="true" aria-labelledby="sprite-gen-title"') ||
  !editorPage.includes('Sprite Generator') ||
  !editorPage.includes('aria-label="Sprite description"') ||
  !editorPage.includes('Generated sprite candidates') ||
  !editorPage.includes('selectedGeneratedSpriteIndex') ||
  editorPage.includes("addLocalSprite('ai')")
) {
  failures.push('editor Generate with AI menu item must open a local sprite generator modal and add a generated sprite')
}

if (
  !editorPage.includes("activeQuickConfig === 'position'") ||
  !editorPage.includes('X position input') ||
  !editorPage.includes('Y position input') ||
  !editorPage.includes('updateSelectedSpriteX') ||
  !editorPage.includes('selectedSpriteCoordinate')
) {
  failures.push('editor sprite quick config must support position editing and coordinate display')
}

if (
  !editorPage.includes("activeQuickConfig === 'layer'") ||
  !editorPage.includes('Layer order options') ||
  !editorPage.includes('moveSelectedSpriteLayer') ||
  !editorPage.includes('Bring to front')
) {
  failures.push('editor sprite quick config must support layer order actions')
}

if (
  !editorPage.includes("import PrototypeCard from '@/components/ui/PrototypeCard.vue'") ||
  !editorPage.includes('<PrototypeCard class="map-card">') ||
  !editorPage.includes('<PrototypeCard class="map-card map-sprites-card">')
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
  !editorPage.includes("import tutorialIcon from '@/assets/editor/navbar-icons/tutorial.svg?raw'") ||
  !editorPage.includes('to="/tutorials" aria-label="Tutorials"') ||
  !editorPage.includes('flex h-full items-center px-3 text-grey-1000 hover:bg-grey-400') ||
  !tutorialIcon.includes('M10.9023 2.19043')
) {
  failures.push('editor navbar must include the real tutorials entry after the project menu')
}

if (!editorPage.includes('.stage-tools button') || !editorPage.includes('color: var(--ui-color-grey-1000);')) {
  failures.push('editor quick config controls must use the real grey-1000 icon token')
}

if (!editorPage.includes('.stage-tools button:hover') || !editorPage.includes('color: var(--ui-color-turquoise-500);')) {
  failures.push('editor quick config controls must use the real hover icon token')
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
  if (text.includes('@scalar/api-reference')) failures.push(`docs page must use local static prototype content: ${rel}`)
}

if (failures.length > 0) {
  console.error(`Prototype contract check failed with ${failures.length} issue(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Prototype contract check passed.')
