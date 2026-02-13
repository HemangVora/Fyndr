import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const receiptItemSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number().default(1),
});

const parsedReceiptSchema = z.object({
  merchant: z.string().nullable(),
  items: z.array(receiptItemSchema),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("receipt") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No receipt image provided" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" =
      "image/jpeg";
    if (file.type === "image/png") mediaType = "image/png";
    else if (file.type === "image/gif") mediaType = "image/gif";
    else if (file.type === "image/webp") mediaType = "image/webp";

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
                data: base64,
              },
            },
            {
              type: "text",
              text: `Extract all line items from this receipt. Return ONLY valid JSON in this exact format:
{
  "merchant": "Restaurant Name or null",
  "items": [
    {"name": "Item Name", "price": 12.99, "quantity": 1}
  ],
  "subtotal": 25.98,
  "tax": 2.34,
  "tip": 5.00,
  "total": 33.32
}

Rules:
- price should be the total for that line (price × quantity)
- If tax/tip/subtotal are not visible, set them to null
- total is required — estimate from items if not visible
- Return ONLY the JSON, no markdown, no explanation`,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Failed to parse receipt — no text response" },
        { status: 500 }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    const validated = parsedReceiptSchema.parse(parsed);

    return NextResponse.json({ success: true, receipt: validated });
  } catch (error) {
    console.error("Receipt parsing error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid receipt format", details: error.issues },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse receipt",
      },
      { status: 500 }
    );
  }
}
