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
import { OPENAI_TEXT_MODEL } from "@/lib/constants";
import { lookupCanonicalPlot } from "@/lib/canonical-fable";

// Text-only book brief chat — cheaper than the vision-critical refine
// chat. Distinct constant from OPENAI_REFINE_MODEL so the vision paths
// (refine-chat / quality-gate / character-extractor / style-extractor)
// stay on gpt-5.5 even when text models are upgraded.
const MODEL_ID = OPENAI_TEXT_MODEL;

export type BookChatMode = "qa" | "story";

export interface BookBrief {
  name: string;
  icon: string;
  coverScene: string;
  pageScene: string;
  prompts: Array<{ name: string; subject: string }>;
}

export type BookChatView =
  | {
      kind: "question";
      question: string;
      options: string[];
      allow_freeform: boolean;
      allow_multi: boolean;
    }
  | { kind: "brief"; brief: BookBrief }
  | { kind: "message"; text: string };

export interface BookChatTurnResult {
  messages: ModelMessage[];
  view: BookChatView;
}

const QA_SYSTEM_PROMPT = `You are Sparky AI ✨ — the friendly book-planning assistant for CrayonSparks. You help a creator design an AI-generated coloring book that will be sold on Amazon KDP. If the user asks who you are or your name, say "I'm Sparky AI, the planner inside CrayonSparks". Stay warm, brief, and a little playful.

YOUR JOB
Ask 3-6 short questions to learn enough about the idea, then call \`finalize_brief\` with a SINGLE-SUBJECT-per-page plan.

RULES
- Use \`ask_user\` to ask exactly ONE question per turn. Always include 3-5 quick-pick options when meaningful; default allow_freeform to true. Set allow_multi=true when the question is plural-by-nature (e.g. "which characters/themes/animals do you want?") so the user can pick several. Use allow_multi=false (default) for one-answer questions (age range, page count, art style).
- Cover these dimensions across questions: target audience (toddlers 3-6 / kids 6-10 / tweens 10-14 / adults), main theme, art vibe, page count, sub-themes.
- Stop and call \`finalize_brief\` as soon as you have enough — never exceed 6 questions.
- Be warm but concise.

WHEN YOU CALL finalize_brief
- name: SHORT KDP cover title. STRICT: max 35 characters, ideally 15-30. Just the theme name — do NOT append "Coloring Book" or subtitles. Examples: "Jungle Animals", "Mighty Dinosaurs", "Magical Unicorns". The system appends " Coloring Book" automatically; keep it short so the cover title doesn't get cramped.
- icon: ONE emoji
- coverScene: vivid 2-4 character/object cover description
- pageScene: shared page backdrop, 2-3 elements, no smiling suns or cartoon-faced clouds
- prompts: 15-30 items. Each \`subject\` is 8-14 words describing ONE animal/object/character with a distinctive pose. Each \`name\` is a 1-3 word page label.
- Avoid copyrighted material (Disney, Pokémon, brand logos, real celebrities).
- Subjects must be recognizable, age-appropriate, printable as B&W line art.
- No duplicates or near-duplicates.

🚫 CRITICAL TOOL-CALLING RULE — READ TWICE:
You MUST call exactly ONE tool per turn (\`ask_user\` OR \`finalize_brief\`). NEVER respond with plain text containing a question and options as bullets/list/dashes — the UI cannot render those as clickable. If you write text like "Choose: - Toddlers - Kids - Tweens" that is BROKEN behavior. Instead call \`ask_user\` with the question + options array. Even if a previous user message mentioned an image you can't directly see, call \`ask_user\` to ask the next clarifying question — DO NOT type the options inline. Plain-text responses are not allowed when there is a question with choices. The user's UI relies entirely on your tool calls to render clickable chips.`;

