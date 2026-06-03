import { Link } from 'react-router-dom'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'

export default function Header() {
  const account = useCurrentAccount()

  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <div className="logo-icon">
          <i className="fa-solid fa-database" />
        </div>
        <div className="logo-text">
          Walrus<span>Paste</span>
        </div>
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
        <Link to="/" className="btn">
          <i className="fa-solid fa-plus" />
          New Paste
        </Link>
      </div>
    </header>
  )
}
