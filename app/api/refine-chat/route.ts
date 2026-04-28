import { NextResponse } from "next/server";
import type { ModelMessage } from "ai";
import {
  runRefineChatTurn,
  type RefineBookContext,
  type AttachedImage,
} from "@/lib/refine-chat";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  context?: RefineBookContext;
  history?: ModelMessage[];
  userMessage?: string;
  hasUserReference?: boolean;
  attachedImages?: AttachedImage[];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.context || !body.context.target?.id || !body.context.bookTitle) {
    return NextResponse.json(
      { error: "context with bookTitle and target is required." },
      { status: 400 },
    );
  }
  const userMessage = (body.userMessage ?? "").trim();
  if (!userMessage) {
    return NextResponse.json(
      { error: "userMessage is required." },
      { status: 400 },
    );
  }
  if (userMessage.length > 2000) {
    return NextResponse.json(
      { error: "userMessage too long (max 2000 chars)." },
      { status: 400 },
    );
  }

  const history = Array.isArray(body.history) ? body.history : [];

  try {
    const result = await runRefineChatTurn({
      context: body.context,
      history,
      userMessage,
      hasUserReference: !!body.hasUserReference,
      attachedImages: Array.isArray(body.attachedImages)
        ? body.attachedImages
        : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refine chat turn failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
