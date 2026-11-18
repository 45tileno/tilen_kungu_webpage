const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

dotenv.config();

const { query, runMigrations } = require('./db');

const app = express();
const port = process.env.PORT || 3000;
const sessionTtlSeconds = Math.max(300, Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 7));

const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(emailConfig);

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
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.static(path.join(__dirname)));

app.use('/api', async (_req, res, next) => {
  try {
    await runMigrations();
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(503).json({ success: false, message: 'The service is temporarily unavailable.' });
  }
});

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function readSessionToken(req) {
  const token = req.headers['x-session-id'] || req.query.sessionId;
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  await query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'))`,
    [tokenHash, userId, sessionTtlSeconds]
  );
  // Expired rows are disposable; this keeps the table bounded without a background worker.
  await query('DELETE FROM sessions WHERE expires_at < NOW()').catch(error => console.error('Session cleanup failed:', error));
  return token;
}

async function getSession(req) {
  const token = readSessionToken(req);
  if (!token) return null;
  const result = await query(
    `UPDATE sessions
     SET last_seen_at = NOW()
     WHERE token_hash = $1 AND expires_at > NOW()
     RETURNING user_id, expires_at`,
    [hashSessionToken(token)]
  );
  return result.rows[0] || null;
}

async function requireSession(req, res, next) {
  try {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ success: false, message: 'You must be logged in to send a message.' });
    req.session = session;
    next();
  } catch (error) {
    console.error('Error reading session:', error);
    res.status(503).json({ success: false, message: 'Unable to verify your session right now.' });
  }
}

app.get('/api/session', async (req, res) => {
  try {
    const session = await getSession(req);
    return res.json(session ? { authenticated: true, userId: session.user_id } : { authenticated: false });
  } catch (error) {
    console.error('Error checking session:', error);
    return res.status(503).json({ success: false, message: 'Unable to verify your session right now.' });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const token = readSessionToken(req);
    if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [hashSessionToken(token)]);
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(503).json({ success: false, message: 'Unable to log out right now.' });
  }
});

app.post('/api/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!username || !email || !password) return res.status(400).json({ success: false, message: 'Please complete all registration fields.' });
  if (username.length < 3 || username.length > 80) return res.status(400).json({ success: false, message: 'Username must be between 3 and 80 characters.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

  try {
    const existingUser = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1', [username, email]);
    if (existingUser.rowCount > 0) return res.status(409).json({ success: false, message: 'Username or email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    await query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)', [username, email, passwordHash]);
    return res.json({ success: true, message: 'Registration successful. You can now log in.' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Username or email already exists.' });
    console.error('Error registering user:', error);
    return res.status(500).json({ success: false, message: 'Unable to register. Please try again later.' });
  }
});

app.post('/api/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password) return res.status(400).json({ success: false, message: 'Please enter your username and password.' });

  try {
    const userResult = await query('SELECT id, username, email, password_hash FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1', [username]);
    if (userResult.rowCount === 0) return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    const user = userResult.rows[0];
    if (!(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    const sessionId = await createSession(user.id);
    return res.json({ success: true, message: 'Login successful.', sessionId, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Error logging in user:', error);
    return res.status(500).json({ success: false, message: 'Unable to log in. Please try again later.' });
  }
});

app.post('/api/contact', requireSession, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();
  if (!name || !email || !subject || !message) return res.status(400).json({ success: false, message: 'Please fill in all fields.' });

  try {
    const result = await query(
      `INSERT INTO contacts (user_id, name, email, subject, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.session.user_id, name, email, subject, message]
    );
    const mailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';
    const mailTo = process.env.EMAIL_TO || process.env.SMTP_USER || 'tilenvennykungu@gmail.com';
    if (!emailConfig.auth.user || !emailConfig.auth.pass) return res.status(500).json({ success: false, message: 'Your message was saved, but email delivery is not configured. Please ask the site owner to set up SMTP.' });
    await transporter.sendMail({
      from: mailFrom,
      to: mailTo,
      subject: `New contact form message from ${name}`,
      text: `You have a new message from ${name} <${email}>\n\nSubject: ${subject}\n\n${message}`,
      html: `<h2>New contact form message</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
    });
    return res.json({ success: true, message: `Your message was sent successfully and delivered to ${mailTo}.`, id: result.rows[0].id });
  } catch (error) {
    console.error('Error processing contact:', error);
    return res.status(500).json({ success: false, message: 'Unable to process your message. Please try again later.' });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ success: true, status: 'OK', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ success: false, status: 'DEGRADED', database: 'unavailable' });
  }
});

module.exports = app;

if (require.main === module) {
  app.listen(port, () => console.log(`Server is running on http://localhost:${port}`));
}
