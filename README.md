# InboxPilot — AI Email Agent

An AI agent that triages your Gmail inbox every morning, prioritizes emails by importance, drafts personalized responses, and presents everything in a clean dashboard where you review and send with one click.

**Live demo**: 

## How It Works

1. **Create an account** (email + password)
2. **Enter your Gmail App Password** in Settings (AES-256 encrypted at rest)
3. **Every morning**, the agent processes your inbox via IMAP
4. **Open the dashboard** — see the agent's execution trace, review prioritized emails with drafted responses, click Send or Skip

The agent is genuinely agentic: it has tools (`get_person_profile`, `classify_email`, `draft_response`, `skip_email`) and autonomously decides which to call, in what order, and how to reason about each email. It's not a fixed pipeline.

## Architecture

```
Next.js (App Router) → Vercel (hosting + daily cron)
├── Email/password auth (NextAuth credentials + bcrypt)
├── Gmail IMAP/SMTP (via user's App Password, AES-256 encrypted in DB)
├── OpenAI gpt-5-mini (agent with function calling)
└── Supabase Postgres (users, processed emails, briefings)
```

**Key design decisions:**
- **No Google OAuth** — eliminates Google Cloud project setup, app verification, and restricted scope reviews. Users just create an account and enter their App Password.
- **AES-256-GCM encryption** — App Passwords are encrypted at rest with authenticated encryption, never stored in plaintext.
- **Raw OpenAI function calling** — no LangChain or framework abstractions. The agent loop is ~100 lines of TypeScript.
- **Transparent reasoning** — every email shows WHY the agent assigned its priority, building trust and demonstrating genuine AI reasoning.

## The Agent

The agent (`src/lib/agent/core.ts`) uses OpenAI's function calling in a loop. It receives unread emails and has 4 tools:

| Tool | Purpose |
|------|---------|
| `get_person_profile(name)` | Look up a sender in the contacts directory for relationship context |
| `classify_email(emailId, priority, reasoning, needsResponse)` | Assign HIGH/MEDIUM/LOW priority with detailed reasoning |
| `draft_response(emailId, responseText, tone)` | Draft a personalized reply based on the sender's relationship |
| `skip_email(emailId, reason)` | Mark an email as not needing a response |

**Typical execution (2 turns):**

1. **Turn 1**: Agent calls `get_person_profile` for ALL senders (batched)
2. **Turn 2**: Using profile context, agent batches all `classify_email`, `draft_response`, and `skip_email` calls
3. **Done**: Agent finishes, results are stored, dashboard updates

The system prompt instructs batching but doesn't hardcode the pipeline — the model decides tool order and arguments autonomously.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Hosting | Vercel (cron jobs via `vercel.json`) |
| Auth | NextAuth.js v5 (Credentials provider + bcrypt) |
| Database | Supabase (Postgres) |
| AI | OpenAI `gpt-5-mini` with function calling |
| Email Read | Gmail IMAP via `imap` + `mailparser` |
| Email Send | Gmail SMTP via `nodemailer` |
| Encryption | AES-256-GCM for App Password storage |
| UI | Tailwind CSS + shadcn/ui |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (sign up / sign in)
│   ├── layout.tsx                  # Root layout with SessionProvider
│   ├── dashboard/page.tsx          # Main dashboard (agent trace + email cards)
│   ├── settings/page.tsx           # App Password + profile setup
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/      # NextAuth handler
│       │   └── signup/             # Account creation (bcrypt)
│       ├── cron/process/           # Daily cron endpoint (all users)
│       ├── process-now/            # Manual trigger (single user, auth'd)
│       ├── settings/               # Save encrypted App Password
│       └── emails/send|skip/       # Send/skip actions
├── lib/
│   ├── auth.ts                     # NextAuth Credentials config
│   ├── crypto.ts                   # AES-256-GCM encrypt/decrypt
│   ├── db.ts                       # Supabase client (lazy singleton)
│   ├── gmail.ts                    # IMAP fetch + SMTP send
│   ├── types.ts                    # All TypeScript interfaces
│   └── agent/
│       ├── core.ts                 # Agent loop with tracing
│       ├── tools.ts                # 4 tool definitions + executors
│       ├── prompts.ts              # System prompt builder
│       └── contacts.ts             # 5 contact profiles + lookup
└── components/
    ├── AuthForm.tsx                # Sign up / sign in form
    ├── RunAgentButton.tsx          # "Process Inbox Now" button
    ├── AgentTrace.tsx              # Collapsible agent execution log
    ├── EmailQueue.tsx              # Priority-sorted card queue
    ├── EmailCard.tsx               # Single email with draft + send/skip
    ├── Briefing.tsx                # Morning briefing card
    ├── SettingsForm.tsx            # App Password + profile form
    └── LocalTime.tsx               # Client-side timestamp rendering
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier)
- An [OpenAI](https://platform.openai.com) API key
- A Gmail account with [2-Step Verification](https://myaccount.google.com/security) enabled

### 1. Clone and install

```bash
git clone 
cd 
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/migration.sql`
3. Copy your **Project URL** and **Service Role Key** from **Settings > API**

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in the values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
AUTH_SECRET=any-random-string-at-least-32-chars
ENCRYPTION_KEY=another-random-string-for-aes
CRON_SECRET=another-random-string-for-cron
```

Generate random secrets with: `openssl rand -base64 32`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):
1. **Sign up** with your email and a password
2. Go to **Settings** and enter your [Gmail App Password](https://myaccount.google.com/apppasswords)
3. Click **"Process Inbox Now"** on the dashboard
4. Review prioritized emails, edit drafts if needed, click Send or Skip

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod
```

Then add all 6 env vars in the Vercel dashboard (**Settings > Environment Variables**) and redeploy:

```bash
vercel --prod
```

The cron job (`vercel.json`) will automatically run daily. Check **Settings > Cron Jobs** in the Vercel dashboard to verify.
