 import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* --------------------- OAUTH DISCORD --------------------- */
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
    console.error("Error Discord:", e);
    res.status(500).json({ error: "Error al validar Discord" });
  }
});

/* --------------------- ENVIO DE NOMINACIONES --------------------- */
app.post("/send", async (req, res) => {
  try {
    const { user, nominations } = req.body;

    if (!user || !nominations) {
      return res.status(400).json({ ok: false, message: "Faltan datos" });
    }

    // Configuración del transporte de Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS // contraseña de aplicación si 2FA
      }
    });

    // Construir el contenido HTML del correo
    const htmlContent = `
      <h2>Nuevas nominaciones de Discord</h2>
      <p><b>ID de usuario:</b> ${user.id}</p>
      <p><b>Usuario:</b> ${user.username}</p>
      <hr>
      <h3>Respuestas:</h3>
      <ul>
        <li><b>Mejor jugador:</b> ${nominations.mejorJugador}</li>
        <li><b>Mejor evento:</b> ${nominations.mejorEvento}</li>
        <li><b>Juego favorito:</b> ${nominations.juegoFavorito}</li>
        <li><b>MVP:</b> ${nominations.mvp}</li>
        <li><b>Usuario favorito:</b> ${nominations.usuarioFavorito}</li>
        <li><b>Artista del año:</b> ${nominations.artistaAno}</li>
        <li><b>Dibujo del año:</b> <a href="${nominations.dibujoAno}">${nominations.dibujoAno}</a></li>
        <li><b>Mejor clip:</b> <a href="${nominations.mejorClip}">${nominations.mejorClip}</a></li>
      </ul>
    `;

    // Enviar correo
    await transporter.sendMail({
      from: `"Awards 2025" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // puedes poner otro correo si quieres
      subject: `Nominaciones de ${user.username}`,
      html: htmlContent
    });

    res.json({ ok: true, message: "Correo enviado correctamente" });

  } catch (err) {
    console.error("Error al enviar correo:", err);
    res.status(500).json({ ok: false, message: "Error al enviar correo" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor corriendo en puerto", process.env.PORT || 3000);
});
 
