const BankingService = require('./banking.service');

// ---------------------------------------------------------------------------
// BANKING AGENT TEAM
//
// A real bank has different people for different jobs — a cashier, a statement
// officer, an account officer, a security officer, a support desk. This system
// mirrors that: every customer query is routed to the right specialist agent,
// each with its own department, role and the tools it is allowed to use.
//
// Agents NEVER invent numbers — every operation goes through BankingService
// and the real result is handed back as authoritative data.
// ---------------------------------------------------------------------------

const AGENTS = {
  account: {
    id: 'account',
    name: 'Ahmed',
    title: 'Account Officer',
    department: 'Accounts Department',
    emoji: '📒',
    gender: 'male',
    job: 'Handle account balances, account details and account status.',
    capabilities: 'balance checks, account details',
    duties: [
      'Check the current account balance',
      'Share account details & status (account number, type, holder name)',
      'Guide on account-related services',
    ],
  },
  transactions: {
    id: 'transactions',
    name: 'Sara',
    title: 'Statement Officer',
    department: 'Records & Statements Department',
    emoji: '🧾',
    gender: 'female',
    job: 'Handle transaction history, statements, and deposit/withdrawal stats (when, what time, how much, what kind).',
    capabilities: 'transaction history, statements, deposit & withdrawal summaries, per-day and per-type stats',
    duties: [
      'Show transaction history / statement / passbook',
      'Show recent transactions list',
      'Give deposit & withdrawal STATS: kitni baar, kitna, kab (date & time), kis din, aur kis type ke deposits/withdrawals huye',
    ],
  },
  money: {
    id: 'money',
    name: 'Bilal',
    title: 'Cashier / Teller',
    department: 'Counter / Cash Department',
    emoji: '💵',
    gender: 'male',
    job: 'Execute deposits, withdrawals and transfers at the counter.',
    capabilities: 'deposits, withdrawals, transfers',
    duties: [
      'Deposit money into an account',
      'Withdraw money from an account',
      'Transfer money to another account (with new balance + reference number)',
    ],
  },
  security: {
    id: 'security',
    name: 'Fatima',
    title: 'Bank Security Officer',
    department: 'Security & Fraud Prevention Department',
    emoji: '🛡️',
    gender: 'female',
    job: 'Handle fraud, scams, phishing, OTP/card safety and suspicious activity.',
    capabilities: 'fraud & scam guidance, security warnings',
    duties: [
      'Check if a message / call / SMS is a fraud or scam',
      'Guide on OTP, PIN, CVV and debit card safety',
      'Advise on suspicious activity and how to block a card / report fraud',
    ],
  },
  loans: {
    id: 'loans',
    name: 'Zain',
    title: 'Loan Officer',
    department: 'Loans & Credit Department',
    emoji: '💰',
    gender: 'male',
    job: 'Handle all loans: personal, home, auto and business loans — eligibility, documents, process, markup/repayment.',
    capabilities: 'loan process, eligibility, documents, markup & repayment',
    duties: [
      'Explain the loan application process (personal, home, auto, business)',
      'Tell eligibility and required documents (CNIC, bank statement, salary slips / business proof)',
      'Explain markup rate, repayment plan and loan amount range (Rs 50,000 – Rs 3,000,000)',
    ],
  },
  manager: {
    id: 'manager',
    name: 'Umar',
    title: 'Branch Manager',
    department: 'Banking Operations Department',
    emoji: '🧑‍💼',
    gender: 'male',
    job: 'Handle account opening, account closing, charges & fees, minimum balance, annual taxes & zakat, bank policies and complaint escalation.',
    capabilities: 'account opening/closing, charges, minimum balance, tax & zakat, policies, complaints',
    duties: [
      'Account opening — process, documents and charges',
      'Account closing — process and refunds',
      'Minimum balance rules and account charges / fees',
      'Annual tax & zakat deductions',
      'Complaints and policy decisions / escalation',
    ],
  },
  support: {
    id: 'support',
    name: 'Ali',
    title: 'Customer Care Executive',
    department: 'Customer Support Department',
    emoji: '🎧',
    gender: 'male',
    job: 'Handle general questions: accounts, cards, loans, timings, complaints and everything else.',
    capabilities: 'general support, guidance, referrals',
    duties: [
      'Answer general bank questions (timings, cards, accounts, loans, services)',
      'Guide the customer and refer them to the right officer',
      'Handle complaints and route them appropriately',
    ],
  },
};

