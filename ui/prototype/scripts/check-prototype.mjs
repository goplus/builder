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
const guestBanner = read('src/components/community/home/GuestBanner.vue')
const navbar = read('src/components/community/CommunityNavbar.vue')
const projectsSection = read('src/components/community/ProjectsSection.vue')
const projectCard = read('src/components/project/ProjectCard.vue')
const app = read('src/App.vue')
const styles = read('src/styles/app.css')
const mockData = read('src/data/mock.ts')
const editorPage = read('src/pages/editor/index.vue')

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

if (projectCard.includes('remixes')) {
  failures.push('project card must mirror dev branch metadata and show updated time instead of remix count')
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

if (!read('src/components/copilot/PrototypeCopilot.vue').includes('const isOpen = ref(false)')) {
  failures.push('offline Copilot must default to collapsed so it does not cover editor panels')
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
