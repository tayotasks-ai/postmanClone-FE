<template>
  <div class="app">
    <!-- ── TOP BAR ──────────────────────────────── -->
    <header class="topbar">
      <span class="logo">⚡ Relay</span>
      <div class="topbar-actions">
        <button class="btn btn-sm" @click="importModal = true">📥 Import</button>
        <button class="btn btn-sm" @click="exportAll">📤 Export</button>
      </div>
      <div class="spacer" />
      <select class="env-select" v-model="store.activeEnvId">
        <option value="">No Environment</option>
        <option v-for="e in store.environments" :key="e._id" :value="e._id">{{ e.name }}</option>
      </select>
      <button class="btn btn-sm" @click="envModal = true">🌐 Environments</button>
    </header>

    <div class="body-layout">
      <!-- SIDEBAR -->
      <Sidebar />

      <!-- RESIZER -->
      <div class="resizer" ref="hRes" @mousedown="startHDrag" />

      <!-- WORKSPACE + RESPONSE (vertical split) -->
      <div class="right-pane">
        <!-- Placeholder when nothing open -->
        <div v-if="!store.activeRequest" class="welcome">
          <div class="welcome-icon">⚡</div>
          <div class="welcome-title">Relay API Client</div>
          <div class="welcome-sub">Select a request from the sidebar or create a new one</div>
          <button class="btn btn-primary" style="margin-top:16px" @click="promptNewRequest">+ New Request</button>
        </div>

        <template v-else>
          <div class="top-pane" :style="{ height: topHeight + 'px' }">
            <div class="req-name-bar">
              <input class="req-name-input" v-model="store.activeRequest.name" placeholder="Request name…" />
            </div>
            <RequestWorkspace @save="saveModal = true" />
          </div>

          <div class="v-resizer" @mousedown="startVDrag" />

          <ResponsePanel />
        </template>
      </div>
    </div>

    <!-- ── MODALS ──────────────────────────────── -->
    <Transition name="fade">
      <PromptModal v-if="store.promptConfig" />
    </Transition>

    <Transition name="fade">
      <ConfirmModal v-if="store.confirmConfig" />
    </Transition>

    <Transition name="fade">
      <EnvironmentModal v-if="envModal" @close="envModal = false" />
    </Transition>

    <Transition name="fade">
      <SaveRequestModal v-if="saveModal" :request="store.activeRequest" @close="saveModal = false" @saved="saveModal = false" />
    </Transition>

    <Transition name="fade">
      <div v-if="importModal" class="modal-overlay" @click.self="importModal = false">
        <div class="modal">
          <h3>Import Postman Collection</h3>
          <div class="import-drop" @click="$refs.fileInput.click()">
            📂 Click to select a Postman Collection JSON
          </div>
          <input ref="fileInput" type="file" accept=".json" style="display:none" @change="onImportFile" />
          <div class="form-field" style="margin-top:12px">
            <label class="form-label">Or paste JSON</label>
            <textarea class="field-input" v-model="importText" rows="5" placeholder='{"info":{"name":"My API"},"item":[]}'></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm" @click="importModal = false">Cancel</button>
            <button class="btn btn-primary btn-sm" @click="doImport">Import</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- TOAST -->
    <Transition name="toast">
      <div v-if="store.toast" class="toast" :class="'toast-' + store.toast.type">
        {{ store.toast.msg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRelayStore } from './stores/relay.js'
import Sidebar from './components/Sidebar.vue'
import RequestWorkspace from './components/RequestWorkspace.vue'
import ResponsePanel from './components/ResponsePanel.vue'
import EnvironmentModal from './components/EnvironmentModal.vue'
import SaveRequestModal from './components/SaveRequestModal.vue'
import PromptModal from './components/PromptModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'

const store = useRelayStore()

const envModal    = ref(false)
const saveModal   = ref(false)
const importModal = ref(false)
const importText  = ref('')
const topHeight   = ref(340)
const hRes        = ref(null)

onMounted(() => store.bootstrap())

// ── Horizontal sidebar resize ─────────────────────
function startHDrag(e) {
  const sidebar = document.querySelector('.sidebar')
  const startX = e.clientX
  const startW = sidebar.offsetWidth
  const onMove = (e) => {
    sidebar.style.width = Math.max(180, Math.min(420, startW + e.clientX - startX)) + 'px'
  }
  const up = () => { removeEventListener('mousemove', onMove); removeEventListener('mouseup', up) }
  addEventListener('mousemove', onMove)
  addEventListener('mouseup', up)
}

// ── Vertical request/response resize ─────────────
function startVDrag(e) {
  const startY = e.clientY
  const startH = topHeight.value
  const onMove = (e) => { topHeight.value = Math.max(160, Math.min(600, startH + e.clientY - startY)) }
  const up = () => { removeEventListener('mousemove', onMove); removeEventListener('mouseup', up) }
  addEventListener('mousemove', onMove)
  addEventListener('mouseup', up)
  e.preventDefault()
}

// ── New request prompt ────────────────────────────
function promptNewRequest() {
  if (!store.collections.length) {
    store.showToast('Create a collection first')
    return
  }
  store.newBlankRequest(store.collections[0]._id)
}

// ── Export ────────────────────────────────────────
function exportAll() {
  const data = {
    info: { name: 'Relay Export', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: store.collections.map(col => ({
      name: col.name,
      item: (col.requests || []).map(r => ({
        name: r.name,
        request: {
          method: r.method,
          header: (r.headers || []).map(h => ({ key: h.key, value: h.value, disabled: !h.enabled })),
          url: { raw: r.url, query: (r.params || []).map(p => ({ key: p.key, value: p.value, disabled: !p.enabled })) },
          body: r.bodyType && r.bodyType !== 'none'
            ? { mode: ['json','text','xml'].includes(r.bodyType) ? 'raw' : r.bodyType, raw: r.body || '' }
            : undefined,
        }
      }))
    }))
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'relay-export.postman_collection.json'
  a.click()
  store.showToast('Exported!')
}

// ── Import ────────────────────────────────────────
function onImportFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { importText.value = ev.target.result; doImport() }
  reader.readAsText(file)
}

async function doImport() {
  try {
    const data = JSON.parse(importText.value)

    if (data._postman_variable_scope === 'environment') {
      const vars = (data.values || []).filter(v => v.enabled !== false).map(v => ({ key: String(v.key || ''), value: String(v.value || '') }))
      await store.createEnvironment(data.name || 'Imported Env', vars)
      store.showToast(`Imported environment "${data.name}"`)
      importModal.value = false
      importText.value = ''
      return
    }

    const colName = data.info?.name || 'Imported Collection'
    const requests = []
    function processItems(items, prefix = '') {
      for (const item of items || []) {
        if (item.item) { processItems(item.item, prefix ? `${prefix}/${item.name}` : item.name); continue }
        if (!item.request) continue
        const r = item.request
        const headers = (r.header || []).map(h => ({ key: h.key, value: h.value, enabled: !h.disabled }))
        const params  = (r.url?.query || []).map(p => ({ key: p.key, value: p.value, enabled: !p.disabled }))
        let body = '', bodyType = 'none'
        if (r.body) {
          const mode = r.body.mode
          if (mode === 'raw') { body = r.body.raw || ''; bodyType = r.body.options?.raw?.language === 'json' ? 'json' : 'text' }
          else if (mode === 'urlencoded') bodyType = 'form'
        }
        const url = typeof r.url === 'string' ? r.url : r.url?.raw || ''
        requests.push({ name: item.name, folder: prefix || '', method: r.method || 'GET', url, headers, params, body, bodyType, auth: { type: 'none' } })
      }
    }
    processItems(data.item)
    const col = await store.createCollection(colName)
    // Save each request
    for (const r of requests) {
      await store.saveRequest({ ...r, id: null, colMongoId: col._id })
    }
    store.showToast(`Imported "${colName}" — ${requests.length} requests`)
    importModal.value = false
    importText.value = ''
  } catch (e) {
    store.showToast('Import failed: ' + e.message, 'error')
  }
}
</script>

<style>
.app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

/* Topbar */
.topbar {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 16px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.logo { font-size: 15px; font-weight: 700; color: var(--accent); letter-spacing: -0.3px; margin-right: 4px; }
.topbar-actions { display: flex; gap: 6px; }
.spacer { flex: 1; }
.env-select { background: var(--bg3); border: 1px solid var(--border2); color: var(--text); padding: 5px 10px; border-radius: 6px; font-size: 12px; outline: none; }

/* Body layout */
.body-layout { display: flex; flex: 1; overflow: hidden; }

/* Resizers */
.resizer   { width: 3px; background: var(--border); cursor: col-resize; flex-shrink: 0; transition: background 0.1s; }
.resizer:hover { background: var(--accent); }
.v-resizer { height: 3px; background: var(--border); cursor: row-resize; flex-shrink: 0; transition: background 0.1s; }
.v-resizer:hover { background: var(--accent); }

/* Right pane */
.right-pane { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.top-pane   { flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; }

/* Welcome */
.welcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text3); }
.welcome-icon  { font-size: 40px; }
.welcome-title { font-size: 16px; color: var(--text2); font-weight: 600; }
.welcome-sub   { font-size: 13px; }

/* Request name bar */
.req-name-bar { padding: 8px 16px 0; background: var(--bg2); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.req-name-input { background: none; border: none; color: var(--text); font-size: 14px; font-weight: 600; outline: none; width: 100%; padding: 4px 0 8px; }
.req-name-input::placeholder { color: var(--text3); font-weight: 400; }

/* Import drop zone */
.import-drop { border: 1.5px dashed var(--border2); border-radius: 8px; padding: 20px; text-align: center; color: var(--text3); cursor: pointer; font-size: 13px; }
.import-drop:hover { border-color: var(--accent); color: var(--accent); }

/* Toast */
.toast { position: fixed; bottom: 20px; right: 20px; background: var(--bg3); border: 1px solid var(--border2); color: var(--text); padding: 10px 16px; border-radius: 8px; font-size: 13px; z-index: 300; }
.toast-error { border-color: rgba(239,68,68,0.4); color: var(--red); }
.toast-warn  { border-color: rgba(245,158,11,0.4); color: var(--yellow); }
</style>
