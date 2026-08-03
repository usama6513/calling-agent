const URLScanner = require('./url-scanner.service');

const SCAM_PATTERNS = [
  {
    label: 'OTP/PIN/secret code request',
    score: 35,
    patterns: [/otp/i, /\bpin\b/i, /mpin/i, /secret code/i, /verification code/i, /one time password/i, /security code/i, /share.*(code|otp|pin)/i, /(otp|code|pin).*share/i, /apna.*(otp|pin|code)/i, /share karo/i, /batana mat/i],
  },
  {
    label: 'Account blocked/frozen threat',
    score: 30,
    patterns: [/account.*(blocked|block|frozen|suspend)/i, /(blocked|block|frozen|suspend).*account/i, /account.*hold/i, /khat.a.*(block|band)/i, /account.*(band|block)/i, /khat.a block/i],
  },
  {
    label: 'Urgency / pressure (act now)',
    score: 20,
    patterns: [/act now/i, /immediately/i, /urgent/i, /within.*(hour|minute|24)/i, /last chance/i, /today only/i, /as soon as possible/i, /abhi karein/i, /fori/i, /jaldi/i, /same day/i, /24 ghant/i, /aaj hi/i],
  },
  {
    label: 'Prize/lottery/gift claim',
    score: 30,
    patterns: [/lottery/i, /prize/i, /you have won/i, /congratulations.*won/i, /gift voucher/i, /gift card/i, /cash reward/i, /lucky winner/i, /jackpot/i, /inaam/i, /jeet/i, /reward/i, /mubarak.*(jeet|inaam)/i, /free gift/i],
  },
  {
    label: 'Guaranteed returns / get rich quick',
    score: 30,
    patterns: [/guaranteed.*(return|profit|income)/i, /double.*(money|paisa|amount)/i, /paisa double/i, /money double/i, /high returns/i, /risk.free.*(return|investment)/i, /passive income/i, /100%.*(return|profit)/i, /no risk/i, /multi level/i, /mlm/i, /pyramid/i],
  },
  {
    label: 'Secrecy / do not tell anyone',
    score: 25,
    patterns: [/do not tell/i, /don't tell/i, /keep it secret/i, /confidential/i, /no one.*know/i, /kisi ko.*(na|mat) bat/i, /batana mat/i, /secret rakh/i],
  },
  {
    label: 'KYC/update/verify request',
    score: 25,
    patterns: [/kyc/i, /update.*(detail|info|account)/i, /verify.*(account|identity|details)/i, /confirm.*(account|details)/i, /pan card.*(update|link)/i, /update your/i],
  },
  {
    label: 'Bank/financial brand impersonation',
    score: 25,
    patterns: [/sbi|hdfc|icici|axis|kotak|yes bank|paytm|phonepe|google pay|gpay|paypal|jazzcash|easypaisa|nbp|ubl|mcb|alhabib|bank al habib|meezan/i],
  },
  {
    label: 'Caller claims to be authority',
    score: 20,
    patterns: [/main.*bank.*(se|ka)|bank.*se bol/i, /cbi.*(case|officer)|cbi case/i, /police.*(case|court)|police station/i, /court.*(case|notice)/i, /income tax.*(officer|case)/i, /cyber.*(cell|crime|police)/i, /traffic.*(fine|challan|case)/i, /narcotics.*(parcel|courier)/i, /customs.*(parcel|courier)/i],
  },
  {
    label: 'Courier/parcel trap',
    score: 25,
    patterns: [/parcel.*(couri|courier|pakage|package|found|reject)/i, /parcel.*(drugs|narcotics|illegal)/i, /courier.*(fees|payment|charge)/i, /package.*held/i, /delivery.*(fee|charge|hold)/i, /parcel.*(na chhudwa|pakda)/i],
  },
  {
    label: 'Fake refund / cashback',
    score: 25,
    patterns: [/refund/i, /cashback/i, /money back/i, /wapsi/i, /refund.*(account|bank)/i, /refund processing/i],
  },
  {
    label: 'Unusual sender (short code / VK- / VM- / AD-)',
    score: 15,
    patterns: [/^(vk-|vm-|ad-|jt-|vd-)/i, /^\d{4,6}$/m],
  },
  {
    label: 'Threat of consequences',
    score: 25,
    patterns: [/legal action/i, /arrest/i, /jail/i, /fine.*(impose|pay)/i, /case.*(file|register)/i, /your.*(arrest|case)/i, /penalty/i],
  },
  {
    label: 'Payment/tax demand',
    score: 20,
    patterns: [/pay.*(fine|fee|charges|amount)/i, /deposit.*(money|amount|fees)/i, /transfer.*(money|fees|amount)/i, /fee.*(pay|submit)/i, /tax.*(due|pending|outstanding)/i, /payment pending/i],
  },
];

const TRUSTED_SENDER_HINTS = [/^(VK-SBI|SBI|HDFCBK|ICICIB|AXISBK|KOTAKB|PAYTM|VPAYM|VPAPL|PHPE|JAZZCASH|EASYPAISA)\b/i, /^\d{10}$/];

class FraudScanner {
  static looksLikeSmsOrTranscript(text) {
    if (!text || text.trim().length < 10) return false;
    const t = text.trim();
    const scamScore = this.score(t);

    const hasSenderLikePrefix = /^(VK-|VM-|AD-|JT-|VD-|SBI|HDFC|ICICI|AXIS|KOTAK|PAYTM|PHPE|JAZZCASH|EASYPAISA)[- ]/i.test(t);
    const hasQuotes = /["''][^"''\n]{10,}["'']/.test(t);

    const isQuestion =
      /[?？]/.test(t) ||
      /\b(how|what|when|where|why|which|can|should|is|are|does|do)\b/i.test(t) ||
      /\b(batao|bataiye|bataye|batana|kaise|kaisa|kya|kyaa|kab|kahan|kitna|kitne|lo|do|dedo|btao|btaiye)\b/i.test(t) ||
      /\b(chahiye|hona chahiye|karna chahiye|kya karein|kya karun|mujhe batao)\b/i.test(t);

    const reportingIntent =
      /\b(mujhe|usne|mere|aapke|aapko|ye|yeh|is|ek)\s+(call|sms|message|msg|link|phone|number|email|khat|watsapp|whatsapp)\b/i.test(t) ||
      /\b(call|sms|message|msg|link|number|email|khat)\b.{0,20}\b(aayi|aaya|aya|mila|mili|aai|aae|bheja|bheji|aata|aati)\b/i.test(t) ||
      /\b(safe hai|scam hai|scam|fraud|genuine|fake hai|asli|jali|verify karo|check karo|theek hai)\b/i.test(t) ||
      /\b(bola|bula|bol raha|bol rahi|kehta|kehti|kehe raha|kaha|ne kaha|bata raha|bataya|bataya tha|ne bata)\b/i.test(t) ||
      /\b(kya ye|kya is|kya yeh)\b.{0,20}\b(safe|scam|asli|jali|fake|genuine)\b/i.test(t);

    if (hasSenderLikePrefix) return true;
    if (hasQuotes && scamScore.score >= 10) return true;
    if (reportingIntent && scamScore.score >= 15) return true;
    if (!isQuestion && scamScore.score >= 40 && t.length <= 300) return true;

    return false;
  }

  static score(text) {
    const flags = [];
    let total = 0;
    for (const group of SCAM_PATTERNS) {
      for (const re of group.patterns) {
        if (re.test(text)) {
          flags.push(group.label);
          total += group.score;
          break;
        }
      }
    }
    return { score: total, flags: [...new Set(flags)] };
  }

  static async scan(message) {
    const text = message.trim();
    const urls = URLScanner.extractUrls(text);

    const sms = this.score(text);

    let urlReports = [];
    for (const url of urls) {
      try {
        urlReports.push(await URLScanner.scanUrl(url));
      } catch {
        urlReports.push({ url, verdict: 'unknown', heuristic: { verdict: 'unknown', score: 0, flags: ['Scan failed'] } });
      }
    }

    const isTrustedSender = TRUSTED_SENDER_HINTS.some((re) => re.test(text));
    const highScore = sms.score;
    const urlHighRisk = urlReports.some((u) => u.verdict === 'high_risk');
    const urlMediumRisk = urlReports.some((u) => u.verdict === 'medium_risk');

    let verdict;
    let reason;
    if (highScore >= 60 || urlHighRisk || (highScore >= 40 && urlMediumRisk)) {
      verdict = 'high_risk';
      reason = 'Strong scam indicators detected in the message';
    } else if (highScore >= 30 || urlMediumRisk || (highScore >= 15 && urls.length > 0)) {
      verdict = 'medium_risk';
      reason = 'Some suspicious indicators found - be careful';
    } else if (highScore >= 15) {
      verdict = 'low_risk';
      reason = 'Minor suspicious wording - stay alert';
    } else {
      verdict = 'likely_safe';
      reason = 'No clear scam indicators found';
    }

    if (isTrustedSender && !urlHighRisk && highScore < 40) {
      verdict = 'likely_safe';
      reason = 'Looks like an official sender message - but still never share OTP/PIN';
    }

    return {
      scannedText: text.length > 800 ? text.slice(0, 800) + '...' : text,
      type: urls.length > 0 ? 'message_with_link' : 'message',
      verdict,
      reason,
      indicators: sms.flags,
      indicatorScore: sms.score,
      isTrustedSender,
      urls: urlReports.map((u) => ({
        url: u.url,
        verdict: u.verdict,
        reason: u.verdictReason || '',
        flags: u.heuristic?.flags || [],
      })),
    };
  }
}

module.exports = FraudScanner;
