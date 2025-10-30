import * as path from 'node:path'
import * as fs from 'node:fs'
import AdmZip from 'adm-zip'
import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'node:child_process'
import { mm, me, defineMainMethod, sendMainEvent } from './protocol'

const spxProjectPath = (
  app.isPackaged
  ? path.join(app.getPath('temp'), 'project')
  : path.join(__dirname, 'project')
)

const spxPath = app.isPackaged ? path.resolve(__dirname, '..', 'app.asar.unpacked', 'spx') : path.join(__dirname, 'spx')
const spxExecutablePath = path.join(spxPath, 'go', 'bin', process.platform === 'win32' ? 'spx.exe' : 'spx')

console.debug(`App is packaged: ${app.isPackaged}`)
console.debug(`SPX path: ${spxPath}`)
console.debug(`SPX executable path: ${spxExecutablePath}`)
console.debug(`SPX project path: ${spxProjectPath}`)

let spxProcess: ChildProcess | null = null
let spxAIInteractionAPIEndpoint = ''
let spxAIInteractionAPIToken = ''
let spxAIDescription = ''

async function unzipProject(buffer: ArrayBuffer) {
  if (fs.existsSync(spxProjectPath)) await fs.promises.rm(spxProjectPath, { recursive: true, force: true })
  await fs.promises.mkdir(spxProjectPath, { recursive: true })

  const zipBuffer = Buffer.from(buffer)
  const zip = new AdmZip(zipBuffer)
  zip.extractAllTo(spxProjectPath, true)
}

function spawnSpxProcess() {

  // 检查文件是否存在
  if (!fs.existsSync(spxExecutablePath)) {
    throw new Error(`SPX executable not found at ${spxExecutablePath}`)
  }
  
  const stat = fs.statSync(spxExecutablePath)
  console.debug(`isFile: ${stat.isFile()}, size: ${stat.size}, mode: ${stat.mode.toString(8)}`)
  
  // 在 Unix 系统上检查执行权限
  if (process.platform !== 'win32') {
    const hasExecutePermission = (stat.mode & parseInt('111', 8)) !== 0
    console.debug(`Has execute permission: ${hasExecutePermission}`)
  }

  const mingw64BinPath = path.join(spxPath, 'mingw64', 'bin')
  process.env.PATH = `${mingw64BinPath};${process.env.PATH}`

  return spawn(spxExecutablePath, [
    'run',
    '--ixgogen',
    '--goenv', spxPath,
    '--path', spxProjectPath,
    '--aipack', 'default'
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: spxProjectPath,
    detached: true,  // This creates a new process group
    env: {
      ...process.env,
      SPX_AI_ENDPOINT: spxAIInteractionAPIEndpoint,
      SPX_AI_TOKEN: spxAIInteractionAPIToken,
      SPX_AI_DESCRIPTION: spxAIDescription
    }
  })
}

async function startSpx(buffer: ArrayBuffer) {
  await unzipProject(buffer)

  spxProcess = spawnSpxProcess()
  console.debug(`Spawned SPX process with PID: ${spxProcess.pid}`)

  // Handle stdout (normal logs)
  spxProcess.stdout?.on('data', (data) => {
    const output = data.toString()
    sendMainEvent(mainWindow, me.console, 'log', output)
  })

  // Handle stderr (error logs)
  spxProcess.stderr?.on('data', (data) => {
    const output = data.toString()
    sendMainEvent(mainWindow, me.console, 'warn', output)
  })

  // Handle process exit
  spxProcess.on('exit', (maybeCode, maybeSignal) => {
    console.debug(`SPX process exited with code: ${maybeCode}, signal: ${maybeSignal}`)
    const code = maybeCode ?? 0
    if (code !== 0) sendMainEvent(mainWindow, me.gameError, `exited with code ${code}`)
    sendMainEvent(mainWindow, me.gameExit, code)
    spxProcess = null
  })

  // Handle process error
  spxProcess.on('error', (error) => {
    sendMainEvent(mainWindow, me.gameError, error.message)
  })
}

function stopSpx() {
  if (spxProcess == null || spxProcess.pid == null) return
  try {
    // Kill the entire process group (negative PID kills the group)
    process.kill(-spxProcess.pid, 'SIGKILL')
  } catch (error) {
    console.warn('Failed to kill process group, trying individual process:', error)
    spxProcess.kill('SIGKILL')
  }
  spxProcess = null
}

function initializeIPCHandlers() {
  defineMainMethod(
    mm.setAIInteractionAPIEndpoint,
    endpoint => {
      console.log('setAIInteractionAPIEndpoint called with:', endpoint)
      spxAIInteractionAPIEndpoint = endpoint
    }
  )
  defineMainMethod(
    mm.setAIInteractionAPIToken,
    token => {
      console.log('setAIInteractionAPIToken called with:', token)
      spxAIInteractionAPIToken = token
    }
  )
  defineMainMethod(
    mm.setAIDescription,
    description => {
      console.log('setAIDescription called with:', description)
      spxAIDescription = description
    }
  )
  defineMainMethod(
    mm.startGame,
    (buffer) => {
      startSpx(buffer)
    }
  )
  defineMainMethod(mm.stopGame, () => {
    console.log('stopGame called')
    stopSpx()
  })
}

let mainWindow: BrowserWindow | null = null

function initializeMainWindow(){
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 720,
    // fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // We need to load the corresponding version of spx-gui, which supports the desktop runner.
  // mainWindow.loadURL('http://localhost:5173/')
  mainWindow.loadURL('https://builder-h7ancsycn-goplus.vercel.app/')
  // mainWindow.loadURL('https://x.qiniu.com/')

  // For debug only. TODO: remove me
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  initializeIPCHandlers()
  initializeMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      initializeMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
