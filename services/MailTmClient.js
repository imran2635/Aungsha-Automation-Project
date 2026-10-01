const { expect } = require('@playwright/test');

/**
 * Temp mailbox client.
 * Primary: Mail.tm  |  Fallback: Guerrilla Mail (when Mail.tm is down)
 */
class MailTmClient {
  constructor(request) {
    this.request = request;
    this.apiBase = 'https://api.mail.tm';
    this.guerrillaBase = 'https://api.guerrillamail.com/ajax.php';
  }

  async withRetry(label, operation, maxAttempts = 6) {
    let lastResponse;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      lastResponse = await operation(attempt);
      if (lastResponse.ok()) return lastResponse;

      const retryable = lastResponse.status() === 429 || lastResponse.status() >= 500;
      if (!retryable || attempt === maxAttempts) break;
      const retryAfter = Number(lastResponse.headers()['retry-after']);
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1_000
        : Math.min(1_500 * (2 ** (attempt - 1)), 12_000);
      console.log(`${label}: HTTP ${lastResponse.status()}, retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const details = await lastResponse.text().catch(() => 'response body unavailable');
    throw new Error(
      `${label} failed after ${maxAttempts} attempts: HTTP ${lastResponse.status()} ${details.slice(0, 300)}`,
    );
  }

  async createTempMailbox() {
    try {
      const mailbox = await this.#createMailTmMailbox();
      console.log(`✅ Temp mailbox (Mail.tm): ${mailbox.address}`);
      return mailbox;
    } catch (mailTmError) {
      console.log(`⚠️ Mail.tm unavailable (${mailTmError.message.slice(0, 120)}) — falling back to Guerrilla Mail`);
      const mailbox = await this.#createGuerrillaMailbox();
      console.log(`✅ Temp mailbox (Guerrilla Mail): ${mailbox.address}`);
      return mailbox;
    }
  }

  async #createMailTmMailbox() {
    const domainsResponse = await this.withRetry(
      'Mail.tm domains request',
      () => this.request.get(`${this.apiBase}/domains`),
      3,
    );
    const domains = await domainsResponse.json();
    const domain = (domains['hydra:member'] || domains.member || [])
      .find((item) => item.isActive !== false)?.domain;
    expect(domain, 'Expected an active Mail.tm domain').toBeTruthy();

    let address;
    let mailboxPassword;
    await this.withRetry('Mail.tm account creation', async (attempt) => {
      address = `aungsha${Date.now()}${attempt}${Math.floor(Math.random() * 1_000_000)}@${domain}`;
      mailboxPassword = `Mailbox@${Date.now()}-${attempt}`;
      return this.request.post(`${this.apiBase}/accounts`, {
        data: { address, password: mailboxPassword },
      });
    }, 3);

    const tokenResponse = await this.withRetry(
      'Mail.tm token request',
      () => this.request.post(`${this.apiBase}/token`, {
        data: { address, password: mailboxPassword },
      }),
      3,
    );
    const { token } = await tokenResponse.json();
    expect(token, 'Expected Mail.tm bearer token').toBeTruthy();
    return { address, token, provider: 'mail.tm' };
  }

  async #createGuerrillaMailbox() {
    const sessionResponse = await this.withRetry(
      'Guerrilla Mail get_email_address',
      () => this.request.get(`${this.guerrillaBase}?f=get_email_address&lang=en`),
      4,
    );
    const session = await sessionResponse.json();
    let token = session.sid_token;
    expect(token, 'Expected Guerrilla Mail sid_token').toBeTruthy();

    // Force a unique inbox — get_email_address can reuse the same sticky address.
    const emailUser = `aungsha${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
    const setResponse = await this.withRetry(
      'Guerrilla Mail set_email_user',
      () => this.request.get(
        `${this.guerrillaBase}?f=set_email_user&email_user=${encodeURIComponent(emailUser)}&lang=en&sid_token=${encodeURIComponent(token)}`,
      ),
      4,
    );
    const payload = await setResponse.json();
    if (payload.sid_token) token = payload.sid_token;
    const address = payload.email_addr || payload.email || `${emailUser}@guerrillamailblock.com`;
    expect(address, 'Expected Guerrilla Mail address').toBeTruthy();
    expect(String(address).toLowerCase(), 'Guerrilla address must include unique user').toContain(emailUser.toLowerCase());
    return { address, token, provider: 'guerrilla', seq: 0 };
  }

  async waitForVerificationMail(mailbox, verificationPage) {
    return this.waitForOtpMail(mailbox, {
      verificationPage,
      fromHint: /aungsha/i,
    });
  }

  /**
   * Poll temp mailbox for an OTP (or verification link) from Aungsha.
   * Pass `seenIds` / `afterIso` so password-change OTP is not confused with signup mail.
   */
  async waitForOtpMail(mailbox, options = {}) {
    if (mailbox.provider === 'guerrilla') {
      return this.#waitForGuerrillaOtpMail(mailbox, options);
    }
    return this.#waitForMailTmOtpMail(mailbox, options);
  }

  async #waitForMailTmOtpMail(mailbox, options = {}) {
    const {
      verificationPage,
      fromHint = /aungsha/i,
      subjectHint = /./,
      seenIds = new Set(),
      afterIso = null,
      maxAttempts = 75,
    } = options;

    let messageId;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await this.withRetry(
        'Mail.tm messages request',
        () => this.request.get(`${this.apiBase}/messages`, {
          headers: { Authorization: `Bearer ${mailbox.token}` },
        }),
      );
      const payload = await response.json();
      const messages = payload['hydra:member'] || payload.member || [];
      const message = messages.find((item) => {
        if (seenIds.has(item.id)) return false;
        if (afterIso && item.createdAt && Date.parse(item.createdAt) < Date.parse(afterIso) - 2_000) {
          return false;
        }
        const haystack = `${item.from?.name || ''} ${item.from?.address || ''} ${item.subject || ''}`;
        return fromHint.test(haystack) && subjectHint.test(item.subject || '');
      });
      if (message) {
        messageId = message.id;
        break;
      }
      if (attempt === 15 && verificationPage) {
        await this.#tryResendCode(verificationPage);
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    expect(messageId, 'Expected Aungsha OTP / verification email in Mail.tm').toBeTruthy();

    const messageResponse = await this.withRetry(
      'Mail.tm message read',
      () => this.request.get(`${this.apiBase}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${mailbox.token}` },
      }),
    );
    const message = await messageResponse.json();
    return this.#extractOtpFromText({
      subject: message.subject || '',
      intro: message.intro || '',
      text: message.text || '',
      html: message.html || [],
      messageId,
    });
  }

  async #waitForGuerrillaOtpMail(mailbox, options = {}) {
    const {
      verificationPage,
      fromHint = /aungsha/i,
      subjectHint = /./,
      seenIds = new Set(),
      maxAttempts = 75,
    } = options;

    let mailId;
    let seq = Number(mailbox.seq || 0);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await this.withRetry(
        'Guerrilla Mail check_email',
        () => this.request.get(
          `${this.guerrillaBase}?f=check_email&sid_token=${encodeURIComponent(mailbox.token)}&seq=${seq}`,
        ),
      );
      const payload = await response.json();
      if (payload.sid_token) mailbox.token = payload.sid_token;
      const list = payload.list || [];
      const message = list.find((item) => {
        const id = String(item.mail_id);
        if (seenIds.has(id) || id === '1') return false; // skip welcome mail id=1 often
        const haystack = `${item.mail_from || ''} ${item.mail_subject || ''} ${item.mail_excerpt || ''}`;
        if (/guerrillamail/i.test(item.mail_from || '') && /welcome/i.test(item.mail_subject || '')) {
          return false;
        }
        return fromHint.test(haystack) && subjectHint.test(item.mail_subject || '');
      });

      if (message) {
        mailId = message.mail_id;
        break;
      }

      // advance seq for polling newer mail
      if (list.length) {
        const maxId = Math.max(...list.map((m) => Number(m.mail_id) || 0));
        if (Number.isFinite(maxId) && maxId > seq) seq = maxId;
      }

      if (attempt === 15 && verificationPage) {
        await this.#tryResendCode(verificationPage);
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    expect(mailId, 'Expected Aungsha OTP / verification email in Guerrilla Mail').toBeTruthy();

    const fetchResponse = await this.withRetry(
      'Guerrilla Mail fetch_email',
      () => this.request.get(
        `${this.guerrillaBase}?f=fetch_email&sid_token=${encodeURIComponent(mailbox.token)}&email_id=${encodeURIComponent(mailId)}`,
      ),
    );
    const message = await fetchResponse.json();
    return this.#extractOtpFromText({
      subject: message.mail_subject || '',
      intro: message.mail_excerpt || '',
      text: message.mail_body || '',
      html: [],
      messageId: String(mailId),
    });
  }

  async #tryResendCode(verificationPage) {
    const resendCode = verificationPage.getByRole('button', { name: /resend code/i })
      .or(verificationPage.getByText(/resend code/i));
    if (await resendCode.first().isVisible().catch(() => false)) {
      await resendCode.first().click();
      console.log('Verification email was delayed; requested a new code');
    }
  }

  #extractOtpFromText({ subject, intro, text, html, messageId }) {
    const combinedText = [subject, intro, text, ...(html || [])]
      .filter(Boolean)
      .join('\n');
    const readableText = combinedText
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/\s+/g, ' ');
    const otpMatch = readableText.match(
      /(?:one-time passcode|verification code|otp|code)[\s\S]{0,300}?(?<!\d)(\d(?:\s+\d){5}|\d{6})(?!\d)/i,
    ) || readableText.match(/(?<!\d)(\d{6})(?!\d)/);
    const otp = otpMatch?.[1]?.replace(/\s/g, '');
    const verificationUrl = combinedText.match(/https?:\/\/[^\s"'<>]+/gi)
      ?.find((href) => /staging\.aungsha\.com/i.test(href) && /verify|confirm|token|password/i.test(href));

    expect(otp || verificationUrl, 'Expected OTP or verification link in temp-mail').toBeTruthy();
    return { otp, verificationUrl, messageId, subject: subject || '' };
  }
}

module.exports = { MailTmClient };
