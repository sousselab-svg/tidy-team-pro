# CleanOps — App Store Connect Listing (English)

All copy is ready to paste into App Store Connect. Character counts are within Apple's limits.

---

## 1. App Information

| Field | Value |
|---|---|
| **App Name** (30) | `CleanOps: Field Service` (24) |
| **Subtitle** (30) | `Schedule, dispatch & invoice` (29) |
| **Bundle ID** | `app.lovable.6a6af60f372a40a6a7dc46010b75f6d4` |
| **SKU** | `cleanops-ios-001` |
| **Primary Category** | Business |
| **Secondary Category** | Productivity |
| **Age Rating** | 4+ |
| **Content Rights** | Does not contain third-party content |

---

## 2. Promotional Text (170)

```
Run your cleaning and field-service business from your phone. Schedule jobs, dispatch your team with live GPS, capture photos and signatures, and get paid faster.
```
(168 chars)

---

## 3. Description (4000)

```
CleanOps is the all-in-one field service platform for cleaning companies, handymen, pest control, lawn care, and any team that runs jobs out in the field. Replace spreadsheets, WhatsApp groups and paper checklists with one app that keeps your operation running.

THE COMPLETE FIELD-SERVICE TOOLKIT
• Smart schedule — drag-and-drop daily and weekly views with conflict detection
• Dispatch with live GPS — see where every operator is in real time
• Route optimization — auto-sort the day's stops to save fuel and time
• Check-in pipeline — On the way → In progress → Completed, with timestamps
• Photo proof — before/after pictures attached to every job
• Digital signatures — capture the customer's signoff right on the phone
• Recurring contracts — weekly, biweekly and monthly jobs created automatically
• Quotes & invoices — send a branded PDF in seconds and track payment status
• NPS after every job — automatic survey to measure customer happiness
• Reactivation — find lapsed customers and bring them back with one tap
• Reports — revenue, jobs per operator, on-time rate, top clients
• Referrals — built-in program to turn happy clients into new leads

BUILT FOR THE FIELD
• Works offline — finish a job in a basement with no signal, syncs when back online
• iPhone-first UI — large tap targets, one-handed flows, no clutter
• Push notifications for new jobs, status changes and customer messages
• Multi-operator team with role-based access (admin / dispatcher / operator)
• Customer portal — share a public link so clients can track their job live

PRIVACY & SECURITY
• Your data is yours. Row-level security isolates every account.
• Location is only collected during the shift, and only with your permission.
• Photos stay in your account — no public buckets, no third-party training.
• Full LGPD / GDPR data export and deletion from inside the app.

WHO USES CLEANOPS
• Residential and commercial cleaning companies
• Pool, lawn, pest control and HVAC services
• Handyman, painting and small construction crews
• Property managers running maintenance teams

GET STARTED IN MINUTES
1. Create your account
2. Add your team and a few clients
3. Drag your first job onto the calendar
4. Watch your operation come alive on the dispatch map

Have a question or want a feature? Tap Support inside the app — we read every message.
```

---

## 4. Keywords (100, comma-separated, no spaces)

```
cleaning,field service,dispatch,schedule,crew,jobs,invoice,quote,gps,route,recurring,nps,handyman
```
(99 chars)

---

## 5. What's New — v1.0.0

```
Welcome to CleanOps 1.0!
• Smart schedule with drag-and-drop
• Live GPS dispatch and route optimization
• Photo proof and digital signatures
• Recurring contracts, quotes and invoices
• Automatic NPS after every job
• Offline mode for jobs without signal
Thanks for trying CleanOps — tap Support inside the app to send feedback.
```

---

## 6. Support & Marketing URLs (REQUIRED — must be publicly reachable, no login)

| Field | URL |
|---|---|
| **Support URL** (required) | `https://cleanops.app/support` |
| **Marketing URL** (optional) | `https://cleanops.app` |
| **Privacy Policy URL** (required) | `https://cleanops.app/privacy` |
| **Terms of Use URL** | `https://cleanops.app/terms` |

> In-app legal pages live at `/privacidade` and `/termos` (PT) and now at `/privacy` and `/terms` (EN). After publishing on Lovable, those routes are immediately public — you can use the published URL directly as the Privacy Policy URL until cleanops.app is live.

---

## 7. App Privacy — declare in App Store Connect

For every item below: **Linked to user = Yes**, **Used for tracking = No**.

### Contact Info
- Email Address — App Functionality, Account Management
- Name — App Functionality
- Phone Number — App Functionality (optional, for SMS reminders)

### Location
- Precise Location — App Functionality (operator check-in, route optimization, live dispatch map)

### User Content
- Photos or Videos — App Functionality (before/after job photos)
- Other User Content — App Functionality (signatures, notes)

### Identifiers
- User ID — App Functionality, Account Management
- Device ID — App Functionality (push notifications)

### Usage Data
- Product Interaction — Analytics (aggregate, opt-in via cookie consent)

### Diagnostics
- Crash Data — App Functionality
- Performance Data — App Functionality

**Not collected:** Health & Fitness, Financial Info, Sensitive Info, Contacts, Browsing/Search History, Audio Data, Other Data.

---

## 8. App Review Information (internal)

```
Demo account (admin, full seed data):
  Email:    apple-reviewer@cleanops.com
  Password: CleanOps2026!Review

Sign in with email/password on the first screen. The demo workspace already
contains sample clients, jobs across this week, team members, invoices and
NPS results so the reviewer can navigate every tab without setup.

Permissions used:
  • Location (While Using) — operator check-in and live dispatch map.
    Reachable from: Equipe → Rastrear, Dispatch tab.
  • Camera & Photos — attach before/after photos to a job.
    Reachable from: any job → Photos.
  • Push & Local Notifications — new-job alerts and reminders.
    Asked on first launch; re-enabled in iOS Settings.

No purchases or paid features are required to use the app.
```

Sign-in info on the App Review tab → enable "Sign-in required" and paste the credentials above.

---

## 9. Submission Checklist

- [ ] App icon 1024×1024 (no alpha, no rounded corners)
- [ ] 6.7" iPhone screenshots (10 from `aso-kit.zip`)
- [ ] Privacy Policy URL returns 200 publicly (no auth)
- [ ] Support URL returns 200 publicly
- [ ] App Privacy questionnaire completed (section 7)
- [ ] Age rating → 4+; Category Business / Productivity
- [ ] Sign in with Apple enabled in Xcode capabilities (required because Google sign-in is offered)
- [ ] Demo account works on the production build
- [ ] Build uploaded via Xcode → Distribute → App Store Connect
- [ ] Export Compliance: "Uses standard encryption (HTTPS only)" → exempt
- [ ] Submit for Review
