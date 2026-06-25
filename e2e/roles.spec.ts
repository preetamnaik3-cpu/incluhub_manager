import { test, expect } from "@playwright/test";
import { loginAs, logout, requireEnv } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  requireEnv("E2E_SUPER_ADMIN_EMAIL");
  requireEnv("E2E_SUPER_ADMIN_PASSWORD");
  requireEnv("E2E_MANAGER_EMAIL");
  requireEnv("E2E_MANAGER_PASSWORD");
  requireEnv("E2E_TEST_PASSWORD");
  requireEnv("E2E_EDITOR_EMAIL");
  requireEnv("E2E_VIEWER_EMAIL");
  requireEnv("E2E_CLIENT_EMAIL");
});

test.describe("Role matrix — production access control", () => {
  test("super_admin sees Admin and all projects", async ({ page }) => {
    await loginAs(page, "super_admin");
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
    await expect(page.getByText("Super Admin")).toBeVisible();

    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page.getByText("Elvix")).toBeVisible();
    await expect(page.getByText("Kosara")).toBeVisible();

    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page).toHaveURL(/\/admin/);
    await logout(page);
  });

  test("manager sees projects but not Admin", async ({ page }) => {
    await loginAs(page, "manager");
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();
    await expect(page.getByText("Manager")).toBeVisible();

    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page.getByText("Elvix")).toBeVisible();
    await expect(page.getByText("Kosara")).toBeVisible();
    await logout(page);
  });

  test("editor sees assigned board and can add tasks", async ({ page }) => {
    await loginAs(page, "editor");
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();
    await expect(page.getByText("Editor")).toBeVisible();

    const boardLink = page.getByRole("link", { name: /board/i }).first();
    await expect(boardLink).toBeVisible();
    await boardLink.click();
    await expect(page.getByRole("button", { name: "Add task" }).first()).toBeVisible();
    await logout(page);
  });

  test("viewer sees board but cannot add tasks or comment", async ({ page }) => {
    await loginAs(page, "viewer");
    await expect(page.getByText("Viewer")).toBeVisible();

    const boardLink = page.getByRole("link", { name: /board/i }).first();
    await expect(boardLink).toBeVisible();
    await boardLink.click();
    await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0);

    const task = page.getByRole("button", { name: /E2E editor assigned task/i });
    if (await task.count()) {
      await task.click();
      await expect(page.getByRole("heading", { name: "Task Details" })).toBeVisible();
      await expect(page.getByPlaceholder("Write a comment...")).toHaveCount(0);
      await page.locator("div.max-w-lg").getByRole("button").first().click();
    }
    await logout(page);
  });

  test("client sees project boards and can comment", async ({ page }) => {
    await loginAs(page, "client");
    await expect(page.getByText("Client")).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();

    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page.getByText("Elvix")).toBeVisible();

    const boardLink = page.getByRole("link", { name: /board/i }).first();
    if (await boardLink.count()) {
      await boardLink.click();
      const task = page.getByRole("button", { name: /E2E editor assigned task/i });
      if (await task.count()) {
        await task.click();
        await expect(page.getByPlaceholder("Write a comment...")).toBeVisible();
        await page.locator("div.max-w-lg").getByRole("button").first().click();
      }
    }
    await logout(page);
  });
});
