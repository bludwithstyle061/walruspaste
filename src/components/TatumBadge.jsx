import { useState, useEffect } from 'react'
import { getSuiObject } from '../lib/walrus'

export default function TatumBadge({ suiRef }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!suiRef) { setStatus('unverified'); return }
    getSuiObject(suiRef)
      .then(obj => setStatus(obj ? 'verified' : 'unverified'))
      .catch(() => setStatus('unverified'))
  }, [suiRef])

  if (status === 'loading') return (
    <span className="tatum-badge">
      <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1 }} />
      verifying
    </span>
  )

  if (status === 'verified') return (
    <a
      className="tatum-badge chip accent"
      href={`https://suiscan.xyz/testnet/object/${suiRef}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <i className="fa-solid fa-circle-check" />
      verified via tatum
    </a>
  )

  return (
    <span className="chip" style={{ opacity: 0.4 }}>
      <i className="fa-solid fa-circle-xmark" />
      unverified
    </span>
  )
}
