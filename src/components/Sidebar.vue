<template>
  <aside class="sidebar">
    <div class="sidebar-top">
      <div class="sidebar-label">Collections</div>
      <input v-model="search" class="search-input" placeholder="Search…" />
    </div>

    <div class="sidebar-scroll">
      <div v-if="store.loading" class="sidebar-loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="!store.collections.length" class="sidebar-empty">
        No collections yet.<br/>Click + to create one.
      </div>

      <div v-for="col in filtered" :key="col._id" class="collection">
        <!-- Collection header -->
        <div class="col-header" :class="{ open: col.open }" @click="toggle(col)">
          <span class="col-arrow" :class="{ rotated: col.open }">›</span>
          <span class="col-name truncate">{{ col.name }}</span>
          <div class="col-actions">
            <button class="icon-btn" title="Add folder" @click.stop="addFolder(col)">+📁</button>
            <button class="icon-btn" title="Add request" @click.stop="addRequest(col)">+</button>
            <button class="icon-btn" title="Rename" @click.stop="renameCol(col)">✎</button>
            <button class="icon-btn danger" title="Delete" @click.stop="deleteCol(col)">✕</button>
          </div>
        </div>

        <!-- Requests & Folders -->
        <div v-if="col.open" class="col-requests">
          <div v-if="!col.requests?.length" class="col-empty">No requests</div>
          
          <SidebarFolder
            v-for="folder in colTree(col).children"
            :key="folder.name"
            :folder="folder"
            :col="col"
            :isActive="isActive"
            @open-req="openReq($event.col, $event.req)"
            @del-req="delReq($event.col, $event.req)"
            @add-folder="handleAddFolder"
            @del-folder="handleDelFolder"
          />

          <div
            v-for="req in colTree(col).items"
            :key="req.id"
            class="req-row"
            :class="{ active: isActive(col, req) }"
            @click="openReq(col, req)"
          >
            <span class="badge" :class="`badge-${req.method}`">{{ req.method }}</span>
            <span class="req-name truncate">{{ req.name }}</span>
            <button class="icon-btn danger req-del" title="Delete" @click.stop="delReq(col, req)">✕</button>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="btn btn-sm" style="width:100%" @click="newCol">+ New Collection</button>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRelayStore } from '../stores/relay.js'
import SidebarFolder from './SidebarFolder.vue'

const store = useRelayStore()
const search = ref('')

const filtered = computed(() => {
  if (!search.value) return store.collections
  const q = search.value.toLowerCase()
  return store.collections.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.requests?.some(r => r.name.toLowerCase().includes(q) || r.url?.toLowerCase().includes(q))
  )
})

function filteredReqs(col) {
  if (!search.value) return col.requests || []
  const q = search.value.toLowerCase()
  return (col.requests || []).filter(r =>
    r.name.toLowerCase().includes(q) || r.url?.toLowerCase().includes(q) || r.folder?.toLowerCase().includes(q)
  )
}

function buildTree(col) {
  const requests = filteredReqs(col)
  const root = { items: [], children: {} }
  
  for (const folder of col.folders || []) {
    const parts = folder.split('/').filter(Boolean)
    let current = root
    let pathAcc = []
    for (const p of parts) {
      pathAcc.push(p)
      if (!current.children[p]) current.children[p] = { name: p, path: pathAcc.join('/'), items: [], children: {} }
      current = current.children[p]
    }
  }

  for (const req of requests) {
    if (!req.folder) {
      root.items.push(req)
    } else {
      const parts = req.folder.split('/').filter(Boolean)
      let current = root
      let pathAcc = []
      for (const p of parts) {
        pathAcc.push(p)
        if (!current.children[p]) current.children[p] = { name: p, path: pathAcc.join('/'), items: [], children: {} }
        current = current.children[p]
      }
      current.items.push(req)
    }
  }
  return root
}

function colTree(col) {
  return buildTree(col)
}

async function toggle(col) {
  if (!col.open && (!col.requests || !col.requests.length)) {
    await store.loadCollectionFull(col._id)
  }
  store.toggleCollection(col._id)
}

