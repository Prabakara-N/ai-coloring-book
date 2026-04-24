import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const BLOG_DIR = join(process.cwd(), "content", "blog");
const VISUALS_BLOG = join(process.cwd(), "public", "visuals", "blog");

function inferCoverImage(slug: string): string | undefined {
  const candidate = join(VISUALS_BLOG, `${slug}.png`);
  if (existsSync(candidate)) return `/visuals/blog/${slug}.png`;
  return undefined;
}

export interface BlogFrontmatter {
  title: string;
  description: string;
  date: string;
  author?: string;
  tags?: string[];
  cover?: string;
  coverImage?: string;
  readingTime?: string;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  content: string;
}

function estimateReadingTime(markdown: string): string {
  const words = markdown.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

export function getAllPosts(): BlogPost[] {
  if (!existsSync(BLOG_DIR)) return [];
  const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  const posts = files.map((file) => {
    const raw = readFileSync(join(BLOG_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const fm = data as BlogFrontmatter;
    const slug = file.replace(/\.(md|mdx)$/i, "");
    return {
      slug,
      frontmatter: {
        ...fm,
        readingTime: fm.readingTime ?? estimateReadingTime(content),
        coverImage: fm.coverImage ?? inferCoverImage(slug),
      },
      content,
    };
  });
  return posts.sort((a, b) =>
    new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
  );
}

export function getPost(slug: string): BlogPost | null {
  const all = getAllPosts();
  return all.find((p) => p.slug === slug) ?? null;
}

export function markdownToHtml(md: string): string {
  // Minimal markdown → HTML (headings, paragraphs, bold, italic, links, code, lists).
  // Intentionally small — blog posts are curated, no untrusted content.
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  let codeLang = "";
  let codeBuf: string[] = [];
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    const text = inlineFormat(paraBuf.join(" "));
    out.push(`<p>${text}</p>`);
    paraBuf = [];
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  const inlineFormat = (s: string) => {
    let t = escape(s);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return t;
  };

  for (const raw of lines) {
    if (inCode) {
      if (/^```/.test(raw)) {
        out.push(
          `<pre><code${codeLang ? ` class="language-${codeLang}"` : ""}>${escape(codeBuf.join("\n"))}</code></pre>`
        );
        inCode = false;
        codeLang = "";
        codeBuf = [];
      } else {
        codeBuf.push(raw);
      }
      continue;
    }
    const line = raw;
    if (/^```/.test(line)) {
      flushPara();
      closeList();
      inCode = true;
      codeLang = line.slice(3).trim();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inlineFormat(h[2])}</h${level}>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineFormat(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\s*$/.test(line)) {
      flushPara();
      closeList();
      continue;
    }
    paraBuf.push(line);
  }
  flushPara();
  closeList();
  if (inCode) {
    out.push(`<pre><code>${escape(codeBuf.join("\n"))}</code></pre>`);
  }
  return out.join("\n");
}
