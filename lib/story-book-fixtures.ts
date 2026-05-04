/**
 * Test fixtures for the story-book pipeline (Phase 1, toddler band).
 *
 * Each fixture is a complete story (characters + palette + cover scene +
 * scenes with dialogue) used by /api/generate-story-book-test and the
 * /story-book-test page to validate the pipeline before the real chat
 * planning flow lands. Add more entries to `STORY_BOOK_FIXTURES` to
 * exercise different themes / palettes / character counts.
 *
 * The PROMPTS in lib/prompts/story-page.ts and lib/prompts/story-cover.ts
 * are 100% generic — none of them mention any character or theme from
 * any fixture below. Fixtures are JUST test data; nothing in production
 * depends on them.
 */

import type {
  StoryCharacter,
  StoryDialogueLine,
  StoryPalette,
} from "@/lib/prompts";

export interface StorySceneFixture {
  id: string;
  name: string;
  scene: string;
  dialogue?: StoryDialogueLine[];
  narration?: string;
  composition?: string;
}

export interface StoryBookFixture {
  slug: string;
  title: string;
  characters: StoryCharacter[];
  palette: StoryPalette;
  /**
   * Description of the front cover composition — who appears together,
   * what they're doing, the setting. Defines THE LOOK of the book; the
   * cover is passed back to every interior page as the visual anchor.
   */
  coverScene: string;
  /** Optional camera / framing hint for the cover. */
  coverComposition?: string;
  /**
   * Description of the back cover composition (upper zone). Typically a
   * single character close-up portrait or a simple complementary scene.
   */
  backCoverScene: string;
  /** Optional camera / framing hint for the back cover. */
  backCoverComposition?: string;
  /**
   * Short marketing tagline rendered in the back cover's middle zone.
   * Hard cap 22 words for the toddler band; one or two short sentences.
   */
  backCoverTagline: string;
  scenes: StorySceneFixture[];
}

const PIP_DESCRIPTOR =
  "a small round black-and-white panda about 4 years old, big round white face with two oval black eye-patches, tiny rounded ears, plump cuddly body with white belly, short tail, no tail tuft, wearing a bright red backpack with a yellow zipper, no other clothing, always rendered with a friendly soft expression";

const TEACHER_DESCRIPTOR =
  "a tall friendly adult brown bear teacher with warm honey-brown fur, kind round eyes behind small oval glasses, wearing a soft sky-blue cardigan over a plain white shirt, holding a single small wooden clipboard, calm welcoming smile";

const FRIEND_DESCRIPTOR =
  "a small fluffy yellow duckling classmate the same size as Pip, soft pastel-yellow feathers, tiny orange beak, two tiny round black eyes, two small webbed orange feet, no clothing, cheerful bouncy posture";

