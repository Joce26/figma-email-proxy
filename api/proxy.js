// © 2026 Jocelyn Abel. All rights reserved.
// SliceNSend | figma-email-proxy.vercel.app
// Unauthorized copying, distribution, or modification of this software
// is strictly prohibited without written permission from the author.

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }
};

// ── License validation ─────────────────────────────────────────────────────
async function validateLicense(licenseKey) {
  if (!licenseKey) return { valid: false, reason: "No license key provided. Please enter your SliceNSend license key in Settings." };
  const url = process.env.SUPABASE_URL + "/rest/v1/licenses?license_key=eq." + encodeURIComponent(licenseKey) + "&active=eq.true&select=id,plan,name";
  try {
    const res = await fetch(url, {
      headers: {
        "apikey": process.env.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + process.env.SUPABASE_ANON_KEY
      }
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return { valid: false, reason: "Invalid or inactive license key. Please check your key in Settings." };
    return { valid: true, license: data[0] };
  } catch(err) {
    return { valid: false, reason: "License check failed: " + err.message };
  }
}

// ── Omnisend template builder ──────────────────────────────────────────────
function buildOmnisendTemplate(templateName, imageUrls) {
  var sections = [];
  for (var i = 0; i < imageUrls.length; i++) {
    var base = "aaa00000000000000000";
    var n = ("0" + (i + 1).toString(16)).slice(-2);
    sections.push({
      id: base + n + "01",
      visibility: { isMobileVisible: true, isDesktopVisible: true },
      rows: [{
        id: base + n + "02",
        columns: [{
          id: base + n + "03",
          width: "582px",
          blocks: [{
            id: base + n + "04",
            type: "image",
            image: {
              source: imageUrls[i].url,
              link: "",
              altText: imageUrls[i].name,
              width: 9999,
              resizeWidth: 552
            },
            styleProperties: {
              paddingLeft: "0px", paddingRight: "0px",
              paddingTop: "0px", paddingBottom: "0px",
              alignment: "center"
            }
          }]
        }]
      }],
      styleProperties: {
        paddingLeft: "24px", paddingRight: "24px",
        paddingTop: "0px", paddingBottom: "0px",
        backgroundColor: "#FFFFFF"
      }
    });
  }

  return {
    name: templateName,
    channel: "email",
    templateProperties: {
      backgroundColor: "#F4F4F4",
      contentWidth: "600px",
      borderRadius: "0px",
      fontFamily: "Arial, sans-serif",
      contentPaddingTop: "0px",
      contentPaddingBottom: "0px",
      contentPaddingLeft: "0px",
      contentPaddingRight: "0px"
    },
    blocks: [{
      id: "aaa000000000000000000001",
      type: "footer",
      styleProperties: {
        backgroundColor: "#F4F4F4",
        paddingTop: "16px",
        paddingBottom: "16px"
      }
    }],
    textPresets: [
      { id: "heading_large", name: "Heading Large", styles: { fontFamily: "Arial, sans-serif", fontSize: "36px", color: "#000000", lineHeight: "125%" } },
      { id: "heading_medium", name: "Heading Medium", styles: { fontFamily: "Arial, sans-serif", fontSize: "30px", color: "#000000", lineHeight: "125%" } },
      { id: "heading_small", name: "Heading Small", styles: { fontFamily: "Arial, sans-serif", fontSize: "24px", color: "#000000", lineHeight: "125%" } },
      { id: "paragraph", name: "Paragraph", styles: { fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#000000", lineHeight: "150%" } },
      { id: "footnote", name: "Footnote", styles: { fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#000000", lineHeight: "150%" } }
    ],
    sections: sections
  };
}

// ── Klaviyo template builder ───────────────────────────────────────────────
function buildKlaviyoTemplate(templateName, imageUrls) {
  var imageRows = "";
  for (var i = 0; i < imageUrls.length; i++) {
    imageRows += '<tr>\n';
    imageRows += '  <td align="center" style="padding:0;margin:0;" data-klaviyo-region="true" data-klaviyo-region-width-pixels="600">\n';
    imageRows += '    <div class="klaviyo-block klaviyo-image-block">\n';
    imageRows += '      <img src="' + imageUrls[i].url + '" alt="' + imageUrls[i].name + '" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" />\n';
    imageRows += '    </div>\n';
    imageRows += '  </td>\n</tr>\n';
  }

  var html = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n';
  html += '<html xmlns="http://www.w3.org/1999/xhtml">\n<head>\n';
  html += '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n';
  html += '<title>' + templateName + '</title>\n';
  html += '<style type="text/css">\n';
  html += '  body { margin:0; padding:0; background-color:#f4f4f4; }\n';
  html += '  img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }\n';
  html += '  table { border-collapse:collapse !important; }\n';
  html += '  @media only screen and (max-width:600px) { .container { width:100% !important; } img { width:100% !important; height:auto !important; } }\n';
  html += '</style>\n</head>\n';
  html += '<body style="margin:0;padding:0;background-color:#f4f4f4;">\n';
  html += '<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f4;">\n';
  html += '  <tr><td align="center" style="padding:0;">\n';
  html += '    <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;">\n';
  html += imageRows;
  html += '    </table>\n  </td></tr>\n</table>\n</body>\n</html>';

  return { data: { type: "template", attributes: { name: templateName, editor_type: "USER_DRAGGABLE", html: html } } };
}

// ── Main handler ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET ──────────────────────────────────────────────────────────────────
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
      return res.status(400).json({ error: "Unknown platform" });
    }
    try {
      const response = await fetch(targetUrl, { method: "GET", headers });
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
      return res.status(response.status).json(data);
    } catch(err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { platform, action, licenseKey, apiKey, endpoint, body, method,
          imageData, imageName, imageUrls, templateName, campaignName,
          subject, previewText, senderName, senderEmail } = req.body;

  if (!platform || !apiKey) return res.status(400).json({ error: "Missing platform or apiKey" });

  // ── Validate license on every request ────────────────────────────────────
  const license = await validateLicense(licenseKey);
  if (!license.valid) {
    console.log("License rejected:", license.reason);
    return res.status(403).json({ error: license.reason });
  }
  console.log("License valid:", license.license.name, "-", license.license.plan);

  // ── Image upload ──────────────────────────────────────────────────────────
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
          headers: { "Authorization": `Omnisend-API-Key ${apiKey}`, "Omnisend-Version": "2026-03-15" },
          body: formData
        });
        const text = await uploadRes.text();
        let data; try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
        console.log("Omnisend image upload:", uploadRes.status, JSON.stringify(data).substring(0, 200));
        return res.status(uploadRes.status).json(data);
      } catch(err) { return res.status(500).json({ error: "Image upload error: " + err.message }); }
    }

    if (platform === "klaviyo") {
      try {
        const uploadRes = await fetch("https://a.klaviyo.com/api/images", {
          method: "POST",
          headers: { "Authorization": `Klaviyo-API-Key ${apiKey}`, "revision": "2026-01-15", "Content-Type": "application/vnd.api+json", "accept": "application/vnd.api+json" },
          body: JSON.stringify({ data: { type: "image", attributes: { name: imageName || "email-image", import_from_url: imageData } } })
        });
        const text = await uploadRes.text();
        let data; try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
        console.log("Klaviyo image upload:", uploadRes.status, JSON.stringify(data).substring(0, 200));
        return res.status(uploadRes.status).json(data);
      } catch(err) { return res.status(500).json({ error: "Klaviyo image upload error: " + err.message }); }
    }
  }

  // ── Publish template/campaign ─────────────────────────────────────────────
  if (action === "publish") {
    console.log("Publish for", platform, "-", templateName);

    if (platform === "omnisend") {
      try {
        // Step 1: Create template
        const templateBody = buildOmnisendTemplate(templateName || campaignName, imageUrls || []);
        const tres = await fetch("https://api.omnisend.com/api/email-templates", {
          method: "POST",
          headers: { "Authorization": `Omnisend-API-Key ${apiKey}`, "Omnisend-Version": "2026-03-15", "Content-Type": "application/json" },
          body: JSON.stringify(templateBody)
        });
        const ttext = await tres.text();
        let tdata; try { tdata = JSON.parse(ttext); } catch(e) { tdata = { raw: ttext }; }
        console.log("Omnisend template:", tres.status, JSON.stringify(tdata).substring(0, 1000));
        console.log("Template body sent:", JSON.stringify(templateBody).substring(0, 1000));

        let templateId = tdata.id || tdata.templateID || null;
        if (!tres.ok) {
          // Fallback to HTML import
          const html = buildFallbackHtml(templateName, imageUrls || []);
          const t2 = await fetch("https://api.omnisend.com/api/email-templates/import", {
            method: "POST",
            headers: { "Authorization": `Omnisend-API-Key ${apiKey}`, "Omnisend-Version": "2026-03-15", "Content-Type": "application/json" },
            body: JSON.stringify({ name: templateName, html: html })
          });
          const t2text = await t2.text();
          let t2data; try { t2data = JSON.parse(t2text); } catch(e) { t2data = { raw: t2text }; }
          templateId = t2data.id || t2data.templateID || null;
        }

        // Step 2: Create campaign
        const emailContent = {
          subject: subject, senderName: senderName || "My Store",
          senderEmail: senderEmail || "", fromEmail: senderEmail || ""
        };
        if (templateId) emailContent.templateID = templateId;
        if (previewText) emailContent.previewText = previewText;

        const cres = await fetch("https://api.omnisend.com/api/campaigns", {
          method: "POST",
          headers: { "Authorization": `Omnisend-API-Key ${apiKey}`, "Omnisend-Version": "2026-03-15", "Content-Type": "application/json" },
          body: JSON.stringify({ name: campaignName, channel: "email", type: "regular", language: "en_US", content: { email: emailContent } })
        });
        const ctext = await cres.text();
        let cdata; try { cdata = JSON.parse(ctext); } catch(e) { cdata = { raw: ctext }; }
        console.log("Omnisend campaign:", cres.status, JSON.stringify(cdata).substring(0, 200));

        if (!cres.ok) return res.status(cres.status).json({ error: "Campaign " + cres.status + ": " + JSON.stringify(cdata).substring(0, 400) });
        return res.status(200).json({ success: true });
      } catch(err) { return res.status(500).json({ error: "Omnisend publish error: " + err.message }); }
    }

    if (platform === "klaviyo") {
      try {
        const klaviyoBody = buildKlaviyoTemplate(templateName, imageUrls || []);
        const tres = await fetch("https://a.klaviyo.com/api/templates", {
          method: "POST",
          headers: { "Authorization": `Klaviyo-API-Key ${apiKey}`, "revision": "2026-01-15", "Content-Type": "application/vnd.api+json", "accept": "application/vnd.api+json" },
          body: JSON.stringify(klaviyoBody)
        });
        const ttext = await tres.text();
        let tdata; try { tdata = JSON.parse(ttext); } catch(e) { tdata = { raw: ttext }; }
        console.log("Klaviyo template:", tres.status, JSON.stringify(tdata).substring(0, 200));

        if (!tres.ok) return res.status(tres.status).json({ error: "Klaviyo template " + tres.status + ": " + JSON.stringify(tdata).substring(0, 400) });
        const templateId = tdata.data && tdata.data.id;
        return res.status(200).json({ success: true, templateId: templateId });
      } catch(err) { return res.status(500).json({ error: "Klaviyo publish error: " + err.message }); }
    }

    return res.status(400).json({ error: "Unknown platform: " + platform });
  }

  // ── Legacy pass-through proxy ─────────────────────────────────────────────
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
  const httpMethod = method || "POST";
  let targetUrl, headers;
  if (platform === "omnisend") {
    targetUrl = `https://api.omnisend.com/api/${endpoint}`;
    headers = { "Authorization": `Omnisend-API-Key ${apiKey}`, "Omnisend-Version": "2026-03-15", "Content-Type": "application/json" };
  } else if (platform === "klaviyo") {
    targetUrl = `https://a.klaviyo.com/api/${endpoint}`;
    headers = { "Authorization": `Klaviyo-API-Key ${apiKey}`, "revision": req.body.revision || "2026-01-15", "Content-Type": "application/vnd.api+json", "accept": "application/vnd.api+json" };
  } else { return res.status(400).json({ error: "Unknown platform" }); }

  try {
    const fetchOptions = { method: httpMethod, headers };
    if (body && ["POST","PUT","PATCH"].includes(httpMethod)) fetchOptions.body = JSON.stringify(body);
    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
    return res.status(response.status).json(data);
  } catch(err) { return res.status(500).json({ error: "Proxy error: " + err.message }); }
}

function buildFallbackHtml(templateName, imageUrls) {
  var rows = imageUrls.map(function(img) {
    return '<tr><td align="center" style="padding:0;"><img src="' + img.url + '" alt="' + img.name + '" width="600" style="display:block;width:100%;max-width:600px;height:auto;" /></td></tr>';
  }).join("\n");
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + templateName + '</title></head><body style="margin:0;padding:0;background:#f4f4f4;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;">' + rows + '</table></td></tr></table></body></html>';
}