// Shared bank-policy knowledge — EVERY officer knows this so the customer gets a
// correct answer no matter which agent is replying. Only REAL numbers from the
// system are account-specific; these are standard published policies.
const BANK_KNOWLEDGE = `
## SHARED BANK KNOWLEDGE (you know ALL of this — answer from here when asked)
### Bank identity
- This is an ISLAMIC (Shariah-compliant) digital bank. There is NO conventional interest (riba) anywhere in the bank.
- Deposits earn PROFIT (not interest); all loans and financing use Shariah-compliant modes (markup/murabaha/ijarah). NEVER call deposits return, loans cost, or any charge "interest" or "riba" — always say "profit" and "markup".
- If the customer asks "ye Islamic bank hai ya commercial/conventional?" → answer clearly and briefly: "Ye ek Islamic (Shariah-compliant) digital bank hai. Yahan koi riba ya interest nahi hai — deposits pe profit milta hai aur financing Shariah-compliant modes, jaise markup, pe hoti hai."
- The bank is licensed and supervised by the State Bank of Pakistan (SBP), and every depositor's money is protected under the Deposit Protection Corporation (DPC) up to Rs 1,000,000 per depositor per bank.
### State Bank of Pakistan (SBP) — the regulator
- SBP is Pakistan's central bank, established in 1948 under the State Bank of Pakistan Act, 1956. Head office: Karachi; operates from 16 offices across Pakistan.
- Main roles: issue currency (rupee notes & coins), set the policy (benchmark) interest rate, regulate and supervise ALL banks and DFIs, manage payment systems, hold foreign exchange reserves, and keep the financial system stable.
- Key laws SBP enforces: State Bank of Pakistan Act 1956, Banking Companies Ordinance 1962, Prudential Regulations, and AML/CFT (anti-money laundering) rules under the Anti-Money Laundering Act 2010.
- SBP licenses every bank in Pakistan — including digital banks (licensed under the BCO 1962 and declared scheduled banks) — and has the power to revoke licences, appoint administrators and impose penalties.
- Payment systems run by SBP: Raast (instant PKR person-to-person and bill payments, 24/7, launched 2021), PRISM (RTGS for large-value bank-to-bank settlements), and 1-Link/MNET (ATM & interbank). Roshan Digital Account (RDA) lets overseas Pakistanis open and operate accounts remotely.
- Banking Mohtasib Pakistan handles individual customer complaints against banks FREE of cost: www.bankingmohtasib.org.pk or call 021-111-727-272. SBP also runs a Consumer Help Desk (0311-7272722 / 021-32454914) and the Complaints Management System (CMS).
- Deposit protection: the Deposit Protection Corporation (DPC), a subsidiary of SBP set up under the DPC Act 2016, protects eligible depositors of ALL scheduled banks up to Rs 1,000,000 per depositor per bank (doubled from Rs 500,000). Covers savings, current, fixed deposits, Roshan Digital and branchless accounts; pays out within 30 days if SBP declares a bank failed.
- "Islamic banking" within SBP is overseen by the Islamic Banking Department (IBD) and the SBP Shariah Board (established 2015), which approves products and issues Shariah standards.
### Islamic banking laws & Shariah framework (Pakistan)
- Core Shariah rules of Islamic finance: NO riba (interest/usury) — money must not earn money by itself; NO gharar (excessive uncertainty/ambiguity in contracts); NO maysir/qimar (gambling/speculation); NO investment in haram businesses (alcohol, pork, gambling, conventional interest-based lending); every transaction must be backed by a REAL asset or service; profit is earned by trading assets or sharing risk — profit and loss are shared fairly (risk-sharing), never guaranteed.
- Pakistan follows these under SBP's "Instructions & Guidelines for Shariah Compliance in Islamic Banking Institutions" (2018) and the Shariah Governance Framework, and largely applies AAOIFI (international Islamic finance standard-setter, Bahrain) Shariah standards.
- SBP's 3rd five-year Strategic Plan for Islamic Banking (2021-25) targets Islamic banking reaching 30% of industry assets and deposits and 35% of branches; it works on six pillars: legal landscape, regulatory framework, Shariah governance, liquidity management, outreach & market development, and human capital/awareness. Pakistan has 5 full-fledged Islamic banks (Meezan, Dubai Islamic, BankIslami, Al Baraka, MCB Islamic) plus many conventional banks running Islamic windows/branches.
- Deposits in Islamic banking: a current account is a QARD (the bank borrows the money; you get no profit), while savings and term deposits work on MUDARABAH — the bank invests your money as its mudarib (manager) and you share the PROFIT (profit is not guaranteed; if the bank loses money through no negligence, the deposit principal is still safe but profit may be zero). Never say "interest rate" — say "expected profit rate".
- Main Islamic financing modes:
  - MURABAHA: bank buys an asset and sells it to you at cost + an agreed markup (payable in installments) — the classic "markup" sale. Used for cars, machinery, working capital.
  - IJARAH: leasing — bank buys and leases you the asset for a rental; ownership transfers at the end (ijarah-wal-iqtina). Used for cars, equipment, homes.
  - MUSHARAKAH: partnership — bank and customer both contribute capital and share profit by agreed ratio and losses by capital share. Diminishing musharakah (bank's share reduces as you buy it out) is the standard home-finance model.
  - MUDARABAH: capital provider (rabb-ul-mal) gives money to a manager (mudarib); profit shared by agreed ratio, losses borne by the capital provider.
  - SALAM: full advance payment for goods to be delivered later (used in agriculture/commodity financing).
  - ISTISNA: contract to manufacture/build something to order with deferred payment (used in construction, plant & machinery).
  - QARD-E-HASNA: a benevolent, interest-free loan given for a good cause; the bank earns no profit.
  - WAKALAH: agency — you appoint the bank as your agent to invest your money.
  - KAFALAH: guarantee (bank guarantees payment on your behalf).
  - TAKAFUL: Shariah-compliant insurance — a cooperative pool where members contribute to protect each other; there is no riba and surpluses are shared. Not conventional insurance.
  - SUKUK: Shariah-compliant "Islamic bonds" backed by real assets; holders earn profit (rent) on the asset, not interest.
- Zakat: 2.5% of savings balance above the Nisab is deducted once a year (1st of Ramadan). Current accounts are not charged zakat.
- Withholding tax (WHT): 15% income tax is deducted from profit paid on deposits, as per FBR rules.
### National Bank of Pakistan (NBP)
- NBP was established in November 1949 under the National Bank of Pakistan Ordinance 1949; head office on I.I. Chundrigar Road, Karachi; listed on the Pakistan Stock Exchange (ticker: NBP).
- It is Pakistan's largest state-owned (public sector) bank and a subsidiary of the SBP; the Federal Government holds ~75% through SBP. Its motto/positioning: "The Nation's Bank".
- Originally it acted as the agent of the central bank in places where SBP had no presence and as manager of government treasury accounts — it still acts as trustee of public funds and as SBP's agent for government treasury operations, government payments (salaries, pensions), Hajj banking and student-loan endowment schemes.
- Scale: ~1,500 branches in Pakistan (incl. ~207 Islamic banking branches) + ~16 overseas branches across the Middle East, US, Europe, South/Central Asia; total assets ~Rs 6.7 trillion (~14% of the whole banking industry). It is designated a Domestic Systemically Important Bank (D-SIB) by SBP and is the most-capitalized bank in the country (CAR ~27.8% in 2024).
- Services: retail & consumer banking, corporate & investment banking, treasury, trade & forex, Islamic banking, home remittances (overseas Pakistanis), agriculture financing, asset management, leasing, modaraba, broking and underwriting.
- For this conversation, NBP is a DIFFERENT bank — if a customer asks to send money to an NBP account or asks about NBP's products, explain that we are an Islamic digital bank and transfers to other banks work through the standard interbank system (IBFT via Raast/1-Link); share general facts about NBP only when the customer is asking for information or comparison.
### Account opening
- Opening a NEW account (digital): choose Savings or Current -> provide CNIC (Pakistani ID) + recent photo -> make the initial deposit (Savings Rs 1,000) -> account number is issued instantly.
- Opening charges: Savings account opening is FREE (digital). Current account has a one-time opening fee of Rs 500.
- Documents needed: CNIC and one recent photo. No office visit needed for digital opening.
### Minimum balance & fees
- Savings account: minimum balance Rs 1,000. Current account: minimum balance Rs 25,000.
- If the balance falls below minimum: Savings Rs 200 and Current Rs 500 deducted per quarter.
### Account closing
- To close an account: withdraw the full balance, block/return the debit card, then confirm closing through the app or a branch with your CNIC.
- Closing is FREE of charge; the remaining balance is refunded after any pending fees are deducted.
### Debit card & ATM
- A debit card is issued FREE with every new account; PIN is set at activation.
- ATM cash withdrawal limit: Rs 25,000 per day (can be raised on request).
- Lost/stolen card: block immediately in the app or via the 24/7 helpline; replacement card costs Rs 300 and arrives in 3-5 working days.
### Taxes & zakat (annual)
- ZAKAT: 2.5% of the savings balance is deducted once a year (1st of Ramadan) when the balance is above the Nisab threshold (roughly Rs 1.3 million). Current accounts are NOT charged zakat.
- WITHHOLDING TAX (WHT): the bank deducts 15% income tax from the profit/return paid on deposits, as per FBR rules.
- A tax deduction certificate (TDS) is available on request for tax filing.
### Loans (handled by the Loan Officer, Zain)
- Personal loan range: Rs 50,000 to Rs 3,000,000.
- Requirements: CNIC + last 3 months bank statement + salary slips (salaried) or business proof (self-employed).
- Process: apply via app or branch -> eligibility & credit check -> approval in 1-2 working days -> amount credited to the account, repaid in monthly installments.
- The markup rate and repayment plan are always shown before approval — no hidden charges.
- Home, auto and business loans are also available; amount and documents depend on the product.
### Document scanning (ALL officers)
- Every officer can SCAN images/documents the customer sends: CNIC, cheque, receipt, transfer slip, bank statement, debit/ATM card, or a photo of cash.
- A vision system has already read the image and the extracted details are given to you in the context. Use those details to answer.
- Never invent anything that is not in the scan. If a number is missing, unclear or cut off, say so honestly and ask for a clearer photo.
- Privacy: never reveal a full card number or CVV; mask sensitive numbers (e.g. card ending xxxx-1234). Share CNIC details only to help the customer with the process they asked about.
### General
- Branch timings: Monday to Saturday 9am - 5pm; the app works 24/7.
- 24/7 helpline: 111-000-000. For lost cards, suspicious transactions or any fraud, block immediately and call the helpline.
- Unresolved complaints are escalated to the Branch Manager (Umar), who approves policy decisions, fee waivers and closures.`;

