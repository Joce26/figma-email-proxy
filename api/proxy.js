export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") {
    const { platform, endpoint, apiKey } = req.query;
    let targetUrl, headers;
    if (platform === "omnisend") {
      targetUrl = `https://api.omnisend.com/api/${endpoint}`;
      headers = {
        "Authorization": `Omnisend-API-Key ${apiKey}`,
        "Omnisend-Version": "2026-03-15"
      };
    }
    try {
      const response = await fetch(targetUrl, { method: "GET", headers });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
      console.log("GET response", response.status, JSON.stringify(data).substring(0, 1000));
      return res.status(response.status).json(data);
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { platform, endpoint, apiKey, body, method } = req.body;
  if (!platform || !endpoint || !apiKey || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const httpMethod = method || "POST";

  let targetUrl, headers;

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
      "revision": "2026-01-15",
      "Content-Type": "application/vnd.api+json",
      "accept": "application/vnd.api+json"
    };
  } else {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }

  try {
    console.log("Proxy " + httpMethod + " -> " + targetUrl);
    console.log("Body: " + JSON.stringify(body).substring(0, 2000));
    const response = await fetch(targetUrl, {
      method: httpMethod,
      headers,
      body: JSON.stringify(body)
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
    console.log("Proxy response", response.status, JSON.stringify(data).substring(0, 500));
    return res.status(response.status).json(data);
  } catch(err) {
    console.log("Proxy error:", err.message);
    return res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
}
