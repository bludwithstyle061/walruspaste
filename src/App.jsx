import { useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import Header from './components/Header'
import TatumBadge from './components/TatumBadge'
import {
  generateEncryptionKey,
  encryptText,
  storeOnWalrus,
  buildPasteUrl,
  saveToHistory,
  getHistory,
} from './lib/walrus'

const EPOCH_OPTIONS = [
  { label: '1 day', value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

export default function App() {
  const account = useCurrentAccount()
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [epochs, setEpochs] = useState(7)
  const [encrypt, setEncrypt] = useState(true)
  const [status, setStatus] = useState('idle') // idle | storing | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const history = getHistory()

  async function handleSubmit() {
    if (!content.trim()) return
    setStatus('storing')
    setError('')

    try {
      let dataBytes
      let keyB64 = null

      if (encrypt) {
        const { key, keyB64: kb } = await generateEncryptionKey()
        keyB64 = kb
        const meta = JSON.stringify({
          title: title || 'Untitled',
          createdAt: Date.now(),
          owner: account?.address || null,
          encrypted: true,
        })
        // Store: JSON metadata (fixed 512 bytes, padded) + encrypted content
        const metaBytes = new TextEncoder().encode(meta.padEnd(512, ' '))
        const encBytes = await encryptText(content, key)
        dataBytes = new Uint8Array(metaBytes.length + encBytes.length)
        dataBytes.set(metaBytes, 0)
        dataBytes.set(encBytes, metaBytes.length)
      } else {
        const payload = JSON.stringify({
          title: title || 'Untitled',
          content,
          createdAt: Date.now(),
          owner: account?.address || null,
          encrypted: false,
        })
        dataBytes = new TextEncoder().encode(payload)
      }

      const { blobId, suiRef, endEpoch } = await storeOnWalrus(dataBytes, epochs)
      const url = encrypt ? buildPasteUrl(blobId, keyB64) : `${window.location.origin}/p/${blobId}`

      const entry = {
        blobId,
        suiRef,
        endEpoch,
        title: title || 'Untitled',
        url,
        encrypted: encrypt,
        createdAt: Date.now(),
        owner: account?.address || null,
      }
      saveToHistory(entry)
      setResult(entry)
      setStatus('done')
    } catch (e) {
      setError(e.message || 'Something went wrong storing your paste.')
      setStatus('error')
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setContent('')
    setTitle('')
    setResult(null)
    setStatus('idle')
    setError('')
  }

  return (
    <div className="app-shell">
      <Header />

      <main>
        {status === 'done' && result ? (
          <div>
            <div className="result-box">
              <div className="result-title">✓ stored on walrus</div>
              <div className="result-url">{result.url}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={copyUrl}>
                  {copied ? '✓ copied!' : 'copy link'}
                </button>
                <button className="btn" onClick={reset}>new paste</button>
              </div>
              <div className="result-meta">
                {result.encrypted && (
                  <span className="meta-chip verified">🔐 end-to-end encrypted</span>
                )}
                {result.endEpoch && (
                  <span className="meta-chip warning">
                    ⏳ expires epoch {result.endEpoch}
                  </span>
                )}
                {result.owner && (
                  <span className="meta-chip">
                    👛 {result.owner.slice(0, 8)}…
                  </span>
                )}
                <TatumBadge suiRef={result.suiRef} />
              </div>
              {result.encrypted && (
                <div className="key-warning">
                  ⚠ The decryption key is in the URL fragment (after #). Save the full link — it cannot be recovered.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                padding: '12px 0',
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--text)',
                outline: 'none',
                marginBottom: '24px',
                letterSpacing: '-0.01em',
              }}
            />

            <div className="editor-wrap">
              <div className="editor-bar">
                <div className="editor-bar-dots">
                  <span style={{ background: '#ff4466' }} />
                  <span style={{ background: '#ffcc00' }} />
                  <span style={{ background: '#00ff88' }} />
                </div>
                <span className="editor-label">paste.txt</span>
                <span className="editor-label">{content.length} chars</span>
              </div>
              <textarea
                className="editor-textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste your code, text, keys, notes… stored forever on Walrus."
                spellCheck={false}
              />
            </div>

            <div className="settings-row">
              <div className="setting-group">
                <span className="setting-label">Expiry</span>
                <select
                  className="setting-select"
                  value={epochs}
                  onChange={e => setEpochs(Number(e.target.value))}
                >
                  {EPOCH_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <label className="toggle-pill">
                <input
                  type="checkbox"
                  checked={encrypt}
                  onChange={e => setEncrypt(e.target.checked)}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                🔐 encrypt
              </label>

              {account && (
                <span className="meta-chip" style={{ fontSize: '0.7rem' }}>
                  <span className="wallet-dot" />
                  linked to wallet
                </span>
              )}
            </div>

            {status === 'error' && (
              <div className="error-box" style={{ marginBottom: 16 }}>
                ✗ {error}
              </div>
            )}

            <div className="action-row">
              <span className="char-count">
                {content.length > 0
                  ? `${content.length} chars · ${new Blob([content]).size} bytes`
                  : 'start typing to see size'}
              </span>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!content.trim() || status === 'storing'}
              >
                {status === 'storing' ? (
                  <><span className="spinner" />storing…</>
                ) : 'store on walrus →'}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && status !== 'done' && (
          <div className="history-section">
            <div className="section-title">your pastes</div>
            <div className="history-list">
              {history.map((item) => (
                <a key={item.blobId} href={item.url} className="history-item">
                  <span className="history-item-title">
                    {item.encrypted ? '🔐 ' : ''}{item.title}
                  </span>
                  <span className="history-item-meta">
                    {item.owner && <span>{item.owner.slice(0, 6)}…</span>}
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={{
        marginTop: 80,
        paddingTop: 24,
        paddingBottom: 32,
        borderTop: '1px solid var(--border)',
        fontSize: '0.7rem',
        color: 'var(--text-dimmer)',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span>WalrusPaste — decentralized, encrypted, censorship-resistant</span>
        <span>powered by Walrus + Sui + Tatum</span>
      </footer>
    </div>
  )
}
