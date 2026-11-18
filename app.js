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
