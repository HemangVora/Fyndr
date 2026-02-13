/**
 * Debt Simplification Algorithm
 *
 * Given a set of balances (who owes what), minimize the number of
 * transactions needed to settle all debts.
 *
 * Algorithm: Greedy matching of largest debtor with largest creditor.
 * This produces a minimal (or near-minimal) set of transfers.
 *
 * Example:
 *   Input balances: A: -20, B: +5, C: +15
 *   (A owes $20, B is owed $5, C is owed $15)
 *
 *   Output: [A → C: $15, A → B: $5]
 *   (2 transactions instead of potentially more)
 */

export interface DebtEdge {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface BalanceInput {
  userId: string;
  userName: string;
  amount: number; // positive = owed money (creditor), negative = owes money (debtor)
}

/**
 * Simplify debts: given net balances per person, compute the minimum
 * set of transfers to settle all debts.
 *
 * @param balances - Array of { userId, userName, amount } where
 *                   positive = creditor (is owed), negative = debtor (owes)
 * @returns Array of transfers { from, to, amount }
 */
export function simplifyDebts(balances: BalanceInput[]): DebtEdge[] {
  // Filter out zero balances
  const nonZero = balances
    .filter((b) => Math.abs(b.amount) > 0.01)
    .map((b) => ({ ...b }));

  if (nonZero.length === 0) return [];

  // Validate: sum of all balances should be ~0 (conservation of money)
  const sum = nonZero.reduce((acc, b) => acc + b.amount, 0);
  if (Math.abs(sum) > 0.1) {
    console.warn(
      `Debt simplifier: balance sum is ${sum.toFixed(2)}, expected ~0`
    );
  }

  // Separate into debtors (negative) and creditors (positive)
  const debtors = nonZero
    .filter((b) => b.amount < 0)
    .map((b) => ({ ...b, amount: Math.abs(b.amount) })) // make positive for easier math
    .sort((a, b) => b.amount - a.amount); // largest debtor first

  const creditors = nonZero
    .filter((b) => b.amount > 0)
    .sort((a, b) => b.amount - a.amount); // largest creditor first

  const transfers: DebtEdge[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];

    // Transfer the smaller of the two amounts
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.01) {
      transfers.push({
        from: debtor.userId,
        fromName: debtor.userName,
        to: creditor.userId,
        toName: creditor.userName,
        amount: Math.round(transferAmount * 100) / 100,
      });
    }

    // Reduce both amounts
    debtor.amount = Math.round((debtor.amount - transferAmount) * 100) / 100;
    creditor.amount =
      Math.round((creditor.amount - transferAmount) * 100) / 100;

    // Move to next debtor/creditor if fully matched
    if (debtor.amount < 0.01) di++;
    if (creditor.amount < 0.01) ci++;
  }

  return transfers;
}

/**
 * Validate the simplification:
 * - Total transferred per debtor matches their debt
 * - Total received per creditor matches their credit
 * - Number of transfers <= number of participants - 1
 */
export function validateSimplification(
  balances: BalanceInput[],
  transfers: DebtEdge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check transfer counts
  const nonZero = balances.filter((b) => Math.abs(b.amount) > 0.01);
  const maxTransfers = Math.max(nonZero.length - 1, 0);
  if (transfers.length > maxTransfers) {
    errors.push(
      `Too many transfers: ${transfers.length} (max ${maxTransfers})`
    );
  }

  // Check per-person totals
  const netByUser = new Map<string, number>();
  for (const b of balances) {
    netByUser.set(b.userId, b.amount);
  }

  const transferNet = new Map<string, number>();
  for (const t of transfers) {
    transferNet.set(t.from, (transferNet.get(t.from) ?? 0) - t.amount);
    transferNet.set(t.to, (transferNet.get(t.to) ?? 0) + t.amount);
  }

  for (const [userId, expected] of netByUser) {
    const actual = transferNet.get(userId) ?? 0;
    if (Math.abs(expected - actual) > 0.02) {
      // Skip near-zero expected values (rounding tolerance)
      if (Math.abs(expected) > 0.01) {
        errors.push(
          `User ${userId}: expected net ${expected.toFixed(2)}, got ${actual.toFixed(2)}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
