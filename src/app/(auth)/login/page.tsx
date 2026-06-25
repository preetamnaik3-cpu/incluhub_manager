import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div className="text-neutral-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
