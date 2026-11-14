import test from "node:test";
import assert from "node:assert/strict";
import { statementMarkdown, type Order } from "./statement_export.ts";

test("a fulfilled order produces a statement with the final total", () => {
  const order: Order = { id: "ord_test", placedAt: "2026-10-28", status: "fulfilled", items: [{ name: "Cable", quantity: 2, unitCents: 500 }], shippingCents: 300 };
  assert.match(statementMarkdown(order), /Total: \$13\.00/);
  assert.match(statementMarkdown(order), /Status: fulfilled/);
});
