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
  },
};

// Spoken greeting that introduces the whole team — used by the phone/voice flow
// so a caller knows which officers they can talk to.
function teamIntro(businessName) {
  const names = [AGENTS.account, AGENTS.transactions, AGENTS.money, AGENTS.security, AGENTS.support];
  const intro = names.map((a) => `${a.name}, ${a.title}`).join('; ');
  return `Hello! You have reached ${businessName || 'our bank'}. You are speaking to our AI banking team. ${intro}. Just tell us what you need. For example, say balance check, deposit, withdraw, transfer, statement, or my transaction stats. How can we help you today?`;
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

function classifyAgent(text) {
  if (!text) return AGENTS.support;
  const t = String(text);

  // Security concerns always go to the Security Officer first.
  if (SECURITY_RE.test(t)) return AGENTS.security;
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

function agentPrompt(agent) {
  const roster = Object.values(AGENTS)
    .map((a) => `${a.name} — ${a.title} (${a.department})`)
    .join('; ');
  return `\n\nYou are roleplaying as ${agent.name}, the ${agent.title} at this bank (${agent.department}). ${agent.job} Your department is responsible for: ${agent.capabilities}. Answer as this officer. You only work with REAL data the system hands you below — never invent account numbers, balances, or transaction figures. If the operation needs something you do not have (account number, amount), politely ask for it. Keep replies short, clear, in the customer's language, and always quote real numbers exactly. If the customer greets you or asks who you are talking to, introduce yourself as ${agent.name}, the ${agent.title} from the ${agent.department}.

THE FULL BANKING TEAM (you know every colleague — when a customer asks to talk to another officer by name or department, acknowledge them by name and role, say you are connecting them, and keep it short. The next message will be answered by that officer):
${roster}

IMPORTANT: This is ONE shared conversation for the whole bank team. Earlier replies in this conversation may have been given by a DIFFERENT officer — do not treat them as your own. Only the message you are replying to right now is yours. If you have just taken over this chat (the customer asked to be connected to you, or you are replying first), warmly introduce yourself as ${agent.name}, the ${agent.title}. Never claim the customer was already talking to you unless you are the one who gave the previous reply.`;
}

// If the customer explicitly asks to speak to a specific officer (by name or
// department, e.g. "i want to talk with fatima", "sara se baat karni hai",
// "security officer se baat kru"), route the next reply to that officer.
function resolveRequestedAgent(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  if (t.length === 0) return null;

  const namesRequested = /\b(ahmed|sara|bilal|fatima|ali)\b/i.test(t);
  const talkRequested = /\b(talk|speak|baat|bat\b|bulao|connect|transfer to|paas karo|pass|se bat|se baat|de do|de dain|de dena)\b/i.test(t);
  if (!namesRequested && !talkRequested) return null;

  const byNameOrRole = [
    [AGENTS.transactions, /\b(sara|statement officer|statement)\b/i],
    [AGENTS.money, /\b(bilal|cashier|teller|cash|counter)\b/i],
    [AGENTS.account, /\b(ahmed|account officer)\b/i],
    [AGENTS.security, /\b(fatima|security officer|fraud)\b/i],
    [AGENTS.support, /\b(ali|customer care|customer support|support)\b/i],
  ];

  for (const [agent, re] of byNameOrRole) {
    if (re.test(t)) return agent;
  }
  return null;
}

// Short spoken self-introduction used by the phone/voice flow so the caller
// always knows which officer is answering (e.g. "Bilal, the Cashier here.").
function voiceIntro(agent) {
  if (!agent) return '';
  return `${agent.name}, the ${agent.title} here from the ${agent.department}. `;
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
  const isBalance = BALANCE_RE.test(t);
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

// --- Entry point --------------------------------------------------------------
// Route a customer message to the right agent, run the real operation (if it is
// an actionable banking intent) and return the persona + result context.
async function routeAndExecute(text) {
  let agent = classifyAgent(text);
  // Security concerns always go to the Security Officer. Otherwise, if the
  // customer explicitly asked to talk to a specific officer, route there so the
  // handover actually happens (e.g. "i want to talk with fatima" → Fatima).
  const requested = resolveRequestedAgent(text);
  if (agent.id !== 'security' && requested && requested.id !== agent.id) {
    agent = requested;
  }

  const intent = detectIntent(text);
  if (!intent) {
    // Not a concrete banking operation (e.g. "kye timings hain", "loan chahiye",
    // a scam report, "fatima se baat karni hai") — just roleplay as the routed
    // agent; no data block needed.
    return { agent, context: null };
  }

  const outcome = await execute(intent.intent, intent.account, intent.amount, intent.raw);
  outcome.intent = intent.intent;
  return { agent, context: buildContext(outcome, agent) };
}

module.exports = { AGENTS, classifyAgent, agentPrompt, voiceIntro, teamIntro, routeAndExecute, detectIntent };
