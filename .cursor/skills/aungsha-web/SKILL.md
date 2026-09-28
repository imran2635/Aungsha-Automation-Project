---
name: aungsha-web
description: >-
  Loads full Aungsha Playwright web automation context (POM map, specs, npm
  scripts, env keys, Cloud9/bKash/ShurjoPay/campaign flows, chat decisions)
  from prior work on E:\Test. Use when the user says /aungsha-web, aungsha-web,
  /pw, continues Aungsha Playwright/staging work on another machine/chat, or
  asks to restore web test context / "sob data".
---

# /aungsha-web — Aungsha Playwright context pack

## User intent (verbatim)

tomar sathe ja kotha bolechi and code base read kore skill file genarte koro jeno pore kothaset korte pari

## When invoked

1. Read [reference.md](reference.md) immediately.
2. Prefer existing POM pages/tests over new scripts.
3. Answer and code as if this chat’s decisions and repo layout are already known.
4. Do not re-ask for stack, baseURL, flows, or file locations already listed below / in reference.
5. Related mobile Appium project uses `/compet` — this skill is **web Playwright only**.

## Hard rules (from this project’s chats)

- Reuse existing page classes and methods. No duplicate code or duplicate methods.
- OOP + POM: pages under `pages/`, specs under `tests/`, helpers under `services/`. Locators stay inside page classes.
- Extend `BasePage`. Minimum code for the task — do not rewrite unchanged files or dump full files unless asked.
- Prefer Bangla/Banglish short replies when the user writes that way.
- After adding/changing flows: update `FLOW-DOCUMENTATION.md` (English) and add npm script in `package.json` when needed.
- Allure: use `allure-playwright` / `allure-js-commons` in specs; report via `npm run allure:*`.
- Headed by default; `$env:HEADLESS='true'` for headless. PowerShell: `npm.cmd` / `npx.cmd`.
- Checkpoint logs: `✅ … PASSED` style console messages in flows.
- Never commit `.env`, credentials, or downloaded PDFs. Never invent new payment sandboxes — use existing page methods.
- Staging mutates data (signup / buy / sell / withdrawal / referral / support) — warn before bulk runs.
- Project under purchase tests is usually **Cloud 9 (Inani)** unless user says otherwise.
- Default bKash number everywhere: `01929918378` (`BKASH_SANDBOX_PHONE` / `WITHDRAWAL_BKASH_NUMBER` / checkout phone fallbacks).

## Stack

- Playwright Test (`@playwright/test` ^1.54 / lock ~1.62) + Desktop Chrome
- CommonJS page objects + Allure reporter
- App: staging `https://staging.aungsha.com` (locale `/en/...`)
- Repo: `E:\Test` → GitHub `https://github.com/imran2635/Aungsha-Automation-Project.git` (branch `main`)

## Run (Windows PowerShell)

```powershell
Set-Location 'E:\Test'
npm.cmd install
npx.cmd playwright install chromium

# set env vars (names in reference) then e.g.:
npm.cmd run buy-flow
npm.cmd run project-buy-bkash
npm.cmd run all-types-payment-method
npm.cmd run campaign-code-flow
npm.cmd run allure:report
```

Payment suite by type:

```powershell
npx.cmd playwright test tests/all-types-payment-method.spec.js -g "POSITIVE" --headed --reporter=list
```

## Key paths

| Role | Path |
|------|------|
| Config | `playwright.config.js` |
| Docs | `FLOW-DOCUMENTATION.md`, `README.md` |
| Pages | `pages/*.js` (extend `BasePage`) |
| Mail | `services/MailTmClient.js` |
| Specs | `tests/*.spec.js` |
| Downloads | `downloads/` (gitignored) |
| Cloud9 checkout | `pages/Cloud9CheckoutPage.js` |
| Auth | `pages/AuthPage.js` |
| Campaign | `tests/campaign-code-flow.spec.js` |
| Payment matrix | `tests/all-types-payment-method.spec.js` |

## Flows to know

- **Login**: `AuthPage.login` / `loginSimple`
- **Buy ShurjoPay**: Projects → Cloud 9 → `Cloud9CheckoutPage` → `completeShurjoPay`
- **Buy bKash**: same → `selectBkashPayment` → `completeBkashSandbox` → invoice/cert downloads
- **Fund Balance**: `selectFundBalance` → `confirmWithFunds`
- **Payment matrix**: 27 cases POSITIVE / NEGATIVE / BOUNDARY / ECPA in `all-types-payment-method.spec.js`
- **Campaign DUSTUDENT10**: 2 signup paths (home modal vs manual apply) → verify MailTm → Funds ≥ BDT 200
- **Marketplace / sell / withdrawal / referral / support / holding**: see reference

## More detail

See [reference.md](reference.md) for full tree, env key names, page method map, npm scripts, and chat decisions timeline.
