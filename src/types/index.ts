export interface User {
  id: string;
  privy_id: string;
  wallet_address: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  user?: User;
}

export interface Expense {
  id: string;
  group_id: string;
  paid_by: string;
  title: string;
  description: string | null;
  total_amount: number;
  currency: string;
  receipt_url: string | null;
  created_at: string;
  splits?: ExpenseSplit[];
  paid_by_user?: User;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_settled: boolean;
  settled_tx_hash: string | null;
  settled_at: string | null;
  user?: User;
}

export interface Settlement {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  tx_hash: string;
  memo: string;
  created_at: string;
  from_user?: User;
  to_user?: User;
}

export interface DebtEdge {
  from: string;
  to: string;
  amount: number;
}

export interface NetBalance {
  userId: string;
  amount: number; // positive = owed money, negative = owes money
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ParsedReceipt {
  merchant: string | null;
  items: ReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number;
}

export interface ActivityItem {
  id: string;
  type: "expense_added" | "settlement" | "group_created" | "member_joined" | "agent_order" | "subscription_payment";
  group_id: string;
  group_name: string;
  actor_id: string;
  actor_name: string;
  description: string;
  amount: number | null;
  tx_hash: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  wallet_address: string;
  capabilities: string[];
  status: "active" | "inactive" | "coming_soon";
  created_at: string;
}

export interface CommerceOrder {
  id: string;
  user_id: string;
  agent_id: string;
  items: { product_id: string; name: string; price: number; quantity: number }[];
  subtotal: number;
  fees: number;
  total: number;
  delivery_address: string | null;
  status: "pending" | "confirmed" | "paid" | "processing" | "delivered" | "cancelled";
  tx_hash: string | null;
  created_at: string;
  agent?: Agent;
}

export interface Subscription {
  id: string;
  user_id: string;
  agent_id: string;
  plan_name: string;
  amount: number;
  interval: "daily" | "weekly" | "monthly";
  status: "active" | "paused" | "cancelled";
  next_payment_at: string;
  last_payment_at: string | null;
  last_tx_hash: string | null;
  created_at: string;
  agent?: Agent;
}

export interface AgentTransfer {
  id: string;
  from_agent_id: string | null;
  to_agent_id: string | null;
  from_user_id: string | null;
  to_user_id: string | null;
  amount: number;
  tx_hash: string | null;
  memo: string | null;
  transfer_type: "user_to_agent" | "agent_to_agent" | "agent_to_user" | "subscription";
  reference_id: string | null;
  created_at: string;
  from_agent?: Agent;
  to_agent?: Agent;
}
