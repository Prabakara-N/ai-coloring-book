/**
 * One-shot story-book planner endpoint. Sibling of /api/plan-book (which
 * targets coloring books). Used by the Bulk Book IdeaForm when the user
 * picks "Story book". For richer multi-turn planning the user can still
 * use the Sparky AI chat at /api/book-chat.
 *
 * Body:
 *   {
 *     idea: string,
 *     pageCount: number,
 *     age?: "toddlers" | "kids" | "tweens",
 *     storyType?: "moral" | "fairytale" | "fantasy" | "adventure"
 *               | "bedtime" | "fiction" | "non-fiction" | "mystery" | "comic",
 *     characterNames?: string,   // free-form, comma-separated
 *   }
 *
 * Returns: { plan: StoryBookPlan }
 */

import { NextResponse } from "next/server";
import {
  planStoryBook,
  type StoryBookPlanInput,
  type StoryType,
} from "@/lib/story-book-planner";

export const runtime = "nodejs";
export const maxDuration = 90;

interface Body {
  idea?: string;
  pageCount?: number;
  age?: StoryBookPlanInput["age"];
  storyType?: StoryType;
  characterNames?: string;
}

const ALLOWED_STORY_TYPES: ReadonlyArray<StoryType> = [
  "moral",
  "fiction",
  "non-fiction",
  "mystery",
  "fantasy",
  "comic",
  "fairytale",
  "adventure",
  "bedtime",
];

function isStoryType(value: unknown): value is StoryType {
  return (
    typeof value === "string" &&
    (ALLOWED_STORY_TYPES as readonly string[]).includes(value)
  );
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const idea = body.idea?.trim();
  if (!idea || idea.length < 10) {
    return NextResponse.json(
      { error: "Story idea is required (min 10 characters)." },
      { status: 400 },
    );
  }
  const pageCount = Math.max(5, Math.min(50, Number(body.pageCount ?? 12)));
  const age: StoryBookPlanInput["age"] =
    body.age === "kids" || body.age === "tweens" ? body.age : "toddlers";
  // storyType is optional — when blank, the planner uses the canonical
  // plot for known fables, or the most natural shape for original ideas.
  const storyType: StoryType | undefined = isStoryType(body.storyType)
    ? body.storyType
    : undefined;
  const characterNames = body.characterNames?.trim() || undefined;

  try {
    const plan = await planStoryBook({
      idea,
      pageCount,
      age,
      storyType,
      characterNames,
    });
    return NextResponse.json({ plan });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Story-book planning failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
