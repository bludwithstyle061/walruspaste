# WalrusPaste

**Encrypted, wallet-owned paste sharing powered by Walrus, Sui, and Tatum.**

WalrusPaste is a decentralized pastebin for code, notes, logs, and sensitive text. It encrypts paste content in the browser, stores the encrypted bytes on Walrus, and creates share links where the decryption key stays in the URL fragment so it is never sent to Walrus, Tatum, or any app server.

**Live demo:** https://youtu.be/MJhXXBM6U_c

> Current deployment: Sui testnet + Walrus testnet.

---

## Why It Matters

Traditional pastebins depend on centralized servers that can read, censor, delete, or leak stored content. WalrusPaste takes a different approach:

- Content is encrypted locally before upload.
- Storage happens on Walrus decentralized blob storage.
- Paste ownership can be linked to a Sui wallet.
- Blob verification is checked through Tatum's Sui RPC.
- Share links contain the decryption key only in the browser URL fragment.

The result is a paste-sharing experience that feels simple, but demonstrates real decentralized storage, wallet identity, client-side encryption, and on-chain verification.

## Demo Flow

1. Open the app.
2. Connect a Sui wallet, optional but recommended for ownership context.
3. Enter a title and paste content.
4. Choose an expiry period in Walrus epochs.
5. Keep encryption enabled.
6. Store the paste on Walrus.
7. Copy the generated share link.
8. Open the link to fetch from Walrus and decrypt locally.

## Features

- **Client-side encryption**: Uses Web Crypto API with AES-256-GCM.
- **Fragment-based key sharing**: The decryption key lives after `#` in the URL and is not sent in HTTP requests.
- **Walrus storage**: Paste bytes are uploaded directly to the Walrus publisher endpoint.
- **Walrus retrieval**: Paste links fetch blobs from the Walrus aggregator endpoint.
- **Sui wallet support**: Built with `@mysten/dapp-kit`.
- **Tatum verification**: Uses Tatum Sui RPC to verify the Walrus blob object reference.
- **Local paste history**: Recent paste links are saved in browser localStorage.
- **SPA deployment ready**: Includes Vercel rewrites for `/p/:blobId` share links.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite |
| Routing | React Router |
| Wallet | `@mysten/dapp-kit` |
| Chain | Sui testnet |
| Storage | Walrus testnet |
| RPC | Tatum Sui testnet RPC |
| Encryption | Web Crypto API, AES-256-GCM |
| Deployment | Vercel |

## Architecture

```text
User browser
  |
  | 1. Generate AES-GCM key locally
  | 2. Encrypt paste content locally
  v
Walrus publisher
  |
  | 3. Store encrypted blob for selected epochs
  v
Walrus blob object on Sui
  |
  | 4. Verify object through Tatum Sui RPC
  v
Share URL
  |
  | /p/:blobId?suiRef=:objectId#decryptionKey
  v
Recipient browser
  |
  | 5. Fetch encrypted blob from Walrus
  | 6. Import key from URL fragment
  | 7. Decrypt content locally
```

## How Encryption Works

WalrusPaste never uploads plaintext paste content when encryption is enabled.

1. The browser generates a 256-bit AES-GCM key.
2. The paste content is encrypted locally with a random IV.
3. Metadata and encrypted bytes are packed into a blob payload.
4. The payload is uploaded to Walrus.
5. The share URL is built with the blob ID and decryption key.
6. The key is placed in the `#fragment`, which browsers do not send to servers.
7. Anyone with the full link can decrypt locally; anyone without the fragment cannot.

## Walrus Integration

WalrusPaste uses the Walrus HTTP endpoints:

```text
PUT /v1/blobs?epochs=N
GET /v1/blobs/:blobId
```

Configured endpoints live in [`src/lib/walrus.js`](src/lib/walrus.js):

```js
export const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space'
export const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'
export const TATUM_RPC = 'https://sui-testnet.gateway.tatum.io'
```

## Tatum Integration

Tatum is used as the Sui RPC layer for verification.

WalrusPaste calls:

```text
sui_getObject
```

against Tatum's Sui testnet RPC to check the Walrus object reference returned after storage. When verification succeeds, the UI shows a Tatum-powered verification badge and links to SuiScan.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A Tatum API key
- A Sui wallet if you want to test wallet ownership

### Installation

```bash
git clone https://github.com/bludwithstyle061/walruspaste.git
cd walruspaste
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

### Environment Variables

Create `.env` from `.env.example`:

```bash
VITE_TATUM_API_KEY=your_tatum_api_key_here
```

The variable is prefixed with `VITE_`, so it is exposed to the browser bundle. Treat it as a client-side API key, not a private backend secret.

## Scripts

```bash
npm run dev      # Start local Vite dev server
npm run build    # Build production assets
npm run preview  # Preview production build locally
```

## Deployment Notes

This is a single-page React app. Deep links such as `/p/:blobId` must serve `index.html`.

The repo includes `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

On Vercel, add `VITE_TATUM_API_KEY` in project environment variables before deploying.

## Judge Checklist

- Walrus is core to the app: every paste is stored and retrieved through Walrus.
- Sui is part of the verification path through Walrus object references.
- Tatum RPC is used to verify stored blob objects.
- Encryption happens client-side before storage.
- The app is deployed and can be tested through a public URL.
- The repo includes setup instructions and deployment notes.

## Current Limitations

- This version targets testnet for demo and judging.
- The Tatum API key is used client-side because this is a fully frontend app.
- Anyone with the full share link, including the `#fragment`, can decrypt the paste.
- If the URL fragment is lost, encrypted paste content cannot be recovered.
- Browser local history is stored only on the current device.

## Roadmap

- Optional backend proxy for stricter API-key handling.
- Paste delete or revoke flow where supported by storage lifecycle.
- Syntax highlighting for code pastes.
- File attachment support.
- Better wallet-linked paste dashboard.
- Mainnet deployment mode after testnet validation.

## License

MIT