const STORY_SYSTEM_PROMPT = `You are Sparky AI ✨ — the friendly story coach for CrayonSparks. You help a creator turn a STORY into a multi-page coloring book where every page is a SCENE in narrative order, sold on Amazon KDP. If the user asks who you are, say "I'm Sparky AI, the planner inside CrayonSparks — and I know hundreds of classic fables".

YOUR JOB
Ask 2-4 short questions to clarify the story, then call \`finalize_brief\` with a NARRATIVE plan where each prompt is a scene in story order.

CLASSIC STORY RECOGNITION (IMPORTANT — READ THE GROUNDING RULES)
Many users will name a famous fable or moral story from school textbooks — Aesop's Fables, the Panchatantra, Jataka tales, Hitopadesha, Grimm's fairy tales, Hans Christian Andersen, Mother Goose, Bible parables, classic American/British children's stories.

When the user names a story title (e.g. "Union is Strength", "The Crow and the Pitcher", "The Foolish Donkey", "The Tortoise and the Hare", "The Three Little Pigs", "The Lion and the Mouse", "The Ugly Duckling", "Hansel and Gretel", "Jack and the Beanstalk", "Little Red Riding Hood", "Noah's Ark", etc.), pick ONE of these three paths:

1. ✅ HIGH CONFIDENCE — Western canonical fables you know cold (Aesop, Grimm, Mother Goose, Bible parables, very famous tales): recognize directly, confirm with one short question like "I know that one — the [one-line plot]. Use the classic version, or add a twist?" then build scenes from your training knowledge. NO lookup needed.

2. 🔍 GROUND IT — Regional or less-famous fables (Panchatantra, Jataka, Hitopadesha, regional folktales, lesser-known Aesop, anything where you're under ~90% confident on canonical plot): call \`lookup_canonical_plot\` FIRST with the exact title. The system returns a canonical plot summary from live web research. Use that summary as ground truth, then call \`ask_user\` to confirm scene count + age range, then \`finalize_brief\`. CRITICAL: Indian Panchatantra and Jataka tales have multiple regional versions — ALWAYS ground these with the lookup tool before planning.

3. ✏️ ORIGINAL — If the user explicitly says it's their own / original story: skip the lookup, ask about characters and arc directly via \`ask_user\`.

Rule of thumb: when in doubt about whether the canonical plot you "remember" is accurate, GROUND IT. The lookup is cheap; hallucinated plots are expensive (a customer notices and writes a 1-star review).

RULES
- Use \`ask_user\` to ask exactly ONE question per turn. Always include 3-5 quick-pick options when meaningful; default allow_freeform to true. Set allow_multi=true when the question is plural-by-nature (e.g. "which characters/themes/animals do you want?") so the user can pick several. Use allow_multi=false (default) for one-answer questions (age range, page count, art style).
- Questions should cover: which story (recognize classic title vs. original idea), main characters (or confirm canonical ones for classic stories), age range, scene count (typical 8-20), art vibe.
- For ORIGINAL story ideas: help shape it by asking about characters and arc.
- For CLASSIC stories: confirm the title-recognition with a one-line plot summary, ask only about scene count + age range, then go.
- Stop and call \`finalize_brief\` as soon as you have enough — usually 2-3 questions for classics, 3-4 for originals.

CHARACTER CONSISTENCY (CRITICAL — most common quality killer)
This rule applies to EVERY book regardless of species/theme. Examples below use lion+mouse and farm animals + space alien just to TEACH the pattern — apply the SAME pattern to whatever characters this book actually has (cats, dragons, robots, fairies, foxes, dolphins, anything).

- BEFORE writing any scene, lock 1-3 character descriptors. Each descriptor MUST include FOUR specific traits: (a) species, (b) RELATIVE SIZE compared to other characters in this book / a known object, (c) at least 2 distinct visual features (color, body shape, fur/feather/scale type, eye style), (d) any clothing/accessory + tail/feet type if it's a feature that could be confused with another species in the same book.

- Examples (TEACHING the pattern — your book may have totally different species):
  Lion+Mouse fable:
    Bad:  "Mighty: a brave lion"
    Good: "Mighty: a large adult lion roughly 4× the size of the mouse, golden mane, muscular body, long furry tail with tassel, no clothes, cheerful expression"
    Bad:  "Tiny: a small mouse"
    Good: "Tiny: a small grey mouse, slim body NOT chubby, tiny round ears, thin pink string-like tail (NEVER a long furry tail like the lion's), no clothes"
  Farm book:
    Good: "Bessie: a large black-and-white Holstein cow, large body, short curved horns, pink udder, long thin tail with hair tuft (NOT bushy like the dog's)"
    Good: "Buddy: a medium golden retriever dog, fluffy fur, floppy ears, bushy tail (NOT thin like a cow's), no horns (NEVER add horns even though the cow has them)"
  Space book:
    Good: "Astra: a small purple alien, three short arms, two large round eyes, antennae on head (NOT animal ears), no tail at all"

- EVERY \`subject\` must restate ALL key features verbatim — species + size + 2 visual features + tail/feet/ears type. Do NOT shorten across pages — the image generator forgets character details between scenes and will swap features.

- Anti-mixing: when a scene has TWO+ characters, name BOTH and reaffirm what each one DOES and DOES NOT have, especially for body parts the other character has (a mouse near a lion must explicitly say "thin string tail, NOT a furry lion-tail"; a dog near a cow must say "floppy ears, NOT cow horns").

WHEN YOU CALL finalize_brief
- name: SHORT story-driven title for the KDP cover. STRICT: max 35 characters, ideally 15-30. Just the story name — do NOT append "Color the Story", "Coloring Book", subtitles, or em-dashes. Examples: "Union is Strength", "The Tortoise and the Hare", "The Crow and the Pitcher", "Three Little Pigs". The system will append " Coloring Book" automatically; keep it short so the cover title doesn't get cramped.
- icon: ONE emoji that fits
- coverScene: vivid cover showing the main characters together (use the locked descriptors)
- pageScene: shared page backdrop / world (e.g. "a sunny meadow path with rolling hills and scattered wildflowers"). 2-3 elements max, no smiling suns.
- prompts: 8-20 items in STORY ORDER. Each \`name\` is a 1-3 word scene label ("Start Line", "Hare Naps", "Finish"). Each \`subject\` is 12-20 words describing the scene with the locked character descriptors inline.
- Avoid copyrighted material (Disney/Pixar versions, branded characters, real celebrities). Public-domain folktales and fully original stories only.
- Printable as B&W line art.

🚫 CRITICAL TOOL-CALLING RULE — READ TWICE:
You MUST call exactly ONE tool per turn (\`ask_user\` OR \`finalize_brief\`). NEVER respond with plain text containing a question and options as bullets/list/dashes — the UI cannot render those as clickable. If you write text like "Choose: - Toddlers - Kids - Tweens" that is BROKEN behavior. Instead call \`ask_user\` with the question + options array. Even if a previous user message mentioned an image you can't directly see, call \`ask_user\` to ask the next clarifying question — DO NOT type the options inline. Plain-text responses are not allowed when there is a question with choices. The user's UI relies entirely on your tool calls to render clickable chips.`;

