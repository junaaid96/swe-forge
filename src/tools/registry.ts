/** Forgeline Tools — registry of client-side developer utilities. */

export interface ToolMeta {
  slug: string;
  title: string;
  blurb: string;
  category: ToolCategory;
  keywords: string;
  badge?: string;
}

export const TOOL_CATEGORIES = [
  'Format & Convert',
  'Encode & Secure',
  'Web & API',
  'Text & Compare',
  'Ship & Deploy',
  'AI & Data',
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const TOOLS: ToolMeta[] = [
  { slug: 'json', title: 'JSON Formatter & to Code', blurb: 'Validate, format and convert JSON to TypeScript, Go or Python.', category: 'Format & Convert', keywords: 'json format validate minify typescript go python struct interface prettify', badge: 'Popular' },
  { slug: 'csv-json', title: 'CSV ↔ JSON', blurb: 'Convert spreadsheets to JSON and back, with delimiter control.', category: 'Format & Convert', keywords: 'csv json convert spreadsheet table delimiter export' },
  { slug: 'markdown', title: 'Markdown Preview', blurb: 'Live GitHub-flavored preview with Mermaid diagrams.', category: 'Format & Convert', keywords: 'markdown md preview gfm readme mermaid' },
  { slug: 'base-converter', title: 'Number Base Converter', blurb: 'Convert between binary, octal, decimal, hex and base64 ints.', category: 'Format & Convert', keywords: 'binary hex octal decimal base convert bigint bit' },
  { slug: 'encoders', title: 'Encoders & Escapers', blurb: 'Base64, URL encoding and HTML escaping in one place.', category: 'Encode & Secure', keywords: 'base64 url encode decode html escape unescape data uri' },
  { slug: 'hash', title: 'Hash & HMAC', blurb: 'SHA digests and HMAC signatures, computed locally via WebCrypto.', category: 'Encode & Secure', keywords: 'hash sha md5 hmac checksum digest signature verify' },
  { slug: 'ids-secrets', title: 'IDs & Secrets', blurb: 'UUID v4/v7, NanoID and secure passwords or tokens.', category: 'Encode & Secure', keywords: 'uuid guid nanoid password token secret random generator v7' },
  { slug: 'jwt', title: 'JWT Decoder', blurb: 'Decode headers and claims, check expiry. Never leaves your browser.', category: 'Encode & Secure', keywords: 'jwt json web token decode verify expiry claims auth bearer' },
  { slug: 'regex', title: 'Regex Tester', blurb: 'Test patterns with live highlighting, groups and a cheatsheet.', category: 'Web & API', keywords: 'regex regexp pattern match test javascript python cheatsheet' },
  { slug: 'time', title: 'Time & Cron', blurb: 'Epoch converter, timezone math and cron explainer with next runs.', category: 'Web & API', keywords: 'timestamp epoch unix cron timezone date convert schedule' },
  { slug: 'curl-api', title: 'curl & HTTP Status', blurb: 'Turn curl into fetch/axios, plus a searchable status-code reference.', category: 'Web & API', keywords: 'curl http fetch axios api postman status code rest' },
  { slug: 'color', title: 'Color & Contrast', blurb: 'HEX/RGB/HSL conversion with WCAG contrast checks and palettes.', category: 'Web & API', keywords: 'color hex rgb hsl contrast wcag accessibility palette picker' },
  { slug: 'diff', title: 'Text Diff Checker', blurb: 'Line-level diff with character highlighting and stats.', category: 'Text & Compare', keywords: 'diff compare text difference patch changed lines' },
  { slug: 'text-case', title: 'Text & Case Tools', blurb: 'Case converters, word counter, line utilities and lorem ipsum.', category: 'Text & Compare', keywords: 'case camel snake kebab word count lorem uppercase lowercase lines sort dedupe' },
  { slug: 'git', title: 'Git Helper', blurb: 'Conventional-commit builder, branch sanitizer, .gitignore generator.', category: 'Ship & Deploy', keywords: 'git commit conventional gitignore branch github message' },
  { slug: 'docker', title: 'Docker & Env', blurb: 'Dockerfile and Compose generators plus a .env validator.', category: 'Ship & Deploy', keywords: 'docker dockerfile compose env container kubernetes deploy' },
  { slug: 'tokens', title: 'LLM Tokens & Cost', blurb: 'Estimate prompt tokens, context usage and API spend per model tier.', category: 'AI & Data', keywords: 'llm token gpt claude gemini cost context window prompt budget openai anthropic', badge: 'New' },
  { slug: 'mock-data', title: 'Mock Data Generator', blurb: 'Seeded fake datasets as JSON, CSV, SQL or TypeScript.', category: 'AI & Data', keywords: 'mock fake data generator json sql csv test fixture faker seed' },
  { slug: 'subnet', title: 'Subnet & CIDR Calculator', blurb: 'Masks, ranges, binary view, subnet splits and membership checks.', category: 'Web & API', keywords: 'subnet cidr ip network mask broadcast range binary cidr networking vpc' },
  { slug: 'sql', title: 'SQL Formatter', blurb: 'Pretty-print and minify queries in 7 dialects, with table detection.', category: 'Format & Convert', keywords: 'sql format formatter postgres mysql sqlite query beautify minify database', badge: 'New' },
  { slug: 'qr', title: 'QR Studio', blurb: 'Link, Wi-Fi and text QR codes with PNG/SVG export.', category: 'Web & API', keywords: 'qr qrcode generator wifi link png svg share code' },
  { slug: 'unicode', title: 'Unicode Inspector', blurb: 'Reveal invisible characters, code points and normalization.', category: 'Text & Compare', keywords: 'unicode utf8 invisible zero-width emoji codepoint normalize homoglyph debug' },
];

export const toolBySlug = (slug: string | undefined) => TOOLS.find((t) => t.slug === slug);

export const relatedTools = (slug: string, n = 3): ToolMeta[] => {
  const me = toolBySlug(slug);
  if (!me) return TOOLS.slice(0, n);
  const same = TOOLS.filter((t) => t.slug !== slug && t.category === me.category);
  const rest = TOOLS.filter((t) => t.slug !== slug && t.category !== me.category);
  return [...same, ...rest].slice(0, n);
};
