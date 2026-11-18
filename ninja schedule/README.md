# 🥷 Ninja Scheduler

A lean scheduler for the ninja program: one weekly template, date-specific subs and cancellations, and a mobile coach hub. Built with React + Vite + Supabase and deployed on Netlify.

## Setup (about 10 minutes)

### 1. Supabase
1. Open your Supabase project. It can be the same one the gymnastics app uses, because every table here starts with `ninja_`.
2. Go to **SQL Editor** and paste `supabase/schema.sql`, then **Run**. It's safe to re-run. It creates the tables and indexes, turns on permissive RLS (`USING (true)`), and enables realtime.
   - **Already ran an earlier schema.sql?** Also run `supabase/migration_002_payroll.sql`, which adds employee IDs and labor codes.
3. Optional: run `supabase/seed.sql` to load 3 sample coaches and 5 classes.
4. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.

### 2. GitHub
```bash
cd ninja-scheduler
git init && git add . && git commit -m "Ninja scheduler v1"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/YOU/ninja-scheduler.git
git push -u origin main
```

### 3. Netlify
1. Go to **Add new site → Import an existing project → GitHub** and pick the repo.
2. You don't need to change the build settings, because `netlify.toml` already sets `npm run build` and the `dist` folder.
3. Go to **Site configuration → Environment variables** and add:
   - `VITE_SUPABASE_URL`: your Project URL
   - `VITE_SUPABASE_ANON_KEY`: your anon key
   - `VITE_ADMIN_PIN` (optional): any PIN. If you set one, the admin view is view-only until someone enters it.
4. **Deploy.** From then on, every push to `main` redeploys the site automatically.

> Vite bakes the env vars in at build time. If you change one, go to **Deploys → Trigger deploy** to rebuild.

### Local dev
```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

## URLs
- `https://your-site.netlify.app/`: the admin scheduler
- `https://your-site.netlify.app/?coach`: the coach hub. Send this link to coaches. They sign in with their name and the phone number on file.

## What's in it

**Admin**
- **Day Board:** Mon–Sun strip for any week, a date picker, and Today and Print buttons. Click a class to sub or cancel it **just for this date**, or to **update the template**. The coach picker labels each coach as *available*, *outside availability*, *teaching another class*, or *out*. Classes turn red when the assigned coach is out or the class has no coach.
- **Classes:** add, edit, copy or delete template classes (day, time, belt, age band, station, 1–3 coaches, optional first and last date).
- **Coaches:** roster with phone, email, color and departure date, plus each coach's submitted availability.
- **Coverage:** open shifts for the next 14 days, day-off requests (approve, deny, mark covered, admin note), coverage reports (**Approve** swaps the sub onto the classes automatically), and multi-day absences.
- **Print:** a week-at-a-glance grid (7 columns, landscape) or one page per coach with their hours. Subs and cancellations are applied, and you can switch team/labor codes on or off.
- **Payroll:** pick a range (This week, Last week, Last 2 weeks, This month, Last month, or custom) and filter by coach or team.
  - **Owner report:** hours by coach × labor code with totals, plus a detail list of every class coached (date, coach, class, time, hours, team, labor code; subs are flagged). Print it, or download it as a CSV.
  - **UKG export:** a CSV in the layout set in Settings. Warns you about coaches without an employee ID and classes without a labor code.
- **Settings:** teams with their UKG labor codes, and the UKG file layout (column headers and order, date/time format, fixed-text columns such as a pay code, and whether back-to-back classes merge into one shift). A live sample row shows the output.
- 🔔 **Badge:** count of pending or uncovered requests.

**Coach hub** (mobile)
- **Schedule:** next 3 weeks, including co-coaches and which of your classes someone is covering.
- **Day off:** step 1, "I need this date off".
- **Coverage:** step 2, "X is covering me (whole day or specific classes)".
- **Availability:** weekly time windows.

## UKG setup checklist
1. **Settings → Teams & labor codes:** enter your real codes.
2. **Classes:** give every class a team. A banner lets you set all unassigned classes at once.
3. **Coaches:** enter each coach's UKG employee ID.
4. **Settings → UKG export layout:** match your UKG import template exactly (headers, column order, date/time format). The starting layout is a generic time-entry import (Employee Id, Date, Start Time, End Time, Hours, Labor Code), so check it against a real import file before the first upload.

Hours come from the schedule (template plus subs, minus cancellations). Time that isn't on the schedule, like meetings or setup, isn't included.

## Notes
- **Security:** there are no logins. Anyone who has the anon key, which ships in the browser bundle, can read and write these tables. That's fine for an internal gym tool. The admin PIN is a speed bump, not real protection.
- **Coach names** link everything together (classes, requests, availability), so the app doesn't allow renaming. To retire a coach, set a departure date.
- **Brief lessons are built in:** paginated fetches (no 1000-row cap), ISO date strings everywhere, override writes that fall back to the template value instead of null, batch writes via `Promise.all` followed by a single refresh, no hardcoded date ceilings, and realtime subscribed per `ninja_` table so gymnastics edits don't trigger reloads.

## File map
```
src/
  App.jsx  Scheduler.jsx  CoachHub.jsx  supabase.js  constants.js  helpers.js  styles.css
  hooks/useScheduleData.js           all loading + realtime
  payroll.js                         report rows, shift merging, CSV/UKG formatting
  tabs/       DayBoardTab  EditClassesTab  CoachesTab  CoverageTab  PrintTab  PayrollTab  SettingsTab
  components/ ClassCard  CoachDropdown  OverrideModal  Modal  TimeOffBadge
  hub/        MySchedule  AvailabilityForm  DayOffForm  CoverageForm
supabase/     schema.sql  migration_002_payroll.sql  seed.sql
```
