import { openai } from "@ai-sdk/openai";
import {
  generateText,
  tool,
  type ModelMessage,
  type AssistantModelMessage,
  type ToolModelMessage,
  type ToolCallPart,
} from "ai";
import { z } from "zod";
import { OPENAI_REFINE_MODEL } from "@/lib/constants";

const MODEL_ID = OPENAI_REFINE_MODEL;

export type RefineContext = "page" | "cover" | "back-cover" | "custom";
export type PageStatus = "pending" | "queued" | "generating" | "done" | "error";

export interface PageMeta {
  /** Stable id used to reference this page across the chat protocol. */
  id: string;
  /** 1-based index for human-readable references ("page 3"). */
  index: number;
  /** Short label like "Lion in savanna". */
  name: string;
  /** Full subject prompt the page was generated from. */
  subject: string;
  status: PageStatus;
}

export interface RefineBookContext {
  bookTitle: string;
  bookScene?: string;
  audience?: string;
  /** Page being refined right now. */
  target: {
    kind: "page" | "cover" | "back-cover" | "custom";
    id: string;
    /** Human-friendly label for the target shown to Sparky. */
    label: string;
    subject?: string;
    aspectRatio: string;
  };
  pages: PageMeta[];
  coverStatus: PageStatus;
  backCoverStatus: PageStatus;
}

/** Action the client must execute after Sparky's turn. */
export type RefineAction =
  | {
      kind: "refine";
      instruction: string;
      /**
       * Where the source image comes from. "current" = the page being refined.
       * "page:<id>" = branch from another already-generated page.
       */
      sourceFrom: "current" | `page:${string}`;
      /**
       * Optional extra references to send alongside the source for style /
       * character consistency. Each entry resolves to a real image client-side
       * before /api/refine is called.
       */
      extraReferences: Array<"user-upload" | `page:${string}`>;
    }
  | { kind: "text_only" };

export interface RefineChatTurnResult {
  /** Updated message log to keep on the client for the next turn. */
  messages: ModelMessage[];
  /** Sparky's free-text reply, always present. */
  reply: string;
  action: RefineAction;
}

