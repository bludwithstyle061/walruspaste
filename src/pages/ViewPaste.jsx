import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import TatumBadge from '../components/TatumBadge'
import { readFromWalrus, importKeyFromB64, decryptBytes, parsePasteUrl, unpackEncryptedPaste } from '../lib/walrus'

export default function ViewPaste() {
  const { blobId } = useParams()
  const [status, setStatus] = useState('loading') // loading | decrypting | done | error
  const [paste, setPaste] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!blobId) return
    loadPaste()
  }, [blobId])

  async function loadPaste() {
    try {
      setStatus('loading')
      const bytes = await readFromWalrus(blobId)

      const { keyB64, suiRef } = parsePasteUrl()

      if (keyB64) {
        setStatus('decrypting')
        const { metadata, encryptedBytes } = unpackEncryptedPaste(bytes)
        const key = await importKeyFromB64(keyB64)
        const plaintext = await decryptBytes(encryptedBytes, key)
        setPaste({ ...metadata, content: plaintext, encrypted: true, suiRef })
      } else {
        // Plain paste: parse entire bytes as JSON
        const json = JSON.parse(new TextDecoder().decode(bytes))
        setPaste({ ...json, suiRef })
      }
      setStatus('done')
    } catch (e) {
      setError(e.message || 'Could not load or decrypt this paste.')
      setStatus('error')
    }
  }

  function formatDate(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <div className="app-shell">
      <Header />
      <main>
        {status === 'loading' && (
          <div className="status-row">
            <span className="spinner" />
            fetching from Walrus…
          </div>
        )}
        {status === 'decrypting' && (
          <div className="status-row">
            <span className="spinner" />
            decrypting…
          </div>
        )}
        {status === 'error' && (
          <div className="error-box">
            ✗ {error}
            {window.location.hash === '' && (
              <div style={{ marginTop: 8, opacity: 0.7 }}>
                This paste may be encrypted. Make sure you're using the full link including the # part.
              </div>
            )}
          </div>
        )}
        {status === 'done' && paste && (
          <div>
            <div className="view-header">
              <h1 className="view-title">{paste.title || 'Untitled'}</h1>
              <div className="view-meta">
                {paste.encrypted && (
                  <span className="meta-chip verified">🔐 end-to-end encrypted</span>
                )}
                {paste.createdAt && (
                  <span className="meta-chip">🕐 {formatDate(paste.createdAt)}</span>
                )}
                {paste.owner && (
                  <span className="meta-chip">
                    👛 {paste.owner.slice(0, 8)}…{paste.owner.slice(-4)}
                  </span>
                )}
                <TatumBadge suiRef={paste.suiRef} />
              </div>
            </div>
            <div className="view-content">{paste.content}</div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn"
                onClick={() => navigator.clipboard.writeText(paste.content)}
              >
                copy content
              </button>
              <a href="/" className="btn btn-primary">+ new paste</a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
