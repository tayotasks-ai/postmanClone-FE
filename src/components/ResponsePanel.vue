<template>
  <div class="res-panel">
    <!-- Empty state -->
    <div v-if="!res" class="res-empty">
      <div class="empty-icon">🚀</div>
      <div class="empty-title">Send a request</div>
      <div class="empty-sub">Press <kbd>Ctrl+Enter</kbd> or click Send</div>
    </div>

    <!-- Loading -->
    <div v-else-if="res.loading" class="res-loading">
      <div class="spinner"></div>
      <span>Waiting for response…</span>
    </div>

    <!-- Error -->
    <div v-else-if="res.error" class="res-error">
      <div class="res-header">
        <span class="res-label">Response</span>
        <span class="status-pill s5xx">Network Error</span>
        <span class="meta">{{ res.time }} ms</span>
      </div>
      <pre class="error-body">⚠ {{ res.error }}</pre>
    </div>

    <!-- Success -->
    <div v-else class="res-content">
      <div class="res-header">
        <span class="res-label">Response</span>
        <div class="status-pill" :class="res.statusClass">
          <span class="status-dot" :class="res.statusClass + '-dot'"></span>
          {{ res.status }} {{ res.statusText }}
        </div>
        <span class="meta mono">{{ res.time }} ms</span>
        <span class="meta mono">{{ res.size }}</span>
        <button class="btn btn-sm" style="margin-left:auto" @click="copy">📋 Copy</button>
      </div>

      <div class="tabs" style="background:var(--bg2)">
        <div v-for="t in resTabs" :key="t" class="tab" :class="{active:resTab===t}" @click="resTab=t">{{ t }}</div>
      </div>

      <!-- Body -->
      <div v-if="resTab==='Body'" class="res-body" v-html="res.bodyHtml"></div>

      <!-- Headers -->
      <div v-if="resTab==='Headers'" class="res-body">
        <div v-for="(v, k) in res.headers" :key="k" class="header-row">
          <span class="hkey">{{ k }}</span><span class="hval">{{ v }}</span>
        </div>
      </div>

      <!-- Info -->
      <div v-if="resTab==='Info'" class="res-body info-panel">
        <div class="info-row"><span>Status</span><span :class="res.statusClass">{{ res.status }} {{ res.statusText }}</span></div>
        <div class="info-row"><span>Time</span><span>{{ res.time }} ms</span></div>
        <div class="info-row"><span>Size</span><span>{{ res.size }}</span></div>
        <div class="info-row"><span>Content-Type</span><span class="mono">{{ res.contentType }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRelayStore } from '../stores/relay.js'

const store = useRelayStore()
const res = computed(() => store.response)
const resTab = ref('Body')
const resTabs = ['Body', 'Headers', 'Info']

function copy() {
  navigator.clipboard.writeText(res.value?.rawBody || '').then(() => store.showToast('Copied!'))
}
</script>

<style scoped>
.res-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

.res-empty, .res-loading {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; color: var(--text3);
}
.empty-icon { font-size: 36px; }
.empty-title { font-size: 14px; color: var(--text2); }
.empty-sub { font-size: 12px; }
kbd { background: var(--bg3); border: 1px solid var(--border2); border-radius: 4px; padding: 1px 5px; font-size: 11px; }
.res-loading { flex-direction: row; font-size: 13px; }

.res-error { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.error-body { flex: 1; overflow: auto; padding: 16px; font-size: 12px; font-family: var(--mono); color: var(--red); white-space: pre-wrap; line-height: 1.6; }

.res-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.res-header {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 16px;
  background: var(--bg2); border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.res-label { font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; }
.meta { font-size: 11px; color: var(--text3); }

.status-pill { display: flex; align-items: center; gap: 5px; background: var(--bg3); border: 1px solid var(--border2); border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 700; font-family: var(--mono); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.s2xx { color: var(--green); } .s2xx-dot { background: var(--green); }
.s3xx { color: var(--blue); }  .s3xx-dot { background: var(--blue); }
.s4xx { color: var(--yellow); }.s4xx-dot { background: var(--yellow); }
.s5xx { color: var(--red); }   .s5xx-dot { background: var(--red); }

.res-body { flex: 1; overflow: auto; padding: 16px; font-family: var(--mono); font-size: 12px; line-height: 1.7; color: var(--text); white-space: pre-wrap; word-break: break-word; }

.header-row { display: flex; gap: 12px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
.hkey { color: var(--text3); min-width: 200px; }
.hval { color: var(--green); }

.info-panel { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; gap: 16px; font-size: 13px; }
.info-row span:first-child { color: var(--text3); min-width: 120px; }
</style>
