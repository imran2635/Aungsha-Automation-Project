const { expect } = require('@playwright/test');

class MailTmClient {
  constructor(request) {
    this.request = request;
    this.apiBase = 'https://api.mail.tm';
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
        : Math.min(1_000 * (2 ** (attempt - 1)), 15_000);
      console.log(`${label}: HTTP ${lastResponse.status()}, retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const details = await lastResponse.text().catch(() => 'response body unavailable');
    throw new Error(
      `${label} failed after ${maxAttempts} attempts: HTTP ${lastResponse.status()} ${details.slice(0, 300)}`,
    );
  }

  async createTempMailbox() {
    const domainsResponse = await this.withRetry(
      'Mail.tm domains request',
      () => this.request.get(`${this.apiBase}/domains`),
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
    });

    const tokenResponse = await this.withRetry(
      'Mail.tm token request',
      () => this.request.post(`${this.apiBase}/token`, {
        data: { address, password: mailboxPassword },
      }),
    );
    const { token } = await tokenResponse.json();
    expect(token, 'Expected Mail.tm bearer token').toBeTruthy();
    return { address, token };
  }

  async waitForVerificationMail(mailbox, verificationPage) {
    let messageId;
    for (let attempt = 0; attempt < 75; attempt += 1) {
      const response = await this.withRetry(
        'Mail.tm messages request',
        () => this.request.get(`${this.apiBase}/messages`, {
          headers: { Authorization: `Bearer ${mailbox.token}` },
        }),
      );
      const payload = await response.json();
      const messages = payload['hydra:member'] || payload.member || [];
      const message = messages.find((item) =>
        /aungsha/i.test(`${item.from?.name || ''} ${item.from?.address || ''} ${item.subject || ''}`),
      );
      if (message) {
        messageId = message.id;
        break;
      }
      if (attempt === 15 && verificationPage) {
        const resendCode = verificationPage.getByRole('button', { name: /resend code/i })
          .or(verificationPage.getByText(/resend code/i));
        if (await resendCode.first().isVisible().catch(() => false)) {
          await resendCode.first().click();
          console.log('Verification email was delayed; requested a new code');
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    expect(messageId, 'Expected Aungsha verification email in Mail.tm').toBeTruthy();

    const messageResponse = await this.withRetry(
      'Mail.tm message read',
      () => this.request.get(`${this.apiBase}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${mailbox.token}` },
      }),
    );
    const message = await messageResponse.json();
    const combinedText = [message.subject, message.intro, message.text, ...(message.html || [])]
      .filter(Boolean)
      .join('\n');
    const readableText = combinedText
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/\s+/g, ' ');
    const otpMatch = readableText.match(
      /(?:one-time passcode|verification code|otp)[\s\S]{0,300}?(?<!\d)(\d(?:\s+\d){5}|\d{6})(?!\d)/i,
    );
    const otp = otpMatch?.[1]?.replace(/\s/g, '');
    const verificationUrl = combinedText.match(/https?:\/\/[^\s"'<>]+/gi)
      ?.find((href) => /staging\.aungsha\.com/i.test(href) && /verify|confirm|token/i.test(href));

    expect(otp || verificationUrl, 'Expected OTP or verification link in temp-mail').toBeTruthy();
    return { otp, verificationUrl };
  }
}

module.exports = { MailTmClient };
