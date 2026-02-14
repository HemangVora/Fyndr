import { supabase } from "@/lib/supabase";
import type { CommerceOrder } from "@/types";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  emoji: string;
}

const PRODUCT_CATALOG: Product[] = [
  { id: "prod_001", name: "Organic Whole Milk", price: 5.99, category: "dairy", description: "1 gallon, organic", emoji: "🥛" },
  { id: "prod_002", name: "Sourdough Bread", price: 4.49, category: "bakery", description: "Artisan loaf", emoji: "🍞" },
  { id: "prod_003", name: "Free Range Eggs", price: 6.99, category: "dairy", description: "1 dozen, large", emoji: "🥚" },
  { id: "prod_004", name: "Avocados", price: 4.99, category: "produce", description: "Bag of 4, ripe", emoji: "🥑" },
  { id: "prod_005", name: "Chicken Breast", price: 9.99, category: "meat", description: "1 lb, boneless skinless", emoji: "🍗" },
  { id: "prod_006", name: "Organic Bananas", price: 2.49, category: "produce", description: "Bunch of 6", emoji: "🍌" },
  { id: "prod_007", name: "Greek Yogurt", price: 5.49, category: "dairy", description: "32 oz, plain", emoji: "🥣" },
  { id: "prod_008", name: "Mixed Greens", price: 3.99, category: "produce", description: "5 oz clamshell", emoji: "🥬" },
  { id: "prod_009", name: "Pasta", price: 1.99, category: "pantry", description: "16 oz, penne", emoji: "🍝" },
  { id: "prod_010", name: "Olive Oil", price: 8.99, category: "pantry", description: "Extra virgin, 500ml", emoji: "🫒" },
];

const AGENT_FEE_RATE = 0.02; // 2%

export function browseProducts(params?: { category?: string; search?: string }): Product[] {
  let products = [...PRODUCT_CATALOG];

  if (params?.category) {
    products = products.filter((p) => p.category === params.category);
  }

  if (params?.search) {
    const q = params.search.toLowerCase();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }

  return products;
}

export function getProductById(id: string): Product | undefined {
  return PRODUCT_CATALOG.find((p) => p.id === id);
}

export async function createOrder(params: {
  userId: string;
  agentId: string;
  items: { product_id: string; quantity: number }[];
  deliveryAddress?: string;
}): Promise<CommerceOrder> {
  const orderItems = params.items.map((item) => {
    const product = getProductById(item.product_id);
    if (!product) throw new Error(`Product not found: ${item.product_id}`);
    return {
      product_id: item.product_id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fees = Math.round(subtotal * AGENT_FEE_RATE * 100) / 100;
  const total = Math.round((subtotal + fees) * 100) / 100;

  const { data, error } = await supabase
    .from("commerce_orders")
    .insert({
      user_id: params.userId,
      agent_id: params.agentId,
      items: orderItems,
      subtotal,
      fees,
      total,
      delivery_address: params.deliveryAddress ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create order: ${error.message}`);
  return data as CommerceOrder;
}

export async function getOrdersForUser(userId: string): Promise<CommerceOrder[]> {
  const { data, error } = await supabase
    .from("commerce_orders")
    .select("*, agent:agents(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to fetch orders:", error);
    return [];
  }

  return (data ?? []) as CommerceOrder[];
}

export async function updateOrderStatus(
  orderId: string,
  status: CommerceOrder["status"],
  txHash?: string
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (txHash) update.tx_hash = txHash;

  const { error } = await supabase
    .from("commerce_orders")
    .update(update)
    .eq("id", orderId);

  if (error) throw new Error(`Failed to update order: ${error.message}`);
}
