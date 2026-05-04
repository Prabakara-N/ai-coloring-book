/**
 * Throwaway smoke-test for the story-book prompt builders. Run with:
 *   npx tsx scripts/check-story-prompt.ts
 *
 * Verifies: prompts build, stay under the 20k char hard cap, and contain
 * no emoji (per AGENTS.md "no emoji in prompts" rule). Delete after the
 * pipeline is wired into the studio UI.
 */

import {
  STORY_PAGE_TODDLER_SYSTEM,
  STORY_PAGE_TODDLER_USER,
  STORY_COVER_TODDLER_SYSTEM,
  STORY_COVER_TODDLER_USER,
} from "@/lib/prompts";
import { PIP_THE_PANDA } from "@/lib/story-book-fixtures";

function check(label: string, system: string, user: string): boolean {
  console.log(`\n=== ${label} ===`);
  console.log("SYSTEM length:", system.length, "USER length:", user.length);
  console.log("Total:", system.length + user.length + 1);
  const combined = system + " " + user;
  const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(combined);
  console.log("Contains emoji?", hasEmoji);
  if (hasEmoji) {
    console.error("FAILED: prompt contains emoji.");
    return false;
  }
  if (system.length + user.length > 20000) {
    console.error("FAILED: prompt exceeds 20000-char hard cap.");
    return false;
  }
  return true;
}

const pageScene = PIP_THE_PANDA.scenes[3];
const pageUser = STORY_PAGE_TODDLER_USER({
  characters: PIP_THE_PANDA.characters,
  palette: PIP_THE_PANDA.palette,
  scene: pageScene.scene,
  dialogue: pageScene.dialogue,
  narration: pageScene.narration,
  composition: pageScene.composition,
});

const coverUser = STORY_COVER_TODDLER_USER({
  title: PIP_THE_PANDA.title,
  characters: PIP_THE_PANDA.characters,
  palette: PIP_THE_PANDA.palette,
  coverScene: PIP_THE_PANDA.coverScene,
  composition: PIP_THE_PANDA.coverComposition,
});

const okPage = check(
  `PAGE prompt (scene 4 "${pageScene.name}")`,
  STORY_PAGE_TODDLER_SYSTEM,
  pageUser,
);
const okCover = check("COVER prompt", STORY_COVER_TODDLER_SYSTEM, coverUser);

if (!okPage || !okCover) process.exit(1);
console.log("\nOK: both prompts clean and within size budget.");
