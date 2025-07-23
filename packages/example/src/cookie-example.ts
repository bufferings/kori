/**
 * Cookie usage examples with Kori
 *
 * This file demonstrates basic usage of cookie reading and setting in Kori.
 */

import { createKori } from '@korix/kori';

// Cookie example server
const app = createKori();

// Example of reading cookies from request
app.get('/read-cookies', ({ req, res }) => {
  // Get all cookies
  const allCookies = req.cookies();
  req.log().info('All cookies:', allCookies);

  // Get specific cookies
  const sessionId = req.cookie('session_id');
  const username = req.cookie('username');

  if (sessionId) {
    return res.json({
      message: 'Cookies found',
      sessionId,
      username: username ?? 'guest',
      allCookies,
    });
  }

  return res.json({
    message: 'Session cookie not found',
    allCookies,
  });
});

// Example of setting cookies
app.post('/login', ({ res }) => {
  // Basic cookie setting
  res.setCookie('session_id', 'abc123def456');

  // Setting cookie with options
  res.setCookie('username', 'user123', {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    httpOnly: true, // No JavaScript access
    secure: false, // OK for HTTP (development)
    sameSite: 'lax', // CSRF protection
    path: '/', // Valid for all paths
  });

  // Cookie with expiration date
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30); // 30 days later

  res.setCookie('rememberMe', 'true', {
    expires: expirationDate,
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
  });

  return res.json({
    message: 'Logged in. Cookies have been set.',
  });
});

// Example of deleting cookies
app.post('/logout', ({ res }) => {
  // Delete cookies
  res.clearCookie('session_id');
  res.clearCookie('username');
  res.clearCookie('rememberMe');

  return res.json({
    message: 'Logged out. Cookies have been cleared.',
  });
});

// Session management example
app.get('/profile', ({ req, res }) => {
  const sessionId = req.cookie('session_id');
  const username = req.cookie('username');

  if (!sessionId) {
    return res.status(401).json({
      message: 'Login required',
    });
  }

  // In real applications, validate session with database here
  return res.json({
    message: 'Profile information',
    sessionId,
    username,
    timestamp: new Date().toISOString(),
  });
});

// Example showing secure cookie options
app.post('/secure-login', ({ res }) => {
  // Secure cookie settings for production
  res.setCookie('secureSession', 'secure-session-id', {
    httpOnly: true, // Prevent XSS attacks
    secure: true, // Send only over HTTPS
    sameSite: 'strict', // Prevent CSRF attacks
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });

  // CSRF token in cookie (example of insecure setting)
  res.setCookie('csrfToken', 'csrf-token-value', {
    httpOnly: false, // JavaScript accessible
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60,
  });

  return res.json({
    message: 'Secure session created',
  });
});

// Example of setting multiple cookies at once
app.post('/set-multiple-cookies', ({ res }) => {
  // Save user preferences in cookies
  res
    .setCookie('theme', 'dark', { maxAge: 60 * 60 * 24 * 365 }) // 1 year
    .setCookie('language', 'en', { maxAge: 60 * 60 * 24 * 365 })
    .setCookie('timezone', 'UTC', { maxAge: 60 * 60 * 24 * 365 })
    .setCookie('notifications', 'enabled', { maxAge: 60 * 60 * 24 * 30 }); // 30 days

  return res.json({
    message: 'Multiple cookies have been set',
  });
});

// Conditional cookie setting example
app.get('/conditional-cookie', ({ req, res }) => {
  const visitCount = req.cookie('visitCount');
  const newCount = visitCount ? parseInt(visitCount, 10) + 1 : 1;

  res.setCookie('visitCount', newCount.toString(), {
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  if (newCount === 1) {
    res.setCookie('firstVisit', new Date().toISOString(), {
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return res.json({
    message: `This is your visit #${newCount}`,
    isFirstVisit: newCount === 1,
  });
});

export { app };

// Run development server directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.log().info('Cookie example server starting on http://localhost:3001');
  app.log().info('');
  app.log().info('Available endpoints:');
  app.log().info('  GET  /read-cookies           - Read cookies');
  app.log().info('  POST /login                  - Login and set cookies');
  app.log().info('  POST /logout                 - Logout and clear cookies');
  app.log().info('  GET  /profile                - Check session');
  app.log().info('  POST /secure-login           - Set secure cookies');
  app.log().info('  POST /set-multiple-cookies   - Set multiple cookies');
  app.log().info('  GET  /conditional-cookie     - Conditional cookie setting');
  app.log().info('');
}
