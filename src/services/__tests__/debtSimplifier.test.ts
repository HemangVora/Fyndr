/**
 * Debt Simplifier validation tests
 * Run with: npx tsx src/services/__tests__/debtSimplifier.test.ts
 */
import {
  simplifyDebts,
  validateSimplification,
  type BalanceInput,
} from "../debtSimplifier";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  PASS: ${message}`);
}

function runTest(name: string, balances: BalanceInput[]) {
  console.log(`\nTest: ${name}`);
  const transfers = simplifyDebts(balances);
  const { valid, errors } = validateSimplification(balances, transfers);

  console.log(
    `  Transfers: ${transfers.map((t) => `${t.fromName} → ${t.toName}: $${t.amount}`).join(", ") || "none"}`
  );

  assert(valid, `Validation passed${errors.length > 0 ? ` (${errors.join("; ")})` : ""}`);
  return transfers;
}

// Test 1: Simple 2-person debt
runTest("Simple 2-person", [
  { userId: "a", userName: "Alice", amount: -20 },
  { userId: "b", userName: "Bob", amount: 20 },
]);

// Test 2: 3-person chain debt
const t2 = runTest("3-person chain", [
  { userId: "a", userName: "Alice", amount: -25 },
  { userId: "b", userName: "Bob", amount: 5 },
  { userId: "c", userName: "Charlie", amount: 20 },
]);
assert(t2.length <= 2, "Should minimize to <= 2 transfers");

// Test 3: 5-person complex
const t3 = runTest("5-person complex", [
  { userId: "a", userName: "Alice", amount: -40 },
  { userId: "b", userName: "Bob", amount: -10 },
  { userId: "c", userName: "Charlie", amount: 25 },
  { userId: "d", userName: "Diana", amount: 15 },
  { userId: "e", userName: "Eve", amount: 10 },
]);
assert(t3.length <= 4, "Should minimize to <= n-1 transfers");

// Test 4: All settled
const t4 = runTest("All settled", [
  { userId: "a", userName: "Alice", amount: 0 },
  { userId: "b", userName: "Bob", amount: 0 },
]);
assert(t4.length === 0, "No transfers needed");

// Test 5: Single debtor, multiple creditors
const t5 = runTest("1 debtor, 3 creditors", [
  { userId: "a", userName: "Alice", amount: -30 },
  { userId: "b", userName: "Bob", amount: 10 },
  { userId: "c", userName: "Charlie", amount: 10 },
  { userId: "d", userName: "Diana", amount: 10 },
]);
assert(t5.length === 3, "Should produce exactly 3 transfers");

// Test 6: Decimal amounts (restaurant split)
runTest("Restaurant decimal split", [
  { userId: "a", userName: "Alice", amount: -33.33 },
  { userId: "b", userName: "Bob", amount: -33.33 },
  { userId: "c", userName: "Charlie", amount: 66.66 },
]);

console.log("\n All tests passed!");
