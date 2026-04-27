# Gainly – Komplettes Datenbank-Schema

## Übersicht

Dieses Dokument beschreibt die gesamte Tabellenstruktur für die Gainly-App.
Alle Tabellen sind für **Supabase (PostgreSQL)** designed und nutzen Row Level Security (RLS).

**Farbcode aus dem Miro-Board:**
- 🔴 Must Have (wird sofort gebaut)
- 🟠 Nice to Have (kommt später)
- 🟡 Optional (Zukunft)

---

## Inhaltsverzeichnis

1. [Core: Users & Auth](#1-core-users--auth)
2. [Exercises & Workouts](#2-exercises--workouts)
3. [Tracking & Goals](#3-tracking--goals)
4. [Gamification](#4-gamification)
5. [Community & Social](#5-community--social)
6. [Nutrition & Recipes](#6-nutrition--recipes)
7. [Locations & Maps](#7-locations--maps)
8. [Motivation & Content](#8-motivation--content)
9. [LLM & Smart Features](#9-llm--smart-features)
10. [Notifications](#10-notifications)

---

## 1. Core: Users & Auth

> Supabase erstellt automatisch eine `auth.users`-Tabelle für Login/Registrierung.
> Wir erstellen eine `profiles`-Tabelle, die zusätzliche User-Daten speichert.

### profiles

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK, FK → auth.users) | Verknüpfung zum Auth-User |
| username | TEXT UNIQUE | Anzeigename |
| display_name | TEXT | Voller Name |
| avatar_url | TEXT | Link zum Profilbild |
| bio | TEXT | Kurzbeschreibung |
| fitness_level | TEXT | 'beginner', 'intermediate', 'advanced' |
| equipment | TEXT[] | Array: ['pullup_bar', 'rings', 'dumbbells', ...] |
| onboarding_completed | BOOLEAN | Onboarding abgeschlossen? |
| xp_total | INTEGER DEFAULT 0 | Gesamte Erfahrungspunkte |
| current_streak | INTEGER DEFAULT 0 | Aktuelle Streak-Tage |
| longest_streak | INTEGER DEFAULT 0 | Längste Streak ever |
| streak_freeze_available | BOOLEAN DEFAULT true | Freeze noch verfügbar diese Woche? |
| preferred_reminder_time | TIME | Wann Push Reminder kommen soll |
| location_lat | DECIMAL | Standort für Gym Buddy Finder |
| location_lng | DECIMAL | Standort für Gym Buddy Finder |
| created_at | TIMESTAMPTZ | Erstelldatum |
| updated_at | TIMESTAMPTZ | Letzte Änderung |

**Warum so?**
- `equipment[]` als Array, damit der Workout-Generator direkt filtern kann
- `xp_total` direkt im Profil statt jedes Mal zu berechnen (Performance)
- `current_streak` wird bei jedem Workout-Log aktualisiert
- `location_lat/lng` für den Gym Buddy Finder (🟡 Optional, aber Spalte schon vorbereitet)

---

## 2. Exercises & Workouts

### exercises (Globale Übungsdatenbank)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| name | TEXT NOT NULL | Name der Übung |
| description | TEXT | Beschreibung / Anleitung |
| category | TEXT | 'push', 'pull', 'legs', 'core', 'cardio', 'flexibility' |
| tracking_type | TEXT | 'reps', 'time', 'distance' |
| equipment_required | TEXT[] | Benötigtes Equipment |
| difficulty | TEXT | 'beginner', 'intermediate', 'advanced' |
| primary_muscles | TEXT[] | Hauptmuskeln ['chest', 'triceps'] |
| secondary_muscles | TEXT[] | Nebenmuskeln ['shoulders'] |
| demo_3d_url | TEXT | URL zum 3D-Modell (🔴 Visualization) |
| is_static_hold | BOOLEAN DEFAULT false | Ist es eine Halteübung? |
| created_by | UUID (FK → profiles) | NULL = System, sonst User-erstellt |
| is_approved | BOOLEAN DEFAULT false | Für Custom → Global Review |
| created_at | TIMESTAMPTZ | Erstelldatum |

**Warum so?**
- `tracking_type` unterscheidet ob Reps oder Zeit getrackt wird (🟠 Time-based Tracking)
- `equipment_required[]` ermöglicht den Equipment Filter (🟡)
- `primary_muscles` / `secondary_muscles` für die 3D-Muskel-Visualisierung (🔴)
- `created_by` = NULL bedeutet offizielle Gainly-Übung, sonst Custom Exercise (🔴)
- `is_approved` für den Review-Prozess wenn User Übungen zum Global DB submitten

### exercise_progressions (Skill Trees & Static Holds)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| exercise_id | UUID (FK → exercises) | Zu welcher Übung |
| stage_name | TEXT | z.B. 'Tuck Planche', 'Advanced Tuck', 'Straddle', 'Full' |
| stage_order | INTEGER | Reihenfolge im Skill Tree |
| prerequisite_stage_id | UUID (FK → self) | Voraussetzung (vorherige Stage) |
| criteria_type | TEXT | 'time', 'reps' |
| criteria_value | INTEGER | z.B. 30 (Sekunden) oder 10 (Reps) |
| description | TEXT | Was man können muss |
| created_at | TIMESTAMPTZ | Erstelldatum |

**Warum so?**
- Deckt sowohl 🔴 Advanced Skill Progression als auch 🔴 Static Hold Progression ab
- `prerequisite_stage_id` zeigt auf die vorherige Stage → damit kann man Skill Trees bauen
- `criteria_value` definiert wann ein Level-Up vorgeschlagen wird

### user_exercise_progress

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| exercise_id | UUID (FK → exercises) | Welche Übung |
| current_stage_id | UUID (FK → exercise_progressions) | Aktuelle Progressionsstufe |
| personal_best_value | INTEGER | Persönliche Bestleistung |
| updated_at | TIMESTAMPTZ | Letzte Aktualisierung |

### workouts

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| name | TEXT NOT NULL | Name des Workouts |
| description | TEXT | Beschreibung |
| created_by | UUID (FK → profiles) | Erstellt von |
| is_template | BOOLEAN DEFAULT false | Ist es eine Vorlage? |
| estimated_duration | INTEGER | Geschätzte Dauer in Minuten |
| difficulty | TEXT | Schwierigkeitsgrad |
| created_at | TIMESTAMPTZ | Erstelldatum |

### workout_exercises (Verknüpfung: Welche Übungen gehören zu welchem Workout)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| workout_id | UUID (FK → workouts) | Welches Workout |
| exercise_id | UUID (FK → exercises) | Welche Übung |
| order_index | INTEGER | Reihenfolge im Workout |
| target_sets | INTEGER | Ziel-Sätze |
| target_reps | INTEGER | Ziel-Wiederholungen |
| target_time_seconds | INTEGER | Ziel-Zeit (bei time-Übungen) |
| rest_seconds | INTEGER | Pause danach |

### workout_logs (Was der User tatsächlich gemacht hat)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| workout_id | UUID (FK → workouts) | Welches Workout |
| started_at | TIMESTAMPTZ | Wann gestartet |
| completed_at | TIMESTAMPTZ | Wann beendet |
| total_duration | INTEGER | Dauer in Sekunden |
| notes | TEXT | User-Notizen |
| xp_earned | INTEGER DEFAULT 0 | Verdiente XP |

### exercise_logs (Einzelne Übung innerhalb eines Workout-Logs)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| workout_log_id | UUID (FK → workout_logs) | Gehört zu welchem Log |
| exercise_id | UUID (FK → exercises) | Welche Übung |
| set_number | INTEGER | Welcher Satz |
| reps_completed | INTEGER | Tatsächliche Reps |
| time_completed_seconds | INTEGER | Tatsächliche Zeit |
| target_reps | INTEGER | Ziel-Reps (für Delta-Berechnung) |
| target_time_seconds | INTEGER | Ziel-Zeit |
| created_at | TIMESTAMPTZ | Zeitstempel |

**Warum so?**
- `workout_logs` + `exercise_logs` sind getrennt → ein Workout-Log enthält viele Übungs-Logs
- `target_reps` vs `reps_completed` ermöglicht 🔴 Adaptive Goal Tracking (Delta berechnen)
- `xp_earned` wird beim Abschluss berechnet und gespeichert

---

## 3. Tracking & Goals

### daily_goals 🔴

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| goal_type | TEXT | 'steps', 'workouts', 'calories', 'active_minutes' |
| target_value | INTEGER | z.B. 10000 (Schritte) |
| current_value | INTEGER DEFAULT 0 | Aktueller Fortschritt |
| date | DATE | Welcher Tag |
| completed | BOOLEAN DEFAULT false | Ziel erreicht? |
| created_at | TIMESTAMPTZ | Erstelldatum |

**Warum so?**
- Pro User pro Tag pro Zieltyp eine Zeile
- `current_value` wird bei jeder Aktivität aktualisiert
- Täglicher Reset: Neue Zeile für neuen Tag erstellen (kein Cron-Job nötig!)
- Progress-Bar in UI: `current_value / target_value * 100`

### user_goal_settings (Was der User als Standard-Ziele gewählt hat)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| goal_type | TEXT | Welcher Zieltyp |
| default_target | INTEGER | Standard-Zielwert |
| is_active | BOOLEAN DEFAULT true | Aktiv? |
| created_at | TIMESTAMPTZ | Erstelldatum |

### before_after_photos 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| photo_url | TEXT | Link zum Bild (Supabase Storage) |
| photo_type | TEXT | 'before' oder 'after' |
| body_weight | DECIMAL | Gewicht zum Zeitpunkt (optional) |
| notes | TEXT | Notizen |
| taken_at | DATE | Datum des Fotos |
| is_public | BOOLEAN DEFAULT false | In Community teilen? |
| created_at | TIMESTAMPTZ | Erstelldatum |

---

## 4. Gamification

### achievements 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| name | TEXT NOT NULL | z.B. 'Iron Will', '30-Day Warrior' |
| description | TEXT | Beschreibung |
| icon_url | TEXT | Badge-Bild |
| category | TEXT | 'streak', 'workout', 'social', 'nutrition' |
| condition_type | TEXT | 'streak_days', 'total_workouts', 'xp_earned' |
| condition_value | INTEGER | z.B. 30 (für streak >= 30) |
| xp_reward | INTEGER DEFAULT 0 | XP die man bekommt |
| created_at | TIMESTAMPTZ | Erstelldatum |

### user_achievements

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| achievement_id | UUID (FK → achievements) | Welches Achievement |
| unlocked_at | TIMESTAMPTZ | Wann freigeschaltet |

### xp_transactions (XP-Verlauf)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| amount | INTEGER | Wie viele XP |
| source_type | TEXT | 'workout', 'achievement', 'challenge', 'streak' |
| source_id | UUID | ID der Quelle (workout_log_id, achievement_id, etc.) |
| created_at | TIMESTAMPTZ | Zeitstempel |

### rewards 🔴

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| name | TEXT | Name des Rewards |
| description | TEXT | Beschreibung |
| xp_cost | INTEGER | Wie viele XP kostet es |
| reward_type | TEXT | 'discount', 'badge', 'feature_unlock' |
| reward_value | TEXT | z.B. '10%' oder URL zum Badge |
| is_active | BOOLEAN DEFAULT true | Aktuell verfügbar? |
| created_at | TIMESTAMPTZ | Erstelldatum |

### user_rewards

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| reward_id | UUID (FK → rewards) | Welcher Reward |
| redeemed_at | TIMESTAMPTZ | Wann eingelöst |

---

## 5. Community & Social

### friendships 🔴

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| requester_id | UUID (FK → profiles) | Wer die Anfrage schickt |
| addressee_id | UUID (FK → profiles) | Wer sie bekommt |
| status | TEXT | 'pending', 'accepted', 'declined' |
| created_at | TIMESTAMPTZ | Erstelldatum |

**Warum so?**
- Freundschaften sind bidirektional, aber die Tabelle speichert nur eine Richtung
- `status` ermöglicht Freundschaftsanfragen

### groups 🔴

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| name | TEXT NOT NULL | Gruppenname |
| description | TEXT | Beschreibung |
| avatar_url | TEXT | Gruppenbild |
| created_by | UUID (FK → profiles) | Erstellt von |
| is_public | BOOLEAN DEFAULT true | Öffentlich beitretbar? |
| max_members | INTEGER DEFAULT 50 | Maximale Mitglieder |
| created_at | TIMESTAMPTZ | Erstelldatum |

### group_members

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| group_id | UUID (FK → groups) | Welche Gruppe |
| user_id | UUID (FK → profiles) | Welcher User |
| role | TEXT DEFAULT 'member' | 'admin', 'moderator', 'member' |
| joined_at | TIMESTAMPTZ | Beitrittsdatum |

### posts 🔴 (Post Progress)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Autor |
| group_id | UUID (FK → groups) | In welcher Gruppe (NULL = öffentlich) |
| content | TEXT | Textinhalt |
| image_url | TEXT | Angehängtes Bild |
| post_type | TEXT | 'progress', 'general', 'achievement', 'workout_share' |
| workout_log_id | UUID (FK → workout_logs) | Verknüpftes Workout (optional) |
| created_at | TIMESTAMPTZ | Erstelldatum |

### comments 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| post_id | UUID (FK → posts) | Zu welchem Post |
| user_id | UUID (FK → profiles) | Wer kommentiert |
| content | TEXT | Kommentartext |
| created_at | TIMESTAMPTZ | Erstelldatum |

### likes 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| post_id | UUID (FK → posts) | Zu welchem Post |
| user_id | UUID (FK → profiles) | Wer liked |
| created_at | TIMESTAMPTZ | Zeitstempel |
| **UNIQUE** | (post_id, user_id) | Jeder User kann nur 1x liken |

### challenges 🔴

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| name | TEXT NOT NULL | Challenge-Name |
| description | TEXT | Beschreibung |
| challenge_type | TEXT | 'streak', 'total_reps', 'total_time', 'workouts' |
| target_value | INTEGER | Zielwert |
| start_date | DATE | Start |
| end_date | DATE | Ende |
| created_by | UUID (FK → profiles) | Erstellt von |
| group_id | UUID (FK → groups) | Nur für Gruppe? (NULL = öffentlich) |
| xp_reward | INTEGER DEFAULT 0 | XP-Belohnung |
| created_at | TIMESTAMPTZ | Erstelldatum |

### challenge_participants

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| challenge_id | UUID (FK → challenges) | Welche Challenge |
| user_id | UUID (FK → profiles) | Welcher User |
| current_value | INTEGER DEFAULT 0 | Aktueller Fortschritt |
| completed | BOOLEAN DEFAULT false | Geschafft? |
| joined_at | TIMESTAMPTZ | Beitrittsdatum |

### leaderboards 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| leaderboard_type | TEXT | 'xp_weekly', 'xp_monthly', 'streak', 'challenge' |
| reference_id | UUID | Challenge-ID oder NULL für globale Boards |
| score | INTEGER | Punktzahl |
| rank | INTEGER | Platzierung |
| period_start | DATE | Beginn der Periode |
| period_end | DATE | Ende der Periode |
| updated_at | TIMESTAMPTZ | Letzte Aktualisierung |

---

## 6. Nutrition & Recipes

### recipes 🔴

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| name | TEXT NOT NULL | Rezeptname |
| description | TEXT | Beschreibung |
| image_url | TEXT | Rezeptfoto |
| prep_time_minutes | INTEGER | Zubereitungszeit |
| cook_time_minutes | INTEGER | Kochzeit |
| servings | INTEGER | Portionen |
| calories_per_serving | INTEGER | Kalorien pro Portion |
| protein_per_serving | DECIMAL | Protein in Gramm |
| carbs_per_serving | DECIMAL | Kohlenhydrate in Gramm |
| fat_per_serving | DECIMAL | Fett in Gramm |
| category | TEXT | 'breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout' |
| dietary_tags | TEXT[] | ['vegan', 'gluten_free', 'high_protein', ...] |
| is_limited_time | BOOLEAN DEFAULT false | Limited-Time Rezept? 🔴 |
| available_from | DATE | Verfügbar ab (für Limited-Time) |
| available_until | DATE | Verfügbar bis |
| created_by | UUID (FK → profiles) | NULL = Gainly, sonst Custom 🔴 |
| is_public | BOOLEAN DEFAULT false | Community-geteilt? 🔴 Recipe Sharing |
| created_at | TIMESTAMPTZ | Erstelldatum |

**Warum so?**
- Macros direkt gespeichert → 🔴 Recipe Macros Auto-Calculate
- `is_limited_time` + Datumsfelder → 🔴 Limited-Time Recipes
- `created_by` NULL vs User → 🔴 Custom Recipes
- `is_public` → 🔴 Recipe Sharing

### recipe_ingredients

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| recipe_id | UUID (FK → recipes) | Zu welchem Rezept |
| name | TEXT NOT NULL | Zutatenname |
| amount | DECIMAL | Menge |
| unit | TEXT | 'g', 'ml', 'stück', 'el', 'tl' |
| calories | INTEGER | Kalorien dieser Zutat |
| protein | DECIMAL | Protein |
| carbs | DECIMAL | Kohlenhydrate |
| fat | DECIMAL | Fett |
| order_index | INTEGER | Reihenfolge |

### recipe_steps

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| recipe_id | UUID (FK → recipes) | Zu welchem Rezept |
| step_number | INTEGER | Schritt-Nummer |
| instruction | TEXT | Anweisung |
| image_url | TEXT | Optionales Bild zum Schritt |

### food_logs 🟠 (Gram-precise Food Logging + One-Click Logging)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| recipe_id | UUID (FK → recipes) | Verknüpftes Rezept (optional) |
| food_name | TEXT | Name des Essens (wenn kein Rezept) |
| meal_type | TEXT | 'breakfast', 'lunch', 'dinner', 'snack' |
| amount_grams | DECIMAL | Menge in Gramm |
| calories | INTEGER | Kalorien |
| protein | DECIMAL | Protein |
| carbs | DECIMAL | Kohlenhydrate |
| fat | DECIMAL | Fett |
| image_url | TEXT | Foto (für Camera Nutrition Tracking 🔴) |
| logged_at | TIMESTAMPTZ | Zeitpunkt |
| created_at | TIMESTAMPTZ | Erstelldatum |

### meal_plans 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| name | TEXT | Plan-Name |
| date | DATE | Für welchen Tag |
| created_at | TIMESTAMPTZ | Erstelldatum |

### meal_plan_items

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| meal_plan_id | UUID (FK → meal_plans) | Welcher Plan |
| recipe_id | UUID (FK → recipes) | Welches Rezept |
| meal_type | TEXT | 'breakfast', 'lunch', 'dinner', 'snack' |
| order_index | INTEGER | Reihenfolge |

---

## 7. Locations & Maps

### locations 🔴

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| name | TEXT NOT NULL | Name (z.B. "Calisthenics Park Stadtpark") |
| location_type | TEXT | 'outdoor_park', 'gym', 'meetup_spot' |
| latitude | DECIMAL NOT NULL | Breitengrad |
| longitude | DECIMAL NOT NULL | Längengrad |
| address | TEXT | Adresse |
| description | TEXT | Beschreibung |
| image_url | TEXT | Foto |
| google_place_id | TEXT | Google Maps API ID |
| equipment_available | TEXT[] | Verfügbares Equipment |
| added_by | UUID (FK → profiles) | Wer hat es hinzugefügt |
| is_verified | BOOLEAN DEFAULT false | Verifiziert? |
| created_at | TIMESTAMPTZ | Erstelldatum |

### location_ratings 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| location_id | UUID (FK → locations) | Welche Location |
| user_id | UUID (FK → profiles) | Welcher User |
| rating | INTEGER | 1-5 Sterne |
| review_text | TEXT | Bewertungstext |
| created_at | TIMESTAMPTZ | Erstelldatum |
| **UNIQUE** | (location_id, user_id) | Nur 1 Bewertung pro User |

---

## 8. Motivation & Content

### quotes 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| text | TEXT NOT NULL | Der Quote |
| author | TEXT NOT NULL | Wer hat es gesagt |
| category | TEXT NOT NULL | 'disziplin', 'mindset', 'durchhalten', ... |
| created_at | TIMESTAMPTZ | Erstelldatum |

### newsletters 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| title | TEXT NOT NULL | Titel |
| content | TEXT | Inhalt (Markdown) |
| category | TEXT | 'news', 'study', 'tip' |
| image_url | TEXT | Titelbild |
| published_at | TIMESTAMPTZ | Veröffentlichungsdatum |
| created_at | TIMESTAMPTZ | Erstelldatum |

---

## 9. LLM & Smart Features

### ai_conversations 🔴 (Personalized Plans)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| conversation_type | TEXT | 'plan_generation', 'nutrition_advice', 'form_check' |
| messages | JSONB | Chat-Verlauf als JSON |
| created_at | TIMESTAMPTZ | Erstelldatum |
| updated_at | TIMESTAMPTZ | Letzte Nachricht |

### nutrition_scans 🔴 (Nutrition Tracking via Camera)

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| image_url | TEXT | Foto des Essens |
| ai_response | JSONB | LLM-Analyse (erkannte Lebensmittel, Macros) |
| confirmed | BOOLEAN DEFAULT false | User hat Ergebnis bestätigt |
| food_log_id | UUID (FK → food_logs) | Verknüpfter Food Log |
| created_at | TIMESTAMPTZ | Erstelldatum |

### predictions 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| prediction_type | TEXT | 'strength_gain', 'weight_loss', 'skill_unlock' |
| prediction_data | JSONB | Die Vorhersage als JSON |
| predicted_date | DATE | Vorhergesagtes Datum |
| actual_value | DECIMAL | Tatsächlicher Wert (wenn eingetreten) |
| created_at | TIMESTAMPTZ | Erstelldatum |

### wearable_connections 🟠

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| provider | TEXT | 'apple_health', 'fitbit', 'garmin' |
| access_token | TEXT | Verschlüsselter Token |
| refresh_token | TEXT | Verschlüsselter Refresh Token |
| last_sync_at | TIMESTAMPTZ | Letzte Synchronisierung |
| created_at | TIMESTAMPTZ | Erstelldatum |

---

## 10. Notifications

### notification_settings

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Welcher User |
| push_enabled | BOOLEAN DEFAULT true | Push an? |
| reminder_time | TIME | Wann erinnern |
| reminder_days | TEXT[] | An welchen Tagen ['mon','tue','wed',...] |
| achievement_notifications | BOOLEAN DEFAULT true | Bei Achievements benachrichtigen? |
| social_notifications | BOOLEAN DEFAULT true | Bei Likes/Comments? |
| fcm_token | TEXT | Firebase Cloud Messaging Token |
| apn_token | TEXT | Apple Push Token |
| updated_at | TIMESTAMPTZ | Letzte Änderung |

### notifications

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Eindeutige ID |
| user_id | UUID (FK → profiles) | Empfänger |
| title | TEXT | Titel |
| body | TEXT | Nachricht |
| notification_type | TEXT | 'reminder', 'achievement', 'social', 'challenge' |
| reference_type | TEXT | 'post', 'achievement', 'challenge', ... |
| reference_id | UUID | ID des verknüpften Objekts |
| read | BOOLEAN DEFAULT false | Gelesen? |
| created_at | TIMESTAMPTZ | Erstelldatum |

---

## Beziehungsdiagramm (vereinfacht)

```
profiles (User)
├── workout_logs ──→ exercise_logs
├── daily_goals
├── user_exercise_progress ──→ exercise_progressions
├── posts ──→ comments, likes
├── friendships
├── group_members ──→ groups
├── challenge_participants ──→ challenges
├── user_achievements ──→ achievements
├── xp_transactions
├── user_rewards ──→ rewards
├── food_logs
├── meal_plans ──→ meal_plan_items ──→ recipes
├── before_after_photos
├── ai_conversations
├── nutrition_scans
├── wearable_connections
├── notification_settings
└── notifications

exercises
├── exercise_progressions
├── workout_exercises ──→ workouts
└── exercise_logs

recipes
├── recipe_ingredients
├── recipe_steps
└── food_logs

locations
└── location_ratings
```

---

## Nächste Schritte

1. **Phase 1** – Core-Tabellen erstellen: profiles, exercises, workouts, workout_logs, exercise_logs
2. **Phase 2** – Tracking: daily_goals, user_goal_settings, exercise_progressions
3. **Phase 3** – Gamification: achievements, xp_transactions, rewards, streaks
4. **Phase 4** – Community: friendships, groups, posts, comments, likes, challenges
5. **Phase 5** – Nutrition: recipes, food_logs, meal_plans
6. **Phase 6** – Locations, LLM, Notifications

> **Wichtig:** Jede Tabelle bekommt Row Level Security (RLS) Policies.
> Diese werden in der jeweiligen Phase definiert und eingerichtet.
