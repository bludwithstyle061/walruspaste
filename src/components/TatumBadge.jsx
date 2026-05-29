import { useState, useEffect } from 'react'
import { getSuiObject } from '../lib/walrus'

export default function TatumBadge({ suiRef }) {
  const [status, setStatus] = useState('loading') // loading | verified | unverified

  useEffect(() => {
    if (!suiRef) { setStatus('unverified'); return }
    getSuiObject(suiRef)
      .then(obj => setStatus(obj ? 'verified' : 'unverified'))
      .catch(() => setStatus('unverified'))
  }, [suiRef])

  if (status === 'loading') return (
    <span className="tatum-badge">
      <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} />
      checking chain…
    </span>
  )

  if (status === 'verified') return (
    <a
      className="tatum-badge"
      href={`https://suiscan.xyz/testnet/object/${suiRef}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      ✦ verified on-chain via Tatum
    </a>
  )

  return (
    <span className="tatum-badge" style={{ opacity: 0.5 }}>
      ○ unverified
    </span>
  )
}
