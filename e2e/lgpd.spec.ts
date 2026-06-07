import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD in .env.e2e");
  }
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
  await page.getByRole("button", { name: /entrar|sign in|login/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
    timeout: 20_000,
  });
}

test("cookie banner shows and persists choice", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/");
  const banner = page.getByTestId("cookie-consent-banner");
  await expect(banner).toBeVisible();
  await page.getByTestId("cookie-essential-only").click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.getByTestId("cookie-consent-banner")).toBeHidden();
});

test("consent: toggle analytics and save", async ({ page }) => {
  await login(page);
  await page.goto("/privacidade-dados");
  await expect(page.getByRole("heading", { name: /privacidade/i })).toBeVisible();
  // Toggle analytics switch (second switch on the page; first is functional disabled)
  const switches = page.getByRole("switch");
  await switches.nth(1).click();
  await page.getByRole("button", { name: /salvar prefer/i }).click();
  await expect(page.getByText(/preferências salvas/i)).toBeVisible({
    timeout: 10_000,
  });
});

test("export my data downloads JSON", async ({ page }) => {
  await login(page);
  await page.goto("/privacidade-dados");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 20_000 }),
    page.getByRole("button", { name: /baixar json/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/cleanops-meus-dados.*\.json$/);
});

test("export rate-limit triggers second time", async ({ page }) => {
  await login(page);
  await page.goto("/privacidade-dados");
  // first export (may already be limited if recent test ran; ignore)
  await page.getByRole("button", { name: /baixar json/i }).click().catch(() => {});
  // second export → must show error toast
  await page.getByRole("button", { name: /baixar json/i }).click();
  await expect(page.getByText(/limite atingido/i)).toBeVisible({
    timeout: 10_000,
  });
});

test("request deletion returns confirmation toast", async ({ page }) => {
  await login(page);
  await page.goto("/privacidade-dados");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /solicitar exclus/i }).click();
  await expect(page.getByText(/confirme em seu e-?mail|abrir link/i)).toBeVisible({
    timeout: 10_000,
  });
});