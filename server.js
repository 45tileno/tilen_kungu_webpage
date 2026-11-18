const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const pgConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'contacts_db',
};

const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

console.log('Postgres config:', {
  host: pgConfig.host,
  port: pgConfig.port,
  user: pgConfig.user,
  passwordType: typeof pgConfig.password,
  database: pgConfig.database,
});
console.log('Email config:', {
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  user: emailConfig.auth.user ? 'configured' : 'missing',
  pass: emailConfig.auth.pass ? 'configured' : 'missing',
  to: process.env.EMAIL_TO || 'not configured',
});

const pool = new Pool(pgConfig);
const transporter = nodemailer.createTransport(emailConfig);

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

initDb().catch(error => {
  console.error('Error initializing database:', error);
});

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-session-id'],
}));
app.options('*', cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-session-id'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const sessions = new Map();

function createSession(userId) {
  const sessionId = crypto.randomBytes(24).toString('hex');
  sessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

function getSession(req) {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

function requireSession(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ success: false, message: 'You must be logged in to send a message.' });
  }
  req.session = session;
  next();
}

app.get('/api/session', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.json({ authenticated: false });
  }
  return res.json({ authenticated: true, userId: session.userId });
});

app.post('/api/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please complete all registration fields.' });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
      [username, email, passwordHash]
    );

    return res.json({ success: true, message: 'Registration successful. You can now log in.' });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ success: false, message: 'Unable to register. Please try again later.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Please enter your username and password.' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = userResult.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const sessionId = createSession(user.id);
    return res.json({ success: true, message: 'Login successful.', sessionId, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Error logging in user:', error);
    return res.status(500).json({ success: false, message: 'Unable to log in. Please try again later.' });
  }
});

app.post('/api/contact', requireSession, async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
  }

  try {
    const insertQuery = `
      INSERT INTO contacts (name, email, subject, message, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `;
    const result = await pool.query(insertQuery, [name, email, subject, message]);

    const mailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';
    const mailTo = process.env.EMAIL_TO || process.env.SMTP_USER || 'tilenvennykungu@gmail.com';
    const mailSubject = `New contact form message from ${name}`;
    const mailText = `You have a new message from ${name} <${email}>\n\nSubject: ${subject}\n\n${message}`;
    const mailHtml = `
      <h2>New contact form message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `;

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.error('SMTP credentials not configured. Cannot send contact email.');
      return res.status(500).json({ success: false, message: 'Your message was saved, but email delivery is not configured. Please ask the site owner to set up SMTP.' });
    }

    try {
      await transporter.sendMail({
        from: mailFrom,
        to: mailTo,
        subject: mailSubject,
        text: mailText,
        html: mailHtml,
      });
      console.log('Notification email sent to', mailTo);
    } catch (mailError) {
      console.error('Error sending notification email:', mailError);
      return res.status(500).json({ success: false, message: 'Your message was saved, but email delivery failed. Please check SMTP settings and try again.' });
    }

    return res.json({ success: true, message: `Your message was sent successfully and delivered to ${mailTo}.`, id: result.rows[0].id });
  } catch (error) {
    console.error('Error inserting contact:', error);
    return res.status(500).json({ success: false, message: 'Unable to save message. Please try again later.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'OK' });
});

// Export the app for Vercel's serverless Node runtime.
module.exports = app;

// Keep local development working without starting a listener during Vercel imports.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}
