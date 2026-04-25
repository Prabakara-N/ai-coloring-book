import { NextResponse } from "next/server";
import type { ModelMessage } from "ai";
import {
  runBookChatTurn,
  type BookChatMode,
} from "@/lib/book-chat";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  messages?: ModelMessage[];
  userMessage?: string;
  mode?: BookChatMode;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const userText = (body.userMessage ?? "").trim();
  const mode: BookChatMode = body.mode === "story" ? "story" : "qa";

  const messages: ModelMessage[] = userText
    ? [...incoming, { role: "user", content: userText }]
    : incoming;

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Send an initial message to start the chat." },
      { status: 400 },
    );
  }

  try {
    const result = await runBookChatTurn(messages, mode);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat turn failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
