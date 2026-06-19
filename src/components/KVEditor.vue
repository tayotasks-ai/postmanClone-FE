<template>
  <div>
    <table class="kv-table">
      <thead>
        <tr>
          <th style="width:28px"></th>
          <th>Key</th>
          <th>Value</th>
          <th v-if="showDesc">Description</th>
          <th style="width:28px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="row._id" class="kv-row">
          <td style="width:28px;text-align:center">
            <input type="checkbox" v-model="row.enabled" style="accent-color:var(--accent);cursor:pointer" />
          </td>
          <td><input class="kv-input" :placeholder="keyPlaceholder" v-model="row.key" :title="resolveTitle(row.key)" @input="emit('update:modelValue', toClean())" /></td>
          <td><input class="kv-input" placeholder="Value" v-model="row.value" :title="resolveTitle(row.value)" @input="emit('update:modelValue', toClean())" /></td>
          <td v-if="showDesc"><input class="kv-input" placeholder="Description" v-model="row.desc" @input="emit('update:modelValue', toClean())" /></td>
          <td style="width:28px;text-align:center">
            <button class="del-btn" @click="remove(i)">✕</button>
          </td>
        </tr>
      </tbody>
    </table>
    <button class="add-btn" @click="add">+ Add {{ label }}</button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRelayStore } from '../stores/relay.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: 'Row' },
  keyPlaceholder: { type: String, default: 'Key' },
  showDesc: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])
const store = useRelayStore()

function resolveTitle(val) {
  if (!val || !val.includes('{{')) return ''
  const resolved = store.interpolate(val)
  return resolved !== val ? resolved : ''
}

let counter = 0
const mkId = () => ++counter

function toRows(arr) {
  return (arr || []).map(r => ({ ...r, _id: mkId() }))
}

const rows = ref(toRows(props.modelValue))

watch(() => props.modelValue, (v) => {
  // Only sync if outer change (not from our own emit)
  rows.value = toRows(v)
}, { deep: false })

function toClean() {
  return rows.value.map(({ _id, ...rest }) => rest)
}

function add() {
  rows.value.push({ key: '', value: '', enabled: true, desc: '', _id: mkId() })
}

function remove(i) {
  rows.value.splice(i, 1)
  emit('update:modelValue', toClean())
}
</script>

<style scoped>
.add-btn { background: none; border: none; color: var(--text3); font-size: 12px; padding: 8px 0; cursor: pointer; }
.add-btn:hover { color: var(--accent); }
.del-btn { background: none; border: none; color: var(--text3); font-size: 12px; cursor: pointer; padding: 2px 4px; border-radius: 3px; }
.del-btn:hover { background: rgba(239,68,68,0.1); color: var(--red); }
</style>
