-- InboxPilot Database Schema
-- Run this in Supabase SQL Editor to set up all tables.
-- Supabase auto-enables the uuid-ossp extension, so gen_random_uuid() works out of the box.

-- =============================================================================
-- USERS
-- Stores account credentials and encrypted Gmail App Passwords.
-- The user_profile field is a plain-text description used by the AI agent
-- to personalize draft responses (tone, style, role context).
-- gmail_app_password is AES-256-GCM encrypted — never stored in plaintext.
-- =============================================================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  password_hash text not null,                -- bcrypt hash
  gmail_app_password text,                    -- AES-256-GCM encrypted
  user_profile text default 'Name: Alex Johnson
Role: Senior Product Manager at TechCorp
Team: Platform team (8 direct reports)
Key projects: Q1 product launch, API redesign, mobile app v2
Communication style: Professional but friendly, concise, action-oriented
Preferences: Prefers bullet points, dislikes unnecessary meetings
Manager: Sarah Chen (VP of Product)
Schedule: Usually available 9am-6pm PST, Wednesdays are no-meeting days',
  created_at timestamptz default now()
);

-- =============================================================================
-- PROCESSED EMAILS
-- One row per email the agent has analyzed. Stores the original email content,
-- the agent's classification (priority + reasoning), and the drafted response.
--
-- status tracks the user's action:
--   pending_review = agent processed it, user hasn't acted yet
--   sent           = user clicked Send, reply was sent via SMTP
--   skipped        = user clicked Skip
--
-- batch_id groups all emails from a single processing run together.
-- The unique constraint on (user_id, gmail_message_id) prevents duplicates
-- if the same email is fetched in multiple runs.
-- =============================================================================
create table if not exists processed_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  gmail_message_id text not null,
  thread_id text,
  from_address text,
  from_name text,
  subject text,
  body_snippet text,                          -- first 200 chars for previews
  body_full text,                             -- up to 3000 chars sent to agent
  received_at timestamptz,
  priority text check (priority in ('HIGH', 'MEDIUM', 'LOW')),
  agent_reasoning text,                       -- why the agent assigned this priority
  needs_response boolean default false,
  draft_response text,                        -- AI-drafted reply (editable by user)
  status text default 'pending_review' check (status in ('pending_review', 'sent', 'skipped')),
  processed_at timestamptz default now(),
  batch_id uuid not null,
  unique(user_id, gmail_message_id)
);

-- =============================================================================
-- BRIEFINGS
-- One row per processing run. Contains a summary of the batch, counts,
-- and the full agent execution trace (JSONB) displayed in the UI.
--
-- The trace stores an array of steps, each with:
--   { iteration, timestamp, durationMs, toolCalls[], tokensUsed }
-- This powers the Agent Trace panel on the dashboard.
-- =============================================================================
create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  batch_id uuid not null,
  content text,                               -- morning briefing summary text
  email_count int default 0,
  urgent_count int default 0,
  needs_response_count int default 0,
  trace jsonb,                                -- full agent execution trace
  created_at timestamptz default now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
create index if not exists idx_processed_emails_user_batch on processed_emails(user_id, batch_id);
create index if not exists idx_processed_emails_user_status on processed_emails(user_id, status);
create index if not exists idx_processed_emails_user_gmail_id on processed_emails(user_id, gmail_message_id);
create index if not exists idx_briefings_user on briefings(user_id, created_at desc);
