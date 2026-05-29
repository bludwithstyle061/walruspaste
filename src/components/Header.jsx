import { Link } from 'react-router-dom'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'

export default function Header() {
  const account = useCurrentAccount()

  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <span className="logo-dot" />
        WalrusPaste
      </Link>
      <div className="header-actions">
        {account ? (
          <div className="wallet-connected">
            <span className="wallet-dot" />
            {account.address.slice(0, 6)}…{account.address.slice(-4)}
          </div>
        ) : (
          <ConnectButton />
        )}
        <Link to="/" className="btn">+ New Paste</Link>
      </div>
    </header>
  )
}
