import { PrivyClient } from "@privy-io/node";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const findSchema = z.object({
  identifier: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = findSchema.parse(body);
    const { identifier } = payload;

    // Look up user (do NOT create — wait for them to sign up)
    const user = await findUser(identifier);

    if (!user) {
      return NextResponse.json(
        { error: "User not found. They need to sign up for Fyndr first." },
        { status: 404 }
      );
    }

    // Get user's wallet
    const wallet = user.linked_accounts?.find(
      (account) =>
        account.type === "wallet" && account.chain_type === "ethereum"
    );

    if (!wallet || !wallet.address) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      address: wallet.address,
      identifier,
      identifierType: getIdentifierType(identifier),
      userId: user.id,
    });
  } catch (error) {
    console.error("Error in /api/find:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Detect identifier type
function getIdentifierType(identifier: string): "wallet" | "email" | "phone" {
  if (identifier.startsWith("0x") && identifier.length === 42) return "wallet";
  if (identifier.includes("@")) return "email";
  return "phone";
}

// Find a user by phone number, email, or wallet address via Privy.
// Does NOT create new users — they must sign up themselves.
async function findUser(identifier: string) {
  const idType = getIdentifierType(identifier);

  // Wallet addresses don't need Privy lookup — return a minimal object
  if (idType === "wallet") {
    return {
      id: identifier,
      linked_accounts: [
        { type: "wallet" as const, chain_type: "ethereum" as const, address: identifier },
      ],
    };
  }

  if (idType === "phone") {
    return privy
      .users()
      .getByPhoneNumber({ number: identifier })
      .catch(() => null);
  } else {
    return privy
      .users()
      .getByEmailAddress({ address: identifier })
      .catch(() => null);
  }
}