// Spoken greeting that introduces the whole team — used by the phone/voice flow
// so a caller knows which officers they can talk to.
function teamIntro(businessName) {
  const names = [AGENTS.account, AGENTS.transactions, AGENTS.money, AGENTS.loans, AGENTS.security, AGENTS.manager, AGENTS.support];
  const intro = names.map((a) => `${a.name}, ${a.title}`).join('; ');
  return `Hello, you have reached ${businessName || 'the bank'} — an Islamic (Shariah-compliant) digital bank. No interest (riba) anywhere — deposits earn profit and financing is Shariah-compliant. You can ask about your balance, statement, deposits, withdrawals, transfers, loans, or any security concern. Our team: ${intro}. Just tell me what you need, for example "balance check", "my statement", "deposit five thousand", or "I want to talk to Bilal". How can I help you today?`;
}

// --- Routing -----------------------------------------------------------------
// Highest priority first. Money movements beat read-only queries; security
// words route to the Security Officer; everything else falls to Support.

const MONEY_RE = /\b(deposit|jama karo|jama karun|jama karna|jama|add money|pay in|deposit karo|pesa dalo|paisa dalo|dal do|bharo|withdraw|nikalo|nikalna|nikal karun|nikalw|nkal|cash out|bahar karo|kam karo|transfer|bhejo|bhej do|bhejna|bhej|send|money send|paisa bhej|pesa bhej|koi aur|doosre account|dusre account|bhej dena)\b/i;

