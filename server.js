import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

  } catch (e) {
    res.status(500).json({ error: "Error Discord" });
  }
});

app.post("/send", async (req, res) => {
  const { user, nominations } = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: "Awards 2025",
    to: process.env.GMAIL_USER,
    subject: "Nueva nominación",
    html: `
      <p><b>ID:</b> ${user.id}</p>
      <p><b>Usuario:</b> ${user.username}</p>
      <pre>${JSON.stringify(nominations, null, 2)}</pre>
    `
  });

  res.json({ ok: true });
});

app.listen(process.env.PORT || 3000);