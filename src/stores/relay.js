import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api.js'

export const useRelayStore = defineStore('relay', () => {
  // ── State ──────────────────────────────────────────────
  const collections   = ref([])
  const environments  = ref([])
  const activeEnvId   = ref(null)
  const loading       = ref(false)
  const toast         = ref(null)

  // Active request being edited in the workspace
  const activeRequest = ref(null)   // { ...reqData, colId, colMongoId }
  const response      = ref(null)   // last HTTP response

  // ── Computed ───────────────────────────────────────────
  const activeEnv = computed(() =>
    environments.value.find(e => e._id === activeEnvId.value) || null
  )

  // ── Toast ──────────────────────────────────────────────
  let toastTimer = null
  function showToast(msg, type = 'info') {
    toast.value = { msg, type }
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = null), 2800)
  }

  // ── Bootstrap ──────────────────────────────────────────
  async function bootstrap() {
    loading.value = true
    try {
      const [cols, envs] = await Promise.all([api.getCollections(), api.getEnvironments()])
      collections.value  = cols.map(c => ({ ...c, open: false }))
      environments.value = envs
    } catch (e) {
      showToast('Could not reach server — is the backend running?', 'error')
    } finally {
      loading.value = false
    }
  }

  // ── Collections ────────────────────────────────────────
  async function createCollection(name) {
    const col = await api.createCollection(name)
    collections.value.unshift({ ...col, open: true })
    showToast(`Collection "${name}" created`)
    return col
  }

  async function renameCollection(colId, name) {
    await api.renameCollection(colId, name)
    const col = collections.value.find(c => c._id === colId)
    if (col) col.name = name
  }

  async function deleteCollection(colId) {
    await api.deleteCollection(colId)
    collections.value = collections.value.filter(c => c._id !== colId)
    if (activeRequest.value?.colMongoId === colId) activeRequest.value = null
    showToast('Collection deleted')
  }

  function toggleCollection(colId) {
    const col = collections.value.find(c => c._id === colId)
    if (col) col.open = !col.open
  }

  // ── Requests ───────────────────────────────────────────
  function openRequest(colMongoId, reqData) {
    activeRequest.value = { ...reqData, colMongoId }
    response.value = null
  }

  function newBlankRequest(colMongoId) {
    activeRequest.value = {
      id: null,         // null = unsaved
      colMongoId,
      name: 'New Request',
      method: 'GET',
      url: '',
      params:  [],
      headers: [
        { key: 'Accept', value: 'application/json', enabled: true },
        { key: 'User-Agent', value: 'Relay/1.0', enabled: true },
      ],
      body: '',
      bodyType: 'none',
      auth: { type: 'none' },
      preScript: '',
      postScript: '',
    }
    response.value = null
  }

  async function saveRequest(reqData) {
    const col = collections.value.find(c => c._id === reqData.colMongoId)
    if (!col) return

    const payload = { ...reqData }
    delete payload.colMongoId

    if (!reqData.id) {
      // Create new
      const saved = await api.addRequest(reqData.colMongoId, payload)
      if (!col.requests) col.requests = []
      col.requests.push(saved)
      activeRequest.value = { ...saved, colMongoId: reqData.colMongoId }
      showToast('Request saved')
      return saved
    } else {
      // Update existing
      await api.updateRequest(reqData.colMongoId, reqData.id, payload)
      if (!col.requests) col.requests = []
      const idx = col.requests.findIndex(r => r.id === reqData.id)
      if (idx !== -1) col.requests[idx] = { ...col.requests[idx], ...payload }
      showToast('Saved')
      return payload
    }
  }

  async function deleteRequest(colMongoId, reqId) {
    await api.deleteRequest(colMongoId, reqId)
    const col = collections.value.find(c => c._id === colMongoId)
    if (col) col.requests = col.requests.filter(r => r.id !== reqId)
    if (activeRequest.value?.id === reqId) activeRequest.value = null
    showToast('Request deleted')
  }

  // Fetch full collection (with bodies) when user opens it
  async function loadCollectionFull(colId) {
    const full = await api.getCollection(colId)
    const idx = collections.value.findIndex(c => c._id === colId)
    if (idx !== -1) collections.value[idx] = { ...collections.value[idx], ...full }
    return full
  }

  // ── Environments ───────────────────────────────────────
  async function createEnvironment(name, vars = []) {
    const env = await api.createEnvironment(name, vars)
    environments.value.push(env)
    showToast(`Environment "${name}" created`)
    return env
  }

  async function saveEnvironment(envId, name, vars) {
    const updated = await api.updateEnvironment(envId, { name, vars })
    const idx = environments.value.findIndex(e => e._id === envId)
    if (idx !== -1) environments.value[idx] = updated
    showToast('Environment saved')
  }

  async function deleteEnvironment(envId) {
    await api.deleteEnvironment(envId)
    environments.value = environments.value.filter(e => e._id !== envId)
    if (activeEnvId.value === envId) activeEnvId.value = null
    showToast('Environment deleted')
  }

  // Variable interpolation
  function interpolate(str) {
    if (!activeEnv.value || !str) return str
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const v = activeEnv.value.vars.find(v => v.key === key)
      return v ? v.value : `{{${key}}}`
    })
  }

  return {
    collections, environments, activeEnvId, activeEnv,
    loading, toast, activeRequest, response,
    showToast, bootstrap,
    createCollection, renameCollection, deleteCollection, toggleCollection, loadCollectionFull,
    openRequest, newBlankRequest, saveRequest, deleteRequest,
    createEnvironment, saveEnvironment, deleteEnvironment,
    interpolate,
  }
})
