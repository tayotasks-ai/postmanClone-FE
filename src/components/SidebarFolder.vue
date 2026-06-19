<template>
  <div class="sidebar-folder">
    <div class="folder-header" @click="open = !open">
      <span class="folder-arrow" :class="{ rotated: open }">›</span>
      <span class="folder-icon">📁</span>
      <span class="folder-name truncate">{{ folder.name }}</span>
      <div class="folder-actions">
        <button class="icon-btn" title="Add subfolder" @click.stop="emit('add-folder', { col, parentPath: folder.path })">+📁</button>
        <button class="icon-btn danger" title="Delete folder" @click.stop="emit('del-folder', { col, folderPath: folder.path })">✕</button>
      </div>
    </div>
    
    <div v-if="open" class="folder-content">
      <!-- Nested Folders -->
      <SidebarFolder 
        v-for="child in folder.children" 
        :key="child.path" 
        :folder="child" 
        :col="col" 
        @open-req="emit('open-req', $event)" 
        @del-req="emit('del-req', $event)" 
        @add-folder="emit('add-folder', $event)"
        @del-folder="emit('del-folder', $event)"
        :isActive="isActive"
      />
      <!-- Requests -->
      <div
        v-for="req in folder.items"
        :key="req.id"
        class="req-row"
        :class="{ active: isActive(col, req) }"
        @click="emit('open-req', { col, req })"
      >
        <span class="badge" :class="`badge-${req.method}`">{{ req.method }}</span>
        <span class="req-name truncate">{{ req.name }}</span>
        <button class="icon-btn danger req-del" title="Delete" @click.stop="emit('del-req', { col, req })">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  folder: Object,
  col: Object,
  isActive: Function
})

const emit = defineEmits(['open-req', 'del-req', 'add-folder', 'del-folder'])

const open = ref(false)
</script>

<style scoped>
.folder-header {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 8px 5px 18px;
  cursor: pointer; user-select: none;
  border-radius: 4px; margin: 0 4px;
}
.folder-header:hover { background: var(--bg3); }
.folder-arrow { color: var(--text3); font-size: 14px; transition: transform 0.15s; display: inline-block; line-height: 1; }
.folder-arrow.rotated { transform: rotate(90deg); }
.folder-icon { font-size: 11px; opacity: 0.8; margin-top: -2px; }
.folder-name { flex: 1; font-size: 12px; font-weight: 600; color: var(--text2); }

.folder-actions { display: none; margin-left: auto; align-items: center; gap: 2px; }
.folder-header:hover .folder-actions { display: flex; }

.folder-content { padding: 2px 0 2px 10px; border-left: 1px solid var(--border); margin-left: 14px; }

.req-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px 5px 12px;
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
</style>