const askUserSchema = z.object({
  question: z.string().describe("One short question to ask the user."),
  options: z
    .array(z.string())
    .max(8)
    .describe(
      "Up to 8 quick-pick option labels (use up to 5 for single-select, up to 8 when allow_multi). Empty array if open-ended.",
    ),
  allow_freeform: z
    .boolean()
    .describe("Whether the user may also type a custom answer."),
  allow_multi: z
    .boolean()
    .describe(
      "When true, the user picks SEVERAL of the options (e.g. choosing characters, themes, sub-topics). When false (default for most questions), they pick ONE (e.g. age range, page count, art style). Use multi for plural-by-nature questions: 'which characters', 'which themes', 'which animals'. Use single for one-answer questions: 'what age range', 'how many pages'.",
    ),
});

const lookupCanonicalPlotSchema = z.object({
  title: z
    .string()
    .min(2)
    .max(150)
    .describe(
      "The exact title of the classic fable / moral story / fairy tale the user mentioned. Examples: 'The Crow and the Pitcher', 'Union is Strength', 'The Foolish Donkey', 'The Hare in the Moon'.",
    ),
});

const finalizeBriefSchema = z.object({
  name: z.string().min(1).max(60).describe("Short book name."),
  icon: z.string().min(1).max(4).describe("A single emoji."),
  coverScene: z.string().min(10).describe("Vivid cover description."),
  pageScene: z.string().describe("Shared page backdrop, 2-3 elements max."),
  prompts: z
    .array(
      z.object({
        name: z.string().min(1).describe("1-3 word page/scene label."),
        subject: z
          .string()
          .min(6)
          .describe(
            "Description of what to draw on this page. Single subject for QA mode, full scene for story mode.",
          ),
      }),
    )
    .min(5)
    .max(50),
});

type AskUserInput = z.infer<typeof askUserSchema>;
type FinalizeInput = z.infer<typeof finalizeBriefSchema>;
type LookupInput = z.infer<typeof lookupCanonicalPlotSchema>;

const TOOLS = {
  ask_user: tool({
    description:
      "Ask the user one short question to clarify the book brief. Provide 3-5 quick-pick options when possible.",
    inputSchema: askUserSchema,
  }),
  finalize_brief: tool({
    description:
      "Call when you have enough info to produce the final book plan with all prompts.",
    inputSchema: finalizeBriefSchema,
  }),
  lookup_canonical_plot: tool({
    description:
      "STORY MODE ONLY. Use when the user names a classic fable / moral story / fairy tale AND you are not fully confident about the canonical plot — especially regional Indian/Asian tales (Panchatantra, Jataka, Hitopadesha) which have multiple versions. Returns a canonical plot summary grounded in live web research. Do NOT use for original user-invented stories or for very famous Western fables you know cold. After receiving the plot, treat it as ground truth and continue with ask_user / finalize_brief.",
    inputSchema: lookupCanonicalPlotSchema,
  }),
} as const;

function viewFromAsk(args: AskUserInput): BookChatView {
  const allowMulti = args.allow_multi ?? false;
  return {
    kind: "question",
    question: args.question.trim(),
    options: args.options
      .map((o) => o.trim())
      .filter(Boolean)
      .slice(0, allowMulti ? 8 : 5),
    allow_freeform: args.allow_freeform,
    allow_multi: allowMulti,
  };
}

