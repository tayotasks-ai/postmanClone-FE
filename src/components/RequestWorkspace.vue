<template>
  <div class="workspace">
    <!-- ── URL BAR ──────────────────────────────────── -->
    <div class="url-bar">
      <select class="method-sel" v-model="req.method" @change="onMethodChange">
        <option v-for="m in methods" :key="m">{{ m }}</option>
      </select>
      <input
        class="url-input"
        v-model="req.url"
        placeholder="https://api.example.com/v1/resource"
        @keydown.ctrl.enter="send"
        @keydown.meta.enter="send"
        @input="parseUrlParams"
      />
      <button class="btn btn-sm" @click="emit('save')">Save</button>
      <button class="btn btn-primary" :disabled="sending" @click="send" style="min-width:70px">
        <span v-if="!sending">Send</span>
        <div v-else class="spinner" style="width:14px;height:14px;margin:0 auto"></div>
      </button>
    </div>

    <!-- ── REQUEST TABS ─────────────────────────────── -->
    <div class="tabs">
      <div v-for="t in reqTabs" :key="t.key" class="tab" :class="{ active: reqTab === t.key }" @click="reqTab = t.key">
        {{ t.label }}
        <span v-if="t.count !== undefined" class="tab-count">{{ t.count }}</span>
      </div>
    </div>

    <!-- ── TAB PANELS ────────────────────────────────── -->
    <div class="panels">

      <!-- PARAMS -->
      <div v-if="reqTab==='params'" class="panel-scroll">
        <KVEditor v-model="req.params" label="Parameter" key-placeholder="param" @update:modelValue="syncParamsToUrl" />
      </div>

      <!-- HEADERS -->
      <div v-if="reqTab==='headers'" class="panel-scroll">
        <KVEditor v-model="req.headers" label="Header" key-placeholder="Content-Type" />
      </div>

      <!-- BODY -->
      <div v-if="reqTab==='body'" class="body-panel">
        <div class="body-type-bar">
          <span v-for="bt in bodyTypes" :key="bt" class="body-tab" :class="{ active: req.bodyType === bt }" @click="setBodyType(bt)">
            {{ bt }}
          </span>
        </div>
        <div v-if="req.bodyType==='none'" class="no-body">This request has no body.</div>
        <textarea v-else-if="['json','text','xml'].includes(req.bodyType)" class="body-editor" v-model="req.body" :placeholder="bodyPlaceholder"></textarea>
        <div v-else-if="req.bodyType==='form'" class="panel-scroll" style="padding:12px 16px">
          <KVEditor v-model="req.formParams" label="Field" key-placeholder="field_name" :show-desc="false" />
        </div>
      </div>

      <!-- AUTH -->
      <div v-if="reqTab==='auth'" class="panel-scroll">
        <div class="form-field">
          <label class="form-label">Auth Type</label>
          <select class="field-input" v-model="req.auth.type" style="max-width:200px">
            <option value="none">No Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="apikey">API Key</option>
            <option value="oauth2">OAuth 2.0</option>
          </select>
        </div>
        <!-- Bearer -->
        <div v-if="req.auth.type==='bearer'" class="form-field">
          <label class="form-label">Token</label>
          <input class="field-input mono" v-model="req.auth.token" placeholder="Enter bearer token" />
        </div>
        <!-- Basic -->
        <template v-if="req.auth.type==='basic'">
          <div class="form-field"><label class="form-label">Username</label><input class="field-input" v-model="req.auth.username" /></div>
          <div class="form-field"><label class="form-label">Password</label><input class="field-input" type="password" v-model="req.auth.password" /></div>
        </template>
        <!-- API Key -->
        <template v-if="req.auth.type==='apikey'">
          <div class="form-field"><label class="form-label">Key</label><input class="field-input mono" v-model="req.auth.key" /></div>
          <div class="form-field"><label class="form-label">Value</label><input class="field-input mono" v-model="req.auth.value" /></div>
          <div class="form-field">
            <label class="form-label">Add to</label>
            <select class="field-input" v-model="req.auth.addTo" style="max-width:160px">
              <option value="header">Header</option>
              <option value="query">Query Param</option>
            </select>
          </div>
        </template>
        <!-- OAuth2 -->
        <template v-if="req.auth.type==='oauth2'">
          <div class="form-field"><label class="form-label">Access Token</label><input class="field-input mono" v-model="req.auth.accessToken" /></div>
          <div class="form-field"><label class="form-label">Token URL</label><input class="field-input mono" v-model="req.auth.tokenUrl" /></div>
        </template>
      </div>

      <!-- SCRIPTS -->
      <div v-if="reqTab==='scripts'" class="body-panel">
        <div class="body-type-bar">
          <span class="body-tab" :class="{active:scriptTab==='pre'}" @click="scriptTab='pre'">Pre-request</span>
          <span class="body-tab" :class="{active:scriptTab==='post'}" @click="scriptTab='post'">Post-response</span>
        </div>
        <textarea v-if="scriptTab==='pre'" class="body-editor" v-model="req.preScript" placeholder="// Runs before the request&#10;// pm.environment.set('token', 'abc')"></textarea>
        <textarea v-else class="body-editor" v-model="req.postScript" placeholder="// Runs after the response&#10;// pm.test('Status is 200', () => pm.response.to.have.status(200))"></textarea>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRelayStore } from '../stores/relay.js'
