-- ============================================
-- GAINLY â€“ SÃ¤ule 2 & 3: Gamification + Community
-- ============================================
-- Diesen gesamten Code im Supabase SQL Editor
-- einfÃ¼gen und mit "Run" ausfÃ¼hren.
-- 
-- Voraussetzung: Phase 1 (Core) muss bereits
-- ausgefÃ¼hrt sein, da diese Tabellen auf
-- profiles, workouts und workout_logs verweisen.
-- ============================================


-- ============================================
-- =============================================
--   SÃ„ULE 2: GAMIFICATION
-- =============================================
-- ============================================


-- ============================================
-- 1. ACHIEVEMENTS
-- ============================================
-- Definiert alle mÃ¶glichen Achievements.
-- Werden von Admins erstellt, nicht von Usern.
-- z.B. "Iron Will" = 30 Tage Streak
-- z.B. "Century Club" = 100 Workouts
-- ============================================

CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT CHECK (category IN ('streak', 'workout', 'social', 'nutrition', 'challenge', 'special')),
  condition_type TEXT NOT NULL CHECK (condition_type IN (
    'streak_days',
    'total_workouts',
    'total_xp',
    'friends_count',
    'challenges_completed',
    'posts_count',
    'group_count'
  )),
  condition_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Jeder kann Achievements sehen
CREATE POLICY "Achievements sind Ã¶ffentlich lesbar"
  ON achievements FOR SELECT
  USING (true);


-- ============================================
-- 2. USER ACHIEVEMENTS
-- ============================================
-- VerknÃ¼pfung: Welcher User hat welches
-- Achievement freigeschaltet und wann.
-- ============================================

CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Jeder kann sehen wer welche Achievements hat (fÃ¼r Profile/Leaderboards)
CREATE POLICY "User-Achievements sind Ã¶ffentlich lesbar"
  ON user_achievements FOR SELECT
  USING (true);

-- System erstellt Achievements (Ã¼ber Service Role), aber
-- User kÃ¶nnen auch eigene EintrÃ¤ge erstellen (fÃ¼r Client-Side Checks)
CREATE POLICY "User kann eigene Achievements erstellen"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 3. XP TRANSACTIONS
-- ============================================
-- Jede XP-Vergabe wird hier protokolliert.
-- Wie ein Kontoauszug fÃ¼r XP.
-- z.B. +50 XP fÃ¼r Workout, +100 XP fÃ¼r Achievement
-- ============================================

CREATE TABLE xp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'workout',
    'achievement',
    'challenge',
    'streak',
    'social',
    'bonus'
  )),
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- User sieht eigene XP-Historie
CREATE POLICY "User sieht eigene XP-Transaktionen"
  ON xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- User kann XP-Transaktionen erstellen
CREATE POLICY "User kann XP-Transaktionen erstellen"
  ON xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 4. REWARDS
-- ============================================
-- Was man fÃ¼r XP eintauschen kann.
-- z.B. Discounts, Badges, Feature Unlocks.
-- Werden von Admins erstellt.
-- ============================================

CREATE TABLE rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  xp_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount', 'badge', 'feature_unlock', 'cosmetic')),
  reward_value TEXT,
  is_active BOOLEAN DEFAULT true,
  limited_quantity INTEGER,
  redeemed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Jeder kann verfÃ¼gbare Rewards sehen
CREATE POLICY "Aktive Rewards sind lesbar"
  ON rewards FOR SELECT
  USING (is_active = true);


-- ============================================
-- 5. USER REWARDS
-- ============================================
-- Welcher User hat welchen Reward eingelÃ¶st.
-- ============================================

CREATE TABLE user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  xp_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- User sieht eigene eingelÃ¶sten Rewards
CREATE POLICY "User sieht eigene Rewards"
  ON user_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- User kann Rewards einlÃ¶sen
CREATE POLICY "User kann Rewards einlÃ¶sen"
  ON user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- =============================================
--   SÃ„ULE 3: COMMUNITY
-- =============================================
-- ============================================


-- ============================================
-- 6. FRIENDSHIPS
-- ============================================
-- Freundschaftssystem mit Anfrage-Status.
-- Eine Zeile pro Freundschafts-Paar.
-- requester schickt Anfrage, addressee nimmt an.
-- ============================================

CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- User sieht Freundschaften wo er beteiligt ist
CREATE POLICY "User sieht eigene Freundschaften"
  ON friendships FOR SELECT
  USING (
    auth.uid() = requester_id
    OR auth.uid() = addressee_id
  );

-- User kann Freundschaftsanfragen senden
CREATE POLICY "User kann Freundschaftsanfragen senden"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Beide Seiten kÃ¶nnen den Status Ã¤ndern (annehmen/ablehnen)
CREATE POLICY "Beteiligte kÃ¶nnen Freundschaft aktualisieren"
  ON friendships FOR UPDATE
  USING (
    auth.uid() = requester_id
    OR auth.uid() = addressee_id
  );

-- Beide Seiten kÃ¶nnen Freundschaft lÃ¶schen (entfreunden)
CREATE POLICY "Beteiligte kÃ¶nnen Freundschaft lÃ¶schen"
  ON friendships FOR DELETE
  USING (
    auth.uid() = requester_id
    OR auth.uid() = addressee_id
  );

-- Trigger fÃ¼r updated_at
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 7. GROUPS / CREWS
-- ============================================
-- User kÃ¶nnen Gruppen erstellen und beitreten.
-- Gruppen kÃ¶nnen Ã¶ffentlich oder privat sein.
-- ============================================

CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 50,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Ã–ffentliche Gruppen kann jeder sehen
-- Private Gruppen nur Mitglieder
CREATE POLICY "Gruppen sind lesbar"
  ON groups FOR SELECT
  USING (
    is_public = true
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- Jeder eingeloggte User kann Gruppen erstellen
CREATE POLICY "User kann Gruppen erstellen"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Nur der Ersteller kann die Gruppe bearbeiten
CREATE POLICY "Ersteller kann Gruppe bearbeiten"
  ON groups FOR UPDATE
  USING (auth.uid() = created_by);

-- Nur der Ersteller kann die Gruppe lÃ¶schen
CREATE POLICY "Ersteller kann Gruppe lÃ¶schen"
  ON groups FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger fÃ¼r updated_at
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 8. GROUP MEMBERS
-- ============================================
-- Wer ist in welcher Gruppe und mit welcher
-- Rolle (admin, moderator, member).
-- ============================================

CREATE TABLE group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Mitglieder einer Gruppe sehen wer noch drin ist
CREATE POLICY "Gruppen-Mitglieder sind sichtbar"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members AS gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.is_public = true
    )
  );

-- User kann Gruppen beitreten
CREATE POLICY "User kann Gruppen beitreten"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins kÃ¶nnen Mitglieder-Rollen Ã¤ndern
CREATE POLICY "Admins kÃ¶nnen Rollen Ã¤ndern"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members AS gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- User kann selbst austreten, Admins kÃ¶nnen Leute entfernen
CREATE POLICY "User kann austreten oder Admin entfernt"
  ON group_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM group_members AS gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );


-- ============================================
-- 9. POSTS (Progress Posts)
-- ============================================
-- Community-Posts. KÃ¶nnen Ã¶ffentlich sein oder
-- in einer Gruppe gepostet werden.
-- KÃ¶nnen mit Workouts verknÃ¼pft werden.
-- ============================================

CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  post_type TEXT DEFAULT 'general' CHECK (post_type IN (
    'general',
    'progress',
    'achievement',
    'workout_share',
    'challenge_update'
  )),
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE SET NULL,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Ã–ffentliche Posts (group_id = NULL) sieht jeder
-- Gruppen-Posts sehen nur Mitglieder
CREATE POLICY "Posts sind lesbar"
  ON posts FOR SELECT
  USING (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = posts.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- User kann Posts erstellen
CREATE POLICY "User kann Posts erstellen"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User kann eigene Posts bearbeiten
CREATE POLICY "User kann eigene Posts bearbeiten"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

-- User kann eigene Posts lÃ¶schen
CREATE POLICY "User kann eigene Posts lÃ¶schen"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger fÃ¼r updated_at
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 10. COMMENTS
-- ============================================
-- Kommentare unter Posts.
-- ============================================

CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Kommentare sind sichtbar wenn der Post sichtbar ist
CREATE POLICY "Kommentare sind lesbar"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND (
        posts.group_id IS NULL
        OR EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = posts.group_id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

-- User kann Kommentare schreiben
CREATE POLICY "User kann kommentieren"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User kann eigene Kommentare bearbeiten
CREATE POLICY "User kann eigene Kommentare bearbeiten"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- User kann eigene Kommentare lÃ¶schen
CREATE POLICY "User kann eigene Kommentare lÃ¶schen"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger fÃ¼r updated_at
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 11. LIKES
-- ============================================
-- Ein User kann einen Post genau einmal liken.
-- ============================================

CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Likes sind sichtbar wenn der Post sichtbar ist
CREATE POLICY "Likes sind lesbar"
  ON likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = likes.post_id
      AND (
        posts.group_id IS NULL
        OR EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = posts.group_id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

-- User kann liken
CREATE POLICY "User kann liken"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User kann eigenen Like entfernen (unlike)
CREATE POLICY "User kann unliken"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- 12. CHALLENGES
-- ============================================
-- Challenges kÃ¶nnen Ã¶ffentlich oder
-- gruppenspezifisch sein.
-- z.B. "100 Pushups in 7 Tagen"
-- ============================================

CREATE TABLE challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN (
    'total_reps',
    'total_time',
    'total_workouts',
    'streak_days',
    'total_xp'
  )),
  target_value INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  xp_reward INTEGER DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_date > start_date)
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Ã–ffentliche Challenges sieht jeder
-- Gruppen-Challenges nur Mitglieder
CREATE POLICY "Challenges sind lesbar"
  ON challenges FOR SELECT
  USING (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = challenges.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- User kann Challenges erstellen
CREATE POLICY "User kann Challenges erstellen"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Ersteller kann Challenge bearbeiten
CREATE POLICY "Ersteller kann Challenge bearbeiten"
  ON challenges FOR UPDATE
  USING (auth.uid() = created_by);

-- Ersteller kann Challenge lÃ¶schen
CREATE POLICY "Ersteller kann Challenge lÃ¶schen"
  ON challenges FOR DELETE
  USING (auth.uid() = created_by);


-- ============================================
-- 13. CHALLENGE PARTICIPANTS
-- ============================================
-- Wer nimmt an welcher Challenge teil
-- und wie weit ist der Fortschritt.
-- ============================================

CREATE TABLE challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Teilnehmer einer Challenge sehen alle anderen Teilnehmer
-- (fÃ¼r Leaderboards innerhalb der Challenge)
CREATE POLICY "Challenge-Teilnehmer sind sichtbar"
  ON challenge_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenge_participants AS cp
      WHERE cp.challenge_id = challenge_participants.challenge_id
      AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_participants.challenge_id
      AND challenges.group_id IS NULL
    )
  );

-- User kann an Challenges teilnehmen
CREATE POLICY "User kann an Challenges teilnehmen"
  ON challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User kann eigenen Fortschritt aktualisieren
CREATE POLICY "User kann eigenen Fortschritt aktualisieren"
  ON challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- 14. LEADERBOARDS
-- ============================================
-- Berechnete Ranglisten. Werden periodisch
-- aktualisiert (z.B. stÃ¼ndlich oder tÃ¤glich).
-- Verschiedene Typen: XP, Streaks, Challenges.
-- ============================================

CREATE TABLE leaderboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN (
    'xp_weekly',
    'xp_monthly',
    'xp_alltime',
    'streak_current',
    'workouts_weekly',
    'workouts_monthly',
    'challenge'
  )),
  reference_id UUID,
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  period_start DATE,
  period_end DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Leaderboards sind Ã¶ffentlich (das ist der Sinn davon)
CREATE POLICY "Leaderboards sind Ã¶ffentlich lesbar"
  ON leaderboards FOR SELECT
  USING (true);

-- Nur System erstellt/aktualisiert Leaderboard-EintrÃ¤ge
-- User kÃ¶nnen eigene EintrÃ¤ge erstellen (Client-Side Updates)
CREATE POLICY "User kann eigene Leaderboard-EintrÃ¤ge erstellen"
  ON leaderboards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User kann eigene Leaderboard-EintrÃ¤ge aktualisieren"
  ON leaderboards FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- 15. NOTIFICATIONS
-- ============================================
-- Alle In-App Benachrichtigungen.
-- z.B. "Max hat deinen Post geliked"
-- z.B. "Du hast 'Iron Will' freigeschaltet!"
-- ============================================

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'like',
    'comment',
    'friend_request',
    'friend_accepted',
    'achievement',
    'challenge_invite',
    'challenge_completed',
    'group_invite',
    'streak_reminder',
    'xp_earned',
    'leaderboard_change',
    'system'
  )),
  reference_type TEXT,
  reference_id UUID,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Notifications