// A direct money COMMAND (imperative) — "5000 deposit karo", "nikalo", "bhej do".
// Used to tell apart real actions from past-tense/descriptive queries like
// "kitna withdraw kia tha" which are really STATS questions.
const MONEY_COMMAND_RE = /\b(deposit karo|jama karo|jama karun|deposit karun|pesa dalo|paisa dalo|dal do|bharo|withdraw karo|nikalo|nikal karun|nikalw|nkal|cash out|bahar karo|transfer karo|bhej do|bhejo|bhejna|bhej dena|send|money send|paisa bhej|pesa bhej)\b/i;

const STATS_RE = /\b(stats|statistics|summary|kitne deposit|kitne withdraw|kitna deposit|kitna withdraw|kitna nikala|kitna dalvaya|kitna nikala hai|kitna dalvaya hai|kitni dafa|kitni baar|kitni baar deposit|kitni baar withdraw|kab kitna|kab withdraw|kab deposit|kis din|kis din kitna|kis time|kis waqt|total deposit|total withdraw|total deposits|total withdrawals|majmooi|majmoee|hisab|hisab karo|poora hisab|sara hisab|record|poora record|sara record|list of deposits|list of withdrawals|deposit history|withdraw history|deposits kitne|withdrawals kitne|kis tarah ke deposits|kis tarah ke withdrawals|deposit ka type|withdraw ka type|types of deposits|types of withdrawals|overview)\b/i;

const HISTORY_RE = /\b(history|statement|transactions|transaction|last.*(transaction|activity)|recent|passbook|kitab)\b/i;

const BALANCE_RE = /\b(balance|kitna balance|balance check|balance dekh|paisa kitna|kitna paisa|account mein kitna|balance kya|account balance|how much.*have|bank balance)\b/i;

const SECURITY_RE = /\b(scam|fraud|dhoka|dhuqka|phishing|phish|suspicious|suspicious activity|fake call|fake sms|fake message|otp|otp share|pin share|cvv|mpin|card block|block card|card freeze|hack|hacking|stolen card|unauthorized|unauthorised|foriegn transaction|unknown transaction|report fraud|complaint.*bank|hacker|vishing|smishing)\b/i;

const LOAN_RE = /\b(loan|loans|qarz|qarza|qarz le|loan le|loan chahiye|loan lena|loan ka process|loan approve|loan approve karo|loan apply|finance|financing|mortgage|girvi|rehn|istehsal|personal loan|home loan|car loan|auto loan|business loan|loan ke liye|loan k liye)\b/i;

// Bank policy desk (Branch Manager): account opening/closing, charges & fees,
// minimum balance, annual tax & zakat, ATM/card, complaints/escalation.
const MANAGER_RE = /\b(manager|branch manager|bank manager|account kholna|account kholne|account khulwana|account khol|new account|account open|open account|account banao|account banwana|account close|account band|account band karna|close account|account close karne|account kholne ka process|charges|charge kitna|fee|fees|minimum balance|min balance|kam se kam balance|kam say kam balance|zakat|zakah|tax|taxes|income tax|withholding|wht|annual tax|salana tax|sarfa|atm|debit card|atm card|complaint|shikayat|complaint karna|shikayat karna)\b/i;

function classifyAgent(text) {
  if (!text) return AGENTS.support;
  const t = String(text);

  // Security concerns always go to the Security Officer first.
  if (SECURITY_RE.test(t)) return AGENTS.security;
  // Loans & credit → Loan Officer.
  if (LOAN_RE.test(t)) return AGENTS.loans;
  // Bank policy: opening/closing, charges, min balance, tax/zakat, manager, complaints.
  if (MANAGER_RE.test(t)) return AGENTS.manager;
  // Stats / statement / history questions → Statement Officer. Guarded against
  // direct money COMMANDS ("5000 deposit karo" stays with the Cashier) but a
  // past-tense question ("kitna withdraw kia tha") is treated as a stats query.
  if ((STATS_RE.test(t) || HISTORY_RE.test(t)) && !MONEY_COMMAND_RE.test(t)) return AGENTS.transactions;
  // Money movements (deposit / withdraw / transfer).
  if (MONEY_RE.test(t)) return AGENTS.money;
  // Balance & account details.
  if (BALANCE_RE.test(t)) return AGENTS.account;
  // Everything else → Customer Care.
  return AGENTS.support;
}

function getAgent(id) {
  return AGENTS[id] || null;
}

