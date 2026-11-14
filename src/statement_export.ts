import { createHash } from "node:crypto";
import { z } from "zod";
import { InfraiClient, InfraiError, infrai } from "./infra_client.ts";

export type Order = { id: string; placedAt: string; items: Array<{ name: string; quantity: number; unitCents: number }>; shippingCents: number; status: "paid" | "fulfilled" };

export const orderRequest = z.object({
  id: z.string().min(1), placedAt: z.string().min(1),
  items: z.array(z.object({ name: z.string().min(1), quantity: z.number().int().positive(), unitCents: z.number().int().nonnegative() })).min(1),
  shippingCents: z.number().int().nonnegative(), status: z.enum(["paid", "fulfilled"])
});

export function statementMarkdown(order: Order): string {
  const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
  const total = subtotal + order.shippingCents;
  const lines = order.items.map((item) => `- ${item.name} x${item.quantity}: $${(item.quantity * item.unitCents / 100).toFixed(2)}`);
  return `# Account statement\n\nOrder: ${order.id}\nDate: ${order.placedAt}\nStatus: ${order.status}\n\n${lines.join("\n")}\n- Shipping: $${(order.shippingCents / 100).toFixed(2)}\n- Total: $${(total / 100).toFixed(2)}`;
}

export async function exportStatement(order: Order, client = new InfraiClient()): Promise<unknown> {
  const parsed = orderRequest.safeParse(order);
  if (!parsed.success) throw new Error("Invalid order request");
  if (order.status !== "fulfilled") throw new Error("Only fulfilled orders can be exported");
  const requestId = createHash("sha256").update(order.id).digest("hex");
  try {
    return await client.request(infrai.pdf.generate, "POST", {
      markdown: statementMarkdown(order), page_size: "A4", orientation: "portrait", store: false
    });
  } catch (error) {
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) throw new Error(`${requestId}: ${error.message}`);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const order: Order = { id: "ord_1042", placedAt: "2026-10-28", status: "fulfilled", items: [{ name: "Field jacket", quantity: 1, unitCents: 12900 }], shippingCents: 1200 };
  exportStatement(order).then((result) => console.log(JSON.stringify(result))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
