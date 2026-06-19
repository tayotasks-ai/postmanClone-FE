<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" style="width:520px">
      <h3>Environments</h3>

      <div style="display:flex;gap:10px;margin-bottom:16px">
        <select class="field-input" v-model="selectedId" style="flex:1">
          <option value="">— Select environment —</option>
          <option v-for="e in store.environments" :key="e._id" :value="e._id">{{ e.name }}</option>
        </select>
        <button class="btn btn-primary btn-sm" @click="createNew">+ New</button>
      </div>

      <div v-if="editing">
        <div class="form-field">
          <label class="form-label">Name</label>
          <input class="field-input" v-model="editing.name" placeholder="Production" />
        </div>
        <label class="form-label" style="margin-bottom:6px">Variables</label>
        <table class="kv-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Value</th>
              <th style="width:28px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in editing.vars" :key="i" class="kv-row">
              <td><input class="kv-input mono" placeholder="KEY" v-model="v.key" /></td>
              <td><input class="kv-input mono" placeholder="value" v-model="v.value" /></td>
              <td style="text-align:center">
                <button class="del-btn" @click="editing.vars.splice(i,1)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button class="add-btn" @click="editing.vars.push({key:'',value:''})">+ Add Variable</button>

        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-danger btn-sm" @click="delEnv">Delete</button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-sm" @click="emit('close')">Close</button>
        <button v-if="editing" class="btn btn-primary btn-sm" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRelayStore } from '../stores/relay.js'

const emit = defineEmits(['close'])
const store = useRelayStore()

const selectedId = ref('')
const editing = ref(null)

watch(selectedId, (id) => {
  const env = store.environments.find(e => e._id === id)
  editing.value = env ? { ...env, vars: env.vars.map(v => ({ ...v })) } : null
})

async function createNew() {
  const name = prompt('Environment name:')
  if (!name?.trim()) return
  const env = await store.createEnvironment(name.trim())
  selectedId.value = env._id
}

async function save() {
  if (!editing.value) return
  await store.saveEnvironment(editing.value._id, editing.value.name, editing.value.vars.filter(v => v.key))
}

async function delEnv() {
  if (!editing.value || !confirm(`Delete "${editing.value.name}"?`)) return
  await store.deleteEnvironment(editing.value._id)
  selectedId.value = ''
  editing.value = null
}
</script>

<style scoped>
.del-btn { background: none; border: none; color: var(--text3); cursor: pointer; padding: 2px 5px; border-radius: 3px; font-size: 12px; }
.del-btn:hover { background: rgba(239,68,68,0.1); color: var(--red); }
.add-btn { background: none; border: none; color: var(--text3); font-size: 12px; padding: 8px 0; cursor: pointer; margin-top: 4px; display: block; }
.add-btn:hover { color: var(--accent); }
</style>
