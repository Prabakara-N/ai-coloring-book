import { NextResponse } from "next/server";
import {
  generateIdeaSuggestions,
  type IdeaAudience,
} from "@/lib/idea-suggestions";

export const runtime = "nodejs";
export const maxDuration = 30;

const VALID: IdeaAudience[] = ["any", "toddlers", "kids", "tweens"];

interface Body {
  audience?: IdeaAudience;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const audience: IdeaAudience =
    body.audience && VALID.includes(body.audience) ? body.audience : "any";

  try {
    const ideas = await generateIdeaSuggestions(audience);
    return NextResponse.json({ ideas });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Idea generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
