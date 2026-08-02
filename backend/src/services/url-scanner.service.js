const dns = require('dns');
const { URL } = require('url');

const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'tk', 'ml', 'ga', 'cf', 'gq', 'icu', 'loan', 'work', 'zip', 'mov',
  'click', 'link', 'buzz', 'rest', 'online', 'site', 'website', 'fun', 'surf', 'mobi',
  'ooo', 'vip', 'pro', 'info', 'cam', 'stream', 'gdn', 'racing',
]);

const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'rebrand.ly', 'cutt.ly',
  'is.gd', 'buff.ly', 's.id', 'shorturl.at', 'tiny.cc', 'tr.im', 'rb.gy', 't.ly',
  'lnkd.in', 'rbx.co', 'bl.ink', 'shorte.st',
]);

const KNOWN_BRANDS = [
  'paypal', 'google', 'gmail', 'amazon', 'apple', 'netflix', 'whatsapp', 'facebook',
  'instagram', 'twitter', 'microsoft', 'hdfc', 'icici', 'sbi', 'jpmorgan', 'citibank',
  'hsbc', 'barclays', 'chase', 'bank', 'coinbase', 'binance', 'crypto',
];

const SCAM_KEYWORDS = [
  'login', 'verify', 'secure', 'update', 'account', 'bank', 'otp', 'gift', 'prize',
  'reward', 'double', 'bonus', 'bitcoin', 'crypto', 'whatsapp', 'paypal', 'card',
  'password', 'signin', 'auth', 'confirm', 'support', 'claim', 'winner', 'lottery',
  'free', 'refund', 'offer',
];

class URLScanner {
  static extractUrls(text) {
    if (!text) return [];
    const urls = [];
    const regex = /(?:https?:\/\/|www\.)[^\s<>"'`（）()]+/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      let url = match[0].replace(/[.,;:!?)]+$/, '');
      if (!url) continue;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      urls.push(url);
    }
    return [...new Set(urls)];
  }

  static isPrivateIp(ip) {
    if (!ip) return false;
    if (ip === '::1') return true;
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }

  static resolveHost(hostname) {
    return new Promise((resolve) => {
      dns.lookup(hostname, (err, address) => {
        if (err) return resolve(null);
        resolve(address);
      });
    });
  }

