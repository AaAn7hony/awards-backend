 import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(cors({ origin: "*" }));
app.use(express.json());

/* ===== DISCORD OAUTH ===== */
app.post("/oauth/discord", async (req, res) => {
  try {
    const { code } = req.body;

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

    if (!token.access_token) {
      return res.status(400).json({ error: "Token inválido" });
    }

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
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

/* ===== SEND MAIL ===== */
app.post("/send", async (req, res) => {
  try {
    const { user, nominations } = req.body;

    if (!user || !nominations) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS // APP PASSWORD
      }
    });

    await transporter.verify(); // 🔥 fuerza error si Gmail no acepta login

    await transporter.sendMail({
      from: `"Awards 2025" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: "Nueva nominación",
      html: `
        <h2>Nueva nominación</h2>
        <p><b>ID Discord:</b> ${user.id}</p>
        <p><b>Usuario:</b> ${user.username}</p>
        <hr>
        <pre>${JSON.stringify(nominations, null, 2)}</pre>
      `
    });

    res.json({ ok: true });

  } catch (err) {
    console.error("MAIL ERROR:", err);
    res.status(500).json({ error: "No se pudo enviar el mail" });
  }
});

/* ===== START ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
