# 🤖 AI Business Calling Agent

An AI-powered business calling agent that handles phone calls, WhatsApp messages, and web chat for any type of business.

## Features

- **Phone Calls** - Inbound/Outbound calls via Twilio
- **WhatsApp** - Automated messaging and customer support
- **Web Chat** - Embeddable chat widget for websites
- **AI Engine** - Groq-powered natural conversations
- **Multi-business** - Support for restaurants, real estate, e-commerce, consulting
- **24/7 Availability** - Always active AI assistant
- **Admin Dashboard** - Manage businesses, view analytics

## Tech Stack

| Component | Technology |
|-----------|------------|
| AI Engine | Groq API (Llama 3.3 70B) |
| Phone Calls | Twilio Voice API |
| WhatsApp | Twilio WhatsApp API |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma |
| Frontend | Next.js + Tailwind CSS |
| Widget | Vanilla JavaScript |

## Project Structure

```
calling-agent/
├── backend/          # API Server (Node.js + Express)
├── dashboard/        # Admin Panel (Next.js)
├── widget/           # Website Chat Widget
└── README.md
```

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
# Edit .env with your credentials

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database (optional)
node prisma/seed.js

# Start server
npm run dev
```

### 2. Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Widget Usage

Add this to your website's HTML:

```html
<script src="widget.js" 
  data-business-id="YOUR_BUSINESS_ID"
  data-widget-key="YOUR_WIDGET_KEY"
  data-theme="blue"
  data-position="bottom-right">
</script>
```

`data-widget-key` (visible in the dashboard under the business) authorizes the public widget to load your business's chat history. Without a valid key the history endpoints return 401.

## Environment Variables

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/calling_agent"

# Groq AI (free tier)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Twilio (for phone/WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=xxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# App
APP_URL=http://localhost:5000
```

## API Endpoints

### Chat
- `POST /api/chat` - Send message to AI
- `POST /api/chat/voice` - Voice input processing

### Business
- `POST /api/business` - Create business
- `GET /api/business` - List businesses
- `GET /api/business/:id` - Get business details
- `PUT /api/business/:id` - Update business
- `PUT /api/business/:id/knowledge` - Update knowledge base
- `PUT /api/business/:id/rules` - Update rules

### Conversations
- `GET /api/conversations/:businessId` - List conversations
- `GET /api/conversations/detail/:id` - Get conversation details
- `PUT /api/conversations/:id/close` - Close conversation
- `PUT /api/conversations/:id/transfer` - Transfer to human

### Phone
- `POST /api/phone/call` - Make outbound call
- `GET /api/phone/status/:callSid` - Get call status

### WhatsApp
- `POST /api/whatsapp/send` - Send WhatsApp message
- `POST /api/whatsapp/template` - Send template message
- `POST /api/whatsapp/order-confirmation` - Send order confirmation
- `POST /api/whatsapp/appointment-reminder` - Send reminder

### Webhooks
- `POST /api/webhook/voice/incoming` - Handle incoming calls
- `POST /api/webhook/voice/gather` - Process speech input
- `POST /api/webhook/voice/status` - Call status updates
- `POST /api/webhook/whatsapp/incoming` - Handle WhatsApp messages

## Business Types

| Type | Features |
|------|----------|
| Restaurant | Menu, orders, reservations, delivery |
| Real Estate | Properties, viewings, appointments |
| E-commerce | Products, orders, shipping, returns |
| Consulting | Appointments, services, consultations |
| Generic | Custom knowledge base, flexible |

## Setup Guides

### Groq API (Free)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with email
3. Create API key
4. Copy to `.env` as `GROQ_API_KEY`

### PostgreSQL

1. Install PostgreSQL
2. Create database: `createdb calling_agent`
3. Update `DATABASE_URL` in `.env`

### Twilio (Optional)

1. Go to [twilio.com](https://twilio.com)
2. Sign up and get credentials
3. Buy a phone number
4. Update `.env` with credentials
5. Set webhook URLs in Twilio console

## License

ISC
