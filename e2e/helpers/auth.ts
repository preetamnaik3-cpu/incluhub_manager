import { expect, type Page } from "@playwright/test";

export type E2ERole = "super_admin" | "manager" | "editor" | "viewer" | "client";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function credentialsFor(role: E2ERole): { email: string; password: string } {
  switch (role) {
    case "super_admin":
      return {
        email: requireEnv("E2E_SUPER_ADMIN_EMAIL"),
        password: requireEnv("E2E_SUPER_ADMIN_PASSWORD"),
      };
    case "manager":
      return {
        email: requireEnv("E2E_MANAGER_EMAIL"),
        password: requireEnv("E2E_MANAGER_PASSWORD"),
      };
    case "editor":
    case "viewer":
    case "client":
      return {
        email: requireEnv(`E2E_${role.toUpperCase()}_EMAIL`),
        password: requireEnv("E2E_TEST_PASSWORD"),
      };
  }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

export async function loginAs(page: Page, role: E2ERole) {
  const { email, password } = credentialsFor(role);
  await login(page, email, password);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}
