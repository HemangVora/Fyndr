import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import * as groups from "@/services/groups";
import * as expenses from "@/services/expenses";
import * as settlement from "@/services/settlement";
import * as activity from "@/services/activity";
import * as userService from "@/services/user";
import * as payments from "@/services/payments";
import * as agents from "@/services/agents";
import * as commerce from "@/services/commerce";
import * as subscriptions from "@/services/subscriptions";
import * as agentTransfers from "@/services/agentTransfers";
import { supabase } from "@/lib/supabase";
import { PrivyClient } from "@privy-io/node";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `You are Fyndr AI, a helpful assistant for payments and expense splitting. You are embedded in a mobile payment app.

Key behaviors:
- Keep responses to 1-3 sentences. Be concise and mobile-friendly.
- Use $ formatting for amounts (e.g. $12.50).
- When a user uploads a receipt image, immediately call parse_receipt_image to extract items.
- Before creating expenses, confirm the amount and group with the user.
- When adding members, ask for their email or phone number.
- Be proactive: if a user says "split this", figure out the group and amounts.
- Format lists with bullet points, not tables.
- When a user asks to send money (e.g. "send 100 to hemang"), use prepare_payment to look up the recipient and prepare the transaction. The actual send happens client-side.
- When a user asks to request money, use request_payment to create a payment request.
- When a user wants their wallet QR or address, use get_wallet_info.

You can help with:
- Sending payments to contacts by name, email, or phone
- Requesting payments from others
- Showing wallet QR code for receiving payments
- Uploading and parsing receipts
- Creating groups and adding members
- Adding expenses and splitting bills
- Checking balances (who owes whom)
- Generating settlement plans (minimum transfers needed)
- Searching for users and viewing activity

You also handle agentic commerce on the Tempo blockchain:
- When a user wants to shop, use browse_products then create_order.
- For subscriptions, use browse_subscriptions and manage_subscription.
- For agent discovery, use browse_agents.
- All payments are REAL on-chain Tempo transfers. Fulfillment is simulated on testnet.`;

