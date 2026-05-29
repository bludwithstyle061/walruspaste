// ─── Walrus Config ─────────────────────────────────────────────────────────
export const WALRUS_PUBLISHER = 'https://publisher.walrus.space'
export const WALRUS_AGGREGATOR = 'https://aggregator.walrus.space'
export const TATUM_RPC = 'https://sui-mainnet.gateway.tatum.io'
// Replace with your actual Tatum API key from dashboard.tatum.io
export const TATUM_API_KEY = import.meta.env.VITE_TATUM_API_KEY || ''

// Storage epochs (1 epoch ≈ 1 day on testnet, ~1 week on mainnet)
export const DEFAULT_EPOCHS = 10

// ─── Encryption Helpers ────────────────────────────────────────────────────
// Derives a 256-bit AES-GCM key from a random base64 string
export async function generateEncryptionKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const raw = await crypto.subtle.exportKey('raw', key)
  return {
    key,
    keyB64: btoa(String.fromCharCode(...new Uint8Array(raw)))
  }
}

export async function importKeyFromB64(b64) {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
}

export async function encryptText(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  // Pack: first 12 bytes = IV, rest = ciphertext
  const packed = new Uint8Array(iv.length + ciphertext.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(ciphertext), iv.length)
  return packed
}

export async function decryptBytes(packedBytes, key) {
  const iv = packedBytes.slice(0, 12)
  const ciphertext = packedBytes.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

// ─── Walrus Store ─────────────────────────────────────────────────────────
export async function storeOnWalrus(dataBytes, epochs = DEFAULT_EPOCHS) {
  const blob = new Blob([dataBytes])
  const res = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`, {
    method: 'PUT',
    body: blob,
  })
  if (!res.ok) throw new Error(`Walrus store failed: ${res.statusText}`)
  const json = await res.json()
  // Response has either newlyCreated or alreadyCertified
  const blobId =
    json?.newlyCreated?.blobObject?.blobId ||
    json?.alreadyCertified?.blobId
  if (!blobId) throw new Error('No blobId returned from Walrus')

  const suiRef =
    json?.newlyCreated?.blobObject?.id ||
    json?.alreadyCertified?.eventOrObject?.Object?.id ||
    null

  const endEpoch =
    json?.newlyCreated?.blobObject?.storage?.endEpoch ||
    json?.alreadyCertified?.endEpoch ||
    null

  return { blobId, suiRef, endEpoch }
}

// ─── Walrus Read ──────────────────────────────────────────────────────────
export async function readFromWalrus(blobId) {
  const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`)
  if (!res.ok) throw new Error(`Walrus read failed: ${res.statusText}`)
  const buf = await res.arrayBuffer()
  return new Uint8Array(buf)
}

// ─── Tatum Sui RPC ────────────────────────────────────────────────────────
export async function getSuiObject(objectId) {
  if (!objectId) return null
  const headers = { 'Content-Type': 'application/json' }
  if (TATUM_API_KEY) headers['x-api-key'] = TATUM_API_KEY

  const res = await fetch(TATUM_RPC, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sui_getObject',
      params: [objectId, { showContent: true, showOwner: true }],
    }),
  })
  if (!res.ok) throw new Error('Tatum RPC call failed')
  const json = await res.json()
  return json?.result
}

// ─── URL helpers ─────────────────────────────────────────────────────────
// Encode paste link: /p/{blobId}#{keyB64}
// Key is in the fragment so it's never sent to any server
export function buildPasteUrl(blobId, keyB64) {
  return `${window.location.origin}/p/${blobId}#${encodeURIComponent(keyB64)}`
}

export function parsePasteUrl() {
  const parts = window.location.pathname.split('/')
  const blobId = parts[parts.length - 1]
  const keyB64 = decodeURIComponent(window.location.hash.slice(1))
  return { blobId, keyB64 }
}

// ─── LocalStorage paste history ──────────────────────────────────────────
const HISTORY_KEY = 'walruspaste_history'

export function saveToHistory(entry) {
  const history = getHistory()
  history.unshift(entry)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)))
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}
