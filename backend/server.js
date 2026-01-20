// backend/server.js

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { body, validationResult } = require("express-validator");
const { Resend } = require("resend");

// Load .env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS setup (allow frontend origin)
app.use(
  cors({
    origin: "*",
  }),
);

// Parse JSON bodies
app.use(express.json());

// Health-check route (optional)
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// Escape helper (prevents HTML injection)
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Create Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/contact
app.post(
  "/api/contact",

  // Server-side validation & sanitization
  [
    // Honeypot: ignore if 'website' field is populated (bots)
    body("website").custom((value) => {
      if (value && value.trim() !== "") {
        throw new Error("Bot detected");
      }
      return true;
    }),

    // Name: required, sanitize
    body("name").trim().notEmpty().withMessage("Name is required").escape(),

    // Email: required, valid, normalize
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),

    // Message: required, sanitize
    body("message")
      .trim()
      .notEmpty()
      .withMessage("Message is required")
      .escape(),
  ],

  async (req, res) => {
    // Run validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If honeypot triggered, send 200 OK but no email
      if (errors.array().some((err) => err.msg === "Bot detected")) {
        return res.status(200).json({ message: "OK" });
      }
      // Otherwise return validation errors
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, subject, message } = req.body;

    try {
      await resend.emails.send({
        from: "Website Contact <onboarding@resend.dev>",
        to: process.env.RECIPIENT_EMAIL,
        reply_to: email,
        subject: subject ? `📩 ${subject}` : `📩 New message from ${name}`,

        // Plain-text fallback
        text:
          `New contact form message\n\n` +
          `Name: ${name}\n` +
          `Email: ${email}\n` +
          `Subject: ${subject || "-"}\n\n` +
          `Message:\n${message}\n`,

        // HTML version (Gmail will show this nicely)
        html: `
          <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111;">
            <h2 style="margin:0 0 12px;">New Contact Form Message</h2>

            <table style="border-collapse:collapse; width:100%; max-width:640px;">
              <tr>
                <td style="padding:8px 10px; border:1px solid #ddd; width:140px;"><b>Name</b></td>
                <td style="padding:8px 10px; border:1px solid #ddd;">${escapeHtml(
                  name,
                )}</td>
              </tr>
              <tr>
                <td style="padding:8px 10px; border:1px solid #ddd;"><b>Email</b></td>
                <td style="padding:8px 10px; border:1px solid #ddd;">
                  <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 10px; border:1px solid #ddd;"><b>Subject</b></td>
                <td style="padding:8px 10px; border:1px solid #ddd;">${escapeHtml(
                  subject || "-",
                )}</td>
              </tr>
            </table>

            <h3 style="margin:18px 0 8px;">Message</h3>
            <div style="padding:12px; border:1px solid #ddd; border-radius:8px; background:#f9f9f9; white-space:pre-wrap;">
${escapeHtml(message)}
            </div>

            <p style="margin:18px 0 0; font-size:12px; color:#666;">
              Reply to this email to respond to <b>${escapeHtml(name)}</b>.
            </p>
          </div>
        `,
      });

      return res.status(200).json({ message: "Email sent successfully" });
    } catch (err) {
      console.error("Resend error:", err);
      return res.status(500).json({ error: "Failed to send email" });
    }
  },
);

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