function isActive(col, req) {
  return store.activeRequest?.id === req.id && store.activeRequest?.colMongoId === col._id
}

function openReq(col, req) {
  store.openRequest(col._id, req)
}

async function addRequest(col) {
  if (!col.open) await toggle(col)
  store.newBlankRequest(col._id)
}

async function addFolder(col) {
  if (!col.open) await toggle(col)
  const name = await store.showPrompt('Folder name:')
  if (!name?.trim()) return
  await store.addFolder(col._id, name.trim())
}

async function handleAddFolder({ col, parentPath }) {
  if (!col.open) await toggle(col)
  const name = await store.showPrompt('Subfolder name:')
  if (!name?.trim()) return
  await store.addFolder(col._id, parentPath + '/' + name.trim())
}

async function handleDelFolder({ col, folderPath }) {
  if (!(await store.showConfirm('Delete Folder', `Delete "${folderPath}" and all its contents?`))) return
  await store.deleteFolder(col._id, folderPath)
}

async function newCol() {
  const name = await store.showPrompt('Collection name:')
  if (!name?.trim()) return
  await store.createCollection(name.trim())
}

async function renameCol(col) {
  const name = await store.showPrompt('New name:', col.name)
  if (!name?.trim() || name === col.name) return
  await store.renameCollection(col._id, name.trim())
}

async function deleteCol(col) {
  if (!(await store.showConfirm('Delete Collection', `Delete "${col.name}" and all its requests?`))) return
  await store.deleteCollection(col._id)
}

async function delReq(col, req) {
  if (!(await store.showConfirm('Delete Request', `Delete "${req.name}"?`))) return
  await store.deleteRequest(col._id, req.id)
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  min-width: 200px;
  background: var(--bg2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}
.sidebar-top { padding: 12px 14px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.sidebar-label { font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }
.search-input { width: 100%; background: var(--bg); border: 1px solid var(--border2); color: var(--text); padding: 6px 10px; border-radius: 6px; font-size: 12px; outline: none; }
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--text3); }
.sidebar-scroll { flex: 1; overflow-y: auto; padding: 6px 0; }
.sidebar-loading, .sidebar-empty { display: flex; justify-content: center; align-items: center; padding: 32px 16px; color: var(--text3); font-size: 12px; text-align: center; line-height: 1.6; gap: 10px; }

.col-header {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 8px 7px 12px;
  cursor: pointer; user-select: none;
  border-radius: 4px; margin: 0 4px;
}
.col-header:hover { background: var(--bg3); }
.col-header.open { background: var(--bg3); }
.col-arrow { color: var(--text3); font-size: 14px; transition: transform 0.15s; display: inline-block; line-height: 1; }
.col-arrow.rotated { transform: rotate(90deg); }
.col-name { flex: 1; font-size: 12px; font-weight: 600; color: var(--text); }
.col-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.1s; }
.col-header:hover .col-actions { opacity: 1; }

.col-requests { padding: 2px 0 4px; }
.col-empty { padding: 5px 14px 5px 28px; color: var(--text3); font-size: 11px; }

.req-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px 5px 26px;
  cursor: pointer; border-radius: 4px; margin: 0 4px;
}
.req-row:hover { background: var(--bg3); }
.req-row.active { background: var(--bg4); }
.req-name { flex: 1; font-size: 12px; color: var(--text2); }
.req-row:hover .req-name, .req-row.active .req-name { color: var(--text); }
.req-del { opacity: 0; }
.req-row:hover .req-del { opacity: 1; }

.icon-btn {
  background: none; border: none; color: var(--text3);
  font-size: 13px; padding: 2px 4px; border-radius: 3px;
  line-height: 1; opacity: 0.7;
}
.icon-btn:hover { background: var(--bg4); color: var(--text); opacity: 1; }
.icon-btn.danger:hover { background: rgba(239,68,68,0.12); color: var(--red); }

.sidebar-footer { padding: 10px 12px; border-top: 1px solid var(--border); flex-shrink: 0; }
</style>
