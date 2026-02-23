-- ============================================
-- GAINLY â€“ Phase 1: Core-Tabellen
-- ============================================
-- Diesen gesamten Code im Supabase SQL Editor
-- einfÃ¼gen und mit "Run" ausfÃ¼hren.
-- ============================================


-- ============================================
-- 1. PROFILES
-- ============================================
-- Erweitert den auth.users von Supabase mit
-- zusÃ¤tzlichen User-Daten wie Username, Bio,
-- Equipment, XP, Streaks etc.
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  equipment TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  xp_total INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  streak_freeze_available BOOLEAN DEFAULT true,
  preferred_reminder_time TIME,
  location_lat DECIMAL,
  location_lng DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Jeder kann Profile sehen (fÃ¼r Community, Leaderboards etc.)
CREATE POLICY "Profile sind Ã¶ffentlich lesbar"
  ON profiles FOR SELECT
  USING (true);

-- User kann nur sein eigenes Profil bearbeiten
CREATE POLICY "User kann eigenes Profil bearbeiten"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- User kann sein eigenes Profil erstellen
CREATE POLICY "User kann eigenes Profil erstellen"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Automatisch ein Profil erstellen wenn sich ein User registriert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Automatisch updated_at aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 2. EXERCISES (Globale Ãœbungsdatenbank)
-- ============================================
-- EnthÃ¤lt alle Ãœbungen â€“ sowohl offizielle
-- Gainly-Ãœbungen (created_by = NULL) als auch
-- Custom Exercises von Usern.
-- ============================================

CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('push', 'pull', 'legs', 'core', 'cardio', 'flexibility')),
  tracking_type TEXT DEFAULT 'reps' CHECK (tracking_type IN ('reps', 'time', 'distance')),
  equipment_required TEXT[] DEFAULT '{}',
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  primary_muscles TEXT[] DEFAULT '{}',
  secondary_muscles TEXT[] DEFAULT '{}',
  demo_3d_url TEXT,
  is_static_hold BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Jeder kann offizielle + genehmigte Ãœbungen sehen
-- User kÃ¶nnen zusÃ¤tzlich ihre eigenen Custom Exercises sehen
CREATE POLICY "Ãœbungen sind lesbar"
  ON exercises FOR SELECT
  USING (
    created_by IS NULL                    -- Offizielle Gainly-Ãœbungen
    OR is_approved = true                 -- Von Community genehmigte
    OR auth.uid() = created_by            -- Eigene Custom Exercises
  );

-- User kann eigene Ãœbungen erstellen
CREATE POLICY "User kann Ãœbungen erstellen"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- User kann eigene Ãœbungen bearbeiten
CREATE POLICY "User kann eigene Ãœbungen bearbeiten"
  ON exercises FOR UPDATE
  USING (auth.uid() = created_by);

-- User kann eigene Ãœbungen lÃ¶schen
CREATE POLICY "User kann eigene Ãœbungen lÃ¶schen"
  ON exercises FOR DELETE
  USING (auth.uid() = created_by);


-- ============================================
-- 3. EXERCISE PROGRESSIONS (Skill Trees)
-- ============================================
-- Definiert die Progressionsstufen pro Ãœbung.
-- z.B. Planche: Tuck â†’ Advanced Tuck â†’ 
-- Straddle â†’ Full
-- ============================================

CREATE TABLE exercise_progressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  prerequisite_stage_id UUID REFERENCES exercise_progressions(id) ON DELETE SET NULL,
  criteria_type TEXT CHECK (criteria_type IN ('time', 'reps')),
  criteria_value INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exercise_progressions ENABLE ROW LEVEL SECURITY;

-- Progressionen sind fÃ¼r alle lesbar (gehÃ¶ren zu Ãœbungen)
CREATE POLICY "Progressionen sind lesbar"
  ON exercise_progressions FOR SELECT
  USING (true);


-- ============================================
-- 4. USER EXERCISE PROGRESS
-- ============================================
-- Speichert wo der User bei jeder Ãœbung steht.
-- Aktuelle Stage + persÃ¶nliche Bestleistung.
-- ============================================

CREATE TABLE user_exercise_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  current_stage_id UUID REFERENCES exercise_progressions(id) ON DELETE SET NULL,
  personal_best_value INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

ALTER TABLE user_exercise_progress ENABLE ROW LEVEL SECURITY;

-- User kann nur eigenen Fortschritt sehen
CREATE POLICY "User sieht eigenen Fortschritt"
  ON user_exercise_progress FOR SELECT
  USING (auth.uid() = user_id);

-- User kann eigenen Fortschritt erstellen
CREATE POLICY "User kann Fortschritt erstellen"
  ON user_exercise_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User kann eigenen Fortschritt aktualisieren
CREATE POLICY "User kann Fortschritt aktualisieren"
  ON user_exercise_progress FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- 5. WORKOUTS
-- ============================================
-- Workout-Vorlagen. KÃ¶nnen vom System oder
-- von Usern erstellt werden.
-- ============================================

CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_template BOOLEAN DEFAULT false,
  estimated_duration INTEGER,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- User sieht eigene Workouts + Ã¶ffentliche Templates
CREATE POLICY "Workouts sind lesbar"
  ON workouts FOR SELECT
  USING (
    auth.uid() = created_by              -- Eigene Workouts
    OR is_template = true                 -- Ã–ffentliche Templates
  );

-- User kann Workouts erstellen
CREATE POLICY "User kann Workouts erstellen"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- User kann eigene Workouts bearbeiten
CREATE POLICY "User kann eigene Workouts bearbeiten"
  ON workouts FOR UPDATE
  USING (auth.uid() = created_by);

