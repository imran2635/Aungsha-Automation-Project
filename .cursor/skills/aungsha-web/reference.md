# /aungsha-web reference — full codebase + chat decisions

## Repo root

`E:\Test` (package `aungsha-signup-playwright`)  
GitHub: `https://github.com/imran2635/Aungsha-Automation-Project.git` · default branch `main`

Sibling skill: `/compet` = Appium/WebdriverIO **mobile** repo — do not mix paths.

## Source tree

```
E:\Test\
  package.json / package-lock.json
  playwright.config.js          # baseURL staging, Allure, HEADLESS/SLOW_MO
  README.md
  FLOW-DOCUMENTATION.md         # runbook + checkpoints (English)
  pages/
    BasePage.js                 # goto(path); default baseUrl staging
    AuthPage.js                 # openSignIn, login, loginSimple, cookies
    SignUpPage.js               # open, createAccountWithEmail, signUpWithReferral
    VerificationPage.js         # complete (OTP or verification URL)
    ProjectsPage.js             # open, openCloud9Details, openPurbachalCheckout
    Cloud9CheckoutPage.js       # phone, drawer, bKash / ShurjoPay / funds, buy()
    MarketplacePage.js          # purchasable cards, ShurjoPay, downloads, My Listings
    PortfolioPage.js            # holdings, sellToAungsha, marketplace list, convertUnitToFunds
    FundsPage.js                # my-points, balances, withdraw button
    WithdrawalPage.js           # bKash withdraw dialog + OTP file support
    ListingsPage.js             # active listing asserts / nav
    TransactionsPage.js         # + PaymentSuccessPage (invoice/cert downloads)
    ReferralRewardsPage.js      # metrics, referral URL, waitForMetricsIncrease
    SupportTicketsPage.js       # create / negative ticket cases
  services/
    MailTmClient.js             # api.mail.tm temp mailbox + verification wait
  tests/
    signup.spec.js
    login.spec.js
    project-details.spec.js
    buy-flow.spec.js                      # Cloud 9 · ShurjoPay
    project-buy-bkash.spec.js             # Cloud 9 · bKash + downloads
    all-types-payment-method.spec.js      # 27 cases matrix
    campaign-code-flow.spec.js            # DUSTUDENT10 · 2 signup flows
    fund-balance-test-suite.spec.js
    customer-support-ticket-flow.spec.js
    project-buy-from-marketplace.spec.js
    project-buy-sell-to-aungsha.spec.js
    project-buy-sell-to-marketplace.spec.js
    withdrawal-flow.spec.js
    referral-rewards-flow.spec.js
    holding-details.spec.js
  downloads/                    # runtime PDFs (gitignored)
  allure-results/ / allure-report/
  playwright-report/ / test-results/
```

Note: `FLOW-DOCUMENTATION.md` inventory may lag (e.g. campaign-code-flow added later) — trust `package.json` + `tests/` as live source, then update the doc.

## npm scripts

| Script | Spec |
|--------|------|
| `signup` | signup.spec.js |
| `login` | login.spec.js |
| `project-details` | project-details.spec.js |
| `buy-flow` | buy-flow.spec.js |
| `project-buy-bkash` | project-buy-bkash.spec.js |
| `all-types-payment-method` | all-types-payment-method.spec.js |
| `campaign-code-flow` | campaign-code-flow.spec.js |
| `fund-balance-suite` | fund-balance-test-suite.spec.js |
| `support-ticket-flow` | customer-support-ticket-flow.spec.js |
| `marketplace-buy-flow` | project-buy-from-marketplace.spec.js |
| `aungsha-sell-flow` | project-buy-sell-to-aungsha.spec.js |
| `marketplace-flow` | project-buy-sell-to-marketplace.spec.js |
| `withdrawal-flow` | withdrawal-flow.spec.js |
| `referral-flow` | referral-rewards-flow.spec.js |
| `holding-details` | holding-details.spec.js |
| `test` | all specs |
| `allure:generate` / `allure:open` / `allure:serve` / `allure:report` | Allure |

