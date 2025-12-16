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

    if (!code) {
      return res.status(400).json({ error: "Código faltante" });
    }

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

/* ===== SEND MAIL (GMAIL SSL 465) ===== */
app.post("/send", async (req, res) => {
  try {
    console.log("BODY RECIBIDO:", req.body);

    const { user, nominations } = req.body;

    if (!user || !user.id || !user.username) {
      return res.status(400).json({ error: "Usuario inválido" });
    }

    if (!nominations || Object.keys(nominations).length === 0) {
      return res.status(400).json({ error: "Nominaciones vacías" });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      throw new Error("Variables de Gmail no definidas");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // 🔥 CLAVE PARA RENDER
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS // APP PASSWORD
      }
    });

    await transporter.verify(); // fuerza error si no conecta

    await transporter.sendMail({
      from: `"Awards 2025" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: "Nueva nominación - AWARDS 2025",
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
    res.status(500).json({
      error: "Error enviando correo",
      detail: err.message
    });
  }
});

/* ===== START SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
 
