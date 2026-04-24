import { NextResponse } from "next/server";
import { planBook, type BookPlanInput } from "@/lib/book-planner";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body extends Partial<BookPlanInput> {}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const idea = (body.idea ?? "").trim();
  if (!idea || idea.length < 10) {
    return NextResponse.json(
      { error: "Please describe your book idea in at least 10 characters." },
      { status: 400 }
    );
  }
  const pageCount = Math.max(5, Math.min(50, Number(body.pageCount ?? 20)));
  try {
    const plan = await planBook({
      idea,
      pageCount,
      age: body.age ?? "toddlers",
    });
    return NextResponse.json({ plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Planning failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
