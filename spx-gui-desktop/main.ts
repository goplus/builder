import * as path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'node:child_process'
import { mm, me, defineMainMethod, sendMainEvent } from './protocol'

let spxProcess: ChildProcess | null = null

async function unzipProject(buffer: ArrayBuffer) {
  // TODO
}

async function startSPX(buffer: ArrayBuffer) {
  const projectPath = path.join(__dirname, 'go/src/github.com/goplus/mock-spx')
  await unzipProject(buffer)

  const goroot = path.join(__dirname, 'toolchain/go')
  const gopath = path.join(__dirname, 'go')
  const goBinPath = path.join(goroot, 'bin')
  const goExecutablePath = path.join(goBinPath, process.platform === 'win32' ? 'go.exe' : 'go')

  // Set up environment variables like in test-go.sh
  const env = {
    ...process.env, // inherit existing environment
    GOROOT: goroot,
    GOPATH: gopath,
    GOTOOLCHAIN: '',
    PATH: `${goBinPath}:${process.env.PATH}`
  }

  spxProcess = spawn(goExecutablePath, ['run', '.'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: projectPath,
    env: env,
    detached: true  // This creates a new process group
  })

  // Handle stdout (normal logs)
  spxProcess.stdout?.on('data', (data) => {
    const output = data.toString()
    sendMainEvent(ensureMainWindow(), me.console, 'log', output)
  })

  // Handle stderr (error logs)
  spxProcess.stderr?.on('data', (data) => {
    const output = data.toString()
    sendMainEvent(ensureMainWindow(), me.console, 'error', output)
    sendMainEvent(ensureMainWindow(), me.gameError, output)
  })

  // Handle process exit
  spxProcess.on('close', (code) => {
    sendMainEvent(ensureMainWindow(), me.gameExit, code || 0)
    spxProcess = null
  })

  // Handle process error
  // spxProcess.on('error', (error) => {
  //   if (mainWindow) {
  //     sendMainEvent(mainWindow, me.gameError, error.message)
  //   }
  //   spxProcess = null
  // })
}

function stopSPX() {
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
      // TODO
      console.log('setAIInteractionAPIEndpoint called with:', endpoint)
    }
  )
  defineMainMethod(
    mm.setAIInteractionAPIToken,
    token => {
      // TODO
      console.log('setAIInteractionAPIToken called with:', token)
    }
  )
  defineMainMethod(
    mm.setAIDescription,
    description => {
      // TODO
      console.log('setAIDescription called with:', description)
    }
  )
  defineMainMethod(
    mm.startGame,
    (buffer) => {
      startSPX(buffer)
    }
  )
  defineMainMethod(mm.stopGame, () => {
    console.log('stopGame called')
    stopSPX()
  })
}

let mainWindow: BrowserWindow | null = null

function ensureMainWindow() {
  if (mainWindow == null) throw new Error('Main window is not initialized')
  return mainWindow
}

function initializeMainWindow(){
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadURL('https://x.qiniu.com/')

  // TODO: remove me
  mainWindow.webContents.openDevTools()
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
