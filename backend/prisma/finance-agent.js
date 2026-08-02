require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.business.findFirst({ where: { name: 'Financial Advisor' } });
  if (existing) {
    console.log('Already exists:', existing.id);
    await prisma.$disconnect();
    return;
  }

  const finance = await prisma.business.create({
    data: {
      name: 'Financial Advisor',
      type: 'finance',
      phone: '+923000000001',
      email: 'support@financialadvisor.com',
      website: 'https://financialadvisor.com',
      description:
        'A complete AI financial education, fraud detection, and smart budgeting expert. Knows everything about financial literacy, all types of scams and how to detect them, smart budgeting, daily expense solutions, financial stability, best education courses and career paths in finance, and practical money advice. Ask it anything about money.',
      knowledgeBase: {
        about:
          'This agent is a comprehensive financial knowledge assistant. It educates users about money, protects them from fraud, and helps them budget and build wealth.',
        financialEducation: {
          moneyBasics: [
            'Income: money coming in (salary, business, freelancing, rent, interest)',
            'Expenses: money going out (needs, wants, savings, debt payments)',
            'Savings: money kept aside for the future before spending',
            'Budget: a plan that tells your money where to go each month',
            'Assets: things you own that put money in your pocket (house, business, investments)',
            'Liabilities: things that take money out of your pocket (loans, unpaid bills)',
            'Net worth: total assets minus total liabilities - the real measure of wealth',
            'Inflation: prices rising over time, so money loses value if not invested',
            'Compound interest: earning interest on your interest - the most powerful wealth tool',
            'Emergency fund: 3-6 months of expenses saved for emergencies',
          ],
          banking: [
            'Savings account: safe place for money, earns some profit/interest',
            'Current account: for daily transactions, no/minimal profit',
            'Fixed deposit (FD): lock money for a fixed time for higher profit',
            'Islamic banking: Shariah-compliant, profit/loss sharing instead of interest',
            'Bank cards: debit (uses your money) vs credit (borrowed money, must pay back)',
            'OTP/PIN/CVV are personal - never share them with anyone',
            'Always use official bank apps and numbers, never links from SMS/WhatsApp',
          ],
          loansAndCredit: [
            'Loan: borrowed money that must be repaid with interest/profit',
            'EMI: fixed monthly payment for a loan',
            'Credit score: your financial trust score; higher is better for loan approval',
            'Credit card: pay later facility, but late payments add heavy charges',
            'Always compare interest rates before borrowing',
            'Never take a loan to gamble or invest in get-rich-quick schemes',
            'Defaulting on loans ruins your credit and causes legal problems',
          ],
          investments: [
            'Stocks: buying shares of companies; can grow but prices go up and down',
            'Mutual funds: pooled money managed by professionals, lower risk than single stocks',
            'Gold: safe long-term store of value',
            'Real estate: property investment; needs large capital, slow but steady',
            'Bonds: lending to government/company for fixed profit',
            'Cryptocurrency: very high risk and high volatility - only invest money you can afford to lose',
            'Never invest in schemes promising guaranteed high returns - they are scams',
            'Diversify: spread money across different investments to reduce risk',
            'Only invest after building an emergency fund and clearing expensive debt',
          ],
          insurance: [
            'Life insurance: protects your family if you pass away',
            'Health insurance: covers medical costs - essential for everyone',
            'Vehicle insurance: protects against accident costs (often required by law)',
            'Home insurance: protects your house and belongings',
            'Choose insurance from licensed, verified companies only',
          ],
          taxes: [
            'Income tax: tax on your earnings, collected by the government',
            'Tax brackets: higher income is taxed at higher rates',
            'Tax planning (legal) reduces tax; tax evasion (illegal) has heavy penalties',
            'Keep records of income and expenses for tax filing',
            'Use registered tax advisors for complex tax matters',
          ],
        },
        fraudDetection: {
          commonScams: [
            'Bank fraud: fake calls/SMS claiming your account is blocked or suspicious',
            'OTP phishing: scammers ask for your OTP/PIN - never share it',
            'Card fraud: card cloned or used online without your knowledge',
            'Online shopping scams: fake websites/sellers take payment but send nothing',
            'Investment scams (Ponzi/pyramid): promise huge returns, pay old investors with new money',
            'Lottery/prize scams: you "won" money but must pay fees to receive it',
            'Job scams: fake jobs that ask for money for "processing" or "training"',
            'Romance scams: fake relationships to steal money',
            'Fake charity: fake collection for disasters/needy - verify before donating',
            'Identity theft: criminals steal your info to open accounts or take loans',
            'Tax fraud: fake "tax department" calls demanding immediate payment',
            'Government/court scams: fake calls claiming you owe fines or have warrants',
          ],
          redFlags: [
            'Urgency: "act now or lose the offer" - scammers rush you',
            'Fear: threats of account closure, arrest, or legal action',
            'Secrecy: "do not tell anyone about this call"',
            'Payment in gift cards, cryptocurrency, or "fees" to receive money',
            'Unknown numbers/SMS links asking for personal details',
            'Too-good-to-be-true returns on investments',
            'Callers demanding your OTP, PIN, CVV, or full card details',
          ],
          prevention: [
            'Never share OTP, PIN, CVV, or passwords with anyone - bank staff never ask',
            'Verify calls by calling the official bank/company number yourself',
            'Do not click links in SMS or emails; type official websites directly',
            'Use strong unique passwords and two-factor authentication',
            'Check bank statements regularly for unknown transactions',
            'Only buy from verified sellers and official platforms',
            'Be suspicious of anyone asking for money to release a prize or job',
            'Keep your phone and apps updated',
            'Tell elderly family members about these scams - they are targeted most',
          ],
          afterBeingScammed: [
            'Contact your bank immediately to block your account/card',
            'Change all passwords and enable two-factor authentication',
            'Save all evidence: messages, numbers, screenshots, transaction records',
            'Report to the police and your country fraud helpline/authority',
            'Report the scam account/number to the platform (bank, WhatsApp, social media)',
            'Do not feel ashamed - scammers are professionals; report it fast',
          ],
        },
        smartBudgeting: {
          methods: [
            '50/30/20 rule: 50% needs, 30% wants, 20% savings/debt',
            'Zero-based budget: assign every rupee/dollar a job until income minus expenses = 0',
            'Envelope system: cash in envelopes for each spending category',
            'Pay yourself first: save/invest before paying bills',
          ],
          steps: [
            '1. List all monthly income (salary, freelance, business, other)',
            '2. List all monthly expenses (rent, food, transport, bills, misc)',
            '3. Separate needs (must have) from wants (nice to have)',
            '4. Set a savings goal (start with 10-20% of income)',
            '5. Track daily expenses (rozana akhrajat) in a notebook or app',
            '6. Cut one unnecessary expense this month',
            '7. Review at month end and adjust for next month',
          ],
          dailyExpenseTips: [
            'Track every small purchase - small leaks sink big ships',
            'Cook at home more, limit takeout',
            'Make a shopping list and stick to it',
            'Avoid buying on impulse - wait 24 hours before big purchases',
            'Use public transport or carpool when possible',
            'Buy in bulk only for items you truly use',
            'Set a daily spending limit',
            'Use cash for variable expenses to feel the money leaving',
          ],
          emergencyFund: [
            'Goal: 3-6 months of essential expenses saved',
            'Start small - even a little each month adds up',
            'Keep it in a separate savings account, not your daily account',
            'Use it only for real emergencies, not wants',
          ],
          debtReduction: [
            'Snowball method: pay off smallest debts first for quick wins',
            'Avalanche method: pay off highest-interest debts first to save money',
            'Never take new debt to pay old debt',
            'Negotiate with lenders for better terms when possible',
            'Stop using credit cards until debt is cleared',
          ],
          wealthBuilding: [
            'Build emergency fund first',
            'Pay off high-interest debt',
            'Save 10-20% of every income automatically',
            'Invest in simple diversified options after learning basics',
            'Increase income with side skills and freelancing',
            'Live below your means - spend less than you earn',
            'Be patient - wealth grows over years, not days',
          ],
        },
        financialStability: {
          forStudents: [
            'Track small expenses; student discounts are your friend',
            'Build a habit of saving 10% of any money you receive',
            'Learn basic finance early - it pays for life',
            'Avoid credit card debt; use debit or cash',
            'Do part-time/freelance work to learn earning and budgeting',
          ],
          forSalaried: [
            'Automate savings - transfer 10-20% on salary day',
            'Use company benefits: health insurance, provident fund/pension',
            'Avoid lifestyle inflation when salary increases',
            'Build emergency fund of 3-6 months',
            'Clear high-interest debt (credit cards, personal loans) first',
            'Invest for retirement - start young for compound growth',
          ],
          forFreelancers: [
            'Income is irregular - save more during good months',
            'Set aside 20-30% for taxes',
            'Separate business and personal accounts',
            'Always have a written contract and escrow for clients',
            'Track income and expenses monthly',
          ],
          forBusinessOwners: [
            'Separate personal and business money completely',
            'Track all cash flow - money in and money out',
            'Keep a reserve for slow months',
            'Reinvest profit wisely, not just spend it',
            'Get professional accounting help when the business grows',
          ],
        },
        educationAndCourses: {
          notes: [
            'This agent gives general guidance. Course names, fees, and income vary by country and institution - always verify current details.',
            'Free learning is available on reputable platforms before paying for courses.',
          ],
          careerPaths: [
            'Accounting/Bookkeeping: low start cost, steady demand, work for firms or freelance',
            'Banking: stable career; courses in banking operations, finance',
            'Fintech/Digital Payments: growing field; learn about payment systems, apps',
            'Data Analytics/Finance: analyze financial data; strong future demand',
            'Business Administration: broad management skills for finance roles',
            'Certifications: professional credentials add credibility and salary',
          ],
          typicalFeesAndIncome: [
            'Beginner finance/bookkeeping courses: low to moderate cost, entry-level income',
            'Professional accounting/finance certifications: moderate to high cost, significantly higher income potential',
            'University finance/business degrees: high cost, wide career options',
            'Free online courses: no cost, good for basics and exploration',
          ],
          advice: [
            'Choose a course based on your interest, budget, and job market demand',
            'Start free, verify job demand, then invest in recognized credentials',
            'Combine practical skills (software, Excel, analytics) with theory',
            'Look for scholarships and installment payment options',
          ],
        },
        disclaimers: {
          general:
            'Financial advice is educational and general. Verify with licensed advisors for personal decisions. Interest rates, prices, and course fees change - confirm current figures.',
          fraud:
            'If you suspect fraud, contact your bank and local authorities immediately. Never delay reporting a scam.',
        },
      },
      rules: {
        language: 'Always respond in ENGLISH only.',
        tone: 'Be clear, practical, and easy to understand for beginners.',
        fraudWarning: 'If something looks like a scam, warn the user clearly and explain why before anything else.',
        verification: 'Encourage using official and verified channels for all financial matters.',
        disclaimer: 'Give educational general advice and recommend licensed advisors for personal financial decisions.',
      },
    },
  });

  console.log('Created Financial Advisor:', finance.id);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
