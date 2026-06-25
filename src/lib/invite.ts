import type { SupabaseClient } from "@supabase/supabase-js";

export const PENDING_INVITE_KEY = "inclu_pending_invite";

export function storePendingInvite(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(PENDING_INVITE_KEY, token);
  }
}

export function clearPendingInvite() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PENDING_INVITE_KEY);
  }
}

export function getPendingInvite(urlToken: string | null) {
  if (urlToken) return urlToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem(PENDING_INVITE_KEY);
  }
  return null;
}

export async function redeemInviteIfPresent(
  supabase: SupabaseClient,
  token: string | null
) {
  if (!token) return { redeemed: false as const };

  const { error } = await supabase.rpc("redeem_invite", {
    invite_token: token,
  });

  if (error) {
    return { redeemed: false as const, error: error.message };
  }

  clearPendingInvite();
  return { redeemed: true as const };
}
