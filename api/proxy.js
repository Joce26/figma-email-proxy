// © 2026 Jocelyn Abel. All rights reserved.
// SliceNSend | figma-email-proxy.vercel.app
// Unauthorized copying, distribution, or modification of this software
// is strictly prohibited without written permission from the author.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET handler ────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { platform, endpoint, apiKey } = req.query;
    let targetUrl, headers;

    if (platform === "omnisend") {
      targetUrl = `https://api.omnisend.com/api/${endpoint}`;
      headers = { "Authorization": `Omnisend-API-Key ${apiKey}`, "Omnisend-Version": "2026-03-15" };
    } else if (platform === "klaviyo") {
      targetUrl = `https://a.klaviyo.com/api/${endpoint}`;
      headers = { "Authorization": `Klaviyo-API-Key ${apiKey}`, "revision": "2026-01-15", "accept": "application/vnd.api+json" };
    } else {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }

    try {
      const response = await fetch(targetUrl, { method: "GET", headers });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { platform, endpoint, apiKey, body, method, action, imageData, imageName } = req.body;
  if (!platform || !apiKey) return res.status(400).json({ error: "Missing required fields" });

  // ── Image upload action ────────────────────────────────────────────────────
  if (action === "uploadImage") {
    console.log("Image upload for", platform, "-", imageName);

    if (platform === "omnisend") {
      try {
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const formData = new FormData();
        const blob = new Blob([buffer], { type: "image/png" });
        formData.append("file", blob, (imageName || "image") + ".png");

        const uploadRes = await fetch("https://api.omnisend.com/api/images/upload", {
          method: "POST",
          headers: {
            "Authorization": `Omnisend-API-Key ${apiKey}`,
            "Omnisend-Version": "2026-03-15"
            // No Content-Type — let fetch set multipart boundary automatically
          },
          body: formData
        });

        const text = await uploadRes.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
        console.log("Omnisend image upload:", uploadRes.status, JSON.stringify(data).substring(0, 300));
        return res.status(uploadRes.status).json(data);
      } catch (err) {
        return res.status(500).json({ error: "Omnisend image upload error: " + err.message });
      }
    }

    if (platform === "klaviyo") {
      try {
        const klaviyoBody = {
          data: {
            type: "image",
            attributes: {
              name: imageName || "email-image",
              import_from_url: imageData  // Klaviyo accepts base64 data URI directly
            }
          }
        };

        const uploadRes = await fetch("https://a.klaviyo.com/api/images", {
          method: "POST",
          headers: {
            "Authorization": `Klaviyo-API-Key ${apiKey}`,
            "revision": "2026-01-15",
            "Content-Type": "application/vnd.api+json",
            "accept": "application/vnd.api+json"
          },
          body: JSON.stringify(klaviyoBody)
        });

        const text = await uploadRes.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
        console.log("Klaviyo image upload:", uploadRes.status, JSON.stringify(data).substring(0, 300));
        return res.status(uploadRes.status).json(data);
      } catch (err) {
        return res.status(500).json({ error: "Klaviyo image upload error: " + err.message });
      }
    }

    return res.status(400).json({ error: `Image upload not supported for platform: ${platform}` });
  }

  // ── Regular proxy ──────────────────────────────────────────────────────────
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

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
      "revision": req.body.revision || "2026-01-15",
      "Content-Type": "application/vnd.api+json",
      "accept": "application/vnd.api+json"
    };
  } else {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }

  try {
    console.log("Proxy " + httpMethod + " -> " + targetUrl);
    if (body) console.log("Body:", JSON.stringify(body).substring(0, 2000));

    const fetchOptions = { method: httpMethod, headers };
    if (body && (httpMethod === "POST" || httpMethod === "PUT" || httpMethod === "PATCH")) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
    console.log("Proxy response", response.status, JSON.stringify(data).substring(0, 500));
    return res.status(response.status).json(data);
  } catch (err) {
    console.log("Proxy error:", err.message);
    return res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
}