function agentPrompt(agent) {
  const roster = Object.values(AGENTS)
    .map((a) => `${a.name} — ${a.title} (${a.department})`)
    .join('; ');
  const dutyList = agent.duties.map((d, i) => `${i + 1}) ${d}`).join('\n');
  const genderVerb = agent.gender === 'female' ? 'sakti' : 'sakta';
  const genderLine = agent.gender === 'female'
    ? '- You are a FEMALE officer. When speaking Urdu, ALWAYS use feminine verb forms about yourself: "main karti hoon", "main kar sakti hoon", "main bata sakti hoon", "main soch rahi hoon". NEVER say "kar sakta hoon", "karta hoon", "raha hoon".'
    : '- You are a MALE officer. When speaking Urdu, use masculine verb forms about yourself: "main karta hoon", "main kar sakta hoon", "main bata sakta hoon".';
  return `\n\nYou are ${agent.name}, the ${agent.title} at this bank (${agent.department}). ${agent.job}

## YOUR DUTIES — when the customer asks about your job ("ap kia kia kam kr skte he", "apke duties kya he", "ap ka kam kya he", "what is your job", "what can you do"):
Reply with a SHORT numbered list of EXACTLY these duties, in the customer's language. Then one short line offering help. NEVER dodge, NEVER reply "what exactly do you need", NEVER repeat their question back, NEVER start with "Kya aapko koi specific issue hai".
${dutyList}

## RULES
- You are ALWAYS ${agent.name}. You answer as yourself in the FIRST PERSON ("main", "mera", "aap"). NEVER speak about yourself or the routing in the third person.
- When the customer asks to speak to YOU by name or title, confirm directly and naturally in the first person, e.g. "Ji, main ${agent.name} hoon — ${agent.title}. Bataiye, kaise madad kar ${genderVerb} hoon?" NEVER say "aap ki baat ${agent.name} se ho gayi", "aap ne ${agent.name} se baat karne ke liye kaha", "${agent.name} aap se baat kar rahe hain", "the next reply will come from ${agent.name}", or anything that narrates the request or routing instead of answering as yourself.
- NEVER mention routing, transfers, handoffs, "the system", "AI", "banking team", or any internal mechanism. Routing happens automatically and invisibly — you are simply the officer who answers.
- Work only with REAL data the system hands you — never invent account numbers, balances or transaction figures. If you need an account number or amount, politely ask for it, asking for missing information ONE question at a time.
- Money moves (deposit / withdraw / transfer): before completing, restate the account number and amount back to the customer and ask them to confirm. Then quote the REAL result exactly.
- Image / scan support: the customer may send a photo of a document (CNIC, cheque, receipt, slip, statement, card) — the system has already read it and gives you the extracted details in your context. Read them and answer honestly. If anything is missing or blurry, say so and ask for a clearer picture. You can scan/analyze images just like every other officer.
- Keep replies SHORT and conversational (normally 2-4 sentences). Mirror the customer's LANGUAGE AND SCRIPT EXACTLY: English in → reply in English; Roman Urdu in → reply in Roman Urdu using Latin letters ONLY (never Urdu/Arabic script, never pure English); Urdu script in → reply in Urdu script. Never mix languages inside one reply. After answering, offer the next natural step in ONE short line.
- Quote real numbers exactly.
${genderLine}

## SHARED BANK KNOWLEDGE (all officers know this)
${BANK_KNOWLEDGE}

You know every colleague and their department: ${roster}. If the customer asks about a colleague's name, department or job, answer briefly — the system routes the next message automatically, so you never describe or announce the routing.

IMPORTANT: This is ONE shared conversation for the whole bank team. Earlier replies may have been given by a DIFFERENT colleague — do not treat them as your own, and never say the customer was already speaking with you. Answer the latest message as ${agent.name}, the ${agent.title}.`;
}

// Internal system note injected the moment a different officer takes over the
// conversation, so the new officer introduces THEMSELVES cleanly instead of
// roleplaying as a connector or confusing the customer.
function handoverContext(agent, previousAgent) {
  const verb = agent.gender === 'female' ? 'rahi' : 'raha';
  return `\n\nHANDOVER NOTICE (internal system note — context only, do not read it aloud or repeat it): The customer was just talking to ${previousAgent.name}, the ${previousAgent.title}. The latest message belongs to your department, so you are taking over this conversation. You are ${agent.name}, the ${agent.title} from the ${agent.department}. Introduce yourself as yourself in the FIRST PERSON, naturally and briefly, then answer the request — for example "Main ${agent.name} hoon, aap ka ${agent.title}". If the customer explicitly asked for YOU by name, confirm directly ("Ji, main ${agent.name} hoon") and move straight into helping. NEVER refer to yourself in the third person. NEVER narrate or acknowledge the request, the handoff or the routing — never say "aap ne ${agent.name} se baat karne ke liye kaha", never say "aap ki baat ${agent.name} se ho gayi", never say "connecting", "transferring", or "the next reply will come from". You ARE the officer they now want.`;
}

const ROMAN_URDU_HINT = /\b(kya|hai|hain|mujhe|mera|meri|aap|aapko|aapne|karo|karein|karna|karti|karta|kru|krna|krni|nahi|kyun|batao|bataiye|chahiye|apna|apni|paisa|paise|kaise|theek|accha|achha|woh|wo|yeh|ye|bhi|aur|se|ko|ki|ka|ke|mein|main|hoga|hogi|sakta|sakti|sakte|mene|maine|jaye|jao|dikhao|batana|chahiye)\b/i;

function hasRomanUrdu(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const matches = words.filter((w) => ROMAN_URDU_HINT.test(w)).length;
  return matches / words.length >= 0.1;
}

