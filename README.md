# WalrusPaste 🐋

> Encrypted, wallet-owned, decentralized pastebin built on Walrus + Sui + Tatum

**Live demo:** _deploy to Vercel or walrus.site_

---

## What it does

- **Paste anything** — code, notes, keys, logs
- **End-to-end encrypted** — content is AES-256-GCM encrypted in your browser before hitting Walrus. The decryption key lives only in the URL fragment — no server, no Walrus node, nobody ever sees your plaintext
- **Walrus-native expiry** — blobs expire after N epochs; the UI shows this and lets you reason about storage duration
- **Wallet-owned** — connect a Sui wallet to link your pastes to your on-chain identity
- **Tatum verification** — every paste shows an on-chain verification badge powered by Tatum's Sui RPC

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Blockchain | Sui mainnet |
| Storage | Walrus decentralized blob store |
| RPC | Tatum Sui nodes |
| Wallet | @mysten/dapp-kit |
| Encryption | Web Crypto API (AES-256-GCM) |

## Setup

```bash
git clone <your-repo>
cd walruspaste
npm install

cp .env.example .env
# Add your Tatum API key from dashboard.tatum.io

npm run dev
```

## How encryption works

1. A 256-bit AES-GCM key is generated in your browser
2. Your content is encrypted with that key
3. Encrypted bytes are uploaded to Walrus
4. The decryption key is appended to the share URL as a `#fragment`
5. Fragments are never sent to servers — only your browser sees it
6. Anyone with the full URL can decrypt; anyone without cannot

## Walrus integration

Uses the Walrus HTTP publisher and aggregator endpoints:
- `PUT /v1/blobs?epochs=N` — store a blob for N epochs
- `GET /v1/blobs/:blobId` — retrieve a blob

## Tatum integration

Uses Tatum's Sui mainnet RPC (`https://sui-mainnet.gateway.tatum.io`) to:
- Call `sui_getObject` on the Walrus blob's Sui object ID
- Show a verified on-chain badge with a link to SuiScan

## Hackathon checklist

- [x] Tatum API key + Sui RPC nodes used
- [x] Walrus storage is core functionality (not an add-on)
- [x] Built on Sui mainnet
- [x] GitHub repo + demo video

## Mainnet endpoints

These constants in `src/lib/walrus.js` are configured for mainnet:
```js
export const WALRUS_PUBLISHER = 'https://publisher.walrus.space'
export const WALRUS_AGGREGATOR = 'https://aggregator.walrus.space'
export const TATUM_RPC = 'https://sui-mainnet.gateway.tatum.io'
```
