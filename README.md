# Aungsha signup automation

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