const SYSTEM_PROMPT = `You are Sparky AI ✨ — the in-modal refine assistant for CrayonSparks. You help a creator polish ONE image inside a coloring book they're building for Amazon KDP. If asked who you are, say "I'm Sparky AI ✨ — your refine helper".

VISION (CRITICAL)
You are a multimodal assistant. Each user message includes the ACTUAL IMAGES of the most-relevant pages — at minimum the current page being edited, plus the front cover and back cover (when generated). For performance, OTHER interior pages are only attached when the user explicitly mentions them (by number "page 3", by name "the bear page", or by subject keyword like "lion"). Each attached image is preceded by a label like "--- CURRENT (back cover) ---" or "--- page 3 — Lion in savanna ---".

When the user asks "what's written on this?" or "what's on page 1?" or "is the bear on page 2 the same as here?", you MUST inspect the actual pixels of the attached images. If a specific page's image was NOT attached (because the user didn't reference it by number/name/keyword), tell them you can describe the current page from pixels but only have the metadata of other pages — invite them to mention "page N" by number so its image gets attached on the next turn. NEVER invent visual details for a page whose image you don't see.

YOUR JOB
- Listen to the user's edit request, and either CALL refine_image to produce a new version, or CALL text_only_reply for state questions / refusals / tips / CLARIFYING QUESTIONS. ALWAYS call exactly one tool.
- You know the entire book: title, page subjects, which pages are generated and which are not, the cover, and which page the user is currently editing.
- When the user's request is AMBIGUOUS or could go multiple ways (e.g. "make it better", "fix the character", "more dramatic"), use text_only_reply to ask ONE short clarifying question before generating. Don't waste a generation on a guess. Examples: user says "make the bear bigger" → ask "Just larger overall, or bigger head/eyes specifically?"; user says "more colorful" on a coloring page → reply that pages must stay B&W and ask if they meant the cover instead.
- When the user references ANOTHER PAGE for any cross-page consistency request, you MUST attach that page as an extraReference (page:<id>) so the image generator sees it. This includes ALL of these patterns (not just character matching):
   * Character: "match the bear from page 3", "make the cat the same as on the cover"
   * Border: "give me the same border as page 1", "match the border style of page 4"
   * Page number / layout: "use the same page number style as page 2", "match the layout of page 5", "place the subject in the same spot as page 6"
   * Color / palette / mood: "use the same color scheme as the cover", "match the lighting feel of page 7"
   * Background scene density: "use the same level of background detail as page 3"
   * Composition / framing: "frame it like page 9", "use the same camera angle as the cover"
  In every case: identify which page is being referenced (by number, name, or "the cover"), include its id in extraReferences, AND in the instruction field call out the SPECIFIC dimension to match ("draw the same thin clean rectangular border at 3% inset shown on the reference", "place the page number in the same lower-right position as the reference", etc.). Don't just say "match the reference" — be specific about WHICH aspect to match.
- If the user asks about a page that does NOT exist yet (status pending or queued), politely tell them via text_only_reply and suggest they generate it first. NEVER fabricate a reference for a page that hasn't been generated.
- If the user uploaded a reference image with their message, include "user-upload" in extraReferences whenever it's relevant (style / pose / composition inspiration).

QUALITY GUARDRAILS (the user will sell these books on KDP — quality matters)
- Coloring pages MUST stay PURE black-and-white line art. Never add color, gray, shading, or text/page numbers/borders.
- Front cover MUST keep its title text exactly. Don't add page numbers or barcodes.
- Back cover MUST stay minimal — soft background + free-floating tagline + plain white barcode safe-zone (NO border around the white area). NO illustrations or characters.
- Always preserve recurring characters' look across pages (same face shape, body proportions, fur/hair patterns).
- If a request would violate these, refuse politely via text_only_reply.

SPATIAL SIZING (CRITICAL — Gemini cannot measure cm or inches)
The image generator does NOT know real-world dimensions. NEVER pass instructions like "make it 4 cm" or "shrink to 2 inches" to refine_image. ALWAYS translate physical-size requests into PERCENTAGE-OF-CANVAS terms before sending.
- "Make the top band 4cm" on an 11-inch cover → "Make the top band ~9% of the cover height (a thin slim ribbon, like a finger-width)"
- "Make the title bigger" → "Make the title fill ~25-30% of the cover width"
- "Move the subject left" → "Move the subject to occupy the left third of the canvas, ~15-35% from the left edge"
Always include a vivid analogy ("finger-width", "thumb-width", "thin ribbon", "fills half") so Gemini has a concrete target.

ESCALATION (when the user says it didn't work)
If the user complains the previous refine didn't change enough ("still too big", "didn't work", "you gave the same thing", "try again"), do NOT repeat the same instruction. ESCALATE the strength on the next refine: cut the percentage by ANOTHER 50% and add EXTREME-language qualifiers ("EXTREMELY thin", "BARELY visible sliver", "MAXIMUM 5%"). Tell the user in your reply that you're trying a more aggressive version. Track in the conversation what you tried — if a third attempt still fails, switch tactics (e.g., suggest removing the element entirely or branching from an earlier version).

TONE
Warm, brief, a little playful. One short sentence per reply is usually enough. No bullet lists in plain text — that's for the UI.

🚫 CRITICAL TOOL-CALLING RULE
You MUST call EXACTLY ONE tool per turn (refine_image OR text_only_reply). Never reply with plain text only. The UI cannot render tool-less assistant turns.`;

