// Geçici teşhis scripti: CDP üzerinden belirtilen URL'e gider, konsol hatalarını toplar, screenshot alır.
import { appendFileSync, writeFileSync } from 'node:fs'

const wsUrl = process.argv[2]
const targetUrl = process.argv[3]
const outPng = process.argv[4] || 'cdp-shot.png'

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
    const d = msg.params.exceptionDetails
    exceptions.push((d.exception?.description ?? d.text) + '\nSTACK: ' + (d.stackTrace?.callFrames?.slice(0, 12).map(f => `${f.functionName} (${f.url.split('/').pop()}:${f.lineNumber})`).join(' > ') ?? ''))
    try {
      appendFileSync('cdp-exceptions.log', (d.exception?.description ?? d.text) + '\n=====\n')
    }
    catch {}
  }
})

ws.addEventListener('open', async () => {
  try {
    await send('Runtime.enable')
    await send('Page.enable')
    await send('Page.navigate', { url: targetUrl })
    await new Promise(r => setTimeout(r, 10000))
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(outPng, Buffer.from(shot.data, 'base64'))
    const perf = await send('Runtime.evaluate', {
      expression: `JSON.stringify({ title: document.title, url: location.href, ready: document.readyState })`,
      returnByValue: true,
    })
    console.log('PAGE:', perf.result.value)
    console.log('CONSOLE_ERRORS:', consoleErrors.length)
    for (const e of consoleErrors.slice(0, 20)) console.log('  -', e.slice(0, 300))
    console.log('EXCEPTIONS:', exceptions.length)
    for (const e of exceptions.slice(0, 5)) console.log('  -', e.slice(0, 400))
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
