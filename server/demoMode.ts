export const SYNTHETIC_DEMO_EMAIL = "demo.reviewer@fir-saathi.example";
export const SYNTHETIC_DEMO_PUBLIC_ID = "FS-DEMO1KYC";

export function isSyntheticDemoReviewer(user: { email: string | null } | null | undefined) {
  return user?.email?.trim().toLowerCase() === SYNTHETIC_DEMO_EMAIL;
}