export const PIP_THE_PANDA: StoryBookFixture = {
  slug: "pip-the-panda-first-day",
  title: "Pip the Panda's First Day at School",
  characters: [
    { name: "Pip", descriptor: PIP_DESCRIPTOR },
    { name: "Miss Honey", descriptor: TEACHER_DESCRIPTOR },
    { name: "Daisy", descriptor: FRIEND_DESCRIPTOR },
  ],
  palette: {
    name: "Cheerful bright",
    hexes: [
      "#FFD93D",
      "#FF6B6B",
      "#4ECDC4",
      "#FFE5B4",
      "#A8E6CF",
      "#FFFFFF",
      "#2C3E50",
      "#F4A261",
    ],
  },
  coverScene:
    "Pip the panda stands proudly in the middle wearing his red backpack with a friendly smile, Daisy the yellow duckling on his right and Miss Honey the bear teacher on his left, the three of them grouped warmly in front of a small cheerful school building with a sunny blue sky and soft cream clouds, ready for the first day.",
  coverComposition:
    "centered group portrait, characters fill the lower two-thirds, title block sits above them in the top third, school building and sky behind",
  backCoverScene:
    "Pip the panda close-up portrait waving cheerfully with a small smile, his red backpack visible, on a soft sunny pastel-blue sky background with one or two cream clouds, no other characters and no school building.",
  backCoverComposition:
    "centered character portrait fills the upper zone, character looks slightly toward the viewer",
  backCoverTagline:
    "Pip's first day at school. New friends, big feelings, and a happy ending for little readers.",
  scenes: [
    {
      id: "scene-01",
      name: "Backpack morning",
      scene:
        "Pip stands in a sunny bedroom doorway holding the strap of his red backpack, looking nervous but brave, soft morning light from a window.",
      dialogue: [
        {
          speaker: "Pip",
          text: "My very first day. I can do this.",
        },
      ],
      composition: "mid-shot, Pip slightly left of center, doorway behind him",
    },
    {
      id: "scene-02",
      name: "Walking to school",
      scene:
        "Pip walks down a tidy neighborhood path with green hedges and small flowers, his red backpack bobbing, the school's cheerful red roof visible ahead.",
      narration: "The big day was finally here.",
      composition: "side-on wide shot, Pip walking left to right",
    },
    {
      id: "scene-03",
      name: "School gate",
      scene:
        "Pip stops at a small painted school gate, looking up at a sign-shaped wooden plaque with no letters, his eyes wide with wonder.",
      dialogue: [
        {
          speaker: "Pip",
          text: "Wow. It's so big.",
        },
      ],
    },
    {
      id: "scene-04",
      name: "Meeting Miss Honey",
      scene:
        "Pip stands in a bright classroom doorway facing Miss Honey the bear teacher, who smiles warmly and offers a gentle wave.",
      dialogue: [
        {
          speaker: "Miss Honey",
          text: "Welcome, Pip! Come on in, friend.",
        },
        { speaker: "Pip", text: "Hello, Miss Honey." },
      ],
    },
    {
      id: "scene-05",
      name: "Backpack tumble",
      scene:
        "Pip trips over his own red backpack strap and tumbles forward onto a soft round rug, legs in the air, surprised but unhurt, classroom toys scattered around.",
      dialogue: [
        {
          speaker: "Pip",
          text: "Oof! That backpack is sneaky.",
        },
      ],
      composition: "low-angle close-up, motion lines around Pip",
    },
    {
      id: "scene-06",
      name: "Daisy says hi",
      scene:
        "Daisy the yellow duckling waddles up to Pip on the rug, head tilted curiously, both characters at the same height.",
      dialogue: [
        { speaker: "Daisy", text: "Hi! I'm Daisy. Are you new?" },
        { speaker: "Pip", text: "Yes. I just got here." },
      ],
    },
    {
      id: "scene-07",
      name: "Show and tell",
      scene:
        "Pip and Daisy sit cross-legged on the colorful classroom rug, listening, with two unnamed simple silhouetted classmates in the background.",
      narration: "Show and tell was already starting.",
    },
    {
      id: "scene-08",
      name: "Pip's bamboo",
      scene:
        "Pip stands at the front of the rug holding up a small green bamboo stalk, smiling shyly, classroom blackboard behind him with no readable letters.",
      dialogue: [{ speaker: "Pip", text: "This is my favorite snack." }],
    },
    {
      id: "scene-09",
      name: "Lunchbox swap",
      scene:
        "Pip and Daisy sit at a small low lunch table looking at two open lunchboxes, confused and giggling — they reached for the wrong ones.",
      dialogue: [
        { speaker: "Daisy", text: "Wait. This isn't my sandwich!" },
        { speaker: "Pip", text: "Oops! Let's swap." },
      ],
      composition: "overhead-ish view, both lunchboxes visible between them",
    },
    {
      id: "scene-10",
      name: "Painting time",
      scene:
        "Pip sits at a small art easel painting a wobbly red heart with a fat brush, a smudge of yellow paint on his cheek, classroom paint pots beside him.",
      narration: "Painting was the best part so far.",
    },
    {
      id: "scene-11",
      name: "Story circle",
      scene:
        "Miss Honey sits in a small chair holding a closed picture book, Pip and Daisy sit on the rug in front looking up, calm cozy classroom.",
      dialogue: [
        {
          speaker: "Miss Honey",
          text: "Today's story is about brave bears.",
        },
      ],
    },
    {
      id: "scene-12",
      name: "Pip helps",
      scene:
        "Pip helps a sad-looking Daisy reach a small toy on a low classroom shelf, both characters smiling, soft afternoon light.",
      dialogue: [{ speaker: "Pip", text: "Here. I got it for you." }],
    },
    {
      id: "scene-13",
      name: "Friendship bracelet",
      scene:
        "Daisy hands Pip a small braided yellow-and-red friendship bracelet, both holding it together at the center of a small classroom table.",
      dialogue: [
        { speaker: "Daisy", text: "I made this. For my new friend." },
      ],
    },
    {
      id: "scene-14",
      name: "Recess",
      scene:
        "Pip and Daisy run together across a sunny school playground with soft green grass and a small blue slide in the background, happy mid-stride.",
      narration: "Recess was full of laughter.",
      composition: "wide shot, both characters small in frame, sky filling top",
    },
    {
      id: "scene-15",
      name: "Goodbye",
      scene:
        "Miss Honey waves at the classroom door as Pip and Daisy walk out together, Pip's red backpack now over both shoulders.",
      dialogue: [
        { speaker: "Miss Honey", text: "See you tomorrow, friends!" },
        { speaker: "Pip", text: "Bye, Miss Honey!" },
      ],
    },
    {
      id: "scene-16",
      name: "Going home",
      scene:
        "Pip walks home down the same neighborhood path, smiling brightly now, holding the friendship bracelet up to the warm afternoon sun.",
      narration: "The first day was the best day.",
      composition: "side-on wide shot, walking right to left",
    },
  ],
};

/**
 * Registry of test fixtures. Add new stories here; the test page reads
 * from this map and lets the user pick which one to validate.
 */
export const STORY_BOOK_FIXTURES: Record<string, StoryBookFixture> = {
  [PIP_THE_PANDA.slug]: PIP_THE_PANDA,
};

export const DEFAULT_FIXTURE_SLUG = PIP_THE_PANDA.slug;

export function getFixture(slug: string | undefined): StoryBookFixture {
  if (slug && STORY_BOOK_FIXTURES[slug]) return STORY_BOOK_FIXTURES[slug];
  return STORY_BOOK_FIXTURES[DEFAULT_FIXTURE_SLUG];
}

export function listFixtureSlugs(): string[] {
  return Object.keys(STORY_BOOK_FIXTURES);
}
