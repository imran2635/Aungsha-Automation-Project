# Aungsha Playwright Test Runbook

Based on `tests/*.spec.js` and `package.json` scripts.

| Report item | Count |
|---|---:|
| Test files | **14** |
| Playwright test cases | **52** |
| npm flow scripts | **14** |

---

## Flow Execution Videos

**[Watch All Aungsha Automation Flow Videos](https://drive.google.com/drive/folders/1K-MJ-Z_h0eJSgmpR3jANx9NWWAkXFc15?usp=sharing)**

Drive folder access: **Anyone with the link** → **Viewer**.

---

## One-Time Setup

```powershell
Set-Location 'E:\Test'
npm.cmd install
npx.cmd playwright install chromium
```

> **Warning:** signup, purchase, sell, listing, referral, support-ticket, and
> withdrawal flows modify staging account data.

---

## Complete Test Inventory

| # | npm command | Spec file | Cases |
|---:|---|---|---:|
| 1 | `signup` | signup.spec.js | 1 |
| 2 | `login` | login.spec.js | 1 |
| 3 | `project-details` | project-details.spec.js | 1 |
| 4 | `buy-flow` | buy-flow.spec.js | 1 |
| 5 | `project-buy-bkash` | project-buy-bkash.spec.js | 1 |
| 6 | `all-types-payment-method` | all-types-payment-method.spec.js | 27 |
| 7 | `fund-balance-suite` | fund-balance-test-suite.spec.js | 1 |
| 8 | `support-ticket-flow` | customer-support-ticket-flow.spec.js | 5 |
| 9 | `marketplace-buy-flow` | project-buy-from-marketplace.spec.js | 5 |
| 10 | `aungsha-sell-flow` | project-buy-sell-to-aungsha.spec.js | 5 |
| 11 | `marketplace-flow` | project-buy-sell-to-marketplace.spec.js | 1 |
| 12 | `withdrawal-flow` | withdrawal-flow.spec.js | 1 |
| 13 | `referral-flow` | referral-rewards-flow.spec.js | 1 |
| 14 | `holding-details` | holding-details.spec.js | 1 |
| | **Total** | | **52** |

---

## Understanding the Counts

- **Playwright cases** — number of `test(...)` blocks in the file.
- **PASSED checkpoints** — explicit `✅ ... PASSED` console messages from a run.
- `1 passed` / `5 passed` — Playwright runner result for the whole file.
- Conditional branches mean not every source checkpoint prints in every run.

---

## Primary Flow Run Commands

Copy-paste ready PowerShell commands for the main flows.

### 1. Buy Flow (Cloud 9 · ShurjoPay)

```powershell
$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'; $env:AUNGSHA_PASSWORD='12345678'; $env:AUNGSHA_PHONE='01800000000'; $env:SHURJOPAY_PIN='1234'; $env:SLOW_MO='500'; npm.cmd run buy-flow -- --reporter=line
```

Script: `tests/buy-flow.spec.js` · Cases: 1 · Checkpoints: **11**

```
✅ 1.  Sign-in page opened
✅ 2.  Login successful
✅ 3.  Projects page opened
✅ 4.  Cloud 9 details page opened
✅ 5.  Checkout page opened
✅ 6.  Checkout information completed
✅ 7.  Payment method drawer opened
✅ 8.  Make Digital Payment selected
✅ 9.  ShurjoPay Sandbox opened
✅ 10. ShurjoPay sandbox payment successful
✅ 11. Full project buy flow completed
```

---

### 2. Buy Flow (Cloud 9 · bKash)

```powershell
$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'; $env:AUNGSHA_PASSWORD='12345678'; $env:AUNGSHA_PHONE='01770618575'; $env:BKASH_SANDBOX_PHONE='01770618575'; $env:BKASH_SANDBOX_OTP='123456'; $env:BKASH_SANDBOX_PIN='12121'; $env:SLOW_MO='400'; npm.cmd run project-buy-bkash -- --reporter=line
```

Script: `tests/project-buy-bkash.spec.js` · Cases: 1 · Checkpoints: **14**

```
✅ 1.  Sign-in page opened
✅ 2.  Login successful
✅ 3.  Projects page opened
✅ 4.  Cloud 9 details page opened
✅ 5.  Checkout page opened
✅ 6.  Checkout information completed
✅ 7.  Payment method drawer opened
✅ 8.  Pay with bKash selected
✅ 9.  bKash Sandbox opened
✅ 10. bKash sandbox payment successful
✅ 11. Purchase success page opened
✅ 12. Invoice downloaded
✅ 13. Ownership Certificate downloaded
✅ 14. Full project buy via bKash flow completed
```

Downloaded files: `E:\Test\downloads\`

---

### 3. All Types Payment Method (Positive · Negative · Boundary · ECPA)

Source: `tests/all-types-payment-method.spec.js`  
npm: `all-types-payment-method`  
Total Playwright cases: **27** (3 Positive · 4 Negative · 12 Boundary · 8 ECPA)

| Item | Value |
|---|---|
| Project under test | Cloud 9 (Inani) |
| Base URL | `https://staging.aungsha.com` |
| Download dir | `E:\\Test\\downloads\\` (Fund Balance certificate) |
| Reporter | `list` (each case shows `✓` / `✘` + final `N passed`) |

#### Environment variables (from the spec)

| Variable | Default / example | Used for |
|---|---|---|
| `AUNGSHA_EMAIL` | `imran.bponi@gmail.com` | Login |
| `AUNGSHA_PASSWORD` | `12345678` | Login |
| `AUNGSHA_PHONE` | `01770618575` | Checkout phone / ShurjoPay |
| `SHURJOPAY_PIN` | `1234` | ShurjoPay sandbox PIN |
| `BKASH_SANDBOX_PHONE` | `01770618575` | bKash sandbox wallet |
| `BKASH_SANDBOX_OTP` | `123456` | bKash sandbox OTP |
| `BKASH_SANDBOX_PIN` | `12121` | bKash sandbox PIN |
| `SLOW_MO` | `300` | Optional UI slowdown (ms) |

#### Full run command

```powershell
Set-Location 'E:\Test'

$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'
$env:AUNGSHA_PASSWORD='12345678'
$env:AUNGSHA_PHONE='01770618575'
$env:SHURJOPAY_PIN='1234'
$env:BKASH_SANDBOX_PHONE='01770618575'
$env:BKASH_SANDBOX_OTP='123456'
$env:BKASH_SANDBOX_PIN='12121'
$env:SLOW_MO='300'

npm.cmd run all-types-payment-method
```

#### Run by type

```powershell
npx.cmd playwright test tests/all-types-payment-method.spec.js -g "POSITIVE" --headed --reporter=list
npx.cmd playwright test tests/all-types-payment-method.spec.js -g "NEGATIVE" --headed --reporter=list
npx.cmd playwright test tests/all-types-payment-method.spec.js -g "BOUNDARY" --headed --reporter=list
npx.cmd playwright test tests/all-types-payment-method.spec.js -g "ECPA" --headed --reporter=list
```

#### How to read the terminal

| Signal | Meaning |
|---|---|
| `✓` next to case title | Case **PASSED** |
| `✘` / `×` next to case title | Case **FAILED** |
| `27 passed (Xm)` | Total passed count |
| `N failed` | Total failed count (if any) |
| `✅ … PASSED` | Step checkpoint from `console.log` in the spec |
| `test-results\...` | Failure screenshot / video / trace paths |

#### Expected Playwright list output (all 27 cases)

```
Running 27 tests using 1 worker

  ✓  ✅ POSITIVE 1 — Buy Cloud 9 via bKash sandbox
  ✓  ✅ POSITIVE 2 — Buy Cloud 9 via ShurjoPay sandbox
  ✓  ✅ POSITIVE 3 — Buy Cloud 9 via Fund Balance
  ✓  ❌ NEGATIVE 1 — Unauthenticated Cloud 9 checkout redirects to sign-in
  ✓  ❌ NEGATIVE 2 — Cloud 9 (Inani) visible with Buy Now in Projects
  ✓  ❌ NEGATIVE 3 — Payment drawer shows bKash, Digital Payment, and Fund Balance
  ✓  ❌ NEGATIVE 4 — Payment drawer closed until Buy is clicked
  ✓  🔲 BOUNDARY 1 — Phone empty (min-1) blocks or keeps invalid state
  ✓  🔲 BOUNDARY 2 — Phone too short (10 digits = min-1)
  ✓  🔲 BOUNDARY 3 — Phone exact valid length (11 digits = min/max)
  ✓  🔲 BOUNDARY 4 — Phone too long (12 digits = max+1)
  ✓  🔲 BOUNDARY 5 — Fund balance edges: balance >= 0 and price > 0
  ✓  🔲 BOUNDARY 6 — Payment method exclusivity + sandbox credential lengths
  ✓  🔲 BOUNDARY 7 — Phone with letters (non-numeric edge)
  ✓  🔲 BOUNDARY 8 — Phone with country code (+880 / 880) length edge
  ✓  🔲 BOUNDARY 9 — Phone whitespace-only (blank edge)
  ✓  🔲 BOUNDARY 10 — Invalid BD prefix (not 01x)
  ✓  🔲 BOUNDARY 11 — OTP/PIN credential length edges (min-1 / exact / max+1)
  ✓  🔲 BOUNDARY 12 — Use maximum fund amount equals purchase price edge
  ✓  🧩 ECPA 1 — CRITICAL Valid auth class reaches Cloud 9 checkout
  ✓  🧩 ECPA 2 — CRITICAL Invalid credentials class stays on sign-in
  ✓  🧩 ECPA 3 — CRITICAL Valid phone class (01x · 11 digits)
  ✓  🧩 ECPA 4 — CRITICAL Invalid phone class shows validation
  ✓  🧩 ECPA 5 — CRITICAL All valid payment-method classes selectable
  ✓  🧩 ECPA 6 — CRITICAL None-selected payment class blocks Make Payment
  ✓  🧩 ECPA 7 — CRITICAL Sufficient funds class enables Confirm
  ✓  🧩 ECPA 8 — CRITICAL Digital payment class enables Make Payment CTA

  27 passed (Xm)
```

#### Shared login → checkout helper checkpoints (printed by many cases)

```
✅ Sign-in page opened: PASSED
✅ Login successful: PASSED
✅ Projects page opened: PASSED
✅ Cloud 9 details page opened: PASSED
✅ Checkout page opened: PASSED
✅ Checkout information completed: PASSED
✅ Payment method drawer opened: PASSED
```

---

#### POSITIVE — terminal checkpoints (3 cases)

**POSITIVE 1 — Buy Cloud 9 via bKash sandbox**

```
✅ Sign-in page opened: PASSED
✅ Login successful: PASSED
✅ Projects page opened: PASSED
✅ Cloud 9 details page opened: PASSED
✅ Checkout page opened: PASSED
✅ Checkout information completed: PASSED
✅ Payment method drawer opened: PASSED
✅ Pay with bKash selected: PASSED
✅ bKash Sandbox opened: PASSED
✅ bKash sandbox payment successful: PASSED
✅ POSITIVE 1 — bKash project buy completed: PASSED
```

**POSITIVE 2 — Buy Cloud 9 via ShurjoPay sandbox**

```
✅ Sign-in page opened: PASSED
✅ Login successful: PASSED
✅ Projects page opened: PASSED
✅ Cloud 9 details page opened: PASSED
✅ Checkout page opened: PASSED
✅ Checkout information completed: PASSED
✅ Payment method drawer opened: PASSED
✅ Make Digital Payment selected: PASSED
✅ ShurjoPay Sandbox opened: PASSED
✅ ShurjoPay sandbox payment successful: PASSED
✅ POSITIVE 2 — ShurjoPay project buy completed: PASSED
```

**POSITIVE 3 — Buy Cloud 9 via Fund Balance**

```
✅ Sign-in page opened: PASSED
✅ Login successful: PASSED
✅ Projects page opened: PASSED
✅ Cloud 9 details page opened: PASSED
✅ Checkout page opened: PASSED
✅ Checkout information completed: PASSED
✅ Payment method drawer opened: PASSED
✅ Fund Balance option visible, available BDT <balance>: PASSED
✅ Fund Balance sufficient for purchase (BDT <balance> >= BDT <price>): PASSED
✅ Fund Balance payment method selected: PASSED
✅ Confirmed purchase with Fund Balance: PASSED
✅ Purchase successful — PAID / Paid from Funds: PASSED
✅ Ownership Certificate downloaded: PASSED (<path>)
✅ POSITIVE 3 — Fund Balance project buy completed: PASSED
```

---

#### NEGATIVE — terminal checkpoints (4 cases)

**NEGATIVE 1 — Unauthenticated Cloud 9 checkout redirects to sign-in**

```
✅ NEGATIVE 1 — Unauthenticated checkout access blocked / redirected: PASSED
```

**NEGATIVE 2 — Cloud 9 (Inani) visible with Buy Now in Projects**

```
✅ NEGATIVE 2 — Cloud 9 (Inani) visible in Projects list: PASSED
✅ NEGATIVE 2 — Cloud 9 Buy/Prebook Now button visible on card: PASSED
```

**NEGATIVE 3 — Payment drawer shows bKash, Digital Payment, and Fund Balance**

```
✅ Sign-in / Projects / Checkout / Drawer helper checkpoints…
✅ NEGATIVE 3 — Pay with bKash option visible: PASSED
✅ NEGATIVE 3 — Make Digital Payment option visible: PASSED
✅ NEGATIVE 3 — Use Funds Balance option visible: PASSED
```

**NEGATIVE 4 — Payment drawer closed until Buy is clicked**

```
✅ NEGATIVE 4 — Payment drawer not visible before Buy button click: PASSED
✅ NEGATIVE 4 — Buy button is enabled on checkout page: PASSED
```

---

#### BOUNDARY — terminal checkpoints (12 cases)

**BOUNDARY 1 — Phone empty (min-1)**

```
✅ BOUNDARY 1 — Phone field cleared to empty: PASSED
✅ BOUNDARY 1 — Empty phone handled (drawerOpened=<bool>, validation=<bool>): PASSED
```

**BOUNDARY 2 — Phone too short (10 digits = min-1)**

```
✅ BOUNDARY 2 — Phone accepted length 10 (< 11): PASSED
✅ BOUNDARY 2 — Short phone boundary checked (drawer=<bool>, error=<bool>): PASSED
```

**BOUNDARY 3 — Phone exact valid length (11 digits)**

```
✅ BOUNDARY 3 — Exact 11-digit phone accepted: PASSED
✅ BOUNDARY 3 — Payment drawer opens with exact valid phone: PASSED
```

**BOUNDARY 4 — Phone too long (12 digits = max+1)**

```
✅ BOUNDARY 4 — Long phone truncated/capped | validation shown | over-max observed: PASSED
```

**BOUNDARY 5 — Fund balance edges**

```
✅ BOUNDARY 5 — Available balance BDT <n> >= 0: PASSED
✅ BOUNDARY 5 — Purchase price BDT <n> > 0: PASSED
✅ BOUNDARY 5 — Balance >= price edge (BDT <bal> >= BDT <price>): PASSED
```

**BOUNDARY 6 — Payment exclusivity + credential lengths**

```
✅ BOUNDARY 6 — Credential lengths (phone=11, OTP=6, PIN=5, Shurjo=4): PASSED
✅ BOUNDARY 6 — bKash selected (aria-pressed=true): PASSED
✅ BOUNDARY 6 — Switching to Digital clears bKash pressed state: PASSED
✅ BOUNDARY 6 — Switching to Funds clears Digital pressed state: PASSED
```

**BOUNDARY 7 — Phone with letters**

```
✅ BOUNDARY 7 — Alpha phone handled (stored="<value>", error=<bool>): PASSED
```

**BOUNDARY 8 — Phone with country code (880)**

```
✅ BOUNDARY 8 — Country-code phone edge (length=<n>, error=<bool>): PASSED
```

**BOUNDARY 9 — Phone whitespace-only**

```
✅ BOUNDARY 9 — Whitespace phone handled (trimmedLen=<n>, error=<bool>): PASSED
```

**BOUNDARY 10 — Invalid BD prefix (not 01x)**

```
✅ BOUNDARY 10 — Invalid prefix handled (value=<phone>, error=<bool>, drawer=<bool>): PASSED
```

**BOUNDARY 11 — OTP/PIN credential length edges**

```
✅ BOUNDARY 11 — OTP edges 5 / 6 / 7 defined; exact sandbox OTP=6: PASSED
✅ BOUNDARY 11 — bKash PIN edges 4 / 5 / 6 defined; exact sandbox PIN=5: PASSED
✅ BOUNDARY 11 — ShurjoPay PIN edges 3 / 4 / 5 defined; configured PIN length=4: PASSED
```

**BOUNDARY 12 — Use maximum fund amount**

```
✅ BOUNDARY 12 — Use maximum button clicked: PASSED
✅ BOUNDARY 12 — Confirm enabled when balance>=price (BDT <bal> >= <price>): PASSED
```

---

#### ECPA — terminal checkpoints (8 critical cases)

**ECPA 1 — Valid auth class reaches Cloud 9 checkout**

```
✅ ECPA 1 — Valid auth class: login succeeded: PASSED
✅ ECPA 1 — Valid auth class reaches Cloud 9 checkout: PASSED
```

**ECPA 2 — Invalid credentials class stays on sign-in**

```
✅ ECPA 2 — Invalid credentials blocked (onSignIn=<bool>, error=<bool>): PASSED
```

**ECPA 3 — Valid phone class (01x · 11 digits)**

```
✅ ECPA 3 — Valid phone class opens payment drawer: PASSED
```

**ECPA 4 — Invalid phone class shows validation**

```
✅ ECPA 4 — Invalid phone class handled (value=<phone>, error=<bool>): PASSED
```

**ECPA 5 — All valid payment-method classes selectable**

```
✅ ECPA 5 — Valid class: Pay with bKash selectable: PASSED
✅ ECPA 5 — Valid class: Make Digital Payment selectable: PASSED
✅ ECPA 5 — Valid class: Use Funds Balance selectable: PASSED
```

**ECPA 6 — None-selected payment class blocks Make Payment**

```
✅ ECPA 6 — Make Payment disabled when no method selected: PASSED
```

**ECPA 7 — Sufficient funds class enables Confirm**

```
✅ ECPA 7 — Sufficient funds class (BDT <bal> >= <price>) Confirm enabled: PASSED
```

**ECPA 8 — Digital payment class enables Make Payment CTA**

```
✅ ECPA 8 — Digital payment class enables Make Payment: PASSED
✅ ECPA 8 — bKash payment class also enables Make Payment: PASSED
```

---

#### Case inventory summary (exact titles from the spec)

| # | Type | Exact test title |
|---:|---|---|
| 1 | Positive | ✅ POSITIVE 1 — Buy Cloud 9 via bKash sandbox |
| 2 | Positive | ✅ POSITIVE 2 — Buy Cloud 9 via ShurjoPay sandbox |
| 3 | Positive | ✅ POSITIVE 3 — Buy Cloud 9 via Fund Balance |
| 4 | Negative | ❌ NEGATIVE 1 — Unauthenticated Cloud 9 checkout redirects to sign-in |
| 5 | Negative | ❌ NEGATIVE 2 — Cloud 9 (Inani) visible with Buy Now in Projects |
| 6 | Negative | ❌ NEGATIVE 3 — Payment drawer shows bKash, Digital Payment, and Fund Balance |
| 7 | Negative | ❌ NEGATIVE 4 — Payment drawer closed until Buy is clicked |
| 8 | Boundary | 🔲 BOUNDARY 1 — Phone empty (min-1) blocks or keeps invalid state |
| 9 | Boundary | 🔲 BOUNDARY 2 — Phone too short (10 digits = min-1) |
| 10 | Boundary | 🔲 BOUNDARY 3 — Phone exact valid length (11 digits = min/max) |
| 11 | Boundary | 🔲 BOUNDARY 4 — Phone too long (12 digits = max+1) |
| 12 | Boundary | 🔲 BOUNDARY 5 — Fund balance edges: balance >= 0 and price > 0 |
| 13 | Boundary | 🔲 BOUNDARY 6 — Payment method exclusivity + sandbox credential lengths |
| 14 | Boundary | 🔲 BOUNDARY 7 — Phone with letters (non-numeric edge) |
| 15 | Boundary | 🔲 BOUNDARY 8 — Phone with country code (+880 / 880) length edge |
| 16 | Boundary | 🔲 BOUNDARY 9 — Phone whitespace-only (blank edge) |
| 17 | Boundary | 🔲 BOUNDARY 10 — Invalid BD prefix (not 01x) |
| 18 | Boundary | 🔲 BOUNDARY 11 — OTP/PIN credential length edges (min-1 / exact / max+1) |
| 19 | Boundary | 🔲 BOUNDARY 12 — Use maximum fund amount equals purchase price edge |
| 20 | ECPA | 🧩 ECPA 1 — CRITICAL Valid auth class reaches Cloud 9 checkout |
| 21 | ECPA | 🧩 ECPA 2 — CRITICAL Invalid credentials class stays on sign-in |
| 22 | ECPA | 🧩 ECPA 3 — CRITICAL Valid phone class (01x · 11 digits) |
| 23 | ECPA | 🧩 ECPA 4 — CRITICAL Invalid phone class shows validation |
| 24 | ECPA | 🧩 ECPA 5 — CRITICAL All valid payment-method classes selectable |
| 25 | ECPA | 🧩 ECPA 6 — CRITICAL None-selected payment class blocks Make Payment |
| 26 | ECPA | 🧩 ECPA 7 — CRITICAL Sufficient funds class enables Confirm |
| 27 | ECPA | 🧩 ECPA 8 — CRITICAL Digital payment class enables Make Payment CTA |

> **Note:** POSITIVE 1–3 perform real Cloud 9 purchases on staging. For validation-only runs, use `-g "NEGATIVE"`, `-g "BOUNDARY"`, or `-g "ECPA"`.

---

### 4. Use Funds Balance to Buy Project

```powershell
$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'; $env:AUNGSHA_PASSWORD='12345678'; $env:SLOW_MO='800'; npm.cmd run fund-balance-suite -- --reporter=line
```

Script: `tests/fund-balance-test-suite.spec.js` · Cases: 1 · Checkpoints: **13**

```
✅ 1.  Sign-in page opened
✅ 2.  Login successful
✅ 3.  Projects page opened
✅ 4.  Cloud 9 (Inani) visible with Buy Now action
✅ 5.  Cloud 9 (Inani) details page opened
✅ 6.  Cloud 9 (Inani) checkout page opened
✅ 7.  Checkout information completed
✅ 8.  Payment method drawer opened
✅ 9.  Fund Balance option visible
✅ 10. Fund Balance sufficient for purchase
✅ 11. Fund Balance payment method selected
✅ 12. Confirmed purchase with Fund Balance
✅ 13. Purchase successful — PAID badge / portfolio / balance decrease
```

---

### 5. Customer Support Flow

```powershell
$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'; $env:AUNGSHA_PASSWORD='12345678'; $env:AUNGSHA_PHONE='01772558896'; $env:SUPPORT_CATEGORY='Other'; $env:SLOW_MO='500'; npm.cmd run support-ticket-flow -- --reporter=line
```

Script: `tests/customer-support-ticket-flow.spec.js` · Cases: **5** · Checkpoints: **24**

| Test | Type | Checkpoints |
|---|---|---:|
| Full support-ticket flow | Positive | 19 |
| Empty Ticket Title | Negative | 1 |
| Empty Problem Description | Negative | 1 |
| Category not selected | Negative | 1 |
| Close without submitting | Negative | 2 |

Optional overrides:

```powershell
$env:SUPPORT_CATEGORY='Technical'
$env:SUPPORT_TICKET_TITLE='My test ticket'
$env:SUPPORT_TICKET_MESSAGE='Test issue description'
```

---

### 6. Project Buy from Marketplace

```powershell
$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'; $env:AUNGSHA_PASSWORD='12345678'; $env:AUNGSHA_PHONE='01772558896'; $env:SHURJOPAY_PIN='1234'; $env:SLOW_MO='400'; npm.cmd run marketplace-buy-flow -- --reporter=line
```

Script: `tests/project-buy-from-marketplace.spec.js` · Cases: **5** · Checkpoints: **21**

| Test | Type | Checkpoints |
|---|---|---:|
| Full marketplace buy flow | Positive | 15 |
| Unauthenticated checkout blocked | Negative | 1 |
| Marketplace listing availability | Negative | 1 |
| Make Digital Payment option visible | Negative | 2 |
| Payment drawer pre-click state | Negative | 2 |

Downloaded files: `E:\Test\downloads\`

---

### 7. Project Buy → Sell to Aungsha

```powershell
$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'; $env:AUNGSHA_PASSWORD='12345678'; $env:AUNGSHA_PHONE='01772558896'; $env:SHURJOPAY_PIN='1234'; $env:SLOW_MO='400'; npm.cmd run aungsha-sell-flow -- --reporter=line
```

Script: `tests/project-buy-sell-to-aungsha.spec.js` · Cases: **5** · Checkpoints: **23**

| Test | Type | Checkpoints |
|---|---|---:|
| Full buy → sell to Aungsha | Positive | 16 |
| Unauthenticated My Portfolio blocked | Negative | 1 |
| Cloud 9 visible in Projects list | Negative | 2 |
| Sell Shares disabled before option selected | Negative | 2 |
| Funds page wallet transaction visible | Negative | 2 |

---

### 8. Project Buy → Sell to Marketplace

```powershell
Set-Location 'E:\Test'

$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'
$env:AUNGSHA_PASSWORD='12345678'
$env:AUNGSHA_PHONE='01770618575'
$env:SHURJOPAY_PIN='12121'
$env:BKASH_SANDBOX_PHONE='01770618575'
$env:BKASH_SANDBOX_OTP='123456'
$env:BKASH_SANDBOX_PIN='12121'
$env:MARKETPLACE_ASKING_PRICE='1500'

Remove-Item Env:MARKETPLACE_RESUME_AFTER_PURCHASE -ErrorAction SilentlyContinue

npm.cmd run marketplace-flow
```

Script: `tests/project-buy-sell-to-marketplace.spec.js` · Cases: 1 · Checkpoints: **18**

```
✅ 1.  Cookie consent handled
✅ 2.  Login successful
✅ 3.  Cloud 9 project details opened
✅ 4.  Checkout page opened
✅ 5.  Checkout information completed
✅ 6.  ShurjoPay sandbox opened
✅ 7.  One Cloud 9 unit purchased
✅ 8.  Cloud 9 portfolio details opened
✅ 9.  Go to marketplace selected
✅ 10. Newly purchased one-unit reservation selected
✅ 11. Marketplace resale offer created
✅ 12. Listing active in Dashboard My Listings
✅ 13. Home opened from Dashboard My Listings
✅ 14. Marketplace opened from Home
✅ 15. Marketplace My Listings selected
✅ 16. Listing visible in Marketplace My Listings
✅ 17. Dashboard opened
✅ 18. Final Cloud 9 portfolio details page opened
```

To change asking price: `$env:MARKETPLACE_ASKING_PRICE='1800'`

---

### 9. Withdrawal Flow

```powershell
Set-Location 'E:\Test'

$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'
$env:AUNGSHA_PASSWORD='12345678'
$env:WITHDRAWAL_ACCOUNT_HOLDER='Imran'
$env:WITHDRAWAL_BKASH_NUMBER='01770618575'
$env:WITHDRAWAL_AMOUNT='1400'
$env:WITHDRAWAL_FORCE_FULL_FLOW='true'

Remove-Item Env:WITHDRAWAL_OTP,Env:WITHDRAWAL_FORCE_UNIT_CONVERSION,Env:WITHDRAWAL_RESET_SAVED_METHOD -ErrorAction SilentlyContinue

npm.cmd run withdrawal-flow
```

Script: `tests/withdrawal-flow.spec.js` · Cases: 1 · Checkpoints: **18** (conditional)

OTP can also be placed in `E:\Test\withdrawal-otp.txt`.

---

### 10. Referral Rewards Flow

```powershell
Set-Location 'E:\Test'

$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'
$env:AUNGSHA_PASSWORD='12345678'
$env:AUNGSHA_PHONE='01770618575'
$env:SHURJOPAY_PIN='12121'

$env:BKASH_SANDBOX_PHONE='01770618575'
$env:BKASH_SANDBOX_OTP='123456'
$env:BKASH_SANDBOX_PIN='12121'

$env:REFERRED_PASSWORD='12345678'
$env:REFERRAL_COUNT='1'

Remove-Item Env:REFERRAL_STATUS_ONLY,Env:REFERRAL_RECOVER_EMAIL,Env:REFERRAL_RECOVER_OTP -ErrorAction SilentlyContinue

npm.cmd run referral-flow
```

Script: `tests/referral-rewards-flow.spec.js` · Cases: 1 · Checkpoints: **3** (conditional)

---

## Other Flow Run Commands

### Signup

```powershell
$env:SLOW_MO='500'; npm.cmd run signup -- --reporter=line
```

Script: `tests/signup.spec.js` · Cases: 1

---

### Login

```powershell
$env:SLOW_MO='500'; npm.cmd run login -- --reporter=line
```

Script: `tests/login.spec.js` · Cases: 1

---

### Prebook Project Details

```powershell
$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'; $env:AUNGSHA_PASSWORD='12345678'; $env:SLOW_MO='500'; npm.cmd run project-details -- --reporter=line
```

Script: `tests/project-details.spec.js` · Cases: 1 · Checkpoints: **5**

1. Sign-in page opened  
2. Login successful  
3. Projects page opened  
4. Purbachal Hill City prebook link found  
5. Prebook checkout page opened  

---

### Holding Documents and Property Details

```powershell
$env:AUNGSHA_EMAIL='imran.bponi@gmail.com'; $env:AUNGSHA_PASSWORD='12345678'; $env:SLOW_MO='500'; npm.cmd run holding-details -- --reporter=line
```

Script: `tests/holding-details.spec.js` · Cases: 1 · Checkpoints: **9**

1. Sign-in page opened  
2. Login successful  
3. Latest paid transaction details opened  
4. Paid purchase documents page opened  
5. Invoice downloaded  
6. Ownership Certificate downloaded  
7. My Property Holdings page opened  
8. Cloud 9 holding details page opened  
9. Holding details flow completed  

Downloaded files: `E:\Test\downloads\`

---

## Run All / Headless

```powershell
# All flows (safer to run one at a time)
$env:SLOW_MO='500'; npx.cmd playwright test --headed --reporter=line

# Headless single file
$env:HEADLESS='true'; npx.cmd playwright test tests/login.spec.js --reporter=line
```

---

## Terminal Result Legend

| Symbol | Meaning |
|---|---|
| `✅ ... PASSED` | Explicit verified checkpoint |
| `[WAITING]` | Retry in progress — not a failure |
| `1 passed` | Complete Playwright case passed |
| `1 failed` | Assertion failed — see screenshot/trace paths |

---

## Verified Checkpoint Reference

### support-ticket-flow — Positive (19)

```
✅ 1.  Sign-in page opened
✅ 2.  Login successful
✅ 3.  Support tickets page opened
✅ 4.  Support heading visible
✅ 5.  Stats panel (Total / Pending / Resolved) visible
✅ 6.  New Ticket button visible
✅ 7.  Create Support Ticket form opened
✅ 8.  Full Name pre-filled
✅ 9.  Email pre-filled
✅ 10. Phone filled
✅ 11. Category dropdown visible
✅ 12. Category selected
✅ 13. Ticket Title filled
✅ 14. Problem Description filled
✅ 15. Submit Ticket button enabled
✅ 16. Ticket submitted — form closed
✅ 17. Ticket visible in list with Open/Pending status
✅ 18. Ticket details page opened
✅ 19. Title & message verified on details page
```

Negative:

```
✅ NEG-1. Submit disabled when Ticket Title empty
✅ NEG-2. Submit disabled when Problem Description empty
✅ NEG-3. Submit disabled when Category not selected
✅ NEG-4. Close/Escape dismissed form without submitting
✅ NEG-4. Ticket list count unchanged after cancel
```

### aungsha-sell-flow — Positive (16)

```
✅ 1.  Sign-in page opened
✅ 2.  Cookie consent handled
✅ 3.  Login successful
✅ 4.  Cloud 9 project details opened
✅ 5.  Checkout page opened
✅ 6.  Checkout information completed
✅ 7.  Payment method drawer opened
✅ 8.  Make Digital Payment selected
✅ 9.  ShurjoPay sandbox opened
✅ 10. One Cloud 9 unit purchased
✅ 11. My Portfolio opened — Cloud 9 card visible
✅ 12. Cloud 9 holding details page opened
✅ 13. Sell to Aungsha option selected
✅ 14. One Cloud 9 unit sold — confirmation visible
✅ 15. Funds page verified — wallet transaction visible
✅ 16. Cloud 9 portfolio details page opened with sell options
```

### marketplace-buy-flow — Positive (15)

```
✅ 1.  Sign-in page opened
✅ 2.  Cookie consent handled
✅ 3.  Login successful
✅ 4.  Marketplace opened
✅ 5.  Random purchasable share selected
✅ 6.  Marketplace checkout opened
✅ 7.  Payment method drawer opened
✅ 8.  Make Digital Payment selected
✅ 9.  ShurjoPay sandbox opened
✅ 10. Marketplace share purchased
✅ 11. Invoice downloaded
✅ 12. Ownership Certificate downloaded
✅ 13. My Property Holdings opened
✅ 14. Purchased project visible in holdings
✅ 15. Holding details page opened and verified
```
