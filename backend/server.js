
// backend/server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

// Load .env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS setup (allow frontend origin)
app.use(cors({
  origin: '*'
}));

// Parse JSON bodies
app.use(express.json());

// Health-check route (optional)
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

// POST /api/contact
app.post(
  '/api/contact',

  // Server-side validation & sanitization
  [
    // Honeypot: ignore if 'website' field is populated (bots)
    body('website').custom(value => {
      if (value && value.trim() !== '') {
        throw new Error('Bot detected');
      }
      return true;
    }),

    // Name: required, sanitize
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .escape(),

    // Email: required, valid, normalize
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),

    // Message: required, sanitize
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .escape()
  ],

  async (req, res) => {
    // Run validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If honeypot triggered, send 200 OK but no email
      if (errors.array().some(err => err.msg === 'Bot detected')) {
        return res.status(200).json({ message: 'OK' });
      }
      // Otherwise return validation errors
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    // Extract sanitized data
    const { name, email, message } = req.body;

    // Create Nodemailer transporter
    let transporter;
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } catch (err) {
      console.error('Failed to create transporter:', err);
      return res.status(500).json({ error: 'Mailer setup failed' });
    }

    // Email options
    const mailOptions = {
      from: `"Website Contact" <${process.env.SMTP_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: `New Contact Form Submission from ${name}`,
      text: `
You have a new contact form submission:

Name: ${name}
Email: ${email}
Message:
${message}
      `.trim()
    };

    // Send email
    try {
      await transporter.sendMail(mailOptions);
      return res.status(200).json({ message: 'Email sent successfully' });
    } catch (err) {
      console.error('Error sending email:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
