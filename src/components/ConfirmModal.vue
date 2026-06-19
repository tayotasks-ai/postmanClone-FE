<template>
  <div class="modal-overlay" @click.self="cancel">
    <div class="modal" style="width: 400px">
      <h3>{{ store.confirmConfig.title }}</h3>
      <p style="color: var(--text2); margin-top: 12px; margin-bottom: 20px; font-size: 13px;">{{ store.confirmConfig.message }}</p>
      <div class="modal-footer">
        <button class="btn btn-sm" @click="cancel">Cancel</button>
        <button class="btn btn-danger btn-sm" @click="confirm">Confirm</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRelayStore } from '../stores/relay.js'

const store = useRelayStore()

function confirm() {
  store.confirmConfig.resolve(true)
  store.confirmConfig = null
}

function cancel() {
  store.confirmConfig.resolve(false)
  store.confirmConfig = null
}
</script>