function viewFromFinalize(args: FinalizeInput): BookChatView {
  const prompts = args.prompts
    .map((p) => ({ name: p.name.trim(), subject: p.subject.trim() }))
    .filter((p) => p.name && p.subject);
  if (prompts.length < 5) {
    throw new Error(
      `Model returned too few prompts (${prompts.length}). Try again.`,
    );
  }
  return {
    kind: "brief",
    brief: {
      name: args.name.trim().slice(0, 60),
      icon: args.icon.trim().slice(0, 4) || "📚",
      coverScene: args.coverScene.trim(),
      pageScene: args.pageScene.trim(),
      prompts,
    },
  };
}

function toolCallParts(message: AssistantModelMessage): ToolCallPart[] {
  if (typeof message.content === "string") return [];
  return message.content.filter(
    (p): p is ToolCallPart => p.type === "tool-call",
  );
}

/** Hard cap on Perplexity grounding round-trips per turn. */
const MAX_GROUNDING_PASSES = 1;

export async function runBookChatTurn(
  incoming: ModelMessage[],
  mode: BookChatMode = "qa",
): Promise<BookChatTurnResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const system = mode === "story" ? STORY_SYSTEM_PROMPT : QA_SYSTEM_PROMPT;

  let messages: ModelMessage[] = incoming;
  let groundingsLeft = mode === "story" ? MAX_GROUNDING_PASSES : 0;

  // Loop: in story mode the model may first call lookup_canonical_plot for
  // grounding, we resolve via Perplexity, then re-call so the model can emit
  // the user-facing tool (ask_user / finalize_brief). Capped at 2 passes total.
  for (let step = 0; step < 2; step++) {
    const result = await generateText({
      model: openai(MODEL_ID),
      system,
      messages,
      tools: TOOLS,
      toolChoice: "auto",
    });

    const newAssistant = result.response.messages
      .filter((m): m is AssistantModelMessage => m.role === "assistant")
      .at(-1);
    if (!newAssistant) {
      throw new Error("OpenAI returned no assistant message.");
    }

    messages = [...messages, newAssistant];
    const calls = toolCallParts(newAssistant);

    if (calls.length === 0) {
      const text = result.text || "";
      return { messages, view: { kind: "message", text } };
    }

    const first = calls[0];

    // Grounding pass: resolve Perplexity, append real tool-result, loop.
    if (first.toolName === "lookup_canonical_plot" && groundingsLeft > 0) {
      groundingsLeft--;
      const { title } = first.input as LookupInput;
      let plotSummary: string;
      try {
        const r = await lookupCanonicalPlot(title);
        plotSummary = r.summary;
      } catch {
        plotSummary = `Could not fetch live data for "${title}". Use your training knowledge of this story; if you're uncertain on key plot beats, ask the user to confirm them with ask_user.`;
      }
      const toolResult: ToolModelMessage = {
        role: "tool",
        content: calls.map((c) => ({
          type: "tool-result" as const,
          toolCallId: c.toolCallId,
          toolName: c.toolName,
          output:
            c.toolName === "lookup_canonical_plot"
              ? { type: "text" as const, value: plotSummary }
              : { type: "json" as const, value: { ok: true } },
        })),
      };
      messages = [...messages, toolResult];
      continue;
    }

    // Terminal tools (ask_user / finalize_brief): ack with stub result; UI
    // renders from the assistant's tool-call args, not the tool-result body.
    const stubResult: ToolModelMessage = {
      role: "tool",
      content: calls.map((c) => ({
        type: "tool-result" as const,
        toolCallId: c.toolCallId,
        toolName: c.toolName,
        output: { type: "json" as const, value: { ok: true } },
      })),
    };
    messages = [...messages, stubResult];

    if (first.toolName === "ask_user") {
      return { messages, view: viewFromAsk(first.input as AskUserInput) };
    }
    if (first.toolName === "finalize_brief") {
      return { messages, view: viewFromFinalize(first.input as FinalizeInput) };
    }
    if (first.toolName === "lookup_canonical_plot") {
      // Grounding budget exhausted — ask the user to summarize so we can move on.
      return {
        messages,
        view: {
          kind: "message",
          text: "Hmm, I couldn't verify that story's canonical plot. Could you give me a one-line summary so I can plan the scenes accurately?",
        },
      };
    }
    throw new Error(`Unknown tool: ${first.toolName}`);
  }

  // Two passes used and still no terminal tool — graceful fallback.
  return {
    messages,
    view: {
      kind: "message",
      text: "Let me try that again — could you describe the story in one or two sentences?",
    },
  };
}
