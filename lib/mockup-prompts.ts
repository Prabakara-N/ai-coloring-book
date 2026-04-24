export interface MockupStyle {
  id: string;
  label: string;
  description: string;
  aspect: "1:1" | "3:4" | "4:3" | "16:9";
  prompt: string;
}

export const MOCKUP_STYLES: MockupStyle[] = [
  {
    id: "flat-lay",
    label: "Flat lay with crayons",
    description: "Book lying flat on a light wooden table with a Crayola box and scattered crayons beside it.",
    aspect: "16:9",
    prompt:
      "Photorealistic product photography in natural bright daylight. A children's coloring book lies flat on a clean light-wood table. The cover design of the book exactly matches the reference image. To the right of the book, a colorful box of children's crayons; in the foreground, a few crayons scattered casually. Soft natural shadows, white and warm cream background fading out, premium Amazon-style product shot, 16:9 aspect ratio, shallow depth of field, ultra high detail. No text overlays, no watermarks, no extra labels — just the product itself as it would appear in a lifestyle photo.",
  },
  {
    id: "open-book",
    label: "Open book — inside pages",
    description: "Book open on a desk showing a sample line-art page inside, with a crayon resting on the page.",
    aspect: "16:9",
    prompt:
      "Photorealistic product photography: a children's coloring book lies open on a light wood desk. The left page is blank white, the right page shows a simple black-and-white line-art illustration (cute friendly animal) for children to color. A single colored crayon rests on the lower-right corner of the open page. Natural daylight from a window creating gentle shadows, Amazon-style hero product image, 16:9 aspect ratio, shallow depth of field, ultra-sharp detail, soft cream and wood-tone palette. No text overlays, no watermarks.",
  },
  {
    id: "hand-coloring",
    label: "Kid's hand coloring",
    description: "A small child's hand holding a crayon, mid-coloring on one of the book's pages.",
    aspect: "16:9",
    prompt:
      "Photorealistic lifestyle shot: a close-up of a small child's hand (no face visible) holding a red crayon, actively coloring in a black-and-white line-art illustration on a page of a children's coloring book open on a wooden table. The cover of the book (visible slightly in the background) matches the reference image. Warm natural sunlight, bright cheerful atmosphere, white and wood palette, 16:9 aspect ratio, Amazon lifestyle product photography, shallow depth of field. No text overlays, no watermarks.",
  },
  {
    id: "bundle-stack",
    label: "Stack of 3 books",
    description: "Three copies of the coloring book stacked on a plain surface with a crayon on top.",
    aspect: "1:1",
    prompt:
      "Photorealistic product photography: three identical copies of the same children's coloring book stacked neatly on a plain off-white surface. The topmost book's cover design exactly matches the reference image. A single red crayon rests diagonally on the top cover. Soft even studio lighting, drop shadow underneath, clean and professional Amazon bundle product shot, 1:1 square aspect ratio, ultra-sharp detail. No text overlays, no watermarks.",
  },
  {
    id: "features-callout",
    label: "Infographic callouts",
    description: "Book in the center with minimal feature bullets (20 pages, thick lines, single-sided) annotated.",
    aspect: "1:1",
    prompt:
      "Clean Amazon A+ style infographic: a children's coloring book stands upright in the center of a soft cream background. Around it, three small minimalist icon callouts with short labels: '20 pages', 'Thick outlines', 'Single-sided'. Use navy indigo and orange accent colors. The cover of the book matches the reference image. 1:1 aspect ratio, modern premium e-commerce infographic style, ultra-sharp, plenty of negative space.",
  },
  {
    id: "gift-wrapped",
    label: "Gift-wrapped",
    description: "Book beside a wrapped gift with ribbon — birthday or Easter basket themed.",
    aspect: "4:3",
    prompt:
      "Photorealistic product photography: a children's coloring book leans against a small pastel gift with a soft pink ribbon, on a light wooden surface with a few scattered colorful ribbons and a small bow. Cover design exactly matches the reference image. Warm natural lighting, cheerful birthday-gift atmosphere, pastel cream background, 4:3 aspect ratio, Amazon lifestyle product photography. No text overlays, no watermarks.",
  },
];

export function findMockupStyle(id: string): MockupStyle | undefined {
  return MOCKUP_STYLES.find((m) => m.id === id);
}
