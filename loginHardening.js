const fs = require('fs');
let code = fs.readFileSync('src/app/api/auth/login/route.ts', 'utf8');

// Inject rate limiting map
code = code.replace(/const CAPTCHA_SECRET = process\.env\.CAPTCHA_SECRET \|\| 'captcha_secret_architect';/,
`const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'captcha_secret_architect';

// Basic In-Memory Rate Limiter for DDoS/Brute Force Protection
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitData = rateLimitMap.get(ip);
  if (!limitData) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 min window
    return true;
  }
  if (now > limitData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limitData.count > 10) {
    return false; // Throttled
  }
  limitData.count++;
  return true;
}
`);

// Apply Rate Limit
code = code.replace(/export async function POST\(req: Request\) \{\n\s*try \{/,
`export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }`);

// Handle force_password_change
code = code.replace(/\/\/ Success\n\s*await setSession/,
`// Check if password reset is forced
    if (user.force_password_change === 1) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 15 * 60 * 1000;
      db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(resetToken, expires, user.id);
      return NextResponse.json({ success: true, requirePasswordChange: true, tempToken: resetToken, email: user.email });
    }

    // Success
    await setSession`);

fs.writeFileSync('src/app/api/auth/login/route.ts', code);
