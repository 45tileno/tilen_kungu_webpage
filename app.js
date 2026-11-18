const apiBase = '';
const sessionKey = 'mywebpageSessionId';
const menuButton = document.querySelector('.menu-toggle');
const siteMenu = document.querySelector('#site-menu');
const header = document.querySelector('[data-header]');
const loginNavLink = document.querySelector('#loginNavLink');
const logoutButton = document.querySelector('#logoutButton');
const authMessage = document.querySelector('#authMessage');
const contactForm = document.querySelector('#contactForm');
const formMessage = document.querySelector('#formMessage');

function getSessionId() { return localStorage.getItem(sessionKey); }
function setSessionId(value) { value ? localStorage.setItem(sessionKey, value) : localStorage.removeItem(sessionKey); }
function setFormMessage(message, type = 'error') { if (!formMessage) return; formMessage.textContent = message; formMessage.className = `form-status ${type}`; }

function closeMenu() {
  siteMenu?.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
}
menuButton?.addEventListener('click', () => {
  const open = siteMenu.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
});
document.querySelectorAll('#site-menu a').forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('scroll', () => header?.classList.toggle('is-scrolled', window.scrollY > 8), { passive: true });

const sectionLinks = [...document.querySelectorAll('.site-menu a[href^="#"]')];
const sections = sectionLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  sectionLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`));
}), { rootMargin: '-35% 0px -55% 0px' });
sections.forEach(section => observer.observe(section));

const images = [...document.querySelectorAll('.hero-image')];
let imageIndex = 0;
if (images.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.setInterval(() => {
    images[imageIndex].classList.remove('is-active');
    imageIndex = (imageIndex + 1) % images.length;
    images[imageIndex].classList.add('is-active');
  }, 5000);
}

function updateAuthUI(authenticated) {
  loginNavLink?.classList.toggle('is-hidden', authenticated);
  logoutButton?.classList.toggle('is-hidden', !authenticated);
  if (authMessage) {
    authMessage.textContent = authenticated ? 'You are logged in. You can send a message below.' : 'Please log in before sending a message.';
    authMessage.className = `form-status ${authenticated ? 'success' : 'error'}`;
  }
}
async function checkAuth() {
  const sessionId = getSessionId();
  if (!sessionId) return updateAuthUI(false);
  try {
    const response = await fetch(`${apiBase}/api/session?sessionId=${encodeURIComponent(sessionId)}`);
    const data = await response.json();
    if (!data.authenticated) setSessionId(null);
    updateAuthUI(Boolean(data.authenticated));
  } catch { updateAuthUI(false); }
}
async function logout() {
  const sessionId = getSessionId();
  try { if (sessionId) await fetch(`${apiBase}/api/logout`, { method: 'POST', headers: { 'x-session-id': sessionId } }); } finally { setSessionId(null); updateAuthUI(false); window.location.href = 'login_register.html'; }
}
logoutButton?.addEventListener('click', logout);

contactForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const sessionId = getSessionId();
  if (!sessionId) return setFormMessage('Please log in first, then return here to send your message.');
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const formData = Object.fromEntries(new FormData(contactForm).entries());
  if (Object.values(formData).some(value => !String(value).trim())) return setFormMessage('Please complete all fields before submitting.');
  submitButton.disabled = true;
  submitButton.innerHTML = 'Sending…';
  try {
    const response = await fetch(`${apiBase}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId }, body: JSON.stringify(formData) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to send your message.');
    setFormMessage(result.message || 'Your message was sent successfully.', 'success');
    contactForm.reset();
  } catch (error) { setFormMessage(error.message || 'Unable to send your message right now.'); }
  finally { submitButton.disabled = false; submitButton.innerHTML = 'Send message <span aria-hidden="true">↗</span>'; }
});
checkAuth();

const chatPanel = document.querySelector('[data-chat-panel]');
const chatMessages = document.querySelector('[data-chat-messages]');
const chatForm = document.querySelector('[data-chat-form]');
const chatInput = document.querySelector('#chatInput');
const chatOpeners = document.querySelectorAll('[data-open-chat]');
const chatCloser = document.querySelector('[data-close-chat]');
const qaPrompts = document.querySelectorAll('[data-question]');

const qaAnswers = [
  { keys: ['who is tilen', 'what does tilen do', 'about tilen', 'experience'], answer: 'Tilen Kungu is an IT Specialist and Software Developer based in Nairobi, Kenya. His experience spans technical support, full-stack development, system testing, network administration, database management, hardware support, and infrastructure.' },
  { keys: ['lottoops', 'inventory platform', 'inventory system'], answer: 'LottoOps is a secure inventory management platform Tilen architected and deployed. It includes real-time logging, duplicate checking, role-based access control, scanner-ready data entry, and dynamic stock status tracking, using React/Next.js with Firestore and PostgreSQL.' },
  { keys: ['services', 'offer', 'help with', 'do you provide'], answer: 'The website covers web development, practical web apps, networks and security, CCTV systems, applications, creative work, hardware support, and testing and operations.' },
  { keys: ['website', 'this site', 'portfolio'], answer: 'This is Tilen Kungu’s portfolio and IT-services website. You can explore his capabilities, selected work, services, testimonials, and contact options.' },
  { keys: ['contact', 'reach', 'hire', 'start a project', 'whatsapp'], answer: 'Use the contact form on this page or the WhatsApp button for a quick conversation. You can also log in first if you want to submit the protected contact form.' },
  { keys: ['location', 'where', 'nairobi', 'kenya'], answer: 'Tilen is based in Nairobi, Kenya, and can support local and remote technology projects.' },
  { keys: ['technology', 'stack', 'skills', 'tools'], answer: 'Resume-backed experience includes React, Next.js, Firestore, PostgreSQL, Firebase, database management, network administration, system testing, API integration, debugging, and hardware support.' },
];

function answerQuestion(question) {
  const normalized = question.toLowerCase().trim();
  const match = qaAnswers.find(item => item.keys.some(key => normalized.includes(key)));
  return match?.answer || 'I can answer questions about Tilen, his resume-backed experience, services, this website, and LottoOps. For a specific project quote or technical detail not listed here, please use the contact form or WhatsApp.';
}
function appendChatMessage(text, role) {
  if (!chatMessages) return;
  const message = document.createElement('div');
  message.className = `chat-message ${role}`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function openChat(question) {
  if (!chatPanel) return;
  chatPanel.classList.remove('is-hidden');
  document.querySelector('.chat-launcher')?.setAttribute('aria-expanded', 'true');
  if (question) {
    appendChatMessage(question, 'user');
    window.setTimeout(() => appendChatMessage(answerQuestion(question), 'assistant'), 120);
  }
  window.setTimeout(() => chatInput?.focus(), 0);
}
function closeChat() {
  chatPanel?.classList.add('is-hidden');
  document.querySelector('.chat-launcher')?.setAttribute('aria-expanded', 'false');
}
chatOpeners.forEach(button => button.addEventListener('click', () => openChat()));
chatCloser?.addEventListener('click', closeChat);
qaPrompts.forEach(button => button.addEventListener('click', () => openChat(button.dataset.question)));
chatForm?.addEventListener('submit', event => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question) return;
  appendChatMessage(question, 'user');
  chatInput.value = '';
  window.setTimeout(() => appendChatMessage(answerQuestion(question), 'assistant'), 120);
});
