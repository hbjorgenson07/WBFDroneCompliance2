# Spray Log Tracker

A personal web application for logging and reviewing aerial application missions. Designed to support organized recordkeeping for aerial application operations, with field-by-field detail relevant to FAA Part 137-style documentation needs.

> **Disclaimer:** This tool is for personal recordkeeping and operational organization only. Regulatory requirements for aerial application records vary by state and operation type. The operator is responsible for reviewing current FAA and applicable state regulations.

---

## What This App Does

- Log every spray or spread mission with full operational detail
- Organize records by customer, field, product, aircraft, date, and status
- Search and filter your log history instantly
- Export filtered records to CSV
- Print individual job records
- Duplicate past jobs to speed up repeat runs
- View simple operational statistics

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | Next.js 16 (App Router), React 19 |
| Styling    | Tailwind CSS v4                   |
| Database   | Supabase (PostgreSQL)             |
| Auth       | Supabase Auth (email + password)  |
| Deployment | Vercel                            |
| Language   | TypeScript                        |

---

## Project Structure

```
spray-log-tracker/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (app)/                 # Protected app pages
│   │   ├── dashboard/         # Dashboard with stats + recent logs
│   │   ├── logs/              # Log list with search/filter
│   │   ├── logs/new/          # New log entry form
│   │   ├── logs/[id]/         # Log detail view
│   │   ├── logs/[id]/edit/    # Edit a log
│   │   └── stats/             # Statistics overview
│   ├── api/
│   │   ├── logs/              # GET list, POST create
│   │   ├── logs/[id]/         # GET, PUT, DELETE single log
│   │   └── export/            # CSV export endpoint
│   └── globals.css
├── components/
│   ├── ui/                    # Button, Input, Select, Toggle, Badge, ConfirmModal
│   ├── SprayLogForm.tsx        # Main entry form (collapsible sections)
│   ├── LogCard.tsx             # Card shown in lists
│   ├── LogDetail.tsx           # Full detail view layout
│   ├── SearchFilter.tsx        # Search + filter bar
│   ├── StatsCards.tsx          # Dashboard stat tiles
│   └── Navbar.tsx              # Top nav + dark mode + logout
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server Supabase client
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # generateJobId, formatDate, buildCsv, etc.
├── proxy.ts                    # Auth protection (runs on every request)
├── supabase/schema.sql         # Paste into Supabase SQL editor to set up DB
├── .env.example                # Environment variable template
└── README.md
```

---

## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org) v18 or newer
- A [Supabase](https://supabase.com) account (free tier works fine)
- A [Vercel](https://vercel.com) account (free tier works fine)
- A [GitHub](https://github.com) account (for deployment)

### Step 1 — Install dependencies

```bash
cd spray-log-tracker
npm install
```

### Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **"New Project"** and fill in the project name and database password. Wait about 1 minute for it to finish setting up.
3. In your new project, click **"SQL Editor"** in the left sidebar.
4. Click **"New query"**, then paste the entire contents of `supabase/schema.sql` into the editor, and click **"Run"**.
   - This creates the `spray_logs` table, turns on Row Level Security, and sets up automatic timestamps.
5. Go to **Authentication → Users** in the left sidebar.
   - Click **"Add user"** → **"Create new user"**
   - Enter your email address and a strong password
   - Click **"Create user"**
   - This is the account you will use to log in to the app.
6. Go to **Project Settings → API** and copy two values:
   - **Project URL** (looks like `https://abcdefghij.supabase.co`)
   - **anon / public key** (a long string starting with `eyJ...`)

### Step 3 — Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` in any text editor and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the email and password you created in Supabase.

---

## Supabase Setup at a Glance

| Step | Where                      | What to do                                       |
|------|----------------------------|--------------------------------------------------|
| 1    | SQL Editor                 | Run `supabase/schema.sql` to create the table    |
| 2    | Authentication → Users     | Create your user (email + password)              |
| 3    | Project Settings → API     | Copy Project URL and anon key to `.env.local`    |

---

## Environment Variables

| Variable                        | Where to find it                        |
|---------------------------------|-----------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API       |

Both values are safe to expose on the frontend. Supabase Row Level Security ensures each user can only read and modify their own records.

---

## Deploying to Vercel

### Step 1 — Push to GitHub

From inside the `spray-log-tracker` folder:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2 — Create a Vercel project

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New Project"**.
3. Click **"Import"** next to your GitHub repository.
4. Vercel auto-detects Next.js — leave all build settings as-is.
5. Before clicking Deploy, open the **"Environment Variables"** section and add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key
6. Click **"Deploy"**.

### Step 3 — Open the app

After the deploy finishes (usually under 1 minute), Vercel gives you a URL like:
```
https://spray-log-tracker-abc123.vercel.app
```

Open it on any device, sign in, and you're up and running.

**Future updates:** Any time you push code changes to GitHub, Vercel automatically redeploys. No manual steps needed.

---

## How to Use the App

### Creating a log

1. Click **"+ New Log"** from the dashboard or navigation bar.
2. The form is organized into 4 collapsible sections — tap any section header to expand/collapse it:
   - **Mission / Job Information** — date, operator, aircraft, customer, field, acreage, crop, status
   - **Product / Application** — product name, EPA number, rate, quantity, carrier, RUP toggle
   - **Weather / Conditions** — wind, temperature, humidity, sky conditions
   - **Operational Notes** — nozzle info, swath, altitude, drift notes, remarks
3. Job ID is auto-generated but you can edit it.
4. Click **"Save & View"** to save and go to the detail page.
5. Click **"Save & Continue Editing"** to save and stay on the form.

### Finding past logs

1. Go to **Logs** in the nav bar.
2. Type in the search box to find by customer name, field name, product name, or job ID.
3. Use the filter controls to narrow by status, aircraft, crop type, or date range.
4. Change the sort order with the dropdown.

### Duplicating a job

On any log detail page, click **"Duplicate"**. This opens the form pre-filled with the same values, but with a new auto-generated job ID and today's date. Useful for repeat customers or similar jobs.

### Exporting records

- On the **Logs** page: apply filters, then click **"Export CSV"** to download all matching records.
- On a log detail page: click **"Export CSV"** for just that one record, or **"Print"** for a printer-friendly view.

### Dark mode

Click the moon/sun icon in the navigation bar to toggle dark mode. Your preference is saved automatically.

---

## Troubleshooting

**Login fails or "Invalid login credentials"**
Make sure you created a user in Supabase → Authentication → Users. The database user and the auth user are different — you need the auth user.

**"Your project's URL and API key are required"**
Your `.env.local` file is missing or incorrect. Check the values against Supabase → Project Settings → API.

**Logs not showing up**
Go to Supabase → Table Editor and check that the `spray_logs` table exists. If not, re-run `supabase/schema.sql` in the SQL Editor.

**Vercel deployment fails**
Make sure the two environment variables are set in Vercel's project settings (Settings → Environment Variables), not just in your local `.env.local` file.

**Changes not appearing after deploy**
Vercel deploys on every `git push`. Run `git push` after making any changes.

---

## Data Fields

### Mission / Job Information
Job ID, Date, Start Time, End Time, Operator/Pilot, Aircraft Tail Number, Customer/Farm Name, Field Name, Field Location, GPS Coordinates, Acreage Treated, Crop Type, Application Type (spray/spread), Mission Status (planned/completed/canceled)

### Product / Application
Product Name, EPA Registration Number, Product Type, Target Pest/Purpose, Rate Applied, Total Quantity Used, Carrier Type, Carrier Rate, Tank Mix Notes, Restricted Use Pesticide (yes/no), Label/Restriction Notes

### Weather / Conditions
Wind Speed, Wind Direction, Temperature, Humidity, Sky Conditions, Inversion Concern Notes, General Weather Notes

### Operational Notes
Nozzle/Equipment Notes, Swath Width, Flight Altitude Notes, Drift Mitigation Notes, Incident/Issue Notes, General Remarks
