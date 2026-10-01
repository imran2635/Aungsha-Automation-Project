# Aungsha Automation Test

End-to-end Playwright automation for the Aungsha real estate FinTech platform.

[![Playwright](https://img.shields.io/badge/Playwright-1.54-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Allure](https://img.shields.io/badge/Reporting-Allure-5251CC)](https://docs.qameta.io/allure/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20PowerShell-0078D6?logo=windows&logoColor=white)](#)

Watch the recorded executions of all automated flows in the public Google
Drive folder:

**[View All Automation Flow Videos](https://drive.google.com/drive/folders/1K-MJ-Z_h0eJSgmpR3jANx9NWWAkXFc15?usp=sharing)**

The folder should be shared with **Anyone with the link** as a **Viewer** so
visitors can watch the videos without requesting access.

## Run

```powershell
npm install
npx playwright install chromium
npm run signup
```

### My Profile — info update + password change + re-login

```powershell
npm.cmd run my-profile-password-flow
```

Fresh temp email each run. Updates Address / DOB / Nationality (not Email/Phone),
changes password via OTP, re-logins, verifies My Profile data.

Set the required credentials before running the tests:

```powershell
$env:AUNGSHA_EMAIL='your-email@example.com'
$env:AUNGSHA_PASSWORD='your-password'
$env:AUNGSHA_PHONE='01929918378'
$env:BKASH_SANDBOX_PHONE='01929918378'
$env:SHURJOPAY_PIN='your-sandbox-pin'
npm run signup
```

Run headless with:

```powershell
$env:HEADLESS='true'
npm run signup
```

## Full flow documentation

See [FLOW-DOCUMENTATION.md](./FLOW-DOCUMENTATION.md) for the complete runbook,
commands, execution status, and case-by-case checks.
