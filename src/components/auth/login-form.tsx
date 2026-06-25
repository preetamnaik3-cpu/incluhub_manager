"use client";

import { createClient } from "@/lib/supabase/client";
import { COPY } from "@/lib/roles";
import {
  getPendingInvite,
  PENDING_INVITE_KEY,
  redeemInviteIfPresent,
  storePendingInvite,
} from "@/lib/invite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

export function LoginForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const authError = searchParams.get("error");
  const [isSignUp, setIsSignUp] = useState(!!inviteToken);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const hasStoredInvite = useSyncExternalStore(
    () => () => {},
    () => !!localStorage.getItem(PENDING_INVITE_KEY),
    () => false
  );
  const hasPendingInvite = !!inviteToken || hasStoredInvite;

  useEffect(() => {
    if (inviteToken) storePendingInvite(inviteToken);
  }, [inviteToken]);

  useEffect(() => {
    if (authError === "profile_missing") {
      toast.error(
        "Your account exists but has no profile yet. Ask an admin to fix this, or sign up again after the database trigger is set up."
      );
    }
  }, [authError]);

  async function finishAuth(supabase: ReturnType<typeof createClient>, userId: string) {
    const token = getPendingInvite(inviteToken);
    if (token) {
      const result = await redeemInviteIfPresent(supabase, token);
      if (result.redeemed) {
        toast.success("Invite applied — your role is set!");
      } else if (result.error) {
        toast.error(`Invite not applied: ${result.error}`);
        toast.message("Ask your admin to set your role in Admin → Users & Roles.");
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      toast.error(
        "Signed in but profile was not created. Run the profile SQL fix in Supabase, then sign in again."
      );
      await supabase.auth.signOut();
      return;
    }

    toast.success("Welcome to inclu_manager!");
    window.location.href = "/dashboard";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignUp) {
        if (inviteToken) storePendingInvite(inviteToken);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (!data.session || !data.user) {
          if (inviteToken) storePendingInvite(inviteToken);
          toast.success(
            "Account created! Confirm your email if asked, then sign in — your Manager role will apply on login."
          );
          setIsSignUp(false);
          return;
        }

        await finishAuth(supabase, data.user.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("Sign in failed");

        await finishAuth(supabase, data.user.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            inclu_manager
          </h1>
          <p className="mt-1 text-xs text-neutral-400">by Incluhub</p>
          <p className="mt-4 text-sm text-neutral-500">{COPY.tagline}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label
                htmlFor="login-full-name"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Full name
              </label>
              <Input
                id="login-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          )}
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@incluhub.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {authError === "profile_missing" && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Account setup incomplete. Run the profile fix SQL in Supabase (see README), then sign in again.
            </p>
          )}

          {hasPendingInvite && (
            <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">
              Invite link active — your assigned role applies when you finish sign up or sign in.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Have an invite? Sign up"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
