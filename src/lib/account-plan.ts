export const ACCOUNT_PLANS = ["free", "pro"] as const;

export type AccountPlan = (typeof ACCOUNT_PLANS)[number];

export const PRO_REQUIRED_MESSAGE =
  "Esta funcionalidad está disponible con el plan Pro.";

export function normalizeAccountPlan(
  value: string | null | undefined,
): AccountPlan {
  return value === "pro" ? "pro" : "free";
}

export function hasProAccess(plan: AccountPlan) {
  return plan === "pro";
}
