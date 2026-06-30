// /api/cookie-image.js  — Vercel serverless function (Node.js runtime)
//
// Holds your OpenAI key server-side and forwards image requests to OpenAI.
// The browser only ever talks to THIS endpoint; the key is never exposed.
//
// Required env var (set in Vercel → Project → Settings → Environment Variables):
//   OPENAI_API_KEY = sk-...your key...
//
// Optional env var:
//   ALLOWED_ORIGIN = https://your-site.vercel.app   (locks the API to your site)

export default async function handler(req, res) {
  // --- CORS: allow your site (or all, if you didn't set ALLOWED_ORIGIN) ---
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Browsers send a preflight OPTIONS request first — answer it.
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Server is missing OPENAI_API_KEY" });
  }

  try {
    // req.body is auto-parsed by Vercel when Content-Type is application/json,
    // but parse defensively in case it arrives as a string.
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const prompt = (body.prompt || "").toString().slice(0, 1500); // cap length
    const size = ["1024x1024", "1024x1536", "1536x1024"].includes(body.size)
      ? body.size
      : "1024x1024";

    if (!prompt.trim()) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,
        n: 1,
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      // Surface a safe error message, not the raw key/headers.
      const msg = (data && data.error && data.error.message) || "Image generation failed";
      return res.status(openaiRes.status).json({ error: msg });
    }

    // gpt-image-1 returns { data: [{ b64_json }] }. Pass it straight back;
    // the front-end already knows how to read data[0].b64_json.
    return res.status(200).json(data);
  } catch (err) {
    console.error("cookie-image error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
