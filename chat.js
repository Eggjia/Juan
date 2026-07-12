module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL || "openai/gpt-oss-120b:free";

  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
  }

  const { message } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.origin || "https://vercel.app",
        "X-Title": "胰島素與葡萄糖調節模擬器"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: [
              "你是高中生物課的 AI 家教。",
              "你會用繁體中文回答，內容要簡潔、準確、適合高中生。",
              "你只針對胰島素、葡萄糖、血糖調節、細胞吸收與本模擬器操作情境提供教學說明。",
              "這是教學用簡化模型，不可提供醫療診斷、用藥或治療建議。"
            ].join("\n")
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7
      })
    });

    const data = await openRouterResponse.json().catch(() => ({}));

    if (!openRouterResponse.ok) {
      const messageFromApi = data.error?.message || data.message || "OpenRouter request failed";
      return res.status(openRouterResponse.status).json({ error: messageFromApi });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({ error: "No reply from AI model" });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: "Failed to call OpenRouter" });
  }
};