const tools: Anthropic.Tool[] = [
  {
    name: "get_my_groups",
    description:
      "Get all groups the current user belongs to. Returns group names, member counts, and IDs.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_group",
    description: "Create a new expense-sharing group.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Group name" },
        description: {
          type: "string",
          description: "Optional group description",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_group_member",
    description:
      "Add a member to a group by their email or phone number. Creates a new user via Privy if they don't exist.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_id: { type: "string", description: "The group ID" },
        identifier: {
          type: "string",
          description: "Email address or phone number of the person to add",
        },
      },
      required: ["group_id", "identifier"],
    },
  },
  {
    name: "get_group_details",
    description:
      "Get full details of a group including members, expenses, and balances.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_id: { type: "string", description: "The group ID" },
      },
      required: ["group_id"],
    },
  },
  {
    name: "add_expense",
    description:
      "Add an expense to a group. Splits evenly among all members by default, or provide custom splits.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_id: { type: "string", description: "The group ID" },
        title: {
          type: "string",
          description: "Expense title (e.g. 'Dinner at Mario\\'s')",
        },
        total_amount: { type: "number", description: "Total amount in USD" },
        description: {
          type: "string",
          description: "Optional expense description",
        },
        split_user_ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional: specific user IDs to split among. If omitted, splits among all group members.",
        },
      },
      required: ["group_id", "title", "total_amount"],
    },
  },
  {
    name: "get_balances",
    description:
      "Get the current balance for each member in a group (who owes whom).",
    input_schema: {
      type: "object" as const,
      properties: {
        group_id: { type: "string", description: "The group ID" },
      },
      required: ["group_id"],
    },
  },
  {
    name: "get_settlement_plan",
    description:
      "Compute the minimum number of transfers needed to settle all debts in a group.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_id: { type: "string", description: "The group ID" },
      },
      required: ["group_id"],
    },
  },
  {
    name: "parse_receipt_image",
    description:
      "Parse a receipt image that the user has uploaded. Extracts merchant, items, tax, tip, and total.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_user",
    description: "Look up a user by email or phone number.",
    input_schema: {
      type: "object" as const,
      properties: {
        identifier: {
          type: "string",
          description: "Email or phone number to search for",
        },
      },
      required: ["identifier"],
    },
  },
  {
    name: "get_activity",
    description: "Get recent activity feed for the current user.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of recent activities to fetch (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "prepare_payment",
    description:
      "Prepare a payment to send money to someone. Looks up the recipient and returns their wallet address. The actual blockchain transaction is executed client-side after user confirms.",
    input_schema: {
      type: "object" as const,
      properties: {
        recipient: {
          type: "string",
          description:
            "The recipient's email, phone number, display name, or wallet address",
        },
        amount: {
          type: "number",
          description: "Amount in USD to send",
        },
        memo: {
          type: "string",
          description: "Optional memo/note for the transaction",
        },
      },
      required: ["recipient", "amount"],
    },
  },
  {
    name: "request_payment",
    description:
      "Request a payment from someone. Creates a pending payment request that the other person can see and pay.",
    input_schema: {
      type: "object" as const,
      properties: {
        from_identifier: {
          type: "string",
          description:
            "Email, phone, or name of the person to request money from",
        },
        amount: {
          type: "number",
          description: "Amount in USD to request",
        },
        memo: {
          type: "string",
          description: "Optional reason for the request",
        },
      },
      required: ["from_identifier", "amount"],
    },
  },
  {
    name: "get_wallet_info",
    description:
      "Get the current user's wallet address for receiving payments or displaying a QR code.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_payment_requests",
    description:
      "Get pending payment requests for the current user (both sent and received).",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "browse_agents",
    description:
      "List all available agents in the Fyndr agent marketplace. Shows active and coming soon agents.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "browse_products",
    description:
      "Browse the product catalog for shopping. Can filter by category or search term.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description:
            "Filter by category: dairy, bakery, produce, meat, pantry",
        },
        search: {
          type: "string",
          description: "Search term to filter products by name",
        },
      },
      required: [],
    },
  },
  {
    name: "create_order",
    description:
      "Create a shopping order with selected products. Returns an order that the user must confirm and pay on-chain.",
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["product_id", "quantity"],
          },
          description: "Array of items with product_id and quantity",
        },
        delivery_address: {
          type: "string",
          description: "Optional delivery address",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "get_my_orders",
    description: "Get the current user's order history from agent commerce.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "browse_subscriptions",
    description:
      "Show available subscription plans and the user's active subscriptions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "manage_subscription",
    description:
      "Subscribe to a plan, or cancel/pause an existing subscription.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["subscribe", "cancel", "pause"],
          description: "Action to perform",
        },
        plan_id: {
          type: "string",
          description: "Plan ID (required for subscribe)",
        },
        subscription_id: {
          type: "string",
          description: "Subscription ID (required for cancel/pause)",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "get_agent_activity",
    description:
      "Get recent agent transfer activity showing the on-chain agent economy.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of recent transfers to fetch (default 10)",
        },
      },
      required: [],
    },
  },
];

