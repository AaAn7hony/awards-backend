import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import EmailJS from "@emailjs/nodejs";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const emailJSClient = new EmailJS();

/* ===== DISCORD OAUTH ===== */
app.post("/oauth/discord", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) return res.status(400).json({ error: "Código faltante" });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI
      })
    });

    const token = await tokenRes.json();
    if (!token.access_token) return res.status(400).json({ error: "Token inválido" });

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });

    const user = await userRes.json();

    res.json({
      id: user.id,
      username: `${user.username}#${user.discriminator}`
    });

  } catch (err) {
    console.error("DISCORD ERROR:", err);
    res.status(500).json({ error: "Error Discord" });
  }
});

/* ===== ENVIAR EMAIL ===== */
app.post("/send", async (req, res) => {
  try {
    const { user, nominations } = req.body;

    if (!user || !nominations) return res.status(400).json({ error: "Datos incompletos" });

    const templateParams = {
      user_id: user.id,
      username: user.username,
      nominations: JSON.stringify(nominations, null, 2)
    };

    await emailJSClient.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams,
      process.env.EMAILJS_PUBLIC_KEY
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("EMAILJS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===== START SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto", PORT)); 