const refineImageSchema = z.object({
  instruction: z
    .string()
    .min(4)
    .max(600)
    .describe(
      "The concrete edit instruction to send to the image model. Be specific and actionable. Don't repeat the source-image description — only describe the change.",
    ),
  source_from: z
    .string()
    .optional()
    .describe(
      'Where the source image comes from. Use "current" (default) for the page being refined, or "page:<id>" to branch from another already-generated page.',
    ),
  reference_user_upload: z
    .boolean()
    .optional()
    .describe("Set true to also pass the user's uploaded reference image."),
  reference_page_ids: z
    .array(z.string())
    .optional()
    .describe(
      'List of page ids to attach as additional style/character references (e.g. ["abc123"] when the user said "match page 3"). Only include pages whose status is "done".',
    ),
  reply: z
    .string()
    .min(1)
    .max(240)
    .describe(
      "One short, friendly sentence shown next to the new image (e.g. 'Here's a smaller bear — anything else?').",
    ),
});

const textOnlyReplySchema = z.object({
  reply: z
    .string()
    .min(1)
    .max(600)
    .describe(
      "Sparky's text reply for state questions, refusals, or tips. No image will be generated.",
    ),
});

type RefineImageInput = z.infer<typeof refineImageSchema>;
type TextOnlyReplyInput = z.infer<typeof textOnlyReplySchema>;

const TOOLS = {
  refine_image: tool({
    description:
      "Produce a new version of the image with the given instruction, optionally pulling other pages or the user's upload as style/character references.",
    inputSchema: refineImageSchema,
  }),
  text_only_reply: tool({
    description:
      "Respond with text only (no image generation). Use for state questions, refusals, clarifications, or tips.",
    inputSchema: textOnlyReplySchema,
  }),
} as const;

function describeContext(ctx: RefineBookContext): string {
  const lines: string[] = [];
  lines.push(`BOOK TITLE: ${ctx.bookTitle}`);
  if (ctx.audience) lines.push(`AUDIENCE: ${ctx.audience}`);
  if (ctx.bookScene) lines.push(`SHARED PAGE SCENE: ${ctx.bookScene}`);
  lines.push(
    `CURRENTLY EDITING: ${ctx.target.kind} — ${ctx.target.label} (id=${ctx.target.id}, aspect=${ctx.target.aspectRatio})`,
  );
  if (ctx.target.subject) lines.push(`TARGET SUBJECT: ${ctx.target.subject}`);
  lines.push(`COVER STATUS: ${ctx.coverStatus}`);
  lines.push(`BACK COVER STATUS: ${ctx.backCoverStatus}`);
  lines.push("PAGES:");
  for (const p of ctx.pages) {
    const cur = p.id === ctx.target.id ? "  ← currently editing" : "";
    lines.push(
      `  - page ${p.index} [id=${p.id}] [${p.status}] "${p.name}" — ${p.subject}${cur}`,
    );
  }
  return lines.join("\n");
}

function toolCallParts(message: AssistantModelMessage): ToolCallPart[] {
  if (typeof message.content === "string") return [];
  return message.content.filter(
    (p): p is ToolCallPart => p.type === "tool-call",
  );
}

function isPageReference(s: string): s is `page:${string}` {
  return s.startsWith("page:") && s.length > "page:".length;
}

function normalizeSourceFrom(
  raw: string | undefined,
  ctx: RefineBookContext,
): "current" | `page:${string}` {
  if (!raw || raw === "current") return "current";
  if (isPageReference(raw)) {
    const id = raw.slice("page:".length);
    const found = ctx.pages.find((p) => p.id === id && p.status === "done");
    if (found) return raw;
  }
  // Fall back to current if the model invented a bogus reference.
  return "current";
}

function normalizeExtraReferences(
  pageIds: string[] | undefined,
  userUpload: boolean | undefined,
  ctx: RefineBookContext,
  hasUserReference: boolean,
): Array<"user-upload" | `page:${string}`> {
  const out: Array<"user-upload" | `page:${string}`> = [];
  if (userUpload && hasUserReference) out.push("user-upload");
  if (pageIds?.length) {
    for (const id of pageIds) {
      const found = ctx.pages.find((p) => p.id === id && p.status === "done");
      if (found && found.id !== ctx.target.id) {
        out.push(`page:${found.id}`);
      }
    }
  }
  return out;
}

