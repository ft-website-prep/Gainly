// deno-lint-ignore-file no-explicit-any
// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { study_id } = await req.json();

    if (!study_id) {
      return new Response(
        JSON.stringify({ error: "study_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Studie laden
    const { data: study, error: studyError } = await supabase
      .from("metric_studies")
      .select("id, abstract, summary")
      .eq("id", study_id)
      .single();

    if (studyError || !study) {
      return new Response(
        JSON.stringify({ error: "Study not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Bereits gecacht? Direkt zurückgeben
    if (study.summary) {
      return new Response(
        JSON.stringify({ summary: study.summary }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. OpenAI aufrufen
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a health educator who explains medical research to fitness enthusiasts with no medical background.
Your job: take a scientific abstract and explain it in plain, engaging English.
Format your response as 3 short paragraphs:
1. What was studied and why it matters (1-2 sentences)
2. What the researchers found — use simple numbers and analogies where helpful (2-3 sentences)
3. What this means for you practically as someone tracking their health (1-2 sentences)
Keep it under 150 words total. No bullet points. No jargon without explanation.`,
          },
          {
            role: "user",
            content: `Here is the abstract:\n\n${study.abstract}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    const openaiData = await openaiRes.json();
    const summary = openaiData.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return new Response(
        JSON.stringify({ error: "Failed to generate summary" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Summary in DB cachen
    await supabase
      .from("metric_studies")
      .update({ summary })
      .eq("id", study_id);

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
