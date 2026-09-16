// Geçici teşhis scripti: CDP üzerinden sayfayı yeniler, konsol hatalarını toplar, screenshot alır.
// Kullanım: node scripts/cdp-check.mjs <ws-url> <out-png>
const wsUrl = process.argv[2]
const outPng = process.argv[3] || 'cdp-shot.png'

const ws = new WebSocket(wsUrl)
const pending = new Map()
let id = 0

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })
}

const consoleErrors = []
const exceptions = []

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(msg.error.message))
    else resolve(msg.result)
  }
  else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' '))
  }
  else if (msg.method === 'Runtime.exceptionThrown') {
    exceptions.push(msg.params.exceptionDetails.text + ' :: ' + (msg.params.exceptionDetails.exception?.description ?? ''))
  }
})

ws.addEventListener('open', async () => {
  try {
    await send('Runtime.enable')
    await send('Page.enable')
    await send('Page.reload', { ignoreCache: true })
    await new Promise(r => setTimeout(r, 9000))
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    const { writeFileSync } = await import('node:fs')
    writeFileSync(outPng, Buffer.from(shot.data, 'base64'))
    const perf = await send('Runtime.evaluate', {
      expression: `JSON.stringify({ title: document.title, url: location.href, bodyText: document.body.innerText.slice(0, 200), ready: document.readyState })`,
      returnByValue: true,
    })
    console.log('PAGE:', perf.result.value)
    console.log('CONSOLE_ERRORS:', consoleErrors.length)
    for (const e of consoleErrors.slice(0, 20)) console.log('  -', e)
    console.log('EXCEPTIONS:', exceptions.length)
    for (const e of exceptions.slice(0, 10)) console.log('  -', e)
    console.log('SHOT_SAVED:', outPng)
  }
  catch (err) {
    console.error('ERR:', err.message)
  }
  finally {
    ws.close()
    process.exit(0)
  }
})

ws.addEventListener('error', (ev) => {
  console.error('WS error:', ev.message || 'unknown')
  process.exit(1)
})
