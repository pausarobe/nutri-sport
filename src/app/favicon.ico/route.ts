export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#0B4F3A"/>
  <path d="M32 13C22 13 15 21 15 31c0 11 9 20 17 23 8-3 17-12 17-23 0-10-7-18-17-18Z" fill="none" stroke="#E2F1E8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M32 19v30" stroke="#A7D7B9" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M21 32h7l3-6 4 12 4-6h7" fill="none" stroke="#34D399" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
