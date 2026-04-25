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

const MODEL_ID = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

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
    }
  | { kind: "brief"; brief: BookBrief }
  | { kind: "message"; text: string };

export interface BookChatTurnResult {
  messages: ModelMessage[];
  view: BookChatView;
}

const QA_SYSTEM_PROMPT = `You are a friendly interviewer helping a creator design an AI-generated coloring book sold on Amazon KDP.

YOUR JOB
Ask 3-6 short questions to learn enough about the idea, then call \`finalize_brief\` with a SINGLE-SUBJECT-per-page plan.

RULES
- Use \`ask_user\` to ask exactly ONE question per turn. Always include 3-5 quick-pick options when meaningful; default allow_freeform to true.
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

ALWAYS call exactly one tool per turn.`;

const STORY_SYSTEM_PROMPT = `You are a friendly story coach helping a creator turn a STORY into a multi-page coloring book where every page is a SCENE in narrative order. Sold on Amazon KDP.

YOUR JOB
Ask 2-4 short questions to clarify the story, then call \`finalize_brief\` with a NARRATIVE plan where each prompt is a scene in story order.

CLASSIC STORY RECOGNITION (IMPORTANT)
Many users will name a famous fable or moral story from school textbooks — Aesop's Fables, the Panchatantra, Jataka tales, Hitopadesha, Grimm's fairy tales, Hans Christian Andersen, Mother Goose, Bible parables, classic American/British children's stories. If the user gives a title (e.g. "Union is Strength", "The Crow and the Pitcher", "The Boy Who Cried Wolf", "The Lion and the Mouse", "The Tortoise and the Hare", "The Three Little Pigs", "Goldilocks and the Three Bears", "The Foolish Donkey", "The Wise Old Owl", "Hansel and Gretel", "Jack and the Beanstalk", "Little Red Riding Hood", "The Ugly Duckling", "The Hare in the Moon", "Noah's Ark", etc.) — you ALREADY KNOW this story from your training. Recognize it by title and use the canonical plot. Do not ask the user to retell it. Instead confirm with one question like "I know that one — the [one-line plot]. Want me to use the classic version, or add a twist?" then build scenes faithful to the original. Only ask for plot details if the user explicitly says it is original / their own story.

RULES
- Use \`ask_user\` to ask exactly ONE question per turn. Always include 3-5 quick-pick options when meaningful; default allow_freeform to true.
- Questions should cover: which story (recognize classic title vs. original idea), main characters (or confirm canonical ones for classic stories), age range, scene count (typical 8-20), art vibe.
- For ORIGINAL story ideas: help shape it by asking about characters and arc.
- For CLASSIC stories: confirm the title-recognition with a one-line plot summary, ask only about scene count + age range, then go.
- Stop and call \`finalize_brief\` as soon as you have enough — usually 2-3 questions for classics, 3-4 for originals.

CHARACTER CONSISTENCY (CRITICAL)
- In your head, lock 1-3 short character descriptors before writing scenes. Example: "Tilly: a small green tortoise with a mossy round shell"; "Hopper: a tall lanky hare with one floppy ear and a striped scarf".
- EVERY \`subject\` must restate the character descriptor inline so the image generator renders them consistently.
- Bad:  "Tortoise crosses the finish line"
- Good: "Tilly the small green tortoise with a mossy round shell crosses the chalk finish line, smiling"

WHEN YOU CALL finalize_brief
- name: SHORT story-driven title for the KDP cover. STRICT: max 35 characters, ideally 15-30. Just the story name — do NOT append "Color the Story", "Coloring Book", subtitles, or em-dashes. Examples: "Union is Strength", "The Tortoise and the Hare", "The Crow and the Pitcher", "Three Little Pigs". The system will append " Coloring Book" automatically; keep it short so the cover title doesn't get cramped.
- icon: ONE emoji that fits
- coverScene: vivid cover showing the main characters together (use the locked descriptors)
- pageScene: shared page backdrop / world (e.g. "a sunny meadow path with rolling hills and scattered wildflowers"). 2-3 elements max, no smiling suns.
- prompts: 8-20 items in STORY ORDER. Each \`name\` is a 1-3 word scene label ("Start Line", "Hare Naps", "Finish"). Each \`subject\` is 12-20 words describing the scene with the locked character descriptors inline.
- Avoid copyrighted material (Disney/Pixar versions, branded characters, real celebrities). Public-domain folktales and fully original stories only.
- Printable as B&W line art.

ALWAYS call exactly one tool per turn.`;

const askUserSchema = z.object({
  question: z.string().describe("One short question to ask the user."),
  options: z
    .array(z.string())
    .max(5)
    .describe("Up to 5 quick-pick option labels. Empty array if open-ended."),
  allow_freeform: z
    .boolean()
    .describe("Whether the user may also type a custom answer."),
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
} as const;

function viewFromAsk(args: AskUserInput): BookChatView {
  return {
    kind: "question",
    question: args.question.trim(),
    options: args.options.map((o) => o.trim()).filter(Boolean).slice(0, 5),
    allow_freeform: args.allow_freeform,
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

export async function runBookChatTurn(
  incoming: ModelMessage[],
  mode: BookChatMode = "qa",
): Promise<BookChatTurnResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const system =
    mode === "story" ? STORY_SYSTEM_PROMPT : QA_SYSTEM_PROMPT;

  const result = await generateText({
    model: openai(MODEL_ID),
    system,
    messages: incoming,
    tools: TOOLS,
    toolChoice: "auto",
    temperature: 0.7,
  });

  const newAssistantMessages = result.response.messages.filter(
    (m): m is AssistantModelMessage => m.role === "assistant",
  );
  const assistant = newAssistantMessages[newAssistantMessages.length - 1];
  if (!assistant) {
    throw new Error("OpenAI returned no assistant message.");
  }

  const calls = toolCallParts(assistant);
  const updated: ModelMessage[] = [...incoming, assistant];

  if (calls.length === 0) {
    const text = result.text || "";
    return { messages: updated, view: { kind: "message", text } };
  }

  // Single tool call expected per turn. If the model emits multiple, take the first
  // and ack each one so the conversation stays well-formed.
  const toolResultMessage: ToolModelMessage = {
    role: "tool",
    content: calls.map((c) => ({
      type: "tool-result" as const,
      toolCallId: c.toolCallId,
      toolName: c.toolName,
      output: { type: "json" as const, value: { ok: true } },
    })),
  };
  updated.push(toolResultMessage);

  const first = calls[0];
  if (first.toolName === "ask_user") {
    return {
      messages: updated,
      view: viewFromAsk(first.input as AskUserInput),
    };
  }
  if (first.toolName === "finalize_brief") {
    return {
      messages: updated,
      view: viewFromFinalize(first.input as FinalizeInput),
    };
  }
  throw new Error(`Unknown tool: ${first.toolName}`);
}
