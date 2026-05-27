// Vercel serverless function — proxies requests to Omnisend and Klaviyo
// Solves CORS restrictions from Figma plugin sandbox

export default async function handler(req, res) {
  // Allow requests from anywhere (Figma plugin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { platform, endpoint, apiKey, body } = req.body;

  if (!platform || !endpoint || !apiKey || !body) {
    return res.status(400).json({ error: "Missing required fields: platform, endpoint, apiKey, body" });
  }

  // Build the target URL based on platform
  let targetUrl;
  let headers;

  if (platform === "omnisend") {
    targetUrl = `https://api.omnisend.com/api/${endpoint}`;
    headers = {
      "Authorization": `Omnisend-API-Key ${apiKey}`,
      "Omnisend-Version": "2026-03-15",
      "Content-Type": "application/json"
    };
  } else if (platform === "klaviyo") {
    targetUrl = `https://a.klaviyo.com/api/${endpoint}`;
    headers = {
      "Authorization": `Klaviyo-API-Key ${apiKey}`,
      "revision": "2024-10-15",
      "Content-Type": "application/json"
    };
  } else {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: `Proxy fetch failed: ${err.message}` });
  }
}
