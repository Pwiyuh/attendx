# AttendX Implementation Plan

## ✅ Completed: Landing Page (SaaS)

- Installed Tailwind CSS v3.4 alongside existing SCSS.
- Built a `tailwind.config.js` design system with galactic colors, blur, and animations.
- Created a reusable `GlassCard` component with premium glassmorphism effects.
- Built all 9 landing page sections: Navbar, Hero, Stats, Features, How It Works, Customization, Pricing, CallToAction, Footer.
- Navbar smart-routes authenticated users to "Go to Dashboard", unauthenticated users see Login / Get Started.

---

## ✅ Completed: School Onboarding Flow

### Backend
- [x] Added `SchoolSettings` model to `models.py` (school_name, logo_url, setup_completed).
- [x] Created `routes/onboarding.py` with:
  - `GET /api/onboarding/status` — check if setup is done.
  - `POST /api/onboarding/setup` — create school + admin account, return JWT.
- [x] Registered onboarding router in `main.py`.

### Frontend
- [x] Created `pages/Onboarding/Onboarding.tsx` — 2-step glassmorphic wizard.
  - Step 1: School name input.
  - Step 2: Admin name, email, password.
  - On submit → auto-login via `attendx_user` localStorage → redirect to `/admin`.
  - On re-visit after setup → redirects to `/login`.
- [x] Created `GetStartedRedirect` component in `App.tsx` — queries `/onboarding/status` and routes to `/onboarding` or `/login` accordingly.
- [x] Registered `/onboarding` and `/get-started` routes.
- [x] Updated all Landing Page CTAs (Navbar, Hero, Pricing, CallToAction) to route through `/get-started`.

---

## 🔜 Next: Parent Notification System

- [ ] Add `parent_email` column to `students` table.
- [ ] Update student CRUD schemas and admin UI to include parent email field.
- [ ] Create `notification_service.py` (mock email logger for development).
- [ ] Add "Notify Absentees" endpoint: `POST /api/attendance/notify-absentees`.
- [ ] Add "Notify Absentees" button to Teacher Dashboard.

---

## 🔜 Future Improvements

- [ ] Update Login page to match galactic glassmorphism theme.
- [ ] SEO meta tags on Landing Page.
- [ ] Production deployment (Docker + CI/CD).
- [ ] Multi-tenancy (schema-per-tenant or row-level isolation).
