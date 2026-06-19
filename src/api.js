const BASE = import.meta.env.PROD ? 'https://postmanclone-be.onrender.com/api' : '/api'

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Collections
  getCollections:    ()           => req('GET',    '/collections'),
  getCollection:     (id)         => req('GET',    `/collections/${id}`),
  createCollection:  (name)       => req('POST',   '/collections', { name }),
  updateCollection:  (id, data)   => req('PUT',    `/collections/${id}`, data),
  renameCollection:  (id, name)   => req('PATCH',  `/collections/${id}`, { name }),
  deleteCollection:  (id)         => req('DELETE', `/collections/${id}`),

  // Requests inside collections
  addRequest:    (colId, reqData) => req('POST',   `/collections/${colId}/requests`, reqData),
  updateRequest: (colId, reqId, data) => req('PUT', `/collections/${colId}/requests/${reqId}`, data),
  deleteRequest: (colId, reqId)   => req('DELETE', `/collections/${colId}/requests/${reqId}`),

  // Environments
  getEnvironments:   ()           => req('GET',    '/environments'),
  createEnvironment: (name, vars) => req('POST',   '/environments', { name, vars }),
  updateEnvironment: (id, data)   => req('PUT',    `/environments/${id}`, data),
  deleteEnvironment: (id)         => req('DELETE', `/environments/${id}`),
}
