import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- 1. REQUEST AUSLESEN ---
    const { conversation_id, message } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 2. SUPABASE CLIENT ERSTELLEN ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    // Client MIT User-Auth (sieht nur was der User sehen darf)
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Client OHNE User-Auth (kann alles lesen/schreiben, umgeht RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- 3. USER IDENTIFIZIEREN ---
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 4. BUDGET PRÜFEN ---
    const { data: budgetData, error: budgetError } = await supabaseAdmin
      .rpc("check_ai_budget", { p_user_id: user.id });

    if (budgetError) {
      return new Response(
        JSON.stringify({ error: "Budget check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const budget = budgetData[0];

    if (!budget.has_budget) {
      return new Response(
        JSON.stringify({
          error: "Monthly token limit reached",
          tokens_used: budget.tokens_used,
          tokens_limit: budget.tokens_limit,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 5. USER-KONTEXT LADEN ---
    const [
      { data: profile },
      { data: recentWorkouts },
      { data: exerciseProgress },
      { data: conversationHistory },
    ] = await Promise.all([

      // Profil: Level, Equipment, Streak, XP
      supabaseAdmin
        .from("profiles")
        .select("username, fitness_level, equipment, xp_total, current_streak, longest_streak, ai_preferred_language")
        .eq("id", user.id)
        .single(),

      // Letzte 5 Workouts mit Übungsnamen
      supabaseAdmin
        .from("workout_logs")
        .select("started_at, total_duration, xp_earned, notes, workouts(name)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(5),

      // Aktuelle Progressionsstufen
      supabaseAdmin
        .from("user_exercise_progress")
        .select("personal_best_value, exercises(name, category, difficulty), exercise_progressions(stage_name)")
        .eq("user_id", user.id)
        .limit(10),

      // Bisherige Nachrichten dieser Konversation (falls vorhanden)
      conversation_id
        ? supabaseAdmin
            .from("ai_messages")
            .select("role, content")
            .eq("conversation_id", conversation_id)
            .order("created_at", { ascending: true })
            .limit(20)
        : Promise.resolve({ data: [] }),

    ]);

    // --- 6. SYSTEM PROMPT BAUEN ---

    // Workout-Historie als lesbaren Text formatieren
    const workoutSummary = (recentWorkouts || [])
      .map((w) => {
        const date = new Date(w.started_at).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        });
        const name = w.workouts?.name || "Quick Workout";
        const duration = w.total_duration
          ? `${Math.round(w.total_duration / 60)} min`
          : "unknown duration";
        return `- ${date}: ${name} (${duration}, +${w.xp_earned || 0} XP)`;
      })
      .join("\n");

    // Progressionen als lesbaren Text formatieren
    const progressSummary = (exerciseProgress || [])
      .map((p) => {
        const name = p.exercises?.name || "Unknown";
        const stage = p.exercise_progressions?.stage_name;
        const pb = p.personal_best_value;
        let line = `- ${name}`;
        if (stage) line += ` → Current stage: ${stage}`;
        if (pb) line += ` (PB: ${pb})`;
        return line;
      })
      .join("\n");

    // Equipment als lesbaren Text formatieren
    const equipmentList = (profile?.equipment || []).length > 0
      ? profile.equipment.join(", ")
      : "No equipment (bodyweight only)";

    // Liga berechnen
    const xp = profile?.xp_total || 0;
    const league = xp >= 50000 ? "Legend"
      : xp >= 15000 ? "Beast"
      : xp >= 5000 ? "Athlete"
      : xp >= 1000 ? "Grinder"
      : "Rookie";

    // Sprache bestimmen
    const lang = profile?.ai_preferred_language === "de" ? "German" : "English";

    // Der eigentliche System Prompt
    const systemPrompt = `You are the Gainly Coach, a personal calisthenics and fitness trainer inside the Gainly app. You respond in ${lang}.

## Your personality
- Motivating but not cheesy. Direct and knowledgeable.
- You speak like a trusted training partner, not a corporate chatbot.
- Keep answers concise. A few focused sentences beat a wall of text.
- Use the user's data naturally, don't list it back to them.

## User profile
- Name: ${profile?.username || "Athlete"}
- Fitness level: ${profile?.fitness_level || "not set"}
- Equipment: ${equipmentList}
- XP: ${xp} (${league} league)
- Current streak: ${profile?.current_streak || 0} weeks
- Longest streak: ${profile?.longest_streak || 0} weeks

## Recent workouts (last 7 days)
${workoutSummary || "No recent workouts logged."}

## Skill progressions
${progressSummary || "No progression data yet."}

## Rules you must follow
- NEVER give medical diagnoses. If the user describes pain or injury, recommend seeing a doctor.
- NEVER recommend supplements or medication.
- If asked about nutrition, give general guidance only. You are not a dietitian.
- Base your recommendations on the user's actual fitness level and equipment.
- If the user asks about an exercise they don't have equipment for, suggest a bodyweight alternative.
- When suggesting progressions, reference their current stage if available.`;

    // --- 7. NACHRICHTEN-ARRAY BAUEN ---
    const messages = [
      { role: "system", content: systemPrompt },
    ];

    // Bisherige Chat-Historie einfügen (falls vorhanden)
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Aktuelle User-Nachricht anfügen
    messages.push({ role: "user", content: message });

    // --- 8. OPENAI API AUFRUFEN ---
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messages,
          max_tokens: 800,
          temperature: 0.7,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: "OpenAI API error", details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0].message.content;
    const tokensInput = openaiData.usage?.prompt_tokens || 0;
    const tokensOutput = openaiData.usage?.completion_tokens || 0;

    // --- 9. KONVERSATION ERSTELLEN ODER NUTZEN ---
    let activeConversationId = conversation_id;

    if (!activeConversationId) {
      const { data: newConv, error: convError } = await supabaseAdmin
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          conversation_type: "general",
        })
        .select("id")
        .single();

      if (convError || !newConv) {
        return new Response(
          JSON.stringify({ error: "Failed to create conversation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      activeConversationId = newConv.id;
    }

    // --- 10. NACHRICHTEN IN DB SPEICHERN ---
    await supabaseAdmin.from("ai_messages").insert([
      {
        conversation_id: activeConversationId,
        role: "user",
        content: message,
        tokens_input: 0,
        tokens_output: 0,
        model: "gpt-4o-mini",
      },
      {
        conversation_id: activeConversationId,
        role: "assistant",
        content: assistantMessage,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        model: "gpt-4o-mini",
      },
    ]);

    // --- 11. TOKEN-NUTZUNG TRACKEN ---
    await supabaseAdmin.rpc("track_ai_usage", {
      p_user_id: user.id,
      p_tokens_input: tokensInput,
      p_tokens_output: tokensOutput,
    });

    // --- 12. ANTWORT ANS FRONTEND ---
    return new Response(
      JSON.stringify({
        conversation_id: activeConversationId,
        message: assistantMessage,
        tokens: {
          input: tokensInput,
          output: tokensOutput,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});