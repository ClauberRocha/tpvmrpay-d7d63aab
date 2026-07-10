// Edge function: análise estratégica com IA (Lovable AI Gateway)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller to prevent abuse of AI credits
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }



    const payload = await req.json();

    const systemPrompt = `Você é um analista financeiro sênior especializado em pagamentos (TPV).
Analise os dados em JSON e retorne JSON válido seguindo o schema solicitado, em português do Brasil.
Seja objetivo, quantitativo e prático. Use os números fornecidos. Não invente dados.`;

    const userPrompt = `Dados de TPV (Total Payment Volume) para análise:\n\n${JSON.stringify(payload, null, 2)}\n\nFaça:
1. Detecção de anomalias na série mensal (quedas/picos fora do padrão)
2. Identificação de crescimento incomum (positivo)
3. Sinais de queda preocupante de TPV
4. Risco de churn baseado em clientes inativos / concentração
5. Projeção de receita para os próximos 3 meses (com cenário base, otimista e pessimista)
Use a ferramenta retornar_analise.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "retornar_analise",
                description: "Retorna a análise estratégica estruturada",
                parameters: {
                  type: "object",
                  properties: {
                    anomalias: {
                      type: "array",
                      description: "Anomalias detectadas (quedas/picos atípicos)",
                      items: {
                        type: "object",
                        properties: {
                          periodo: { type: "string", description: "Ex: Mar/26" },
                          tipo: { type: "string", enum: ["pico", "queda"] },
                          severidade: { type: "string", enum: ["baixa", "media", "alta"] },
                          descricao: { type: "string" },
                        },
                        required: ["periodo", "tipo", "severidade", "descricao"],
                      },
                    },
                    crescimento_incomum: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          dimensao: { type: "string", description: "cliente, segmento, UF, etc." },
                          nome: { type: "string" },
                          descricao: { type: "string" },
                        },
                        required: ["dimensao", "nome", "descricao"],
                      },
                    },
                    quedas_tpv: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          contexto: { type: "string" },
                          impacto: { type: "string" },
                          recomendacao: { type: "string" },
                        },
                        required: ["contexto", "impacto", "recomendacao"],
                      },
                    },
                    risco_churn: {
                      type: "object",
                      properties: {
                        nivel: { type: "string", enum: ["baixo", "medio", "alto"] },
                        descricao: { type: "string" },
                        clientes_em_risco: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["nivel", "descricao"],
                    },
                    projecao_receita: {
                      type: "object",
                      properties: {
                        proximos_meses: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              periodo: { type: "string" },
                              base: { type: "number" },
                              otimista: { type: "number" },
                              pessimista: { type: "number" },
                            },
                            required: ["periodo", "base", "otimista", "pessimista"],
                          },
                        },
                        comentario: { type: "string" },
                      },
                      required: ["proximos_meses", "comentario"],
                    },
                    resumo_executivo: { type: "string" },
                  },
                  required: [
                    "anomalias",
                    "crescimento_incomum",
                    "quedas_tpv",
                    "risco_churn",
                    "projecao_receita",
                    "resumo_executivo",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "retornar_analise" } },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      return new Response(
        JSON.stringify({ error: "IA não retornou análise estruturada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = typeof args === "string" ? JSON.parse(args) : args;

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analise-ia error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
