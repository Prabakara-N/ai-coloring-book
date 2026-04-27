/**
 * Wraps a KDP description in the minimal HTML structure that Amazon KDP's
 * "Book Description (HTML)" field expects — just <html>/<head>/<title>/<body>
 * with the description fragment inside <body>. No DOCTYPE, no meta, no
 * styling — KDP renders only a small whitelist of inline tags
 * (<p>, <strong>, <em>, <ul>, <li>, <br>) and ignores the rest, so a fat
 * styled document just adds noise.
 */

interface BuildKdpHtmlInput {
  title: string;
  descriptionHtml: string;
}

export function buildKdpHtmlDocument({
  title,
  descriptionHtml,
}: BuildKdpHtmlInput): string {
  const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<html>
<head>
<title>${safeTitle}</title>
</head>
<body>
${descriptionHtml.trim()}
</body>
</html>`;
}
