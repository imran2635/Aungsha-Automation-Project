# Aungsha Playwright Test Runbook

This document is based directly on the current `tests/*.spec.js` files and the
commands defined in `package.json`. The repository currently contains **11
Playwright test files**, with **one Playwright test case per file**.

## Flow Execution Videos

Recorded browser executions for the automated flows are available here:

**[Watch All Aungsha Automation Flow Videos](https://drive.google.com/drive/folders/1K-MJ-Z_h0eJSgmpR3jANx9NWWAkXFc15?usp=sharing)**

Google Drive access must be set to **Anyone with the link** and the role must
be **Viewer**. This allows GitHub visitors and project stakeholders to watch
the videos without signing in or requesting access.

## Executive Summary

| Report item | Result |
|---|---:|
| Total automated tests available | **11** |
| Full end-to-end tests executed in this work session | **4** |
| Final successful results | **4 Passed** |
| Final failed results | **0 Failed** |
| Tests not executed in this session | **7 Not Run** |
| Documented checkpoints in the four verified flows | **47** |

### Verified Flows

| Flow | Final status | Documented checkpoints |
|---|---|---:|
| Cloud 9 sandbox buy flow | **PASSED** | 10 |
| Project buy sell to Aungsha | **PASSED** | 7 |
| Project buy sell to market place | **PASSED** | 18 |
| Project Buy to Market place | **PASSED** | 12 |
| **Verified total** | **4 Passed / 0 Failed** | **47** |

> “Not Run” does not mean failed. The remaining seven tests are available in
> the repository but were not executed during this documentation session to
> avoid unnecessary state-changing operations.

## Understanding the Counts

- **Playwright cases** means the number of `test(...)` blocks.
- **PASSED checkpoints** means explicit `PASSED` console messages in the source.
- `1 passed` means the complete Playwright test case finished successfully.
- The withdrawal and referral flows contain conditional branches, so every
  checkpoint in their source will not necessarily appear during one run.
- Tests without explicit PASSED logs still use assertions. Playwright displays
  `1 passed` when the complete test finishes successfully.

## One-Time Setup

Run the following commands from PowerShell:

```powershell
cd E:\Test
npm.cmd install
npx.cmd playwright install chromium
```

The examples use `SLOW_MO=2500`, which adds approximately 2.5 seconds between
browser actions so the flow is easy to follow.

> Warning: Although these are staging sandbox tests, signup, purchase, sell,
> listing, referral, support-ticket, and withdrawal flows modify account data.

---

## Complete Test Inventory

| # | npm command | Test title | Cases | PASSED checkpoints | Execution status |
|---:|---|---|---:|---:|---|
| 1 | `signup` | create an Aungsha account with email | 1 | 0 | Not run |
| 2 | `login` | log in to Aungsha with email | 1 | 0 | Not run separately |
| 3 | `project-details` | open the prebook project details page | 1 | 5 | Not run |
| 4 | `buy-flow` | complete the Cloud 9 sandbox buy flow | 1 | 10 | **1 passed** |
| 5 | `holding-details` | download holding documents and open property details | 1 | 9 | Not run |
| 6 | `aungsha-sell-flow` | Project buy sell to Aungsha | 1 | 7 | **1 passed** |
| 7 | `marketplace-flow` | Project buy sell to market place | 1 | 18 | **1 passed** |
| 8 | `marketplace-buy-flow` | Project Buy to Market place | 1 | 12 | **1 passed** |
| 9 | `referral-flow` | complete referral rewards flow through referred purchase | 1 | 3 source locations; conditional | Not run |
| 10 | `support-ticket-flow` | submit a customer support ticket and view its message | 1 | 0 | Not run |
| 11 | `withdrawal-flow` | complete a new instant withdrawal with bKash | 1 | 18 source locations; conditional | Not run |

There are **11 Playwright test cases** in total. The source contains **82
explicit PASSED log locations**. Because some logs belong to alternative or
conditional branches, all 82 are not expected to print in a single run.

---

## 1. Signup

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run signup -- --reporter=line
```

### Source-Based Verification

1. Opens the English home page.
2. Opens the signup page.
3. Enters the email and password.
4. Selects the terms checkbox.
5. Verifies navigation or the email/OTP verification step after submission.

Explicit PASSED logs: **0**. Expected successful Playwright result: `1 passed`.

Script: `tests/signup.spec.js`

---

## 2. Login

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run login -- --reporter=line
```

### Source-Based Verification

1. Opens the sign-in page.
2. Selects the email login method.
3. Enters the email and password.
4. Verifies that the browser leaves the sign-in URL after submission.

Explicit PASSED logs: **0**. Expected successful Playwright result: `1 passed`.

Script: `tests/login.spec.js`

---

## 3. Prebook Project Details

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run project-details -- --reporter=line
```

### PASSED Checkpoints — 5

1. Sign-in page opened.
2. Login successful.
3. Projects page opened.
4. Purbachal Hill City prebook link found.
5. Prebook checkout page opened.

Script: `tests/project-details.spec.js`

---

## 4. Cloud 9 Sandbox Buy Flow

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run buy-flow -- --reporter=line
```

### PASSED Checkpoints — 10

1. Sign-in page opened.
2. Login successful.
3. Projects page opened.
4. Cloud 9 details page opened.
5. Checkout page opened.
6. Checkout information completed.
7. Payment method drawer opened.
8. ShurjoPay Sandbox opened.
9. Sandbox payment successful.
10. Full project buy flow completed.

Latest verified result: **1 passed**.

Script: `tests/buy-flow.spec.js`

---

## 5. Holding Documents and Property Details

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run holding-details -- --reporter=line
```

### PASSED Checkpoints — 9

1. Sign-in page opened.
2. Login successful.
3. Latest paid transaction details opened.
4. Paid purchase documents page opened.
5. Invoice downloaded.
6. Ownership Certificate downloaded.
7. My Property Holdings page opened.
8. Cloud 9 holding details page opened.
9. Holding details flow completed.

Downloaded files are stored in `E:\Test\downloads\`.

Script: `tests/holding-details.spec.js`

---

## 6. Project Buy Sell to Aungsha

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run aungsha-sell-flow -- --reporter=line
```

### PASSED Checkpoints — 7

1. Cookie consent handled.
2. Login successful.
3. Cloud 9 project details opened.
4. One Cloud 9 unit purchased.
5. One Cloud 9 unit sold to Aungsha.
6. Funds page verified.
7. Cloud 9 portfolio details page opened.

Latest verified result: **1 passed**.

Script: `tests/project-buy-sell-to-aungsha.spec.js`

---

## 7. Project Buy Sell to Marketplace

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run marketplace-flow -- --reporter=line
```

### PASSED Checkpoints — 18

1. Cookie consent handled.
2. Login successful.
3. Cloud 9 project details opened.
4. Checkout page opened.
5. Checkout information completed.
6. ShurjoPay sandbox opened.
7. One Cloud 9 unit purchased.
8. Cloud 9 portfolio details opened.
9. Go to marketplace selected.
10. Newly purchased one-unit reservation selected.
11. Marketplace resale offer created at the configured asking price.
12. Listing active in Dashboard My Listings.
13. Home opened from Dashboard My Listings.
14. Marketplace opened from Home.
15. Marketplace My Listings selected.
16. Listing visible in Marketplace My Listings.
17. Dashboard opened.
18. Final Cloud 9 portfolio details page opened.

Latest verified result: **1 passed**.

The default asking price is BDT 1,500. To change it:

```powershell
$env:MARKETPLACE_ASKING_PRICE='1800'
$env:SLOW_MO='2500'; npm.cmd run marketplace-flow -- --reporter=line
```

Script: `tests/project-buy-sell-to-marketplace.spec.js`

---

## 8. Project Buy from Marketplace

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run marketplace-buy-flow -- --reporter=line
```

### PASSED Checkpoints — 12

1. Cookie consent handled.
2. Login successful.
3. Marketplace opened.
4. Random purchasable third-party share selected.
5. Marketplace checkout opened.
6. ShurjoPay sandbox opened.
7. Marketplace share purchased.
8. Invoice downloaded.
9. Ownership certificate downloaded.
10. My Property Holdings opened.
11. Purchased project visible in holdings.
12. Purchased project holding details verified.

If document generation is delayed, the script displays `[WAITING]` and retries
up to three times. Downloaded files are stored in `E:\Test\downloads\`.

Latest verified result: **1 passed**.

Script: `tests/project-buy-from-marketplace.spec.js`

---

## 9. Referral Rewards Flow

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run referral-flow -- --reporter=line
```

### Source-Based Verification

1. Logs in to the referrer account.
2. Verifies the Referral Rewards page and captures the referral URL.
3. Creates a temporary Mail.tm account.
4. Signs up through the referral link.
5. Completes email OTP or link verification.
6. Purchases Cloud 9 through the referred account.
7. Verifies increases in referral totals, successful referrals, and cashback.
8. Verifies full referral flow completion.

The default is `REFERRAL_COUNT=1`. A PASSED message is printed for every referred
account. Providing `RECOVER_EMAIL` enables an additional conditional recovery
checkpoint. The source contains **three PASSED message locations**.

Example with three referred accounts:

```powershell
$env:REFERRAL_COUNT='3'
$env:SLOW_MO='2500'; npm.cmd run referral-flow -- --reporter=line
```

Script: `tests/referral-rewards-flow.spec.js`

---

## 10. Customer Support Ticket Flow

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run support-ticket-flow -- --reporter=line
```

### Source-Based Verification

1. Completes login with retry handling.
2. Opens the Support Tickets page and verifies the Support heading.
3. Opens the New Ticket dialog.
4. Enters the phone number, category, title, and description.
5. Submits the ticket and verifies that the dialog closes.
6. Verifies that the ticket row is visible with Open or Pending status.
7. Opens the ticket details URL.
8. Verifies the exact ticket title.
9. Verifies the exact submitted message.

Explicit PASSED logs: **0**. The script prints the verified title and message;
the expected successful Playwright result is `1 passed`.

Optional overrides:

```powershell
$env:SUPPORT_CATEGORY='Technical'
$env:SUPPORT_TICKET_TITLE='My test ticket'
$env:SUPPORT_TICKET_MESSAGE='Test issue description'
```

Script: `tests/customer-support-ticket-flow.spec.js`

---

## 11. Withdrawal Flow

### Command

```powershell
$env:SLOW_MO='2500'; npm.cmd run withdrawal-flow -- --reporter=line
```

### Source PASSED Checkpoint Locations — 18

1. Sign-in page opened.
2. Login successful.
3. Existing pending withdrawal detected, when applicable.
4. My Portfolio opened, when unit conversion is required.
5. Portfolio holding details opened.
6. Instant Withdraw option selected.
7. Unit converted to withdrawable funds, when required.
8. Existing converted funds detected and duplicate conversion skipped.
9. Withdrawal payment-method dialog opened.
10. Existing bKash method removed, when requested.
11. New bKash method added, when required.
12. Withdrawal verification OTP sent, when required.
13. Verified bKash method selected.
14. Pending withdrawal amount verified.
15. Instant withdrawal completed.
16. Full withdrawal flow completed.

The source contains **18 PASSED log statements**, but the logical list contains
16 steps because two completion messages exist in alternative branches. Early
returns and alternative branches mean all messages will not print in one run.

The default withdrawal amount is BDT 1,400. The OTP can be supplied through an
environment variable or `E:\Test\withdrawal-otp.txt`.

```powershell
$env:WITHDRAWAL_AMOUNT='1400'
$env:WITHDRAWAL_OTP='123456'
$env:SLOW_MO='2500'; npm.cmd run withdrawal-flow -- --reporter=line
```

Script: `tests/withdrawal-flow.spec.js`

---

## Run All Tests

```powershell
$env:SLOW_MO='2500'; npx.cmd playwright test --headed --reporter=line
```

This command runs all 11 tests and may create multiple state-changing
transactions. Running one flow at a time is safer and easier to review.

## Headless Example

The npm scripts include `--headed`. Use a direct command for a headless run:

```powershell
$env:HEADLESS='true'; npx.cmd playwright test tests/login.spec.js --reporter=line
```

## Understanding Terminal Results

- `[PASSED]` or `✅ ... PASSED`: an explicit successful checkpoint.
- `[WAITING]`: a retry is in progress; this is not a failure.
- `1 passed`: the complete Playwright test case passed.
- `1 failed`: an action or assertion failed; the terminal displays screenshot
  and trace paths for investigation.

---

## Final Result — Project Manager Summary

```text
Total automated tests available : 11
Tests executed and verified      : 4
Passed                           : 4
Failed                           : 0
Not run in this session          : 7
Verified flow checkpoints        : 47

FINAL STATUS: 4/4 EXECUTED FLOWS PASSED
```

### Conclusion

All four purchase and sell flows included in the execution scope completed
successfully. No executed flow has a final failed result. The remaining seven
tests are available and discoverable by Playwright but were not executed in
this session, so they are not counted as passed or failed.