// Execute a tool call and return the result
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string,
  imageBase64?: string,
  imageMediaType?: string,
  clientWallet?: string
): Promise<Record<string, unknown>> {
  try {
    switch (toolName) {
      case "get_my_groups": {
        const result = await groups.getGroupsForUser(userId);
        return {
          groups: result.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            member_count: g.member_count,
            members: g.members.map((m) => ({
              id: m.user_id,
              name: m.user?.display_name ?? "Unknown",
              role: m.role,
            })),
          })),
        };
      }

      case "create_group": {
        const result = await groups.createGroup({
          name: toolInput.name as string,
          description: toolInput.description as string | undefined,
          createdBy: userId,
        });
        return {
          success: true,
          group: { id: result.id, name: result.name },
        };
      }

      case "add_group_member": {
        const identifier = toolInput.identifier as string;
        const groupId = toolInput.group_id as string;

        // Look up user in our DB first
        let user = await userService.searchUserByIdentifier(identifier);

        if (!user) {
          // Check Privy to see if the user has ever signed up
          let privyUser = null;
          if (identifier.includes("@")) {
            privyUser = await privy
              .users()
              .getByEmailAddress({ address: identifier })
              .catch(() => null);
          } else {
            privyUser = await privy
              .users()
              .getByPhoneNumber({ number: identifier })
              .catch(() => null);
          }

          if (!privyUser) {
            // User has never signed up — don't create a new account
            return {
              error: `User "${identifier}" hasn't joined Fyndr yet. Ask them to sign up first, then try adding them again.`,
            };
          }

          // User exists in Privy but not in our DB — sync them
          const wallet = privyUser.linked_accounts?.find(
            (a) => a.type === "wallet" && a.chain_type === "ethereum"
          );

          const { data: created, error: createErr } = await supabase
            .from("users")
            .upsert(
              {
                privy_id: privyUser.id,
                wallet_address: wallet?.address?.toLowerCase() ?? "",
                email: identifier.includes("@") ? identifier : null,
                phone: !identifier.includes("@") ? identifier : null,
                display_name: identifier,
              },
              { onConflict: "privy_id" }
            )
            .select("*")
            .single();
          if (createErr)
            throw new Error(`Failed to create user: ${createErr.message}`);
          user = created;
        }

        await groups.addMember(groupId, user!.id);
        return {
          success: true,
          user: {
            id: user!.id,
            name: user!.display_name,
            identifier,
          },
        };
      }

      case "get_group_details": {
        const groupId = toolInput.group_id as string;
        const group = await groups.getGroupById(groupId);
        if (!group) return { error: "Group not found" };

        const expenseList = await expenses.getExpensesForGroup(groupId);
        const balances = expenses.calculateGroupBalances(
          expenseList,
          group.members
        );

        return {
          group: {
            id: group.id,
            name: group.name,
            description: group.description,
            member_count: group.member_count,
            members: group.members.map((m) => ({
              id: m.user_id,
              name: m.user?.display_name ?? "Unknown",
              role: m.role,
            })),
          },
          expenses: expenseList.slice(0, 10).map((e) => ({
            title: e.title,
            amount: e.total_amount,
            paid_by: e.paid_by_user?.display_name ?? "Unknown",
            date: e.created_at,
          })),
          balances: balances.map((b) => ({
            name: b.userName,
            amount: b.amount,
            status:
              b.amount > 0
                ? "is owed"
                : b.amount < 0
                  ? "owes"
                  : "settled up",
          })),
        };
      }

      case "add_expense": {
        const groupId = toolInput.group_id as string;
        const group = await groups.getGroupById(groupId);
        if (!group) return { error: "Group not found" };

        const splitUserIds =
          (toolInput.split_user_ids as string[]) ??
          group.members.map((m) => m.user_id);

        const totalAmount = toolInput.total_amount as number;
        const perPerson =
          Math.round((totalAmount / splitUserIds.length) * 100) / 100;

        const splits = splitUserIds.map((uid) => ({
          userId: uid,
          amount: perPerson,
        }));

        const expense = await expenses.createExpense({
          groupId,
          paidBy: userId,
          title: toolInput.title as string,
          description: toolInput.description as string | undefined,
          totalAmount,
          splits,
        });

        return {
          success: true,
          expense: {
            id: expense.id,
            title: expense.title,
            total: totalAmount,
            split_count: splitUserIds.length,
            per_person: perPerson,
          },
        };
      }

      case "get_balances": {
        const groupId = toolInput.group_id as string;
        const group = await groups.getGroupById(groupId);
        if (!group) return { error: "Group not found" };

        const expenseList = await expenses.getExpensesForGroup(groupId);
        const balances = expenses.calculateGroupBalances(
          expenseList,
          group.members
        );

        return {
          group_name: group.name,
          balances: balances.map((b) => ({
            name: b.userName,
            user_id: b.userId,
            amount: b.amount,
            status:
              b.amount > 0
                ? `is owed $${b.amount.toFixed(2)}`
                : b.amount < 0
                  ? `owes $${Math.abs(b.amount).toFixed(2)}`
                  : "settled up",
          })),
        };
      }

      case "get_settlement_plan": {
        const groupId = toolInput.group_id as string;
        const group = await groups.getGroupById(groupId);
        if (!group) return { error: "Group not found" };

        const expenseList = await expenses.getExpensesForGroup(groupId);
        const balances = expenses.calculateGroupBalances(
          expenseList,
          group.members
        );

        const plan = settlement.computeSettlementPlan(balances);

        return {
          group_name: group.name,
          transfers: plan.transfers.map((t) => ({
            from: t.fromName,
            to: t.toName,
            amount: `$${t.amount.toFixed(2)}`,
          })),
          total_amount: `$${plan.totalAmount.toFixed(2)}`,
          transaction_count: plan.transactionCount,
        };
      }

      case "parse_receipt_image": {
        if (!imageBase64) {
          return { error: "No image was uploaded with this conversation." };
        }

        const mediaType = (imageMediaType ?? "image/jpeg") as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp";

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: imageBase64,
                  },
                },
                {
                  type: "text",
                  text: `Extract all line items from this receipt. Return ONLY valid JSON:
{
  "merchant": "Name or null",
  "items": [{"name": "Item", "price": 12.99, "quantity": 1}],
  "subtotal": 25.98,
  "tax": 2.34,
  "tip": 5.00,
  "total": 33.32
}
Rules: price = total for that line. If tax/tip/subtotal not visible, set null. total is required.`,
                },
              ],
            },
          ],
        });

        const textBlock = response.content.find((b) => b.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          return { error: "Failed to parse receipt" };
        }

        let jsonStr = textBlock.text.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "");
        }

        return { receipt: JSON.parse(jsonStr) };
      }

      case "search_user": {
        const identifier = toolInput.identifier as string;
        const user = await userService.searchUserByIdentifier(identifier);
        if (!user) return { found: false, identifier };
        return {
          found: true,
          user: {
            id: user.id,
            name: user.display_name,
            email: user.email,
            phone: user.phone,
          },
        };
      }

      case "get_activity": {
        const limit = (toolInput.limit as number) ?? 10;
        const items = await activity.getActivityFeed(userId, limit);
        return {
          activities: items.map((a) => ({
            type: a.type,
            description: a.description,
            group: a.group_name,
            time: a.created_at,
          })),
        };
      }

      case "prepare_payment": {
        const recipient = toolInput.recipient as string;
        const amount = toolInput.amount as number;
        const memo = (toolInput.memo as string) ?? "";

        // Try to find user by name, email, or phone
        let user = await userService.searchUserByIdentifier(recipient);

        // If not found by email/phone, try searching by display name
        if (!user) {
          const { data: nameResults } = await supabase
            .from("users")
            .select("*")
            .ilike("display_name", `%${recipient}%`)
            .limit(1);
          if (nameResults && nameResults.length > 0) {
            user = nameResults[0];
          }
        }

        if (!user) {
          return {
            error: `Could not find user "${recipient}". Try their email or phone number.`,
          };
        }

        return {
          action: "send_payment",
          recipient_address: user.wallet_address,
          recipient_name: user.display_name ?? recipient,
          recipient_id: user.id,
          amount: amount.toString(),
          memo,
          ready: true,
        };
      }

      case "request_payment": {
        const fromIdentifier = toolInput.from_identifier as string;
        const amount = toolInput.amount as number;
        const memo = (toolInput.memo as string) ?? "";

        // Find the target user
        let targetUser = await userService.searchUserByIdentifier(fromIdentifier);
        if (!targetUser) {
          const { data: nameResults } = await supabase
            .from("users")
            .select("*")
            .ilike("display_name", `%${fromIdentifier}%`)
            .limit(1);
          if (nameResults && nameResults.length > 0) {
            targetUser = nameResults[0];
          }
        }

        if (!targetUser) {
          return {
            error: `Could not find user "${fromIdentifier}". Try their email or phone number.`,
          };
        }

        const request = await payments.createPaymentRequest({
          fromUserId: targetUser.id,
          toUserId: userId,
          amount,
          memo: memo || undefined,
        });

        return {
          success: true,
          request: {
            id: request.id,
            from_name: targetUser.display_name,
            amount: `$${amount.toFixed(2)}`,
            memo: memo || null,
          },
        };
      }

      case "get_wallet_info": {
        // Get user from our DB by ID
        const { data: dbUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (!dbUser) return { error: "User not found" };

        return {
          action: "show_wallet_qr",
          wallet_address: clientWallet || dbUser.wallet_address,
          display_name: dbUser.display_name,
        };
      }

      case "get_payment_requests": {
        const requests = await payments.getPaymentRequests(userId);
        return {
          requests: requests.map((r) => ({
            id: r.id,
            type: r.to_user_id === userId ? "incoming" : "outgoing",
            from: r.from_user?.display_name ?? "Unknown",
            to: r.to_user?.display_name ?? "Unknown",
            amount: `$${r.amount.toFixed(2)}`,
            memo: r.memo,
            status: r.status,
            created_at: r.created_at,
          })),
        };
      }

      case "browse_agents": {
        const allAgents = await agents.getAllAgents();
        return {
          agents: allAgents.map((a) => ({
            id: a.id,
            slug: a.slug,
            name: a.name,
            description: a.description,
            icon: a.icon,
            color: a.color,
            capabilities: a.capabilities,
            status: a.status,
            wallet_address: a.wallet_address,
          })),
        };
      }

      case "browse_products": {
        const products = commerce.browseProducts({
          category: toolInput.category as string | undefined,
          search: toolInput.search as string | undefined,
        });
        return {
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
            description: p.description,
            emoji: p.emoji,
          })),
          categories: ["dairy", "bakery", "produce", "meat", "pantry"],
        };
      }

      case "create_order": {
        const items = toolInput.items as { product_id: string; quantity: number }[];
        // Get the grocery-shopper agent
        const agent = await agents.getAgentBySlug("grocery-shopper");
        if (!agent) return { error: "Grocery agent not available" };

        const order = await commerce.createOrder({
          userId,
          agentId: agent.id,
          items,
          deliveryAddress: toolInput.delivery_address as string | undefined,
        });

        return {
          action: "confirm_order",
          order_id: order.id,
          items: order.items,
          subtotal: order.subtotal,
          fees: order.fees,
          total: order.total,
          agent_name: agent.name,
          agent_wallet: agent.wallet_address,
        };
      }

      case "get_my_orders": {
        const orders = await commerce.getOrdersForUser(userId);
        return {
          orders: orders.map((o) => ({
            id: o.id,
            items: o.items,
            total: o.total,
            status: o.status,
            tx_hash: o.tx_hash,
            created_at: o.created_at,
            agent_name: o.agent?.name ?? "Agent",
          })),
        };
      }

      case "browse_subscriptions": {
        const plans = subscriptions.getPlans();
        const userSubs = await subscriptions.getUserSubscriptions(userId);
        return {
          plans: plans.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            amount: p.amount,
            interval: p.interval,
            features: p.features,
          })),
          active_subscriptions: userSubs.map((s) => ({
            id: s.id,
            plan_name: s.plan_name,
            amount: s.amount,
            interval: s.interval,
            status: s.status,
            next_payment_at: s.next_payment_at,
          })),
        };
      }

      case "manage_subscription": {
        const action = toolInput.action as string;

        if (action === "subscribe") {
          const planId = toolInput.plan_id as string;
          if (!planId) return { error: "plan_id is required for subscribe" };

          const plan = subscriptions.getPlanById(planId);
          if (!plan) return { error: `Plan not found: ${planId}` };

          const agent = await agents.getAgentBySlug("subscription-manager");
          if (!agent) return { error: "Subscription agent not available" };

          const sub = await subscriptions.createSubscription({
            userId,
            agentId: agent.id,
            planId,
          });

          return {
            action: "confirm_subscription",
            subscription_id: sub.id,
            plan_name: plan.name,
            amount: plan.amount,
            interval: plan.interval,
            next_payment_at: sub.next_payment_at,
            agent_name: agent.name,
            agent_wallet: agent.wallet_address,
          };
        }

        if (action === "cancel" || action === "pause") {
          const subId = toolInput.subscription_id as string;
          if (!subId) return { error: "subscription_id is required" };

          const newStatus = action === "cancel" ? "cancelled" : "paused";
          await subscriptions.updateSubscriptionStatus(subId, newStatus);
          return { success: true, action, subscription_id: subId, new_status: newStatus };
        }

        return { error: `Unknown action: ${action}` };
      }

      case "get_agent_activity": {
        const limit = (toolInput.limit as number) ?? 10;
        const transfers = await agentTransfers.getRecentTransfers(limit);
        return {
          transfers: transfers.map((t) => ({
            id: t.id,
            type: t.transfer_type,
            amount: t.amount,
            tx_hash: t.tx_hash,
            memo: t.memo,
            from_agent: t.from_agent?.name ?? null,
            to_agent: t.to_agent?.name ?? null,
            created_at: t.created_at,
          })),
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return {
      error: err instanceof Error ? err.message : "Tool execution failed",
    };
  }
}

