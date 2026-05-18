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
const projectRunner = read('src/components/project/PrototypeProjectRunner.vue')
const copilot = read('src/components/copilot/PrototypeCopilot.vue')
const communityApi = read('src/apis/community.ts')
const centeredWrapper = read('src/components/community/CenteredWrapper.vue')
const prototypeTag = read('src/components/ui/PrototypeTag.vue')

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
  'src/components/project/PrototypeProjectRunner.vue',
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

if (!copilot.includes('right: 16, bottom: 16') || !copilot.includes('width: 64px') || !copilot.includes('height: 64px')) {
  failures.push('copilot collapsed launcher must stay compact and inset from the viewport edge')
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
