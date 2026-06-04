import { useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import Header from './components/Header'
import TatumBadge from './components/TatumBadge'
import {
  generateEncryptionKey,
  encryptText,
  packEncryptedPaste,
  storeOnWalrus,
  buildPasteUrl,
  saveToHistory,
  getHistory,
} from './lib/walrus'

const EPOCH_OPTIONS = [
  { label: '1 day',  value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days',value: 30 },
  { label: '90 days',value: 90 },
]

export default function App() {
  const account = useCurrentAccount()
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [epochs, setEpochs] = useState(7)
  const [encrypt, setEncrypt] = useState(true)
  const [status, setStatus] = useState('idle')
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
        const metadata = {
          title: title || 'Untitled',
          createdAt: Date.now(),
          owner: account?.address || null,
          encrypted: true,
        }
        const encBytes = await encryptText(content, key)
        dataBytes = packEncryptedPaste(metadata, encBytes)
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
      const url = buildPasteUrl(blobId, encrypt ? keyB64 : null, suiRef)

      const entry = { blobId, suiRef, endEpoch, title: title || 'Untitled', url, encrypted: encrypt, createdAt: Date.now(), owner: account?.address || null }
      saveToHistory(entry)
      setResult(entry)
      setStatus('done')
    } catch (e) {
      setError(e.message || 'Storage failed.')
      setStatus('error')
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setContent(''); setTitle(''); setResult(null); setStatus('idle'); setError('')
  }

  return (
    <div className="app-shell">
      <Header />
      <main>
        {status === 'done' && result ? (
          <div className="result-box">
            <div className="result-header">
              <span className="result-status-dot" />
              <span className="result-title">stored on walrus</span>
            </div>
            <div className="result-url">{result.url}</div>
            <div className="result-actions">
              <button className="btn btn-primary" onClick={copyUrl}>
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
                {copied ? 'Copied' : 'Copy Link'}
              </button>
              <button className="btn" onClick={reset}>
                <i className="fa-solid fa-plus" />
                New Paste
              </button>
            </div>
            <div className="result-meta">
              {result.encrypted && (
                <span className="chip green">
                  <i className="fa-solid fa-lock" />
                  end-to-end encrypted
                </span>
              )}
              {result.endEpoch && (
                <span className="chip yellow">
                  <i className="fa-solid fa-hourglass-half" />
                  expires epoch {result.endEpoch}
                </span>
              )}
              {result.owner && (
                <span className="chip">
                  <i className="fa-solid fa-wallet" />
                  {result.owner.slice(0, 8)}…
                </span>
              )}
              <TatumBadge suiRef={result.suiRef} />
            </div>
            {result.encrypted && (
              <div className="key-warning">
                <i className="fa-solid fa-triangle-exclamation" />
                The decryption key is in the URL fragment (after #). Save the full link — it cannot be recovered.
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="title-input-wrap">
              <i className="fa-solid fa-file-lines" />
              <input
                type="text"
                className="title-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Untitled document"
              />
            </div>

            <div className="editor-wrap">
              <div className="editor-bar">
                <div className="editor-bar-left">
                  <span className="editor-indicator" />
                  <span className="editor-filename">paste.txt</span>
                </div>
                <span className="editor-info">{content.length} chars</span>
              </div>
              <textarea
                className="editor-textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste your code, notes, keys, or anything. Stored on Walrus — decentralized, encrypted, permanent."
                spellCheck={false}
              />
            </div>

            <div className="settings-row">
              <div className="setting-group">
                <span className="setting-label">
                  <i className="fa-solid fa-clock" />
                  Expiry
                </span>
                <select className="setting-select" value={epochs} onChange={e => setEpochs(Number(e.target.value))}>
                  {EPOCH_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="settings-divider" />

              <label className="toggle-pill">
                <input type="checkbox" checked={encrypt} onChange={e => setEncrypt(e.target.checked)} />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span className="toggle-label">
                  <i className="fa-solid fa-lock" />
                  Encrypt
                </span>
              </label>

              {account && (
                <div className="settings-divider" />
              )}

              {account && (
                <span className="chip green" style={{ fontSize: '0.65rem' }}>
                  <i className="fa-solid fa-wallet" />
                  wallet linked
                </span>
              )}
            </div>

            {status === 'error' && (
              <div className="error-box" style={{ marginBottom: 16 }}>
                <i className="fa-solid fa-circle-xmark" />
                {error}
              </div>
            )}

            <div className="action-row">
              <span className="char-count">
                {content.length > 0
                  ? `${content.length} chars · ${new Blob([content]).size} bytes`
                  : 'ready to store'}
              </span>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!content.trim() || status === 'storing'}
              >
                {status === 'storing' ? (
                  <><span className="spinner" style={{ borderColor: '#000', borderTopColor: '#000', opacity: 0.5 }} />Storing…</>
                ) : (
                  <><i className="fa-solid fa-arrow-up-from-bracket" />Store on Walrus</>
                )}
              </button>
            </div>
          </div>
        )}

        {history.length > 0 && status !== 'done' && (
          <div className="history-section">
            <div className="section-header">
              <span className="section-title">Recent Pastes</span>
              <span className="section-line" />
            </div>
            <div className="history-list">
              {history.map((item) => (
                <a key={item.blobId} href={item.url} className="history-item">
                  <div className="history-item-left">
                    <i className={`fa-solid ${item.encrypted ? 'fa-lock' : 'fa-file-lines'}`} />
                    <span className="history-item-title">{item.title}</span>
                  </div>
                  <span className="history-item-meta">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <span>WalrusPaste — decentralized, encrypted, censorship-resistant</span>
        <span>Walrus + Sui + Tatum</span>
      </footer>
    </div>
  )
}