Most flow scripts run `--headed`. Payment + campaign use `--reporter=list`.

## Env keys (names only — never store secrets in skill)

**Runner:** `HEADLESS`, `SLOW_MO`

**Auth / checkout:** `AUNGSHA_EMAIL`, `AUNGSHA_PASSWORD`, `AUNGSHA_PHONE`, `SHURJOPAY_PIN`

**bKash sandbox:** `BKASH_SANDBOX_PHONE` (default `01929918378`), `BKASH_SANDBOX_OTP`, `BKASH_SANDBOX_PIN`  
**Withdrawal bKash:** `WITHDRAWAL_BKASH_NUMBER` (default `01929918378`)

**Campaign:** `CAMPAIGN_CODE` (default `DUSTUDENT10`), `SIGNUP_PASSWORD`, `SIGNUP_FULL_NAME`

**Support:** `SUPPORT_CATEGORY`, `SUPPORT_TICKET_TITLE`, `SUPPORT_TICKET_MESSAGE`

**Marketplace sell:** `MARKETPLACE_ASKING_PRICE`, `MARKETPLACE_RESUME_AFTER_PURCHASE`

**Withdrawal:** `WITHDRAWAL_ACCOUNT_HOLDER`, `WITHDRAWAL_BKASH_NUMBER`, `WITHDRAWAL_AMOUNT`, `WITHDRAWAL_OTP` (or file `withdrawal-otp.txt`), `WITHDRAWAL_FORCE_FULL_FLOW`, `WITHDRAWAL_STATUS_ONLY`, `WITHDRAWAL_RESET_SAVED_METHOD`, `WITHDRAWAL_FORCE_UNIT_CONVERSION`

**Referral:** `REFERRED_PASSWORD`, `REFERRED_FIRST_NAME`, `REFERRED_LAST_NAME`, `REFERRAL_COUNT`, `REFERRAL_STATUS_ONLY`, `REFERRAL_RECOVER_EMAIL`, `REFERRAL_RECOVER_OTP`

Copy-paste run examples with values live in local `FLOW-DOCUMENTATION.md` only — do not paste passwords into new commits or skills.

## URLs

| Use | Value |
|-----|--------|
| Base | `https://staging.aungsha.com` |
| Sign-in | `/en/sign-in` |
| Sign-up | `/en/sign-up`, home `/en` |
| Projects / Cloud 9 | `/en/projects` → Cloud 9 (Inani) details/checkout |
| Funds | `/en/dashboard/my-points` |
| bKash sandbox | `sandbox.payment.bkash.com` |
| ShurjoPay sandbox | `sandbox.securepay.shurjopayment.com` |
| Mail API | `https://api.mail.tm` |
| Demo videos | Google Drive folder linked from README / FLOW doc |

## Key page method map

- **AuthPage**: `openSignIn`, `handleCookieConsent`, `fillCredentials`, `submitLogin`, `loginSimple`, `login` (retry + `access_token` cookie)
- **Cloud9CheckoutPage**: `openCheckoutFromDetails`, `fillCheckoutInfo`, `openPaymentDrawer`, `selectDigitalPayment`, `selectBkashPayment`, `selectFundBalance`, `confirmWithFunds`, `completeBkashSandbox`, `completeShurjoPay`, `buy`
- **MarketplacePage**: `selectRandomPurchasable`, `openCheckout`, `completeShurjoPay`, `downloadInvoiceAndCertificate`, `openMyListingsTab`
- **PortfolioPage**: `openCloud9Details`, `sellToAungsha`, `selectMarketplaceAndList`, `convertUnitToFunds`
- **PaymentSuccessPage** (in TransactionsPage.js): `downloadInvoice`, `downloadCertificate`, `downloadOwnershipCertificateByTitle`
- **MailTmClient**: `createTempMailbox`, `waitForVerificationMail`