import { useRequestSender } from '../composables/useRequestSender.js'
import KVEditor from './KVEditor.vue'

const emit = defineEmits(['save'])
const store = useRelayStore()
const { sendRequest } = useRequestSender()

const methods   = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']
const bodyTypes = ['none','json','text','form','xml']
const reqTab    = ref('params')
const scriptTab = ref('pre')
const sending   = ref(false)

// Local copy of the active request
const req = ref(makeBlank())

function makeBlank() {
  return {
    method: 'GET', url: '', params: [], headers: [
      { key: 'Accept', value: 'application/json', enabled: true },
    ], body: '', bodyType: 'none', formParams: [],
    auth: { type: 'none' }, preScript: '', postScript: '', name: 'New Request',
  }
}

watch(() => store.activeRequest, (r) => {
  if (!r) { req.value = makeBlank(); return }
  req.value = {
    ...makeBlank(),
    ...r,
    auth: r.auth ? { ...r.auth } : { type: 'none' },
    params:     (r.params || []).map(x => ({ ...x })),
    headers:    (r.headers || []).map(x => ({ ...x })),
    formParams: (r.formParams || []).map(x => ({ ...x })),
  }
}, { immediate: true })

// Keep store.activeRequest in sync so Save picks up latest edits
watch(req, (v) => {
  if (store.activeRequest) Object.assign(store.activeRequest, v)
}, { deep: true })

const reqTabs = computed(() => [
  { key: 'params',  label: 'Params',  count: (req.value.params || []).filter(p => p.key).length },
  { key: 'headers', label: 'Headers', count: (req.value.headers || []).filter(h => h.key).length },
  { key: 'body',    label: 'Body' },
  { key: 'auth',    label: 'Auth' },
  { key: 'scripts', label: 'Scripts' },
])

const bodyPlaceholder = computed(() => ({
  json: '{\n  "key": "value"\n}',
  xml:  '<?xml version="1.0"?>\n<root></root>',
  text: 'Plain text body…',
}[req.value.bodyType] || ''))

function onMethodChange() {
  if (['GET','HEAD'].includes(req.value.method)) req.value.bodyType = 'none'
}

function setBodyType(bt) {
  req.value.bodyType = bt
}

function parseUrlParams() {
  try {
    const u = new URL(req.value.url)
    if (!u.search) return
    const ps = [...u.searchParams.entries()].map(([key, value]) => ({ key, value, enabled: true, desc: '' }))
    if (ps.length) req.value.params = ps
  } catch {}
}

function syncParamsToUrl() {
  try {
    const base = req.value.url.split('?')[0]
    const enabled = (req.value.params || []).filter(p => p.enabled && p.key)
    const qs = enabled.map(p => encodeURIComponent(p.key) + (p.value ? '=' + encodeURIComponent(p.value) : '')).join('&')
    req.value.url = qs ? base + '?' + qs : base
  } catch {}
}

async function send() {
  sending.value = true
  await sendRequest(req.value)
  sending.value = false
}
</script>

<style scoped>
.workspace { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

.url-bar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--bg2); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.method-sel { background: var(--bg3); border: 1px solid var(--border2); color: var(--text); padding: 7px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; font-family: var(--mono); min-width: 88px; outline: none; }
.url-input { flex: 1; background: var(--bg); border: 1px solid var(--border2); color: var(--text); padding: 7px 12px; border-radius: 6px; font-size: 13px; font-family: var(--mono); outline: none; }
.url-input:focus { border-color: var(--accent); }
.url-input::placeholder { color: var(--text3); }

.panels { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.panel-scroll { flex: 1; overflow-y: auto; padding: 12px 16px; }

/* Body panel */
.body-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.body-type-bar { display: flex; gap: 4px; padding: 8px 16px; border-bottom: 1px solid var(--border); background: var(--bg2); flex-shrink: 0; }
.body-tab { padding: 4px 10px; color: var(--text3); cursor: pointer; font-size: 12px; border-radius: 4px; }
.body-tab:hover { color: var(--text2); background: var(--bg3); }
.body-tab.active { background: var(--bg4); color: var(--text); }
.no-body { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text3); font-size: 13px; }
.body-editor { flex: 1; background: var(--bg); border: none; color: var(--text); padding: 14px 16px; font-size: 12px; font-family: var(--mono); resize: none; outline: none; line-height: 1.65; }
.body-editor::placeholder { color: var(--text3); }
</style>
