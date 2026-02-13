# SplitPay — Tempo Hackathon Project

## Project Overview
SplitPay is a bill-splitting app for Track 1 (Consumer Payments & Social Finance) of the Tempo Hackathon.
Users split expenses with friends, AI scans receipts, and settlements happen instantly via Tempo stablecoins.

## Tech Stack
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Auth/Wallet**: Privy (email/phone → embedded wallet, REQUIRED by hackathon)
- **Blockchain**: Tempo SDK (tempo.ts) + viem on Tempo testnet
- **Database**: Supabase (groups, expenses, balances)
- **AI**: Anthropic Claude API (receipt scanning)
- **UI**: shadcn/ui + TailwindCSS v4 + Lucide icons + Motion (framer-motion)
- **Language**: TypeScript (strict mode)

## Key Architecture Rules
- No business logic inside components — extract to `src/services/`
- Types go in `src/types/`
- Hooks in `src/hooks/`
- API routes in `src/app/api/`
- shadcn components in `src/components/ui/`
- App components in `src/components/`
- Utility functions in `src/lib/`

## Tempo Integration
- Token: alphaUsd at `0x20c0000000000000000000000000000000000001`
- RPC: `https://rpc.testnet.tempo.xyz` (WS: `wss://rpc.testnet.tempo.xyz`)
- Explorer API: `https://explore.tempo.xyz/api`
- Use `tempo.ts` SDK with `tempoActions()` for transfers
- Memos: Use `stringToHex()` for transaction memos (32 bytes max)
- Fee token: alphaUsd (stablecoin gas)

## Privy Integration
- Users login with email or phone number
- Wallets auto-created (no seed phrases)
- Use `/api/find` to resolve email/phone → wallet address
- Server-side: `@privy-io/node` for user lookup/creation

## Commands
- `pnpm dev` — Start dev server (Turbopack)
- `pnpm build` — Production build
- `pnpm check-types` — TypeScript type checking
- `pnpm lint` — ESLint

## Git Rules
- Branch: `feature/splitpay`
- Commit after each phase completion
- Format: `<type>: <description>` (feat/fix/refactor/style)
- Never commit .env files
