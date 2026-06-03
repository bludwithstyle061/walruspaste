import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import TatumBadge from '../components/TatumBadge'
import { readFromWalrus, importKeyFromB64, decryptBytes } from '../lib/walrus'

export default function ViewPaste() {
  const { blobId } = useParams()
  const [status, setStatus] = useState('loading')
  const [paste, setPaste] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (blobId) loadPaste() }, [blobId])

  async function loadPaste() {
    try {
      setStatus('loading')
      const bytes = await readFromWalrus(blobId)
      const keyB64 = decodeURIComponent(window.location.hash.slice(1))

      if (keyB64) {
        setStatus('decrypting')
        const metaBytes = bytes.slice(0, 512)
        const metaStr = new TextDecoder().decode(metaBytes).trim()
        let meta = {}
        try { meta = JSON.parse(metaStr) } catch {}
        const encBytes = bytes.slice(512)
        const key = await importKeyFromB64(keyB64)
        const plaintext = await decryptBytes(encBytes, key)
        setPaste({ ...meta, content: plaintext, encrypted: true })
      } else {
        const json = JSON.parse(new TextDecoder().decode(bytes))
        setPaste(json)
      }
      setStatus('done')
    } catch (e) {
      setError(e.message || 'Could not load or decrypt this paste.')
      setStatus('error')
    }
  }

  function copyContent() {
    navigator.clipboard.writeText(paste.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }

  const suiRef = new URLSearchParams(window.location.search).get('suiRef')

  return (
    <div className="app-shell">
      <Header />
      <main>
        {(status === 'loading' || status === 'decrypting') && (
          <div className="status-row">
            <span className="spinner" />
            {status === 'loading' ? 'fetching from walrus…' : 'decrypting…'}
          </div>
        )}
        {status === 'error' && (
          <div className="error-box">
            <i className="fa-solid fa-circle-xmark" />
            <div>
              {error}
              {window.location.hash === '' && (
                <div style={{ marginTop: 6, opacity: 0.7 }}>
                  This paste may be encrypted. Make sure you have the full link including the # part.
                </div>
              )}
            </div>
          </div>
        )}
        {status === 'done' && paste && (
          <div>
            <div className="view-header">
              <div className="view-eyebrow">Retrieved from Walrus</div>
              <h1 className="view-title">{paste.title || 'Untitled'}</h1>
              <div className="view-meta">
                {paste.encrypted && (
                  <span className="chip green">
                    <i className="fa-solid fa-lock" />
                    encrypted
                  </span>
                )}
                {paste.createdAt && (
                  <span className="chip">
                    <i className="fa-solid fa-clock" />
                    {formatDate(paste.createdAt)}
                  </span>
                )}
                {paste.owner && (
                  <span className="chip">
                    <i className="fa-solid fa-wallet" />
                    {paste.owner.slice(0, 8)}…{paste.owner.slice(-4)}
                  </span>
                )}
                <TatumBadge suiRef={suiRef} />
              </div>
            </div>

            <div className="view-content">{paste.content}</div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={copyContent}>
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
                {copied ? 'Copied' : 'Copy Content'}
              </button>
              <a href="/" className="btn btn-primary">
                <i className="fa-solid fa-plus" />
                New Paste
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
