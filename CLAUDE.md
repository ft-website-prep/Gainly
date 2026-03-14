# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

After completing any meaningful piece of work, commit and push to GitHub immediately. Use clean, descriptive commit messages (e.g. `fix: correct XP calculation on dashboard`, `feat: add league badge to profile`). Don't batch unrelated changes into a single commit. Push frequently so work is never lost.

```bash
git add <files>
git commit -m "type: short description"
git push
```

## Commands

```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
```

No test or lint commands are configured.

## Architecture

**Gainly** is a React + Vite fitness tracking app with gamification. Backend is Supabase (PostgreSQL + Auth).

### Routing

`src/App.jsx` defines all routes:
- Public: `/`, `/login`, `/register`, `/welcome`
- Protected (`/app/*`): wrapped in `ProtectedRoute` → `AppLayout` (sidebar layout)
  - Nested: `dashboard`, `workouts`, `community`, `coach`, `progress`, `profile`, `settings`, `leaderboards`

### Auth

`src/contexts/AuthContext.jsx` provides global auth state via Supabase. `src/components/ProtectedRoute.jsx` guards `/app/*` routes. Supports email/password and Google OAuth.

### Styling

Tailwind CSS with a custom "Gainly Red" color palette (`tailwind.config.js`). Primary accent: `#e10600`. Custom tokens: `dark`, `light`, `surface`, `border`, `muted`, `dim`, `accent` variants. Animations via Framer Motion, GSAP, and Lenis (smooth scroll).

**Cursor:** System cursor is visible. `CustomCursor.jsx` adds only a small 5px red trailing dot (40% opacity, lerp 0.1). No `cursor: none` in CSS.

### Key Directories

- `src/pages/app/` — top-level page components (Dashboard, WorkoutsPage, ProfilePage, etc.)
- `src/components/workouts/` — workout subsystem: Build/Train/Explore tabs, SkillTrees, DailyGoal
- `src/components/app/AppLayout.jsx` — sidebar + layout shell for all `/app/*` pages
- `src/lib/supabaseClient.js` — Supabase client (reads from `.env`)
- `src/contexts/` — React contexts (currently just Auth)

### Environment

Requires a `.env` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Workouts System (`src/pages/app/WorkoutsPage.jsx`)

Three tabs: **Train**, **Build**, **Explore**.

`goToExplore(section, methodId)` navigates to the Explore tab and optionally deep-links to a specific method. `ExploreTab` receives `initialSection` and `initialMethodId` props; a `key` prop forces remount on navigation.

### Train Tab (`TrainTab.jsx`)
- Streak bar, Random Method Generator, Favorited workouts section, My Workouts list
- Clicking a workout name or ✏️ opens **WorkoutDetailModal** (full-screen, editable sets/reps/rest/notes per exercise)
- "Explore in detail →" passes `generatedMethod.id` to `onGoToExplore` → deep-links to that exact method in Explore
- Workout favorites stored in `workouts.is_favorited` (Supabase). Favorited heart is **red** (`text-red-500`)

### Build Tab (`BuildTab.jsx`)
- Left: exercise browser with source toggle (Cali/Gym/Mix), category filter chips, search, "❤️ Saved" filter, "♥ Liste öffnen (N)" button
- Right sidebar: workout builder with drag-and-drop reordering (⠿ handle + HTML5 DnD), ↑↓ arrows, "⚙ Details" modal
- **SavedExercisesModal**: opens all favorited exercises; can unsave or add directly to current workout
- Exercise favorites stored in `profiles.favorited_exercises` (jsonb array of IDs). Favorited heart is **red** (`text-red-500`)
- Detail view modal: editable name, per-exercise sets/reps/rest inputs + notes textarea + warm-up checkbox

### Explore Tab (`ExploreTab.jsx`)
- **Two-level navigation**: 2 parent tiles (Calisthenics / Krafttraining)
- Calisthenics → sub-tabs: 🌳 Skill Trees | 📖 Methods | ⚡ Challenges
- Krafttraining → category tile grid (icon + label + count) → exercise grid with back button
- `initialMethodId` prop: auto-navigates to Calisthenics > Methods and expands that method
- Category icons: `{ push: '💪', pull: '🔽', legs: '🦵', core: '🔥', cardio: '❤️', flexibility: '🌀' }`

#### Challenges sub-tab
- Short competitive mini-challenges (1–4 min), fetched from `workout_challenges` table (separate from `challenges` which is for community group challenges)
- **DifficultyBars**: 4 uniform squares, colored green/orange/dark-orange/red (Easy→Medium→Hard→Extreme)
- Difficulty filter chips (All / Easy / Medium / Hard / Extreme) with matching colors
- 2-column card grid; compact layout with emoji, name, difficulty bars, duration, Mark button
- Completion state stored in `profiles.completed_challenges` (jsonb array of IDs) — same pattern as `favorited_exercises`
- `toggleChallengeComplete(id)` does optimistic update + Supabase write

---

## Profile Page (`src/pages/app/ProfilePage.jsx`)

Tabs: **Profile** | **Stats & Progress**

Profile tab sections:
1. Personal Info + Body Data
2. Activity Calendar (workout heatmap)
3. Progress Timeline (photos/videos)
4. **Google Calendar** — user pastes embed URL from Google Calendar settings; stored in `localStorage` key `gainly_gcal_url`; rendered as iframe (600px height)

Stats tab: XP/workout charts, radar muscle chart, weight trend, goals progress bars.

Body metrics (BMI, KFA) via modal. League system: Rookie → Grinder → Athlete → Beast → Legend (based on XP).

---

## Supabase Schema (key tables)

- `profiles` — user profile, `favorited_exercises` (jsonb array), `completed_challenges` (jsonb array), `weight_kg`, `height_cm`, `bmi_value`, `body_fat_pct`, `xp_total`, `current_streak`
- `workouts` — `created_by`, `is_favorited` (bool), `estimated_duration`, `tags`
- `workout_exercises` — `workout_id`, `exercise_id`, `order_index`, `target_sets`, `target_reps`, `target_time_seconds`, `rest_seconds`
- `exercises` — `name`, `category`, `difficulty`, `tracking_type` (reps/time), `equipment_required` (array), `primary_muscles`
- `training_methods` — `name`, `category`, `difficulty`, `short_description`, `full_description`, `how_it_works`, `default_exercises`, `duration_min/max`
- `workout_logs` / `exercise_logs` — session tracking
- `xp_transactions` — XP history
- `exercise_links` — links exercises to skill tree nodes
- `exercise_requests` — user-submitted exercise requests
- `progress_timeline` — photo/video entries per user
- `body_measurements` — weight history
- `workout_challenges` — short mini-challenges (name, short_description, difficulty_level 2–5, category, duration_min/max). **Not** the same as `challenges` (reserved for community group challenges)
