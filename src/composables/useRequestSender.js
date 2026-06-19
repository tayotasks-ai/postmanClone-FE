import { useRelayStore } from '../stores/relay.js'

export function useRequestSender() {
  const store = useRelayStore()

  function syntaxHighlight(json) {
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-num'
        if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-str'
        else if (/true|false/.test(match)) cls = 'json-bool'
        else if (/null/.test(match)) cls = 'json-null'
        return `<span class="${cls}">${escHtml(match)}</span>`
      }
    )
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B'
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
    return (b / 1048576).toFixed(2) + ' MB'
  }

  function tryRunScript(code, context = {}) {
    try {
      const pm = {
        environment: {
          set: (k, v) => {
            if (!store.activeEnv) return
            const vr = store.activeEnv.vars.find(x => x.key === k)
            if (vr) vr.value = v
            else store.activeEnv.vars.push({ key: k, value: v })
          },
          get: (k) => {
            const v = store.activeEnv?.vars.find(x => x.key === k)
            return v?.value
          },
        },
        response: context,
        test: (name, fn) => {
          try { fn(); console.log('✅', name) }
          catch (e) { console.error('❌', name, e.message) }
        },
      }
      // eslint-disable-next-line no-new-func
      new Function('pm', code)(pm)
    } catch (e) {
      console.warn('Script error:', e)
    }
  }

  async function sendRequest(req) {
    if (!req.url) { store.showToast('Enter a URL first', 'warn'); return }

    // Pre-request script
    if (req.preScript) tryRunScript(req.preScript)

    const url = store.interpolate(req.url)
    const method = req.method

    // Build headers
    const headers = {}
    ;(req.headers || [])
      .filter(h => h.enabled && h.key)
      .forEach(h => { headers[store.interpolate(h.key)] = store.interpolate(h.value) })

    // Auth
    const auth = req.auth || {}
    if (auth.type === 'bearer' && auth.token)
      headers['Authorization'] = `Bearer ${store.interpolate(auth.token)}`
    if (auth.type === 'basic' && auth.username)
      headers['Authorization'] = 'Basic ' + btoa(`${store.interpolate(auth.username)}:${store.interpolate(auth.password)}`)
    if (auth.type === 'apikey' && auth.key && auth.addTo === 'header')
      headers[store.interpolate(auth.key)] = store.interpolate(auth.value || '')
    if (auth.type === 'oauth2' && auth.accessToken)
      headers['Authorization'] = `Bearer ${store.interpolate(auth.accessToken)}`

    // Body
    let body
    if (!['GET', 'HEAD'].includes(method) && req.bodyType !== 'none') {
      if (['json', 'text', 'xml'].includes(req.bodyType)) {
        body = store.interpolate(req.body || '')
        if (req.bodyType === 'json' && !headers['Content-Type'])
          headers['Content-Type'] = 'application/json'
        if (req.bodyType === 'xml' && !headers['Content-Type'])
          headers['Content-Type'] = 'application/xml'
        if (req.bodyType === 'text' && !headers['Content-Type'])
          headers['Content-Type'] = 'text/plain'
      } else if (req.bodyType === 'form') {
        const fd = new URLSearchParams()
        ;(req.formParams || [])
          .filter(f => f.enabled && f.key)
          .forEach(f => fd.append(store.interpolate(f.key), store.interpolate(f.value)))
        body = fd.toString()
        if (!headers['Content-Type'])
          headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    }

    store.response = { loading: true }
    const start = Date.now()

    try {
      const fetchOpts = { method, headers }
      if (body !== undefined) fetchOpts.body = body
      const res = await fetch(url, fetchOpts)
      const elapsed = Date.now() - start

      const contentType = res.headers.get('content-type') || ''
      const text = await res.text()
      const resHeaders = {}
      res.headers.forEach((v, k) => { resHeaders[k] = v })
      const size = new Blob([text]).size

      let bodyHtml = escHtml(text)
      if (contentType.includes('json')) {
        try { bodyHtml = syntaxHighlight(JSON.stringify(JSON.parse(text), null, 2)) } catch {}
      }

      store.response = {
        loading: false,
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        rawBody: text,
        bodyHtml,
        time: elapsed,
        size: formatBytes(size),
        contentType,
        statusClass: res.status < 300 ? 's2xx' : res.status < 400 ? 's3xx' : res.status < 500 ? 's4xx' : 's5xx',
      }

      if (req.postScript) tryRunScript(req.postScript, { status: res.status, body: text })
    } catch (err) {
      store.response = {
        loading: false,
        error: err.message.includes('fetch') || err.message.includes('network')
          ? 'Network error — check the URL and CORS policy on the target server.\n\n' + err.message
          : err.message,
        time: Date.now() - start,
        statusClass: 's5xx',
      }
    }
  }

  return { sendRequest }
}
