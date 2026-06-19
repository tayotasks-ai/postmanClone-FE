<template>
  <div class="modal-overlay" @click.self="cancel">
    <div class="modal" style="width: 400px">
      <h3>{{ store.promptConfig.title }}</h3>
      <div class="form-field" style="margin-top: 16px;">
        <input class="field-input" v-model="value" ref="inputRef" @keyup.enter="confirm" autofocus />
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm" @click="cancel">Cancel</button>
        <button class="btn btn-primary btn-sm" @click="confirm" :disabled="!value.trim()">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRelayStore } from '../stores/relay.js'

const store = useRelayStore()
const value = ref(store.promptConfig.initialValue || '')
const inputRef = ref(null)

onMounted(() => {
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
})

function confirm() {
  if (value.value.trim()) {
    store.promptConfig.resolve(value.value.trim())
    store.promptConfig = null
  }
}

function cancel() {
  store.promptConfig.resolve(null)
  store.promptConfig = null
}
</script>