## Canonical flows (method-level)

1. **ShurjoPay buy**: Auth → Projects.open → openCloud9Details → fillCheckoutInfo → openPaymentDrawer → selectDigitalPayment → completeShurjoPay
2. **bKash buy**: same → selectBkashPayment → completeBkashSandbox → success page downloads under `downloads/`
3. **Fund balance buy**: drawer → selectFundBalance → confirmWithFunds
4. **Campaign Flow 1**: `/en` → wait for modal → “Get 200 Credits Now” → Register path → apply/type `DUSTUDENT10` where UI requires → MailTm verify → dashboard → Funds ≥ 200
5. **Campaign Flow 2**: `/en/sign-up` → Full Name / email / password first → open “Apply Referral or Campaign Code” dropdown → type `DUSTUDENT10` → verify → Funds
6. **Payment matrix**: POSITIVE (3) + NEGATIVE (4) + BOUNDARY (phone/funds) + ECPA partitions on Cloud 9 checkout
7. **Sell to Aungsha / Marketplace list / Marketplace buy / Withdrawal / Referral / Support / Holding details**: orchestrated in matching specs using Portfolio/Funds/Withdrawal/Marketplace/Support/Transactions pages

## Chat decisions timeline (E:\Test)

1. Full codebase read; Fund Balance Cloud 9 purchase suite created; login via staging account env vars; “js file akta raikho”.
2. `buy-flow.spec.js` run with ShurjoPay sandbox; user asked for terminal run commands to keep.
3. Support ticket positives/negatives; fail diagnosis; re-runs.
4. User: **“oop use koro”** → reinforce POM/OOP; Allure added to Playwright; buy-flow wired into Allure; later “sob gulo allure report a add koro”.
5. bKash buy flow: sandbox phone/OTP/PIN → `project-buy-bkash.spec.js` + invoice & ownership certificate download → update FLOW-DOCUMENTATION.
6. `all-types-payment-method.spec.js`: 3 main pays (bKash, ShurjoPay, Fund Balance) on Cloud 9 Inani → then POSITIVE/NEGATIVE → BOUNDARY → ECPA (“critical gulo miss korba na”).
7. FLOW-DOCUMENTATION: English only; include terminal pass/fail visibility + run commands; LinkedIn SQA post drafts from coverage (user iterated headlines).
8. **Campaign code** (`DUSTUDENT10`, BDT 200): two flows (home modal vs sign-up apply). Decisions:
   - URLs `/en` and `/en/sign-up?next=%2Fen`
   - Modal: after load, click **Get 200 Credits Now** (faster wait once visible); Flow-1 cookies not required as a separate must
   - Flow-2: Full Name / email / password **then** open Apply Referral/Campaign Code dropdown and type code so automation is visible
   - Fix dropdown apply; both flows one npm script `campaign-code-flow`
9. User later asked campaign-code-flow to also drive project buy via bKash + digital (ShurjoPay) for flow 1 & 2 — treat as follow-on product ask; check current `campaign-code-flow.spec.js` before assuming buy steps are already merged.
10. Prefer Banglish replies; give copy-paste PowerShell commands when asked “run command dao”.

## Coding preferences for future agents

- Inspect existing pages/tests before creating anything new.
- One concern per file; reuse `Cloud9CheckoutPage` for any Cloud 9 payment work.
- Keep `FLOW-DOCUMENTATION.md` and `package.json` scripts in sync when adding flows.
- Prefer `expect` / `expect.poll` / retries over blind long sleeps; short waits only when UI (modal) truly needs them.
- Do not revive monolithic non-POM scripts as the primary path.
- Demo videos Drive folder stays public Viewer link in README/FLOW doc.

## Demo / docs links

- Flow videos: see README “View All Automation Flow Videos” Drive folder.