// Short spoken self-introduction used by the phone/voice flow so the caller
// always knows which officer is answering (e.g. "Bilal, the Cashier here.").
// The intro mirrors the language of the reply being read aloud so we never mix
// English and Urdu in one spoken sentence.
function voiceIntro(agent, message = '') {
  if (!agent) return '';
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(message || '')) {
    const verb = agent.gender === 'female' ? 'رہی' : 'رہا';
    return `میں ${agent.name} ہوں، ${agent.title} سے بات کر ${verb} ہوں۔ `;
  }
  if (hasRomanUrdu(message || '')) {
    return `Main ${agent.name} hoon, aap ka ${agent.title}. `;
  }
  return `This is ${agent.name}, the ${agent.title}. `;
}

// If the customer explicitly asks to speak to a specific officer (by name or
// department, e.g. "i want to talk with fatima", "sara se baat karni hai",
// "zain se baat karni hai", "security officer se baat kru"), route the next
// reply to that officer.
function resolveRequestedAgent(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  if (t.length === 0) return null;

  const namesRequested = /\b(ahmed|sara|bilal|fatima|ali|zain|umar)\b/i.test(t);
  const talkRequested = /\b(talk|speak|baat|bat\b|bulao|connect|transfer to|paas karo|pass|se bat|se baat|de do|de dain|de dena)\b/i.test(t);
  if (!namesRequested && !talkRequested) return null;

  const byNameOrRole = [
    [AGENTS.transactions, /\b(sara|statement officer|statement)\b/i],
    [AGENTS.money, /\b(bilal|cashier|teller|cash|counter)\b/i],
    [AGENTS.account, /\b(ahmed|account officer)\b/i],
    [AGENTS.manager, /\b(umar|branch manager|bank manager|manager)\b/i],
    [AGENTS.loans, /\b(zain|loan officer|loan|loans)\b/i],
    [AGENTS.security, /\b(fatima|security officer|fraud)\b/i],
    [AGENTS.support, /\b(ali|customer care|customer support|support)\b/i],
  ];

  for (const [agent, re] of byNameOrRole) {
    if (re.test(t)) return agent;
  }
  return null;
}

// --- Intent detection ---------------------------------------------------------
const ACC_RE = /\b(ca[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}|\d{12})\b/i;
const AMOUNT_RE = /(\d[\d,.]*)\s*(rs|pkr|rupees|rupay|rupee|\$|usd|dollar)?/i;

function detectIntent(text) {
  if (!text) return null;
  const t = String(text).trim().toLowerCase();
  if (t.length === 0) return null;

  const accountMatch = t.match(ACC_RE);
  const account = accountMatch ? accountMatch[1].replace(/[\s-]/g, '').toUpperCase() : null;

  const isStats = STATS_RE.test(t) && !MONEY_COMMAND_RE.test(t);
  const isHistory = HISTORY_RE.test(t) && !MONEY_COMMAND_RE.test(t);
  const isBalance = BALANCE_RE.test(t) && !MANAGER_RE.test(t);
  const isDeposit = MONEY_RE.test(t) && /\b(deposit|jama|pay in|add money|dal|bharo)\b/i.test(t) && !/\b(withdraw|nikalo|transfer|bhejo)\b/i.test(t);
  const isWithdraw = /\b(withdraw|nikalo|nikalna|nikal karun|nikalw|nkal|cash out|bahar karo)\b/i.test(t);
  const isTransfer = /\b(transfer|bhejo|bhej do|bhejna|bhej|send|money send|paisa bhej|pesa bhej|koi aur|doosre account|dusre account|bhej dena)\b/i.test(t);

  let intent = null;
  if (isStats) intent = 'stats';
  else if (isTransfer) intent = 'transfer';
  else if (isDeposit) intent = 'deposit';
  else if (isWithdraw) intent = 'withdraw';
  else if (isHistory) intent = 'history';
  else if (isBalance) intent = 'balance';

  if (!intent) return null;

  let amount = null;
  if (intent === 'deposit' || intent === 'withdraw' || intent === 'transfer') {
    const textWithoutAccounts = t.replace(ACC_RE, ' ');
    const amtMatch = textWithoutAccounts.match(/(?:rs\.?|pkr|rupees|rupee|rupay|usd|\$)?\s*(\d[\d,]*(?:\.\d{1,2})?)(?![\d,.])/i);
    if (amtMatch) {
      const clean = amtMatch[1].replace(/,/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num) && num > 0 && num < 1000000000) amount = num;
    }
  }

  return { intent, account, amount, raw: text };
}

// --- Operation execution ------------------------------------------------------
// Turn raw exceptions (Prisma can include whole stack traces) into one clean,
// human-friendly line for the AI.
function cleanError(e) {
  const firstLine = String(e && e.message || 'Something went wrong.').split('\n')[0].trim();
  if (/reach database|connect(ed)? time|connection/i.test(firstLine)) {
    return 'Banking system is temporarily unavailable. Please try again in a moment.';
  }
  return firstLine || 'Something went wrong.';
}