CREATE POLICY "User sieht eigene Notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Jeder eingeloggte User kann Notifications erstellen
-- (z.B. wenn User A User B liked, erstellt die App eine Notification fÃ¼r B)
CREATE POLICY "Notifications kÃ¶nnen erstellt werden"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- User kann eigene Notifications als gelesen markieren
CREATE POLICY "User kann Notifications aktualisieren"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- User kann eigene Notifications lÃ¶schen
CREATE POLICY "User kann Notifications lÃ¶schen"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- INDEXES fÃ¼r Performance
-- ============================================

-- Gamification
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_user_date ON xp_transactions(user_id, created_at);
CREATE INDEX idx_user_rewards_user ON user_rewards(user_id);

-- Community
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_group ON posts(group_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- Challenges
CREATE INDEX idx_challenges_group ON challenges(group_id);
CREATE INDEX idx_challenges_active ON challenges(is_active, start_date, end_date);
CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);

-- Leaderboards
CREATE INDEX idx_leaderboards_type ON leaderboards(leaderboard_type);
CREATE INDEX idx_leaderboards_type_rank ON leaderboards(leaderboard_type, rank);
CREATE INDEX idx_leaderboards_user ON leaderboards(user_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);


-- ============================================
-- HELPER FUNCTIONS
-- ============================================


-- ============================================
-- Funktion: XP vergeben und Profil aktualisieren
-- ============================================
-- Wird aufgerufen wenn ein User XP bekommt.
-- Erstellt eine XP-Transaktion und aktualisiert
-- den xp_total im Profil.
-- ============================================

CREATE OR REPLACE FUNCTION grant_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- XP-Transaktion erstellen
  INSERT INTO xp_transactions (user_id, amount, source_type, source_id, description)
  VALUES (p_user_id, p_amount, p_source_type, p_source_id, p_description);

  -- Profil xp_total aktualisieren
  UPDATE profiles
  SET xp_total = xp_total + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- Funktion: Like-Counter aktualisieren
-- ============================================
-- Wird automatisch ausgelÃ¶st wenn ein Like
-- erstellt oder gelÃ¶scht wird.
-- HÃ¤lt like_count im Post aktuell.
-- ============================================

CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_like_count();


-- ============================================
-- Funktion: Comment-Counter aktualisieren
-- ============================================

CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_count();


-- ============================================
-- Funktion: Challenge-Teilnehmer-Counter
-- ============================================

CREATE OR REPLACE FUNCTION update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenges SET participant_count = participant_count + 1 WHERE id = NEW.challenge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenges SET participant_count = participant_count - 1 WHERE id = OLD.challenge_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_participant_change
  AFTER INSERT OR DELETE ON challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_count();


-- ============================================
-- Funktion: Gruppen-Mitglieder-Counter
-- ============================================

CREATE OR REPLACE FUNCTION update_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_member_change
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_member_count();


-- ============================================
-- FERTIG! ðŸŽ‰
-- ============================================
-- SÃ¤ule 2 + 3 sind eingerichtet. Ihr habt jetzt:
--
-- GAMIFICATION:
--   âœ… achievements (Achievement-Definitionen)
--   âœ… user_achievements (Freigeschaltete Achievements)
--   âœ… xp_transactions (XP-Verlauf)
--   âœ… rewards (EinlÃ¶sbare Belohnungen)
--   âœ… user_rewards (EingelÃ¶ste Rewards)
--
-- COMMUNITY:
--   âœ… friendships (Freundschaften mit Anfragen)
--   âœ… groups (Gruppen/Crews)
--   âœ… group_members (Gruppenmitglieder + Rollen)
--   âœ… posts (Community-Posts)
--   âœ… comments (Kommentare)
--   âœ… likes (Likes mit UNIQUE Constraint)
--   âœ… challenges (Community-Challenges)
--   âœ… challenge_participants (Challenge-Teilnehmer)
--   âœ… leaderboards (Ranglisten)
--   âœ… notifications (Benachrichtigungen)
--
-- HELPER FUNCTIONS:
--   âœ… grant_xp() â€“ XP vergeben
--   âœ… Like/Comment/Participant/Member Counter
--
-- SECURITY:
--   âœ… RLS auf allen Tabellen
--   âœ… Performance-Indexes
-- ============================================
