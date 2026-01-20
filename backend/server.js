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
        // Works immediately without domain verification:
        from: "Website Contact <onboarding@resend.dev>",
        to: process.env.RECIPIENT_EMAIL, // keep your existing env name
        reply_to: email, // so you can reply directly
        subject: subject ? subject : `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject || ""}\n\nMessage:\n${message}`,
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