async function execute(intent, account, amount, raw) {
  const outcome = { success: false, error: null, data: null, needsAccount: !account, needsAmount: false, needsToAccount: false };

  if (intent === 'transfer') {
    const matches = String(raw).match(new RegExp(ACC_RE.source, 'gi')) || [];
    const accounts = matches.map((m) => m.replace(/[\s-]/g, '').toUpperCase());
    const toAccount = accounts.length >= 2 ? accounts[1] : null;
    if (!accounts[0] || !toAccount) {
      outcome.needsAccount = !accounts[0];
      outcome.needsToAccount = !toAccount;
      outcome.error = 'Transfer requires BOTH source and recipient account numbers.';
      return outcome;
    }
    if (!amount) {
      outcome.needsAmount = true;
      outcome.error = 'Transfer requires an amount.';
      return outcome;
    }
    try {
      const result = await BankingService.transfer(accounts[0], toAccount, amount);
      outcome.success = true;
      outcome.data = { type: 'transfer', from: result.from, to: result.to, amount: result.amount, reference: result.reference };
      return outcome;
    } catch (e) {
      outcome.error = cleanError(e);
      return outcome;
    }
  }

  if (!account) {
    outcome.error = (intent === 'history' || intent === 'stats')
      ? 'Account number required to fetch transaction records.'
      : 'Account number required.';
    return outcome;
  }

  if (intent === 'balance') {
    try {
      const result = await BankingService.getBalance(account);
      outcome.success = true;
      outcome.data = { type: 'balance', ...result };
    } catch (e) {
      outcome.error = cleanError(e);
    }
    return outcome;
  }

  if (intent === 'history') {
    try {
      const result = await BankingService.getTransactions(account, 10);
      outcome.success = true;
      outcome.data = { type: 'history', accountNumber: result.accountNumber, customerName: result.customerName, transactions: result.transactions };
    } catch (e) {
      outcome.error = cleanError(e);
    }
    return outcome;
  }

  if (intent === 'stats') {
    try {
      const result = await BankingService.getTransactionStats(account, { days: 30, limit: 10 });
      outcome.success = true;
      outcome.data = { type: 'stats', ...result };
    } catch (e) {
      outcome.error = cleanError(e);
    }
    return outcome;
  }

  if (intent === 'deposit' || intent === 'withdraw') {
    if (!amount) {
      outcome.needsAmount = true;
      outcome.error = `Please specify the amount to ${intent === 'deposit' ? 'deposit' : 'withdraw'}.`;
      return outcome;
    }
    try {
      const result = intent === 'deposit'
        ? await BankingService.deposit(account, amount)
        : await BankingService.withdraw(account, amount);
      outcome.success = true;
      outcome.data = { type: intent, accountNumber: result.accountNumber, balance: result.balance, currency: result.currency, amount: result.amount };
    } catch (e) {
      outcome.error = cleanError(e);
    }
    return outcome;
  }

  outcome.error = 'Unsupported banking operation.';
  return outcome;
}

// --- Context building ---------------------------------------------------------
function money(sym, n) {
  return `${sym} ${Number(n).toLocaleString('en-US')}`;
}

function buildContext(outcome, agent) {
  const by = (v) => (agent && agent.id === 'money' ? 'your teller' : 'the bank');
  if (!outcome.success) {
    return `\n\nBANKING RESULT (the operation was NOT completed — relay this honestly, never invent a success):\nERROR: ${outcome.error}${outcome.needsAccount ? ' The customer needs to provide their account number (format CA-XXXX-XXXX-XXXX). Politely ask for it.' : ''}${outcome.needsToAccount ? ' The customer also needs to provide the RECIPIENT account number for the transfer. Politely ask for it.' : ''}${outcome.needsAmount ? ` The customer has NOT specified an amount. Politely ask them how much they want to ${outcome.intent === 'deposit' ? 'deposit' : outcome.intent === 'withdraw' ? 'withdraw' : 'transfer'}. Do NOT proceed without it.` : ''}`;
  }

  const d = outcome.data;
  if (d.type === 'balance') {
    return `\n\nBANKING RESULT (REAL, AUTHORITATIVE — the balance below is the CURRENT up-to-date balance. Relay it EXACTLY as shown. Do NOT add, subtract, or recalculate anything.):\nAccount ${d.accountNumber} (${d.customerName}) current balance: ${money(d.currency === 'PKR' ? 'Rs' : d.currency, d.balance)}.`;
  }

  if (d.type === 'deposit' || d.type === 'withdraw') {
    return `\n\nBANKING RESULT (REAL, AUTHORITATIVE — these numbers are final. Relay EXACTLY. Do NOT recalculate.):\n${d.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${money(d.currency === 'PKR' ? 'Rs' : d.currency, d.amount)} ${d.type === 'deposit' ? 'made into' : 'taken from'} account ${d.accountNumber} succeeded. New balance: ${money(d.currency === 'PKR' ? 'Rs' : d.currency, d.balance)}.`;
  }

  if (d.type === 'transfer') {
    return `\n\nBANKING RESULT (REAL, AUTHORITATIVE — these numbers are final. Relay EXACTLY. Do NOT recalculate.):\nTransfer of ${money(d.from.currency === 'PKR' ? 'Rs' : d.from.currency, d.amount)} from account ${d.from.accountNumber} to account ${d.to.accountNumber} succeeded. Reference number: ${d.reference}. Source new balance: ${money(d.from.currency === 'PKR' ? 'Rs' : d.from.currency, d.from.balance)}.`;
  }

  if (d.type === 'history') {
    const rows = d.transactions.map((t, i) => {
      const dir = t.type === 'deposit' || t.type === 'transfer_in' ? '+' : '-';
      return `${i + 1}) ${new Date(t.createdAt).toLocaleString()} — ${t.type.replace(/_/g, ' ')} — ${dir}${money('Rs', Math.abs(t.amount))} — balance ${money('Rs', t.balanceAfter)}`;
    }).join('\n');
    return `\n\nBANKING RESULT (REAL, AUTHORITATIVE — this is the list of transactions. Relay these entries in a readable list. Do NOT invent, skip, or alter any.):\nLatest transactions for account ${d.accountNumber} (${d.customerName}):\n${rows || 'No transactions yet.'}`;
  }

  if (d.type === 'stats') {
    const s = d.summary;
    const sym = 'Rs';
    const byTypeRows = d.byType.map((t) => {
      const base = `${t.type.replace(/_/g, ' ')}: ${t.count} time(s), total ${money(sym, t.total)}`;
      const kinds = t.kinds.map((k) => `${k.label} (${k.count})`).join(', ');
      return kinds ? `${base} — kinds: ${kinds}` : base;
    }).join('\n');
    const byDayRows = d.byDay.slice(0, 10).map((day) => {
      const parts = [];
      if (day.deposits > 0) parts.push(`deposits ${day.deposits} = ${money(sym, day.totalDeposited)}`);
      if (day.withdrawals > 0) parts.push(`withdrawals ${day.withdrawals} = ${money(sym, day.totalWithdrawn)}`);
      if (day.transfers > 0) parts.push(`transfers ${day.transfers} = ${money(sym, day.totalTransferred)}`);
      return `${day.date}: ${parts.join(', ') || 'no activity'}`;
    }).join('\n');
    const recentRows = d.recent.map((t) => {
      const dir = t.type === 'deposit' || t.type === 'transfer_in' ? '+' : '-';
      return `${new Date(t.createdAt).toLocaleString()} — ${t.type.replace(/_/g, ' ')} — ${dir}${money(sym, Math.abs(t.amount))}`;
    }).join('\n');

    return `\n\nBANKING RESULT — TRANSACTION STATS (REAL, AUTHORITATIVE. Relay these numbers EXACTLY. Do NOT invent or recalculate.)
Account ${d.accountNumber} (${d.customerName}) — last ${d.days} days:
- Total transactions: ${s.count}
- Total deposited: ${money(sym, s.totalDeposited)} (${s.deposits} deposit${s.deposits === 1 ? '' : 's'})
- Total withdrawn: ${money(sym, s.totalWithdrawn)} (${s.withdrawals} withdrawal${s.withdrawals === 1 ? '' : 's'})
- Total received via transfer: ${money(sym, s.totalTransferredIn)} (${s.transfersIn})
- Total sent via transfer: ${money(sym, s.totalTransferredOut)} (${s.transfersOut})

Types of deposits & withdrawals:
${byTypeRows || 'No deposits or withdrawals in this period.'}

Day-by-day breakdown (newest first):
${byDayRows || 'No activity.'}

Most recent transactions:
${recentRows || 'No transactions yet.'}`;
  }

  return `\n\nBANKING RESULT (REAL data): ${JSON.stringify(d)}`;
}

