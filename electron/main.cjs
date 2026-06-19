'use strict'
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const https = require('https')
const http = require('http')

const isDev = process.env.NODE_ENV === 'development'

// ── HTTP helper (no CORS, runs in Node.js) ─────────────────
function makeRequest({ url, method = 'GET', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    let parsed
    try { parsed = new URL(url) }
    catch (e) { return reject(new Error('Invalid URL: ' + url)) }

    const client = parsed.protocol === 'https:' ? https : http
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method.toUpperCase(),
      headers,
    }

    const req = client.request(opts, (res) => {
      let data = ''
      const resHeaders = {}
      Object.entries(res.headers).forEach(([k, v]) => { resHeaders[k] = Array.isArray(v) ? v.join(', ') : v })
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: resHeaders,
          body: data,
        })
      })
    })

    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(new Error('Request timed out after 30 seconds')) })

    if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      req.write(body)
    }
    req.end()
  })
}

// ── Window ─────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: '⚡ Relay',
    backgroundColor: '#0e1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setMenuBarVisibility(false)

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: HTTP proxy (no CORS) ───────────────────────────────
ipcMain.handle('relay:http-request', async (_event, opts) => {
  try {
    return await makeRequest(opts)
  } catch (err) {
    return {
      status: 0,
      statusText: err.message.includes('timed out') ? 'Request Timeout' : 'Network Error',
      headers: {},
      body: '',
      error: err.message,
    }
  }
})