  static async fetchPage(url, hops = 0) {
    if (hops > 3) return { error: 'Too many redirects' };
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return { error: 'Invalid URL' };
    }
    const ip = await this.resolveHost(parsed.hostname);
    if (this.isPrivateIp(ip)) {
      return { error: 'Blocked (internal address)' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; URLSafetyScanner/1.0; +https://calling-agent.example)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (location) {
          const next = new URL(location, url).href;
          clearTimeout(timer);
          return this.fetchPage(next, hops + 1);
        }
      }
      if (!res.ok) return { error: `HTTP ${res.status}`, status: res.status };
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return { error: `Not HTML (${contentType.split(';')[0]})`, status: res.status };
      }
      const reader = res.body.getReader();
      const chunks = [];
      let size = 0;
      while (size < 200 * 1024) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
      }
      clearTimeout(timer);
      return {
        html: Buffer.concat(chunks).toString('utf8'),
        status: res.status,
        finalUrl: res.url,
      };
    } catch (err) {
      clearTimeout(timer);
      return { error: err.name === 'AbortError' ? 'Timeout' : err.message };
    }
  }

  static extractHtmlInfo(html) {
    const info = {
      title: '',
      description: '',
      text: '',
      hasForm: false,
      sensitiveFields: [],
      externalLinks: 0,
      scripts: 0,
      iframes: 0,
      httpsUpgrade: false,
    };
    if (!html) return info;

    const scripts = html.match(/<script/gi) || [];
    info.scripts = scripts.length;
    info.iframes = (html.match(/<iframe/gi) || []).length;
    info.hasForm = /<form/gi.test(html);

    const sensitive = [];
    const fieldPatterns = [
      { re: /name=["'](password|passwd|pwd|pin|otp|mpin)["']/gi, label: 'password/OTP field' },
      { re: /name=["'](cardnumber|card_number|ccnum|creditcard|ccnumber|exp|expiry|cvv|cvv2|cvc)["']/gi, label: 'credit card field' },
      { re: /name=["'](email|emailaddress|login|username|userid)["']/gi, label: 'login/email field' },
      { re: /name=["'](acc_no|accountnumber|account_number|iban|ifsc|swift)["']/gi, label: 'bank account field' },
    ];
    for (const { re, label } of fieldPatterns) {
      if (re.test(html)) sensitive.push(label);
    }
    info.sensitiveFields = sensitive;

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) info.title = titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 200);

    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    if (descMatch) info.description = descMatch[1].slice(0, 300);

    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    info.text = stripped.slice(0, 1500);

    info.externalLinks = (html.match(/href=["']https?:\/\//gi) || []).length;
    return info;
  }

  static async checkUrlhaus(url) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://urlhaus-api.abuse.ch/v1/url/', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `url=${encodeURIComponent(url)}`,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.query_status === 'no_results') {
        return { listed: false, source: 'URLhaus' };
      }
      if (data.query_status === 'found') {
        return {
          listed: true,
          source: 'URLhaus',
          threat: data.threat || '',
          tags: data.tags || [],
          blacklist: data.blacklist || [],
          urlhausId: data.id || null,
        };
      }
      return { listed: false, note: data.query_status, source: 'URLhaus' };
    } catch {
      return null;
    }
  }

  static heuristics(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return { score: 100, flags: ['Invalid URL'] };
    }

    const flags = [];
    let score = 0;
    const hostname = parsed.hostname.toLowerCase();
    const full = url.toLowerCase();
    const path = parsed.pathname + parsed.search;

    if (parsed.hostname.includes('@')) {
      score += 40;
      flags.push('URL contains @ (userinfo trick - hides real destination)');
    }

    if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      score += 40;
      flags.push('URL uses raw IP address instead of a domain name');
    }

    if (hostname.includes('xn--')) {
      score += 30;
      flags.push('Unicode (punycode) domain - lookalike domain risk');
    }

    const tld = hostname.split('.').pop();
    if (SUSPICIOUS_TLDS.has(tld)) {
      score += 20;
      flags.push(`Suspicious top-level domain (.${tld}) - commonly abused by scammers`);
    }

    if (URL_SHORTENERS.has(hostname)) {
      score += 25;
      flags.push('URL shortener - real destination is hidden');
    }

    if (!full.startsWith('https://')) {
      score += 10;
      flags.push('Not using HTTPS (no encryption)');
    }

    const brandHits = KNOWN_BRANDS.filter((b) => hostname.includes(b));
    for (const brand of brandHits) {
      if (hostname !== `${brand}.com` && hostname !== `${brand}.in` && hostname !== `www.${brand}.com`) {
        score += 35;
        flags.push(`Brand impersonation risk: domain contains "${brand}" but is not the official ${brand} site`);
        break;
      }
    }

    const keywordHits = SCAM_KEYWORDS.filter((k) => full.includes(k));
    if (keywordHits.length > 0) {
      score += Math.min(15 * keywordHits.length, 40);
      flags.push(`Suspicious keywords found in URL: ${keywordHits.slice(0, 6).join(', ')}`);
    }

    const digitsInHost = (hostname.match(/\d/g) || []).length;
    if (digitsInHost >= 4 && digitsInHost > hostname.length / 3) {
      score += 10;
      flags.push('Unusual number of digits in domain name');
    }

    if (path.length > 100) {
      score += 10;
      flags.push('Very long URL path');
    }

    if (hostname.split('.').filter((s) => s).length > 3) {
      score += 15;
      flags.push('Many subdomains - common in phishing links');
    }

    let verdict;
    if (score >= 60) verdict = 'high_risk';
    else if (score >= 35) verdict = 'medium_risk';
    else if (score >= 15) verdict = 'low_risk';
    else verdict = 'likely_safe';

    return { score, verdict, flags };
  }

  static async scanUrl(url) {
    const report = { url, scannedAt: new Date().toISOString() };

    const heuristic = this.heuristics(url);
    report.heuristic = heuristic;

    const reputation = await this.checkUrlhaus(url);
    report.reputation = reputation;

    const page = await this.fetchPage(url);
    if (page.html) {
      const htmlInfo = this.extractHtmlInfo(page.html);
      report.page = { ...htmlInfo, fetchedStatus: page.status, finalUrl: page.finalUrl };
    } else {
      report.page = { fetchError: page.error };
    }

    if (reputation && reputation.listed) {
      report.verdict = 'high_risk';
      report.verdictReason = 'Domain/URL is listed in URLhaus known-malware database';
    } else if (heuristic.verdict === 'high_risk') {
      report.verdict = 'high_risk';
      report.verdictReason = 'Multiple strong phishing warning signs';
    } else if (heuristic.verdict === 'medium_risk') {
      report.verdict = 'medium_risk';
      report.verdictReason = 'Some phishing warning signs detected';
    } else if (report.page && report.page.sensitiveFields.length > 0) {
      report.verdict = 'high_risk';
      report.verdictReason = 'Page asks for sensitive credentials (OTP/password/card)';
    } else if (report.page && report.page.hasForm && report.heuristic.verdict !== 'likely_safe') {
      report.verdict = 'medium_risk';
      report.verdictReason = 'Page contains a form but URL has warning signs';
    } else if (report.page && !report.page.fetchError) {
      report.verdict = heuristic.verdict;
      report.verdictReason = 'Based on URL structure and page content review';
    } else {
      report.verdict = heuristic.verdict;
      report.verdictReason = 'Based on URL structure (page could not be fetched)';
    }

    return report;
  }
}

module.exports = URLScanner;
