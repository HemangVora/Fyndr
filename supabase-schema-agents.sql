-- Agentic Commerce Schema for Fyndr
-- Run this in Supabase SQL Editor

-- 1. Agent Registry
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Bot',
  color TEXT DEFAULT 'text-blue-400',
  wallet_address TEXT NOT NULL,
  capabilities JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'coming_soon')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Commerce Orders
CREATE TABLE commerce_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES agents(id),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2),
  fees DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2),
  delivery_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid','processing','delivered','cancelled')),
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Subscriptions
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES agents(id),
  plan_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  interval TEXT CHECK (interval IN ('daily', 'weekly', 'monthly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_payment_at TIMESTAMPTZ NOT NULL,
  last_payment_at TIMESTAMPTZ,
  last_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Agent Transfer Ledger
CREATE TABLE agent_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_agent_id UUID REFERENCES agents(id),
  to_agent_id UUID REFERENCES agents(id),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  tx_hash TEXT,
  memo TEXT,
  transfer_type TEXT CHECK (transfer_type IN ('user_to_agent','agent_to_agent','agent_to_user','subscription')),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Agents
INSERT INTO agents (slug, name, description, icon, color, wallet_address, capabilities, status) VALUES
  ('grocery-shopper', 'Grocery Shopper', 'AI-powered grocery shopping agent. Browse products, build orders, and pay on-chain.', 'ShoppingCart', 'text-green-400', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1e', '["browse_products", "create_order", "track_delivery"]', 'active'),
  ('subscription-manager', 'Subscription Manager', 'Manage recurring on-chain payments for services and subscriptions.', 'RefreshCw', 'text-purple-400', '0x8ba1f109551bD432803012645Ac136ddd64DBA72', '["manage_subscriptions", "recurring_payments", "plan_management"]', 'active'),
  ('data-agent', 'Data Analyst', 'Real-time market data, portfolio analytics, and DeFi insights.', 'BarChart3', 'text-cyan-400', '0x1234567890abcdef1234567890abcdef12345678', '["market_data", "portfolio_analysis", "defi_tracking"]', 'coming_soon'),
  ('amazon-connect', 'Amazon Connect', 'Shop on Amazon and pay with your Tempo wallet.', 'Package', 'text-orange-400', '0xabcdef1234567890abcdef1234567890abcdef12', '["amazon_search", "amazon_order", "price_tracking"]', 'coming_soon'),
  ('instacart-connect', 'Instacart Connect', 'Order groceries from local stores via Instacart, paid on-chain.', 'Truck', 'text-red-400', '0xfedcba0987654321fedcba0987654321fedcba09', '["instacart_search", "instacart_order", "store_selection"]', 'coming_soon');
