# 🏋️ Gainly

**Die Calisthenics & Fitness Community App mit Gamification.**

Gainly kombiniert Workout-Tracking, Community-Features und ein Gamification-System (XP, Ligen, Achievements) zu einer App, die Fitness motivierend und sozial macht.

---

## 🛠 Tech Stack

| Bereich | Technologie | Zweck |
|---------|------------|-------|
| Frontend | React + Vite | UI & Entwicklungsserver |
| Styling | Tailwind CSS | Utility-First CSS |
| Animationen | Framer Motion, GSAP, Lenis | Scroll- & UI-Animationen |
| Backend | Supabase (PostgreSQL) | Datenbank, Auth, Storage, Realtime |
| Routing | React Router | Seitennavigation |

---

## 🚀 Lokale Einrichtung

**Voraussetzungen:** Node.js 18+ (`node -v` zum Prüfen)

```bash
git clone https://github.com/EUER-USERNAME/gainly.git
cd gainly
npm install
```

Erstelle eine `.env`-Datei im Root-Verzeichnis:

```
VITE_SUPABASE_URL=https://euer-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=euer-anon-key
```

Die Werte findest du im Supabase Dashboard unter **Settings → API**.

> ⚠️ Die `.env`-Datei wird NICHT in Git gepusht. Jedes Teammitglied muss sie lokal erstellen.

Dev-Server starten:

```bash
npm run dev
```

---

## 🗄 Datenbank

23 Tabellen auf **Supabase** (PostgreSQL), Region **Frankfurt (eu-central-1)**.

| Phase | Inhalt | Tabellen |
|-------|--------|----------|
| Phase 1 | Core (Exercises, Workouts, Logs) | 8 |
| Phase 2 | Gamification (XP, Achievements, Rewards) | 5 |
| Phase 3 | Community (Friends, Groups, Posts, Challenges) | 10 |

**Liga-System:** Rookie → Grinder → Athlete → Beast → Legend

Komplette Dokumentation: `docs/database/gainly-db-dokumentation.md`

---

## 🔀 Git Workflow

```bash
git add .
git commit -m "feat: Beschreibung"
git push
```

| Prefix | Wann | Beispiel |
|--------|------|---------|
| `feat:` | Neues Feature | `feat: Login-Seite` |
| `fix:` | Bug behoben | `fix: Streak-Counter` |
| `docs:` | Dokumentation | `docs: README aktualisiert` |
| `style:` | Design/CSS | `style: Button-Farben` |

---

## 👥 Team

| Rolle | Name |
|-------|------|
| Entwickler | Adrian |
| Entwickler | Julian |
