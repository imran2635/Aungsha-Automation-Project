# Aungsha Automation Test

End-to-end Playwright automation for the Aungsha real estate FinTech platform.

## Flow Demo Videos

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

Set the required credentials before running the tests:

```powershell
$env:AUNGSHA_EMAIL='your-email@example.com'
$env:AUNGSHA_PASSWORD='your-password'
$env:AUNGSHA_PHONE='your-phone-number'
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
