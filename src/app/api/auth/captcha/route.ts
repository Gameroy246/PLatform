import { NextResponse } from 'next/server';
import crypto from 'crypto';

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'captcha_secret_architect';

export async function GET() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const hash = crypto.createHmac('sha256', CAPTCHA_SECRET).update(text.toLowerCase()).digest('hex');

  // Simple SVG generation to avoid svg-captcha's fs dependency issues in Next.js App Router
  const svg = `
    <svg width="150" height="50" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1e1e24" />
      ${Array.from({length: 20}).map(() => `<line x1="${Math.random()*150}" y1="${Math.random()*50}" x2="${Math.random()*150}" y2="${Math.random()*50}" stroke="#${Math.floor(Math.random()*16777215).toString(16)}" stroke-width="1" opacity="0.3"/>`).join('')}
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="28" font-weight="bold" fill="#8b5cf6" transform="rotate(${(Math.random() - 0.5) * 10}, 75, 25)">
        ${text.split('').map(c => `<tspan dx="${Math.random() * 5}" dy="${(Math.random() - 0.5) * 10}">${c}</tspan>`).join('')}
      </text>
    </svg>
  `;

  return NextResponse.json({
    image: svg,
    hash: hash
  });
}
