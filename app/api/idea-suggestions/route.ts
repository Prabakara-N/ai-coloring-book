import { NextResponse } from "next/server";
import {
  generateIdeaSuggestions,
  type IdeaAudience,
  type IdeaKind,
} from "@/lib/idea-suggestions";

export const runtime = "nodejs";
export const maxDuration = 30;

const VALID_AUDIENCES: IdeaAudience[] = ["any", "toddlers", "kids", "tweens"];
const VALID_KINDS: IdeaKind[] = ["coloring", "story"];

interface Body {
  audience?: IdeaAudience;
  /** "coloring" (default) or "story" — picks the per-product idea bank. */
  kind?: IdeaKind;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const audience: IdeaAudience =
    body.audience && VALID_AUDIENCES.includes(body.audience)
      ? body.audience
      : "any";
  const kind: IdeaKind =
    body.kind && VALID_KINDS.includes(body.kind) ? body.kind : "coloring";

  try {
    const ideas = await generateIdeaSuggestions(audience, kind);
    return NextResponse.json({ ideas });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Idea generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