// Each concrete banking task belongs to one specialist officer.
function agentForIntent(intent) {
  switch (intent) {
    case 'stats':
    case 'history':
      return AGENTS.transactions; // Sara
    case 'balance':
      return AGENTS.account; // Ahmed
    case 'deposit':
    case 'withdraw':
    case 'transfer':
      return AGENTS.money; // Bilal
    default:
      return null;
  }
}

// --- Entry point --------------------------------------------------------------
// Route a customer message to the right agent. The conversation keeps a "current
// officer" (currentAgent) so the SAME officer stays with the customer across
// follow-up messages instead of bouncing back to Support every time. The officer
// only changes when the customer explicitly asks for someone else, raises a
// security concern, or starts a concrete banking task belonging to another desk.
async function routeAndExecute(text, currentAgent = null) {
  const requested = resolveRequestedAgent(text);
  const intent = detectIntent(text);
  const securityConcern = SECURITY_RE.test(String(text || ''));

  let agent;
  if (securityConcern) {
    // Fraud / scam concerns ALWAYS go to the Security Officer.
    agent = AGENTS.security;
  } else if (requested) {
    // Explicit "talk to X" → hand over to that officer.
    agent = requested;
  } else if (intent) {
    // A real banking task → its specialist (stats→Sara, balance→Ahmed, money→Bilal).
    agent = agentForIntent(intent.intent) || classifyAgent(text);
  } else {
    // No concrete task and no request. If the message clearly opens a new topic
    // for a specialist desk (loan, bank policy/tax/zakat/manager), switch to it;
    // otherwise STAY with the officer already handling this chat.
    const topic = classifyAgent(text);
    if (topic.id === 'loans' || topic.id === 'manager') {
      agent = topic;
    } else if (currentAgent) {
      agent = getAgent(currentAgent.id) || topic;
    } else {
      agent = topic;
    }
  }

  // Handover flag for the caller so it can inject a clean take-over notice.
  const previousAgent = currentAgent && currentAgent.id !== agent.id ? currentAgent : null;

  if (!intent) {
    // Not a concrete banking operation (e.g. "kye timings hain", "loan chahiye",
    // "apka name kia he", "fatima se baat karni hai") — just roleplay as the
    // routed agent; no data block needed.
    return { agent, context: null, previousAgent };
  }

  const outcome = await execute(intent.intent, intent.account, intent.amount, intent.raw);
  outcome.intent = intent.intent;
  return { agent, context: buildContext(outcome, agent), previousAgent };
}

module.exports = { AGENTS, classifyAgent, agentPrompt, handoverContext, getAgent, voiceIntro, teamIntro, routeAndExecute, detectIntent };