function sendSSE(
  controller: ReadableStreamDefaultController,
  type: string,
  data: unknown
) {
  const payload = JSON.stringify({ type, data });
  controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, userId, walletAddress: clientWallet } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract image from the latest user message (if any)
    const latestUserMsg = [...messages].reverse().find(
      (m: { role: string; imageBase64?: string }) =>
        m.role === "user" && m.imageBase64
    );
    const imageBase64 = latestUserMsg?.imageBase64;
    const imageMediaType = latestUserMsg?.imageMediaType;

    // Build Anthropic messages — strip image data from older messages
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(
      (
        m: {
          role: string;
          content: string;
          imageBase64?: string;
          imageMediaType?: string;
        },
        idx: number
      ) => {
        const isLatest = idx === messages.length - 1;

        if (m.role === "user" && m.imageBase64 && isLatest) {
          return {
            role: "user" as const,
            content: [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: (m.imageMediaType ?? "image/jpeg") as
                    | "image/jpeg"
                    | "image/png"
                    | "image/gif"
                    | "image/webp",
                  data: m.imageBase64,
                },
              },
              { type: "text" as const, text: m.content || "What's in this receipt?" },
            ],
          };
        }

        return {
          role: m.role as "user" | "assistant",
          content: m.content || (m.role === "user" ? "..." : "OK"),
        };
      }
    ).filter((m: { role: string; content: string }) => m.content);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = anthropicMessages;
          let iterations = 0;

          while (iterations < MAX_ITERATIONS) {
            iterations++;

            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 2048,
              system: SYSTEM_PROMPT,
              tools,
              messages: currentMessages,
            });

            let hasToolUse = false;
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of response.content) {
              if (block.type === "text") {
                sendSSE(controller, "text_delta", { text: block.text });
              } else if (block.type === "tool_use") {
                hasToolUse = true;

                sendSSE(controller, "tool_use_start", {
                  id: block.id,
                  name: block.name,
                  input: block.input,
                });

                const result = await executeTool(
                  block.name,
                  block.input as Record<string, unknown>,
                  userId,
                  imageBase64,
                  imageMediaType,
                  clientWallet
                );

                const isError = "error" in result;

                sendSSE(controller, "tool_result", {
                  toolCallId: block.id,
                  toolName: block.name,
                  result,
                  isError,
                });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                  is_error: isError,
                });
              }
            }

            if (!hasToolUse) {
              // No tool calls — we're done
              sendSSE(controller, "done", {});
              break;
            }

            // Continue the agentic loop with tool results
            currentMessages = [
              ...currentMessages,
              { role: "assistant" as const, content: response.content },
              { role: "user" as const, content: toolResults },
            ];
          }

          if (iterations >= MAX_ITERATIONS) {
            sendSSE(controller, "text_delta", {
              text: "\n\nI've reached the maximum number of steps. Please continue with another message.",
            });
            sendSSE(controller, "done", {});
          }
        } catch (err) {
          console.error("Chat stream error:", err);
          sendSSE(controller, "error", {
            message:
              err instanceof Error ? err.message : "An error occurred",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