-- User kann eigene Workouts lÃ¶schen
CREATE POLICY "User kann eigene Workouts lÃ¶schen"
  ON workouts FOR DELETE
  USING (auth.uid() = created_by);


-- ============================================
-- 6. WORKOUT EXERCISES
-- ============================================
-- VerknÃ¼pfungstabelle: Welche Ãœbungen gehÃ¶ren
-- zu welchem Workout, in welcher Reihenfolge,
-- mit welchen Zielen.
-- ============================================

CREATE TABLE workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  target_sets INTEGER,
  target_reps INTEGER,
  target_time_seconds INTEGER,
  rest_seconds INTEGER
);

ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- Lesbar wenn das Workout lesbar ist
CREATE POLICY "Workout-Ãœbungen sind lesbar"
  ON workout_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND (workouts.created_by = auth.uid() OR workouts.is_template = true)
    )
  );

-- Erstellen wenn das Workout dem User gehÃ¶rt
CREATE POLICY "User kann Workout-Ãœbungen hinzufÃ¼gen"
  ON workout_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.created_by = auth.uid()
    )
  );

-- Bearbeiten wenn das Workout dem User gehÃ¶rt
CREATE POLICY "User kann Workout-Ãœbungen bearbeiten"
  ON workout_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.created_by = auth.uid()
    )
  );

-- LÃ¶schen wenn das Workout dem User gehÃ¶rt
CREATE POLICY "User kann Workout-Ãœbungen entfernen"
  ON workout_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.created_by = auth.uid()
    )
  );


-- ============================================
-- 7. WORKOUT LOGS
-- ============================================
-- Jedes Mal wenn ein User ein Workout macht,
-- wird hier ein Eintrag erstellt.
-- ============================================

CREATE TABLE workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_duration INTEGER,
  notes TEXT,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Logs
CREATE POLICY "User sieht eigene Workout-Logs"
  ON workout_logs FOR SELECT
  USING (auth.uid() = user_id);

-- User kann eigene Logs erstellen
CREATE POLICY "User kann Workout-Logs erstellen"
  ON workout_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User kann eigene Logs bearbeiten (z.B. Notizen nachtragen)
CREATE POLICY "User kann eigene Workout-Logs bearbeiten"
  ON workout_logs FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- 8. EXERCISE LOGS
-- ============================================
-- Die einzelnen Ãœbungen innerhalb eines
-- Workout-Logs. Jeder Satz = eine Zeile.
-- Hier passiert das eigentliche Tracking.
-- ============================================

CREATE TABLE exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps_completed INTEGER,
  time_completed_seconds INTEGER,
  target_reps INTEGER,
  target_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Exercise-Logs
CREATE POLICY "User sieht eigene Exercise-Logs"
  ON exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_logs
      WHERE workout_logs.id = exercise_logs.workout_log_id
      AND workout_logs.user_id = auth.uid()
    )
  );

-- User kann eigene Exercise-Logs erstellen
CREATE POLICY "User kann Exercise-Logs erstellen"
  ON exercise_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_logs
      WHERE workout_logs.id = exercise_logs.workout_log_id
      AND workout_logs.user_id = auth.uid()
    )
  );

-- User kann eigene Exercise-Logs bearbeiten
CREATE POLICY "User kann Exercise-Logs bearbeiten"
  ON exercise_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_logs
      WHERE workout_logs.id = exercise_logs.workout_log_id
      AND workout_logs.user_id = auth.uid()
    )
  );


-- ============================================
-- INDEXES fÃ¼r Performance
-- ============================================
-- Indexes beschleunigen hÃ¤ufige Abfragen.
-- Ohne sie mÃ¼sste die DB jede Zeile durchsuchen.
-- ============================================

-- Schnelle Suche nach Ãœbungen einer Kategorie
CREATE INDEX idx_exercises_category ON exercises(category);

-- Schnelle Suche nach Ãœbungen eines Users (Custom Exercises)
CREATE INDEX idx_exercises_created_by ON exercises(created_by);

-- Schnelle Suche nach Progressionen einer Ãœbung
CREATE INDEX idx_progressions_exercise ON exercise_progressions(exercise_id);

-- Schnelle Suche nach Fortschritt eines Users
CREATE INDEX idx_user_progress_user ON user_exercise_progress(user_id);

-- Schnelle Suche nach Ãœbungen eines Workouts
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);

-- Schnelle Suche nach Workout-Logs eines Users
CREATE INDEX idx_workout_logs_user ON workout_logs(user_id);

-- Schnelle Suche nach Logs eines Users nach Datum
CREATE INDEX idx_workout_logs_user_date ON workout_logs(user_id, started_at);

-- Schnelle Suche nach Exercise-Logs eines Workout-Logs
CREATE INDEX idx_exercise_logs_workout_log ON exercise_logs(workout_log_id);


-- ============================================
-- FERTIG! ðŸŽ‰
-- ============================================
-- Phase 1 ist eingerichtet. Ihr habt jetzt:
--   âœ… profiles (mit Auto-Erstellung bei Registrierung)
--   âœ… exercises (mit Custom Exercise Support)
--   âœ… exercise_progressions (Skill Trees)
--   âœ… user_exercise_progress (User-Fortschritt)
--   âœ… workouts (Workout-Vorlagen)
--   âœ… workout_exercises (Ãœbungen im Workout)
--   âœ… workout_logs (Absolvierte Workouts)
--   âœ… exercise_logs (Einzelne Satz-Logs)
--   âœ… Row Level Security auf allen Tabellen
--   âœ… Performance-Indexes
--   âœ… Auto-Update Trigger fÃ¼r updated_at
-- ============================================