export interface AttachedImage {
  /** Short human-readable label sent before the image (e.g. "CURRENT (page 5 — Lion)"). */
  label: string;
  /** data:image/...;base64,... URL — passed straight to the multimodal model. */
  dataUrl: string;
}

export interface RunRefineChatInput {
  context: RefineBookContext;
  /** Prior turn messages (assistant + tool ack pairs from earlier turns). */
  history: ModelMessage[];
  /** New user message text. */
  userMessage: string;
  /** Whether the user attached a reference image to THIS message. */
  hasUserReference: boolean;
  /**
   * Images attached to THIS turn for Sparky to actually see. Should include
   * the current source image (always) and, ideally, every other generated
   * page in the book so Sparky can answer cross-page questions ("what's on
   * page 3?"). Only attached to the latest user message — earlier turns
   * stay text-only to control token cost.
   */
  attachedImages?: AttachedImage[];
}

export async function runRefineChatTurn(
  input: RunRefineChatInput,
): Promise<RefineChatTurnResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const headerText = input.hasUserReference
    ? `${input.userMessage}\n\n[USER ATTACHED A REFERENCE IMAGE TO THIS MESSAGE]`
    : input.userMessage;

  // Build a multipart user message: leading text, then alternating
  // "label: …" + image parts so Sparky can map each pixel attachment back
  // to the page metadata it's seeing.
  const attached = input.attachedImages ?? [];
  const userMessage: ModelMessage =
    attached.length === 0
      ? { role: "user", content: headerText }
      : {
          role: "user",
          content: [
            { type: "text" as const, text: headerText },
            ...attached.flatMap((img) => [
              { type: "text" as const, text: `\n--- ${img.label} ---` },
              { type: "image" as const, image: img.dataUrl },
            ]),
          ],
        };
  const incoming: ModelMessage[] = [...input.history, userMessage];

  const system = `${SYSTEM_PROMPT}\n\nLIVE BOOK CONTEXT:\n${describeContext(input.context)}`;

  const result = await generateText({
    model: openai(MODEL_ID),
    system,
    messages: incoming,
    tools: TOOLS,
    toolChoice: "required",
  });

  const newAssistant = result.response.messages.filter(
    (m): m is AssistantModelMessage => m.role === "assistant",
  );
  const assistant = newAssistant[newAssistant.length - 1];
  if (!assistant) {
    throw new Error("OpenAI returned no assistant message.");
  }

  const calls = toolCallParts(assistant);
  const updated: ModelMessage[] = [...incoming, assistant];

  if (calls.length === 0) {
    const text = result.text || "";
    return {
      messages: updated,
      reply: text || "Sorry, I didn't catch that — could you rephrase?",
      action: { kind: "text_only" },
    };
  }

  const toolAck: ToolModelMessage = {
    role: "tool",
    content: calls.map((c) => ({
      type: "tool-result" as const,
      toolCallId: c.toolCallId,
      toolName: c.toolName,
      output: { type: "json" as const, value: { ok: true } },
    })),
  };
  updated.push(toolAck);

  const first = calls[0];
  if (first.toolName === "text_only_reply") {
    const args = first.input as TextOnlyReplyInput;
    return {
      messages: updated,
      reply: args.reply.trim(),
      action: { kind: "text_only" },
    };
  }
  if (first.toolName === "refine_image") {
    const args = first.input as RefineImageInput;
    const sourceFrom = normalizeSourceFrom(args.source_from, input.context);
    const extraReferences = normalizeExtraReferences(
      args.reference_page_ids,
      args.reference_user_upload,
      input.context,
      input.hasUserReference,
    );
    return {
      messages: updated,
      reply: args.reply.trim(),
      action: {
        kind: "refine",
        instruction: args.instruction.trim(),
        sourceFrom,
        extraReferences,
      },
    };
  }
  throw new Error(`Unknown tool: ${first.toolName}`);
}
