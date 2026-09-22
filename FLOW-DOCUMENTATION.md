# Aungsha Playwright Test Runbook

Based on `tests/*.spec.js` and `package.json` scripts.

| Report item | Count |
|---|---:|
| Test files | **13** |
| Playwright test cases | **25** |
| npm flow scripts | **13** |

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
| 6 | `fund-balance-suite` | fund-balance-test-suite.spec.js | 1 |
| 7 | `support-ticket-flow` | customer-support-ticket-flow.spec.js | 5 |
| 8 | `marketplace-buy-flow` | project-buy-from-marketplace.spec.js | 5 |
| 9 | `aungsha-sell-flow` | project-buy-sell-to-aungsha.spec.js | 5 |
| 10 | `marketplace-flow` | project-buy-sell-to-marketplace.spec.js | 1 |
| 11 | `withdrawal-flow` | withdrawal-flow.spec.js | 1 |
| 12 | `referral-flow` | referral-rewards-flow.spec.js | 1 |
| 13 | `holding-details` | holding-details.spec.js | 1 |
| | **Total** | | **25** |

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

### 3. Use Funds Balance to Buy Project

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

### 4. Customer Support Flow

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

### 5. Project Buy from Marketplace

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

### 6. Project Buy → Sell to Aungsha

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

### 7. Project Buy → Sell to Marketplace

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

### 8. Withdrawal Flow

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

### 9. Referral Rewards Flow

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
