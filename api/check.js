const crypto = require("crypto");

function validSession(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const raw = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("bryt_session="));
  if (!raw) return false;
  const value = decodeURIComponent(raw.slice("bryt_session=".length));
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [issued, supplied] = parts;
  if (!/^\d{13}$/.test(issued)) return false;
  const age = Date.now() - Number(issued);
  if (age < 0 || age > 12 * 60 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", secret).update(issued).digest("hex");
  if (expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

async function sendTelegram(username) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `🔎 Instagram username candidate\n\n@${username}\n\nStatus: profile returned not found. This is NOT proof of availability; verify manually in Instagram.`
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) return false;
  const data = await response.json();
  return data.ok === true;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!validSession(req)) return res.status(401).json({ error: "Session expired. Unlock the dashboard again." });

  const username = String((req.body || {}).username || "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    return res.status(400).json({ error: "Invalid Instagram username format." });
  }

  try {
    const response = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000)
    });

    if (response.status === 404) {
      let sent = false;
      try { sent = await sendTelegram(username); } catch (_) {}
      return res.status(200).json({
        status: "not_found",
        telegram_sent: sent,
        message: "Profile returned 404: possible candidate only; verify manually."
      });
    }

    if (response.status === 200) {
      return res.status(200).json({
        status: "taken",
        telegram_sent: false,
        message: "Profile page responded successfully; treat username as taken."
      });
    }

    if (response.status === 429 || response.status === 403) {
      return res.status(200).json({
        status: "rate_limited",
        telegram_sent: false,
        message: `Instagram limited or blocked this request (${response.status}). Checking has been paused; not marked available.`
      });
    }

    return res.status(200).json({
      status: "unknown",
      telegram_sent: false,
      message: `Instagram returned HTTP ${response.status}; result is uncertain.`
    });
  } catch (error) {
    return res.status(503).json({
      error: "Instagram or network request failed. Retry this candidate later; it was not marked available."
    });
  }
};
