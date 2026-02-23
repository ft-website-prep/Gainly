# 🏋️ Gainly

**Die Calisthenics & Fitness Community App mit Gamification.**

Gainly kombiniert Workout-Tracking, Community-Features und ein Gamification-System zu einer App, die Fitness motivierend und sozial macht.

---

## Was ist Gainly?

**Drei Säulen:**

🏋️ **Training** – Übungsdatenbank mit Skill Trees, Workout-Vorlagen, Set-für-Set Tracking und persönliche Bestleistungen.

🎮 **Gamification** – XP für jedes Workout, Achievements zum Freischalten, ein Liga-System (Rookie → Grinder → Athlete → Beast → Legend) und wöchentliche Leaderboards.

👥 **Community** – Freunde adden, Gruppen/Crews erstellen, Progress Posts teilen, Challenges starten und gegeneinander antreten.

---

## Tech Stack

| Bereich | Technologie |
|---------|------------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Animationen | Framer Motion, GSAP, Lenis |
| Backend | Supabase (PostgreSQL) |
| Routing | React Router |

---

## Schnellstart

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

> ⚠️ Werte findest du im Supabase Dashboard (Settings → API). Die `.env` wird nicht in Git gepusht – jeder muss sie lokal erstellen.

```bash
npm run dev
```

App öffnet auf `http://localhost:5173/`

---

## Dokumentation

Die ausführliche Dokumentation liegt im **Wiki** dieses Repos:

📖 **Terminal-Befehle** – Git, npm, Vite, Dateiverwaltung, häufige Gefahren

📖 **Datenbank-Dokumentation** – Alle 23 Tabellen, SQL-Konzepte, RLS-Policies, Trigger

---

## Team

| Rolle | Name |
|-------|------|
| Entwickler | Adrian |
| Entwickler | [Partner] |
