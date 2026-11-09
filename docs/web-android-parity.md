# Android update brought to the web

Source: `JohnLuis07/Stride-Android`, commit `72d7306` (downloaded during this update).
Existing web edits were retained. No live database migrations, function deployments,
account creation, provider generation, or web publication were performed.

## Included

- Android's indigo palette, rounded surfaces, responsive navigation and forms,
  accessible focus indicators, dark surfaces, and mobile focus layout.
- Supabase Auth email/password sign-in and signup, verification-code entry,
  resend, recovery, verified profile resolution, Google OAuth, session restoration,
  real sign-out, and authenticated route gates. Plaintext password queries and
  inserts have been removed. Profile email changes use Auth confirmation.
- Tasks/goals: optional deadline time, device timezone, sound preference,
  trigger-owned completion timing, on-time/late/overdue badges; linked deadlines
  in Calendar open the owning task/goal screen instead of editing an event copy.
- Open-tab deadline reminders, optional browser notifications, dismiss controls.
- Focus timer: elapsed wall-clock countdown, restoration, pause/reset, Android
  presets, lifetime and daily session counts, midnight reset and daily goal of 8.
- Budget settings, locked ledger currency, reserved funds, payday daily allowance,
  posted/planned transactions, salary source, editable ledger, revision conflict
  checks, paginated history, and planned-income/expense forecasts.
- Notebook sources, signed PDF upload/preview/removal/index retry, up to three
  selected ready sources, chat, summary/study-guide generation, flashcards,
  quizzes, citations, artifact history and save-to-note. Notebook deletion goes
  through the cleanup function. Save edited notes before opening study tools.
- Administrator-gated video studio, optional compressed image input, prompt-only
  starting images, latest-reel restoration, sequential scenes while open,
  explicit failed-scene retry, actual status, playback, signed scene downloads,
  browser combination/export and starting another reel.
- Android SQL and Edge Function sources, with browser CORS support added.

## Configure the backend before use

Use the same Supabase project as Android. If it is already upgraded, do not
blindly re-run migrations. Review the current schema and the included setup guides.

1. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local `.env`
   or hosting environment (public anon/publishable key only).
2. Follow [account setup](android/account-provisioning-setup.md),
   [Google sign-in](android/google-sign-in-setup.md),
   [Notes AI](android/notes-ai-setup.md),
   [budget setup](android/allowance-setup.md), and
   [video setup](android/video-generation-setup.md).
   Auth/profile mapping must be installed before the updated web login works.
   Legacy accounts require the documented ownership-verified linking procedure.
3. Apply `supabase/deadline_timing.sql` and `supabase/reminder_sound.sql` if missing.
   These preserve the server's ownership of completion/deadline timestamps.
4. Deploy the included `notes-ai` and `generate-video` functions. Set
   `NOTE_AI_ALLOWED_ORIGINS` to the exact web origins, including development URLs.
   Notes CORS now permits Supabase JS's `x-client-info` header. The video function
   permits browser CORS while retaining Auth, ownership and entitlement checks.
5. Add the web origin and `/dashboard` callback to Supabase Auth's redirect allowlist.
   Configure Google there. Email templates must expose `{{ .Token }}` for the
   signup/recovery code UI. Verify SMTP and email confirmation settings.
6. Enable `Allowance` in Profile & settings. `generatevids` is an administrator
   entitlement; the web preference editor preserves it and cannot grant it.
   Keep provider and service-role secrets only in Edge Function environment.
7. Follow the Notes orphan-cleanup scheduler and video retention guidance in the
   included Android docs; copying source does not install those operations.

## Web differences and remaining verification

This is a web adaptation, not a claim of tested native-platform equivalence.

- Notifications and sounds need browser permission/autoplay support. Reminders
  run while the app is open, and check deadlines reached in the last minute.
  Android's persistent alarm service and closed-app notifications need a separate
  web-push/service-worker/backend implementation for closed-browser delivery.
- Video export uses canvas capture and MediaRecorder in real time. MP4 is selected
  when supported; otherwise the combined file is WebM. Individual scenes remain
  MP4. Keep the tab foregrounded. Exact 30-second MP4 output and native codec
  behavior are not guaranteed across browsers.
- PDF upload currently asks the user for page count; Android obtains this from
  its native renderer. A browser PDF parser is still needed to validate page count
  and reject encrypted/unreadable documents before upload. Server/provider errors
  are displayed, not replaced with fabricated output.
- AI chat uses complete responses rather than Android's streaming presentation.
  Quiz answers are revealed on demand; native quiz navigation/scoring and activity
  rotation restoration are not reproduced exactly.
- Budget forecasts show server planned totals and projected balance. Android's
  dedicated salary editor and detailed daily forecast presentation are represented
  by the unified transaction form and forecast totals here.
- No authenticated browser or live backend/provider run was available. Verify
  account verification/recovery and Google callbacks; two-account data isolation;
  profile/feature saves; timezone/DST deadlines; reminders; budget edits/conflicts;
  PDF uploads/indexing/citations; all study formats; revoked video entitlement;
  image failures, quotas, scene retries, playback and export on target browsers.

## Local validation

`npm run build`, `npm run lint`, and `npm test` pass. Five timer regression cases
cover delayed ticks, one-time completion, break exclusion, daily reset, and presets.
