<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h3>Save Request</h3>
      <div class="form-field">
        <label class="form-label">Request Name</label>
        <input class="field-input" v-model="name" placeholder="Get Users" autofocus />
      </div>
      <div class="form-field">
        <label class="form-label">Folder (optional)</label>
        <input class="field-input" v-model="folder" placeholder="e.g. Auth/Login" />
      </div>
      <div class="form-field">
        <label class="form-label">Collection</label>
        <select class="field-input" v-model="colId">
          <option v-for="c in store.collections" :key="c._id" :value="c._id">{{ c.name }}</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm" @click="emit('close')">Cancel</button>
        <button class="btn btn-primary btn-sm" :disabled="!name.trim() || !colId" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRelayStore } from '../stores/relay.js'

const props = defineProps({ request: Object })
const emit = defineEmits(['close', 'saved'])
const store = useRelayStore()

const name  = ref(props.request?.name || 'New Request')
const folder = ref(props.request?.folder || '')
const colId = ref(props.request?.colMongoId || store.collections[0]?._id || '')

async function save() {
  const data = { ...props.request, name: name.value, folder: folder.value.trim(), colMongoId: colId.value }
  await store.saveRequest(data)
  emit('saved')
  emit('close')
}
</script>
