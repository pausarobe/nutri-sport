export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2d7a3a"/>
  <path d="M19 37c15 0 24-8 27-22 7 14 1 31-14 34-8 2-15-2-18-8 2-2 4-4 5-4Z" fill="#ffffff"/>
  <path d="M23 36c8-2 14-7 19-15" stroke="#2d7a3a" stroke-width="4" stroke-linecap="round"/>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
