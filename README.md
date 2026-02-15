# Fyndr — AI-Powered Agentic Commerce on Tempo

Fyndr is a mobile-first payment app with an AI chat interface that handles expense splitting, peer-to-peer payments, and **agentic commerce** — all powered by real on-chain transactions on the [Tempo](https://tempo.xyz) blockchain.

Every dollar moved through Fyndr is a real blockchain transaction. The agentic payment rails are production-ready — at mainnet, we plug in fulfillment APIs.

## Features

### AI Chat Interface (21 tools)
- **Payments**: Send money, request payments, show wallet QR — all via natural language
- **Expense Splitting**: Create groups, add expenses, calculate balances, generate settlement plans
- **Receipt Parsing**: Upload a receipt photo and the AI extracts items, tax, tip, and total
- **Agentic Commerce**: Browse products, build orders, and pay agents on-chain
- **Subscriptions**: Subscribe to plans with recurring on-chain payments

### Agent Marketplace
- **Grocery Shopper** — Browse a product catalog, build an order, pay on-chain
- **Subscription Manager** — Manage recurring payment plans
- **Coming Soon** — Amazon Connect, Instacart Connect, Data Analyst

### On-Chain Payments
- All transfers use Tempo's `transferSync` with gasless transactions (`feePayer: true`)
- Real token transfers on Tempo Moderato testnet (chain ID 42431)
- Transaction receipts link to [Tempo Explorer](https://explore.moderato.tempo.xyz)

## Tech Stack

- [Next.js](https://nextjs.org) 15 with App Router + Turbopack
- [Tempo SDK](https://www.npmjs.com/package/tempo.ts) (`tempo.ts`) for blockchain interactions
- [Privy](https://privy.io) for embedded wallets and authentication
- [Anthropic Claude](https://anthropic.com) for the AI chat agent
- [Supabase](https://supabase.com) for database (groups, expenses, orders, subscriptions)
- [Viem](https://viem.sh) for Ethereum client
- [TailwindCSS](https://tailwindcss.com) + [Radix UI](https://radix-ui.com) for styling

## Architecture

```
src/
├── app/api/
│   ├── chat/route.ts          # AI agent with 21 tools (SSE streaming)
│   ├── commerce/confirm/      # Order confirmation after on-chain payment
│   ├── subscriptions/confirm/ # Subscription confirmation after payment
│   ├── find/                  # User lookup / wallet resolution
│   └── transactions/          # Transaction history proxy
├── components/
│   ├── chat/                  # ChatInterface, ChatMessage, ToolResultCard
│   ├── apps/                  # AppsTab, PaymentApp, AgentMarketplace
│   ├── ActivityFeed.tsx       # Real-time activity feed
│   └── AppShell.tsx           # Main app layout with tab navigation
├── services/
│   ├── agents.ts              # Agent registry queries
│   ├── commerce.ts            # Product catalog + order management
│   ├── subscriptions.ts       # Subscription plans + lifecycle
│   ├── agentTransfers.ts      # Agent transfer ledger
│   ├── groups.ts              # Group CRUD
│   ├── expenses.ts            # Expense tracking + balance calculation
│   ├── settlement.ts          # Debt simplification algorithm
│   └── payments.ts            # Payment requests
├── hooks/
│   ├── useSend.ts             # On-chain token transfer hook
│   ├── useBalance.ts          # Wallet balance polling
│   └── useChat.ts             # Chat state management
└── types/                     # TypeScript interfaces
```

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Copy the environment file and add your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_PRIVY_APP_ID` / `PRIVY_APP_SECRET` — Privy auth
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
- `ANTHROPIC_API_KEY` — Claude AI

3. Set up the database — run `supabase-schema-agents.sql` in your Supabase SQL editor to create the agent commerce tables.

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Flow

1. **"What agents are available?"** → Shows the agent registry
2. **"I want to buy groceries"** → AI browses the product catalog
3. **Pick items** → Order card appears with real Tempo payment button
4. **"Subscribe to Fyndr Pro"** → Subscription card with on-chain payment
5. **"Show agent activity"** → Transfer ledger with tx hashes linking to explorer
6. **Open Agent Marketplace** → Active agents + coming soon integrations

## Resources

- [Tempo Documentation](https://docs.tempo.xyz)
- [Privy Documentation](https://docs.privy.io)
- [Anthropic API](https://docs.anthropic.com)
- [Supabase Documentation](https://supabase.com/docs)
