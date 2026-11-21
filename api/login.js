const crypto = require("crypto");

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { password } = req.body || {};
  const adminPassword = process.env.PANEL_PASSWORD;
  const secret = process.env.SESSION_SECRET;

  if (!adminPassword || !secret) {
    return res.status(500).json({ error: "PANEL_PASSWORD and SESSION_SECRET must be configured in Vercel." });
  }

  if (typeof password !== "string" || password.length > 200 || password !== adminPassword) {
    return res.status(401).json({ error: "Incorrect panel password." });
  }

  const issued = String(Date.now());
  const signature = sign(issued, secret);
  const cookie = `bryt_session=${issued}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`;
  res.setHeader("Set-Cookie", cookie);
  return res.status(200).json({ ok: true });
};
