class BasePage {
  constructor(page, baseUrl = 'https://staging.aungsha.com') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  async goto(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
      ...options,
    });
  }
}

module.exports = { BasePage };
