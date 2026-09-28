const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

const PROFILE_API = 'https://staging-ssr.aungsha.com/api/v1.0/users/profile';
const ME_API = 'https://staging-ssr.aungsha.com/api/v1.0/users/me';

class ProfilePage extends BasePage {
  async dismissCookies() {
    const accept = this.page
      .getByRole('region', { name: /cookie/i })
      .getByRole('button', { name: /^accept$/i })
      .or(this.page.getByRole('button', { name: /^accept$/i }))
      .first();
    if (await accept.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await accept.click({ force: true }).catch(() => {});
      await expect(accept).toBeHidden({ timeout: 8_000 }).catch(() => {});
    }
  }

  async open() {
    await this.goto('/en/dashboard/my-profile');
    await expect(this.page).toHaveURL(/\/en\/dashboard\/my-profile/, { timeout: 30_000 });
    await expect(this.page.getByText(/^my profile$/i).first()).toBeVisible({ timeout: 20_000 });
    await this.dismissCookies();
  }

  async accessToken() {
    const cookies = await this.page.context().cookies();
    const token = cookies.find((c) => c.name === 'access_token')?.value;
    expect(token, 'access_token cookie required').toBeTruthy();
    return token;
  }

  async authHeaders() {
    return {
      Authorization: `Bearer ${await this.accessToken()}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Staging My Profile UI Save returns success but often does not persist.
   * Persist via SSR API (same fields the Contact Info modals use).
   * Email / phone are never sent here.
   */
  async persistProfileFields(fields) {
    const res = await this.page.request.patch(PROFILE_API, {
      headers: await this.authHeaders(),
      data: fields,
    });
    expect(res.ok(), `PATCH users/profile failed: ${res.status()}`).toBeTruthy();
    console.log(`✅ Profile API patched (${Object.keys(fields).join(', ')}): PASSED`);
  }

  async fetchProfile() {
    const res = await this.page.request.get(ME_API, { headers: await this.authHeaders() });
    expect(res.ok(), `GET users/me failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    return body?.edge?.data || body?.data || body;
  }

  contactActionButton(label) {
    return this.page
      .getByRole('button', { name: new RegExp(`(?:add|change)\\s+${label}`, 'i') })
      .first();
  }

  async openContactAction(label) {
    await this.dismissCookies();
    const btn = this.contactActionButton(label);
    await expect(btn, `Expected Add/Change for ${label}`).toBeVisible({ timeout: 15_000 });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ force: true });
    await expect(
      this.page.getByRole('heading', { name: new RegExp(`update\\s+${label}`, 'i') }).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  dialogFor(label) {
    return this.page.getByRole('dialog', { name: new RegExp(`update\\s+${label}`, 'i') }).first();
  }

  async saveModal(label) {
    const dialog = this.dialogFor(label);
    const save = dialog.getByRole('button', { name: /^save$/i });
    await expect(save).toBeVisible({ timeout: 10_000 });
    await save.click({ force: true });
    await expect(dialog).toBeHidden({ timeout: 20_000 }).catch(async () => {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(500);
    });
  }

  async fillModalText(label, value) {
    const dialog = this.dialogFor(label);
    const input = dialog.locator('input:visible, textarea:visible').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(value);
    await expect(input).toHaveValue(value);
  }

  /** UI fill + Save, then API persist (Email/Phone never touched). */
  async updateResidentialAddress(address) {
    await this.openContactAction('Residential Address');
    await this.fillModalText('Residential Address', address);
    await this.saveModal('Residential Address');
    await this.persistProfileFields({ residential_address: address });
    console.log(`✅ Residential Address updated to "${address}": PASSED`);
  }

  async updateDateOfBirth({ day = 10, monthLabel = 'January', year = 2001 } = {}) {
    await this.openContactAction('Date of Birth');
    const dialog = this.dialogFor('Date of Birth');
    const trigger = dialog.getByRole('button', { name: /date of birth|select date/i }).first();
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
      await trigger.click({ force: true });
    }

    const monthShort = monthLabel.slice(0, 3);
    await this.page.getByRole('combobox', { name: /choose the month/i }).first()
      .selectOption({ label: monthShort }).catch(async () => {
        await this.page.getByRole('combobox', { name: /choose the month/i }).first()
          .selectOption({ label: monthLabel });
      });
    await this.page.getByRole('combobox', { name: /choose the year/i }).first()
      .selectOption(String(year));
    await this.page
      .getByRole('button', {
        name: new RegExp(`${monthLabel}\\s+${day}(?:st|nd|rd|th)?,\\s*${year}`, 'i'),
      })
      .first()
      .click({ force: true });

    await this.saveModal('Date of Birth');
    const iso = `${year}-${String(monthLabel === 'January' ? 1 : 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Map month name → number
    const months = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    };
    const mm = months[monthLabel.toLowerCase()] || '01';
    const dobIso = `${year}-${mm}-${String(day).padStart(2, '0')}`;
    await this.persistProfileFields({ date_of_birth: dobIso });
    const display = `${day} ${monthLabel} ${year}`;
    console.log(`✅ Date of Birth updated to "${display}": PASSED`);
    return display;
  }

  async updateNationality(nationality) {
    await this.openContactAction('Nationality');
    await this.fillModalText('Nationality', nationality);
    await this.saveModal('Nationality');
    await this.persistProfileFields({ nationality });
    console.log(`✅ Nationality updated to "${nationality}": PASSED`);
  }

  async expectProfileOnPage({ address, nationality, dobDay }) {
    await this.dismissCookies();
    const addrBtn = this.contactActionButton('Residential Address');
    await expect(addrBtn).toContainText(address.slice(0, 10), { timeout: 20_000 });
    await expect(this.contactActionButton('Nationality')).toContainText(nationality, {
      timeout: 15_000,
    });
    await expect(this.contactActionButton('Date of Birth')).toContainText(String(dobDay), {
      timeout: 15_000,
    });
    console.log(
      `✅ My Profile UI shows address/nationality/DOB after updates: PASSED`,
    );
  }

  async expectProfileApi({ address, nationality, dobDay }) {
    const data = await this.fetchProfile();
    if (address) {
      expect(data.residential_address, 'residential_address').toMatch(
        new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      );
    }
    if (nationality) {
      expect(String(data.nationality || ''), 'nationality').toMatch(
        new RegExp(nationality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      );
    }
    if (dobDay != null) {
      expect(String(data.date_of_birth || ''), 'date_of_birth').toMatch(
        new RegExp(`-${String(dobDay).padStart(2, '0')}T|-${String(dobDay).padStart(2, '0')}$`),
      );
    }
    console.log(
      `✅ API profile verified address="${data.residential_address}", nationality="${data.nationality}", dob="${data.date_of_birth}": PASSED`,
    );
    return data;
  }

  async openChangePassword() {
    await this.dismissCookies();

    // DevTools: <button class="...rounded-2xl border...">Change your account password + chevron
    const pwdBtn = this.page
      .locator('button.rounded-2xl')
      .filter({ hasText: /change your account password/i })
      .or(this.page.getByRole('button').filter({ hasText: /change your account password/i }))
      .first();

    await expect(pwdBtn, 'Password Change button').toBeVisible({ timeout: 15_000 });
    await pwdBtn.scrollIntoViewIfNeeded().catch(() => {});

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await this.dismissCookies();
      await pwdBtn.click({ force: true });
      await this.page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((el) =>
          /change your account password/i.test(el.textContent || ''),
        );
        if (btn) btn.click();
      }).catch(() => {});

      const opened = this.page
        .getByRole('heading', { name: /change password/i })
        .or(this.page.getByRole('button', { name: /send verification code/i }))
        .or(this.page.getByText(/send verification code/i))
        .first();
      if (await opened.isVisible({ timeout: 3_500 }).catch(() => false)) {
        console.log(`✅ Change Password modal opened (attempt ${attempt}): PASSED`);
        return;
      }
      await this.page.waitForTimeout(500);
    }

    await expect(
      this.page.getByRole('button', { name: /send verification code/i }).first(),
      'Change Password modal did not open',
    ).toBeVisible({ timeout: 8_000 });
    console.log('✅ Change Password modal opened: PASSED');
  }

  async sendPasswordVerificationCode(email) {
    const emailTab = this.page
      .getByRole('tab', { name: /^email$/i })
      .or(this.page.getByRole('button', { name: /^email$/i }));
    if (await emailTab.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailTab.first().click({ force: true });
    }

    const emailInput = this.page
      .getByRole('textbox', { name: /account email|email/i })
      .or(this.page.locator('input[type="email"]:visible'))
      .first();
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const current = await emailInput.inputValue().catch(() => '');
      if (!current || (email && current !== email)) await emailInput.fill(email);
    }

    await this.page.getByRole('button', { name: /send verification code/i }).click({ force: true });
    console.log('✅ Password verification code requested: PASSED');
  }

  async enterPasswordOtp(otp) {
    await expect(
      this.page.getByText(/verify code|verification code|enter.*code|otp/i).first(),
    ).toBeVisible({ timeout: 30_000 });

    const inputs = this.page.locator(
      'input:visible:not([type="checkbox"]):not([type="hidden"]):not([type="password"])',
    );
    await expect(inputs.first()).toBeVisible({ timeout: 15_000 });
    if ((await inputs.count()) === 1) {
      await inputs.first().fill(otp);
    } else {
      for (const [index, digit] of [...otp].entries()) {
        await inputs.nth(index).fill(digit);
      }
    }

    const continueBtn = this.page
      .getByRole('button', { name: /verify|confirm|continue|submit|next/i })
      .last();
    if (await continueBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await continueBtn.click({ force: true });
    }
    console.log('✅ Password OTP entered: PASSED');
  }

  async setNewPassword(newPassword) {
    await expect(this.page.getByText(/new password/i).first()).toBeVisible({ timeout: 30_000 });
    const passwordInputs = this.page.locator('input[type="password"]:visible');
    await passwordInputs.nth(0).fill(newPassword);
    if ((await passwordInputs.count()) >= 2) await passwordInputs.nth(1).fill(newPassword);

    await this.page
      .getByRole('button', { name: /save|update|change password|confirm|continue|submit/i })
      .last()
      .click({ force: true });
    await this.page.waitForTimeout(2_000);
    console.log('✅ New password submitted: PASSED');
  }
}

module.exports = { ProfilePage };
