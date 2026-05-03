import type { ColoringCategory } from "./types";

export const CATEGORIES: ColoringCategory[] = [
  {
    slug: "farm-animals",
    number: 1,
    name: "Farm Animals",
    icon: "🐄",
    description: "20 barnyard favorites — cows, pigs, ducks, sheep & more",
    scene:
      "a pastoral farm landscape with a red barn and silo in the distance, rolling green hills, a simple wooden fence, a plain sun and fluffy clouds in the sky, plus scattered flowers and tufts of grass on the ground",
    coverScene:
      "a happy cartoon cow with a cowbell, a smiling pink pig, and a yellow duckling standing together in front of a red barn, with a green pasture, white picket fence, and a few flowers around them",
    coverTitle: "Farm Animals Coloring Book",
    kdp: {
      title:
        "Farm Animals Coloring Book for Kids Ages 3-6: 20 Big & Simple Drawings | Single-Sided Pages",
      description:
        "A fun first coloring book for toddlers and preschoolers who love farm animals! 20 large, kid-friendly line drawings of cows, pigs, ducks, sheep, horses, chickens, rabbits, and more barnyard favorites.",
      keywords: [
        "farm animals coloring book kids",
        "toddler coloring book ages 3-6",
        "preschool coloring book animals",
        "cow pig duck coloring book",
        "big and simple coloring book",
        "single sided coloring book kids",
        "homeschool activity book preschool",
      ],
      coverPrompt:
        "Happy cartoon cow, pig and duck standing together on a farm with barn and sun in background.",
    },
    prompts: [
      {
        id: "1.01",
        name: "Cow",
        subject: "happy cow standing in a farm field",
      },
      {
        id: "1.02",
        name: "Pig",
        subject: "smiling pig sitting with curly tail",
      },
      { id: "1.03", name: "Sheep", subject: "fluffy sheep grazing on grass" },
      {
        id: "1.04",
        name: "Horse",
        subject: "cute horse trotting with flowing mane",
      },
      { id: "1.05", name: "Duck", subject: "waddling duck with open beak" },
      { id: "1.06", name: "Chicken", subject: "chicken pecking at the ground" },
      { id: "1.07", name: "Goat", subject: "friendly goat with small horns" },
      {
        id: "1.08",
        name: "Rooster",
        subject: "rooster crowing with tail feathers",
      },
      {
        id: "1.09",
        name: "Rabbit",
        subject: "rabbit with long floppy ears and short tail",
      },
      { id: "1.10", name: "Donkey", subject: "donkey standing with long ears" },
      {
        id: "1.11",
        name: "Turkey",
        subject: "turkey with tail feathers fanned out",
      },
      { id: "1.12", name: "Goose", subject: "goose walking with long neck" },
      { id: "1.13", name: "Llama", subject: "llama standing with fluffy coat" },
      { id: "1.14", name: "Piglet", subject: "tiny piglet with curly tail" },
      { id: "1.15", name: "Calf", subject: "baby cow with spotted body" },
      { id: "1.16", name: "Lamb", subject: "baby sheep with fluffy wool" },
      { id: "1.17", name: "Foal", subject: "baby horse with long legs" },
      {
        id: "1.18",
        name: "Chick",
        subject: "fluffy yellow chick hatching from egg",
      },
      { id: "1.19", name: "Sheepdog", subject: "farm dog with wagging tail" },
      { id: "1.20", name: "Farm Cat", subject: "cat sitting on a hay bale" },
    ],
  },
  {
    slug: "wild-animals",
    number: 2,
    name: "Wild Animals",
    icon: "🦁",
    description: "20 jungle & safari drawings — lion, tiger, elephant & more",
    scene:
      "an African savanna and jungle scene with acacia trees, tall grass, rolling hills in the distance, a warm sun and wispy clouds, plus a few rocks and scattered leaves on the ground",
    coverScene:
      "a cheerful cartoon lion with a fluffy mane, a smiling tiger with stripes, a happy elephant with a raised trunk, and a friendly giraffe together in a colorful jungle with palm trees",
    coverTitle: "Wild Animals Coloring Book",
    kdp: {
      title:
        "Wild Animals Coloring Book for Kids Ages 3-6: 20 Jungle & Safari Drawings | Lion, Tiger, Elephant",
      description:
        "Take your little one on a safari adventure with 20 big, friendly wild animal drawings! Features lions, tigers, elephants, giraffes, zebras, monkeys, pandas, kangaroos, and more jungle favorites.",
      keywords: [
        "wild animals coloring book kids",
        "jungle animals coloring book toddler",
        "safari coloring book ages 3-6",
        "lion tiger elephant coloring book",
        "zoo animals coloring book preschool",
        "single sided animal coloring book",
        "big simple coloring book boys girls",
      ],
      coverPrompt:
        "Happy cartoon lion, tiger, elephant and giraffe together in a jungle scene with trees and sun.",
    },
    prompts: [
      {
        id: "2.01",
        name: "Lion",
        subject: "friendly lion with big fluffy mane",
      },
      {
        id: "2.02",
        name: "Tiger",
        subject: "tiger with cartoon stripes and smile",
      },
      {
        id: "2.03",
        name: "Elephant",
        subject: "elephant with trunk raised up",
      },
      {
        id: "2.04",
        name: "Giraffe",
        subject: "tall giraffe with simple spot patterns",
      },
      { id: "2.05", name: "Zebra", subject: "zebra standing with stripes" },
      {
        id: "2.06",
        name: "Monkey",
        subject: "monkey sitting on a tree branch",
      },
      {
        id: "2.07",
        name: "Bear",
        subject: "chubby bear standing on hind legs",
      },
      { id: "2.08", name: "Panda", subject: "panda eating bamboo, sitting" },
      {
        id: "2.09",
        name: "Kangaroo",
        subject: "kangaroo with baby joey in pouch",
      },
      {
        id: "2.10",
        name: "Hippopotamus",
        subject: "big happy hippo with open mouth",
      },
      { id: "2.11", name: "Rhinoceros", subject: "rhino with single horn" },
      { id: "2.12", name: "Cheetah", subject: "running cheetah with spots" },
      {
        id: "2.13",
        name: "Leopard",
        subject: "leopard resting with spot pattern",
      },
      { id: "2.14", name: "Gorilla", subject: "friendly gorilla sitting" },
      { id: "2.15", name: "Wolf", subject: "wolf howling at the moon" },
      { id: "2.16", name: "Fox", subject: "fox sitting with bushy tail" },
      { id: "2.17", name: "Koala", subject: "koala hugging a tree branch" },
      { id: "2.18", name: "Sloth", subject: "sloth hanging from a branch" },
      { id: "2.19", name: "Deer", subject: "deer with small antlers" },
      { id: "2.20", name: "Squirrel", subject: "squirrel holding an acorn" },
    ],
  },
  {
    slug: "sea-creatures",
    number: 3,
    name: "Sea Creatures",
    icon: "🐬",
    description: "20 ocean animals — fish, dolphin, octopus & more",
    scene:
      "an underwater ocean scene with swaying seaweed, a few coral formations, rising bubbles, sandy ocean floor, and gentle wave lines at the surface",
    coverScene:
      "a smiling dolphin jumping out of the water, a cheerful orange clownfish, a friendly purple octopus, and a green sea turtle swimming together among bubbles and colorful coral",
    coverTitle: "Sea Creatures Coloring Book",
    kdp: {
      title:
        "Sea Creatures Coloring Book for Kids Ages 3-6: 20 Ocean Animals | Fish, Dolphin, Octopus & More",
      description:
        "Dive into the ocean with this underwater adventure coloring book! 20 big, kid-friendly line drawings of fish, dolphins, octopuses, turtles, whales, starfish, seahorses, and other ocean creatures.",
      keywords: [
        "sea creatures coloring book kids",
        "ocean animals coloring book toddler",
        "under the sea coloring book preschool",
        "fish dolphin octopus coloring book",
        "marine animals coloring book ages 3-6",
        "single sided ocean coloring book",
        "beach vacation activity book kids",
      ],
      coverPrompt:
        "Happy cartoon fish, dolphin, octopus and sea turtle swimming together underwater with bubbles and seaweed.",
    },
    prompts: [
      { id: "3.01", name: "Fish", subject: "cute fish swimming with bubble" },
      {
        id: "3.02",
        name: "Octopus",
        subject: "octopus with eight curly tentacles",
      },
      { id: "3.03", name: "Crab", subject: "crab with big friendly claws" },
      { id: "3.04", name: "Shark", subject: "smiling friendly shark" },
      { id: "3.05", name: "Dolphin", subject: "dolphin jumping out of water" },
      {
        id: "3.06",
        name: "Sea Turtle",
        subject: "sea turtle with patterned shell",
      },
      { id: "3.07", name: "Seahorse", subject: "seahorse with curled tail" },
      {
        id: "3.08",
        name: "Jellyfish",
        subject: "jellyfish with flowing tentacles",
      },
      {
        id: "3.09",
        name: "Starfish",
        subject: "five-pointed starfish with smile",
      },
      { id: "3.10", name: "Whale", subject: "whale with water spout" },
      { id: "3.11", name: "Puffer Fish", subject: "puffer fish all puffed up" },
      { id: "3.12", name: "Lobster", subject: "lobster with big claws" },
      { id: "3.13", name: "Clownfish", subject: "striped clownfish swimming" },
      { id: "3.14", name: "Eel", subject: "wavy eel with long body" },
      { id: "3.15", name: "Angelfish", subject: "angelfish with long fins" },
      { id: "3.16", name: "Manta Ray", subject: "manta ray with wide wings" },
      { id: "3.17", name: "Walrus", subject: "walrus with long tusks" },
      { id: "3.18", name: "Penguin", subject: "penguin standing on ice" },
      {
        id: "3.19",
        name: "Sea Otter",
        subject: "sea otter floating on back holding a shell",
      },
      { id: "3.20", name: "Narwhal", subject: "narwhal with spiral horn" },
    ],
  },
  {
    slug: "birds",
    number: 4,
    name: "Birds",
    icon: "🦜",
    description: "20 colorful birds — peacock, parrot, owl & more",
    scene:
      "a garden scene with a tree branch, a few leaves, small flowers below, and fluffy clouds and a plain sun in the sky",
    coverScene:
      "a colorful parrot on a branch, a peacock showing its tail feathers, and a wise-looking owl together in a flower garden with a rainbow",
    coverTitle: "Birds Coloring Book",
    kdp: {
      title:
        "Birds Coloring Book for Kids Ages 3-6: 20 Colorful Bird Drawings | Peacock, Parrot, Owl & More",
      description:
        "A beautiful first bird-watching coloring book for young children! Features 20 big, simple drawings of parrots, peacocks, owls, eagles, swans, flamingos, toucans, hummingbirds, and more feathered friends.",
      keywords: [
        "birds coloring book kids",
        "bird coloring book toddler ages 3-6",
        "peacock parrot owl coloring book",
        "nature coloring book preschool",
        "easy bird coloring book big lines",
        "single sided bird coloring book",
        "bird watching activity book kids",
      ],
      coverPrompt:
        "Happy cartoon peacock, parrot and owl together in a colorful garden with flowers.",
    },
    prompts: [
      {
        id: "4.01",
        name: "Parrot",
        subject: "colorful parrot on a branch (in line art)",
      },
      {
        id: "4.02",
        name: "Peacock",
        subject: "peacock with tail feathers fanned out",
      },
      {
        id: "4.03",
        name: "Owl",
        subject: "owl with big round eyes on a branch",
      },
      { id: "4.04", name: "Eagle", subject: "eagle with spread wings" },
      { id: "4.05", name: "Swan", subject: "elegant swan swimming" },
      { id: "4.06", name: "Flamingo", subject: "flamingo standing on one leg" },
      { id: "4.07", name: "Toucan", subject: "toucan with big colorful beak" },
      {
        id: "4.08",
        name: "Hummingbird",
        subject: "tiny hummingbird near a flower",
      },
      { id: "4.09", name: "Robin", subject: "robin bird with a worm" },
      { id: "4.10", name: "Sparrow", subject: "small sparrow on a branch" },
      { id: "4.11", name: "Crow", subject: "crow sitting on a fence" },
      { id: "4.12", name: "Woodpecker", subject: "woodpecker on a tree trunk" },
      { id: "4.13", name: "Pigeon", subject: "pigeon standing on a rooftop" },
      {
        id: "4.14",
        name: "Cardinal",
        subject: "cardinal bird on a snowy branch",
      },
      { id: "4.15", name: "Bluejay", subject: "bluejay with head crest" },
      {
        id: "4.16",
        name: "Ostrich",
        subject: "ostrich with long legs and neck",
      },
      {
        id: "4.17",
        name: "Kingfisher",
        subject: "kingfisher diving toward water",
      },
      { id: "4.18", name: "Duckling", subject: "baby duckling waddling" },
      { id: "4.19", name: "Pelican", subject: "pelican with big bill" },
      { id: "4.20", name: "Seagull", subject: "seagull flying over waves" },
    ],
  },
  {
    slug: "insects-bugs",
    number: 5,
    name: "Insects & Bugs",
    icon: "🦋",
    description: "20 garden bugs — butterfly, ladybug, bee & more",
    scene:
      "a cheerful garden scene with tall flowers, blades of grass, a few leaves, small mushrooms, a flying butterfly in the distance, and fluffy clouds and a plain sun",
    coverScene:
      "a colorful butterfly, a red ladybug with black spots, and a yellow-and-black striped bee together flying over a garden full of flowers and tall grass",
    coverTitle: "Bugs & Insects Coloring Book",
    kdp: {
      title:
        "Bugs & Insects Coloring Book for Kids Ages 3-6: 20 Fun Drawings | Butterfly, Ladybug, Bee & More",
      description:
        "Discover the tiny world of bugs and insects! 20 big, friendly drawings of butterflies, bees, ladybugs, ants, caterpillars, dragonflies, spiders, and more garden creatures.",
      keywords: [
        "bugs coloring book kids",
        "insects coloring book ages 3-6",
        "butterfly ladybug bee coloring book",
        "garden bugs coloring book toddler",
        "nature insects coloring book preschool",
        "single sided bug coloring book",
        "easy coloring book big outlines kids",
      ],
      coverPrompt:
        "Happy cartoon butterfly, ladybug and bee flying in a garden with flowers and grass.",
    },
    prompts: [
      {
        id: "5.01",
        name: "Butterfly",
        subject: "butterfly with patterned wings",
      },
      {
        id: "5.02",
        name: "Honey Bee",
        subject: "striped honey bee with round body",
      },
      { id: "5.03", name: "Ladybug", subject: "ladybug with spots on shell" },
      { id: "5.04", name: "Ant", subject: "ant carrying a leaf" },
      {
        id: "5.05",
        name: "Caterpillar",
        subject: "segmented caterpillar inching on leaf",
      },
      { id: "5.06", name: "Dragonfly", subject: "dragonfly with long wings" },
      {
        id: "5.07",
        name: "Grasshopper",
        subject: "grasshopper with long jumping legs",
      },
      {
        id: "5.08",
        name: "Cricket",
        subject: "cricket sitting on a blade of grass",
      },
      { id: "5.09", name: "Beetle", subject: "beetle with hard shiny shell" },
      { id: "5.10", name: "Spider", subject: "friendly spider on a web" },
      { id: "5.11", name: "Firefly", subject: "firefly with glowing tail" },
      { id: "5.12", name: "Moth", subject: "moth with spread wings" },
      {
        id: "5.13",
        name: "Bumblebee",
        subject: "fluffy bumblebee carrying flower",
      },
      { id: "5.14", name: "Snail", subject: "snail with spiral shell" },
      { id: "5.15", name: "Worm", subject: "wiggling earthworm" },
      {
        id: "5.16",
        name: "Centipede",
        subject: "centipede with many tiny legs",
      },
      {
        id: "5.17",
        name: "Praying Mantis",
        subject: "praying mantis with folded arms",
      },
      { id: "5.18", name: "Wasp", subject: "wasp with striped body" },
      {
        id: "5.19",
        name: "Stag Beetle",
        subject: "stag beetle with big pincers",
      },
      { id: "5.20", name: "Glow Worm", subject: "bright glow worm at night" },
    ],
  },
  {
    slug: "vehicles",
    number: 6,
    name: "Vehicles",
    icon: "🚒",
    description: "20 trucks, cars & trains — big & easy drawings",
    scene:
      "a simple town scene with a road, a few cartoon buildings in the distance, road signs, trees along the sidewalk, and a sky with a plain sun and fluffy clouds",
    coverScene:
      "a red fire truck with a ladder, a yellow school bus with windows full of kids, and a red race car on a sunny road, with cartoon city buildings behind them",
    coverTitle: "Vehicles Coloring Book",
    kdp: {
      title:
        "Vehicles Coloring Book for Kids Ages 3-6: 20 Trucks, Cars & Trains | Big & Easy Drawings",
      description:
        "The ultimate coloring book for little vehicle fans! 20 big, exciting drawings of cars, trucks, fire engines, school buses, trains, airplanes, helicopters, tractors, monster trucks, and more.",
      keywords: [
        "vehicles coloring book kids",
        "trucks cars coloring book toddler",
        "fire truck police car coloring book",
        "transportation coloring book ages 3-6",
        "boys coloring book vehicles big lines",
        "single sided truck coloring book",
        "construction vehicles coloring book kids",
      ],
      coverPrompt:
        "Happy cartoon fire truck, school bus and race car together on a sunny road with city buildings behind.",
    },
    prompts: [
      {
        id: "6.01",
        name: "Car",
        subject: "cartoon sedan car with headlight eyes",
      },
      {
        id: "6.02",
        name: "School Bus",
        subject: "yellow school bus with windows",
      },
      { id: "6.03", name: "Dump Truck", subject: "dump truck with raised bed" },
      { id: "6.04", name: "Train", subject: "steam locomotive with smoke" },
      {
        id: "6.05",
        name: "Airplane",
        subject: "passenger airplane flying in sky",
      },
      {
        id: "6.06",
        name: "Helicopter",
        subject: "helicopter with spinning propeller",
      },
      {
        id: "6.07",
        name: "Sailboat",
        subject: "sailboat with triangular sail",
      },
      { id: "6.08", name: "Bicycle", subject: "bicycle with two wheels" },
      { id: "6.09", name: "Motorcycle", subject: "motorcycle with rider" },
      {
        id: "6.10",
        name: "Tractor",
        subject: "farm tractor with big rear wheels",
      },
      {
        id: "6.11",
        name: "Fire Engine",
        subject: "fire truck with long ladder",
      },
      {
        id: "6.12",
        name: "Police Car",
        subject: "police car with light bar on top",
      },
      { id: "6.13", name: "Ambulance", subject: "ambulance with red cross" },
      {
        id: "6.14",
        name: "Race Car",
        subject: "sporty racing car with spoiler",
      },
      {
        id: "6.15",
        name: "Monster Truck",
        subject: "monster truck with huge wheels",
      },
      {
        id: "6.16",
        name: "Submarine",
        subject: "submarine underwater with periscope",
      },
      {
        id: "6.17",
        name: "Rocket",
        subject: "rocket blasting off with flames",
      },
      {
        id: "6.18",
        name: "Hot Air Balloon",
        subject: "hot air balloon with basket",
      },
      { id: "6.19", name: "Bulldozer", subject: "bulldozer with front scoop" },
      {
        id: "6.20",
        name: "Garbage Truck",
        subject: "garbage truck with bin on the side",
      },
    ],
  },
  {
    slug: "fruits",
    number: 7,
    name: "Fruits",
    icon: "🍎",
    description: "20 tasty fruits — apple, banana, mango & more",
    scene:
      "a kitchen-table scene with a simple fruit bowl, a checkered tablecloth, a window with sunlight streaming in, and small leaves and vines around",
    coverScene:
      "a smiling red apple, a bright yellow banana, a juicy strawberry, and a slice of watermelon with cartoon faces, all arranged together on a picnic blanket",
    coverTitle: "Fruits Coloring Book",
    kdp: {
      title:
        "Fruits Coloring Book for Kids Ages 3-6: 20 Tasty Fruit Drawings | Apple, Banana, Mango & More",
      description:
        "Teach your little one about healthy foods with this fun fruits coloring book! 20 big, simple drawings of apples, bananas, mangoes, strawberries, watermelons, grapes, oranges, and more tasty fruits.",
      keywords: [
        "fruits coloring book kids",
        "fruit coloring book toddler ages 3-6",
        "apple banana mango coloring book",
        "food coloring book preschool kids",
        "healthy foods coloring book children",
        "single sided fruit coloring book",
        "learning fruits coloring book kindergarten",
      ],
      coverPrompt:
        "Happy cartoon apple, banana, strawberry and watermelon together with smiling faces in a fruit basket.",
    },
    prompts: [
      { id: "7.01", name: "Apple", subject: "whole apple with leaf and stem" },
      { id: "7.02", name: "Banana", subject: "single curved banana" },
      { id: "7.03", name: "Mango", subject: "mango with leaf" },
      { id: "7.04", name: "Orange", subject: "whole orange with stem" },
      { id: "7.05", name: "Grapes", subject: "bunch of grapes with leaf" },
      {
        id: "7.06",
        name: "Strawberry",
        subject: "strawberry with seeds and leaf crown",
      },
      {
        id: "7.07",
        name: "Watermelon",
        subject: "watermelon slice with seeds",
      },
      { id: "7.08", name: "Pineapple", subject: "pineapple with spiky leaves" },
      { id: "7.09", name: "Pear", subject: "pear fruit with stem" },
      { id: "7.10", name: "Cherry", subject: "pair of cherries on stem" },
      { id: "7.11", name: "Lemon", subject: "whole lemon with leaf" },
      { id: "7.12", name: "Peach", subject: "peach with leaf" },
      {
        id: "7.13",
        name: "Coconut",
        subject: "coconut split in half with water drop",
      },
      {
        id: "7.14",
        name: "Papaya",
        subject: "papaya cut in half showing seeds",
      },
      { id: "7.15", name: "Kiwi", subject: "kiwi fruit cut in half" },
      {
        id: "7.16",
        name: "Pomegranate",
        subject: "pomegranate cut open showing seeds",
      },
      { id: "7.17", name: "Avocado", subject: "avocado cut in half with pit" },
      { id: "7.18", name: "Blueberry", subject: "cluster of blueberries" },
      { id: "7.19", name: "Dragon Fruit", subject: "dragon fruit with spikes" },
      {
        id: "7.20",
        name: "Custard Apple",
        subject: "custard apple with bumpy skin",
      },
    ],
  },
  {
    slug: "vegetables",
    number: 8,
    name: "Vegetables",
    icon: "🥕",
    description: "20 healthy veggies — carrot, tomato, corn & more",
    scene:
      "a simple vegetable garden scene with soil rows, small plants sprouting, a garden fence, and a sky with a plain sun",
    coverScene:
      "a smiling orange carrot, a red tomato with a leaf, a yellow corn cob, and a green broccoli together in a friendly vegetable garden",
    coverTitle: "Vegetables Coloring Book",
    kdp: {
      title:
        "Vegetables Coloring Book for Kids Ages 3-6: 20 Healthy Food Drawings | Carrot, Tomato & More",
      description:
        "Make healthy eating fun! 20 big, kid-friendly drawings of carrots, tomatoes, corn, pumpkins, broccoli, peppers, and more garden vegetables.",
      keywords: [
        "vegetables coloring book kids",
        "veggie coloring book toddler ages 3-6",
        "carrot tomato corn coloring book",
        "healthy food coloring book preschool",
        "garden vegetables coloring book children",
        "single sided vegetable coloring book",
        "learning veggies coloring book kindergarten",
      ],
      coverPrompt:
        "Happy cartoon carrot, tomato, corn and broccoli with smiling faces together in a garden.",
    },
    prompts: [
      { id: "8.01", name: "Carrot", subject: "carrot with green leafy top" },
      { id: "8.02", name: "Tomato", subject: "round tomato with leaf" },
      { id: "8.03", name: "Corn", subject: "corn on the cob with husk" },
      { id: "8.04", name: "Pumpkin", subject: "pumpkin with stem" },
      { id: "8.05", name: "Broccoli", subject: "broccoli floret" },
      {
        id: "8.06",
        name: "Cucumber",
        subject: "whole cucumber with bumpy skin",
      },
      { id: "8.07", name: "Bell Pepper", subject: "bell pepper with stem" },
      { id: "8.08", name: "Eggplant", subject: "eggplant with leafy top" },
      { id: "8.09", name: "Potato", subject: "whole potato with eyes" },
      { id: "8.10", name: "Onion", subject: "onion with roots and sprout" },
      {
        id: "8.11",
        name: "Cabbage",
        subject: "round cabbage with outer leaves",
      },
      {
        id: "8.12",
        name: "Cauliflower",
        subject: "cauliflower with green leaves",
      },
      { id: "8.13", name: "Lettuce", subject: "leafy lettuce head" },
      { id: "8.14", name: "Garlic", subject: "garlic bulb with skin" },
      { id: "8.15", name: "Chili Pepper", subject: "chili pepper with stem" },
      {
        id: "8.16",
        name: "Sweet Potato",
        subject: "sweet potato with skin texture",
      },
      { id: "8.17", name: "Radish", subject: "radish with leafy top" },
      { id: "8.18", name: "Spinach", subject: "bunch of spinach leaves" },
      { id: "8.19", name: "Peas", subject: "open pea pod showing peas" },
      {
        id: "8.20",
        name: "Mushroom",
        subject: "cute mushroom with spotted cap",
      },
    ],
  },
  {
    slug: "food-treats",
    number: 9,
    name: "Food & Treats",
    icon: "🍰",
    description: "20 yummy treats — ice cream, pizza, cake & more",
    scene:
      "a cheerful picnic scene with a checkered blanket, small paper plates, a tree with fruit, a sky with a plain sun and fluffy clouds, and scattered flowers",
    coverScene:
      "a smiling ice cream cone with two scoops, a donut with sprinkles, a slice of pizza with cheese strings, and a cupcake with a cherry on top — all with cute faces — together on a picnic blanket",
    coverTitle: "Food & Treats Coloring Book",
    kdp: {
      title:
        "Food & Treats Coloring Book for Kids Ages 3-6: 20 Yummy Drawings | Ice Cream, Pizza, Cake & More",
      description:
        "A delicious coloring book packed with 20 big drawings of kids' favorite foods and treats! Ice cream cones, pizza slices, cupcakes, donuts, cookies, pretzels, pancakes, and more yummy goodies.",
      keywords: [
        "food coloring book kids",
        "desserts coloring book toddler ages 3-6",
        "ice cream cake coloring book",
        "yummy treats coloring book preschool",
        "junk food coloring book kids",
        "single sided food coloring book",
        "cute food coloring book big lines",
      ],
      coverPrompt:
        "Happy cartoon ice cream cone, donut, pizza slice and cupcake with smiling faces together on a picnic blanket.",
    },
    prompts: [
      {
        id: "9.01",
        name: "Ice Cream Cone",
        subject: "ice cream cone with two scoops",
      },
      {
        id: "9.02",
        name: "Birthday Cake",
        subject: "slice of birthday cake with candle",
      },
      { id: "9.03", name: "Donut", subject: "donut with sprinkles on top" },
      {
        id: "9.04",
        name: "Pizza Slice",
        subject: "pizza slice with pepperoni and cheese",
      },
      {
        id: "9.05",
        name: "Cupcake",
        subject: "cupcake with frosting swirl and cherry",
      },
      {
        id: "9.06",
        name: "Cookie",
        subject: "round cookie with chocolate chips",
      },
      { id: "9.07", name: "Pretzel", subject: "twisted pretzel with salt" },
      { id: "9.08", name: "Lollipop", subject: "swirl lollipop on a stick" },
      {
        id: "9.09",
        name: "Hot Dog",
        subject: "hot dog in a bun with mustard line",
      },
      {
        id: "9.10",
        name: "Hamburger",
        subject: "hamburger with bun, patty, lettuce",
      },
      {
        id: "9.11",
        name: "French Fries",
        subject: "french fries in a container",
      },
      { id: "9.12", name: "Popcorn", subject: "popcorn bucket overflowing" },
      {
        id: "9.13",
        name: "Pancakes",
        subject: "stack of pancakes with syrup drip",
      },
      { id: "9.14", name: "Waffle", subject: "waffle with syrup and butter" },
      {
        id: "9.15",
        name: "Sandwich",
        subject: "triangle cut sandwich with filling",
      },
      { id: "9.16", name: "Pie", subject: "slice of fruit pie with lattice" },
      { id: "9.17", name: "Taco", subject: "folded taco with filling" },
      {
        id: "9.18",
        name: "Milkshake",
        subject: "milkshake with straw and cream",
      },
      {
        id: "9.19",
        name: "Sushi Roll",
        subject: "sushi roll with rice and filling",
      },
      {
        id: "9.20",
        name: "Gingerbread Man",
        subject: "gingerbread man cookie with icing face",
      },
    ],
  },
  {
    slug: "nature-weather",
    number: 10,
    name: "Nature & Weather",
    icon: "🌈",
    description: "20 sun, moon, rainbow & more nature drawings",
    scene:
      "a calm outdoor landscape with rolling hills, a few trees, a winding path, clouds in the sky, and simple flowers and grass on the ground",
    coverScene:
      "a smiling sun with rays, a crescent moon with a sleepy face, a colorful rainbow, and a cheerful flower together over rolling hills",
    coverTitle: "Nature & Weather Coloring Book",
    kdp: {
      title:
        "Nature & Weather Coloring Book for Kids Ages 3-6: 20 Sun, Moon, Rainbow & More Drawings",
      description:
        "Explore the wonders of nature! 20 big, simple drawings of the sun, moon, stars, rainbows, clouds, trees, flowers, leaves, mountains, and more weather and nature elements.",
      keywords: [
        "nature coloring book kids",
        "weather coloring book toddler ages 3-6",
        "sun moon star coloring book",
        "rainbow flower tree coloring book",
        "outdoors nature coloring book preschool",
        "single sided nature coloring book",
        "seasons weather coloring book kindergarten",
      ],
      coverPrompt:
        "Happy cartoon sun, moon, rainbow and flower together on a hillside with trees and clouds.",
    },
    prompts: [
      { id: "10.01", name: "Sun", subject: "smiling sun with rays all around" },
      {
        id: "10.02",
        name: "Moon",
        subject: "crescent moon with sleeping face",
      },
      { id: "10.03", name: "Star", subject: "five-pointed star with smile" },
      { id: "10.04", name: "Cloud", subject: "fluffy happy cloud" },
      {
        id: "10.05",
        name: "Tree",
        subject: "simple tree with leaves and trunk",
      },
      {
        id: "10.06",
        name: "Flower",
        subject: "daisy flower with petals and stem",
      },
      {
        id: "10.07",
        name: "Rainbow",
        subject: "rainbow arc with clouds at both ends",
      },
      {
        id: "10.08",
        name: "Mountain",
        subject: "mountain with snow cap and sun",
      },
      { id: "10.09", name: "Leaf", subject: "maple leaf with veins" },
      { id: "10.10", name: "Raindrop", subject: "raindrop with face" },
      { id: "10.11", name: "Lightning", subject: "lightning bolt with cloud" },
      {
        id: "10.12",
        name: "Snowflake",
        subject: "intricate snowflake pattern",
      },
      {
        id: "10.13",
        name: "Tornado",
        subject: "spinning tornado with wind swirls",
      },
      {
        id: "10.14",
        name: "Sunflower",
        subject: "tall sunflower with seeds in center",
      },
      {
        id: "10.15",
        name: "Rose",
        subject: "rose with stem and thorns and leaves",
      },
      {
        id: "10.16",
        name: "Forest Mushroom",
        subject: "cute red mushroom with white spots",
      },
      {
        id: "10.17",
        name: "Grass Patch",
        subject: "patch of grass with tiny flowers",
      },
      { id: "10.18", name: "Pinecone", subject: "pinecone with scales" },
      { id: "10.19", name: "Acorn", subject: "acorn with cap" },
      {
        id: "10.20",
        name: "Palm Tree",
        subject: "palm tree on a small island",
      },
    ],
  },
  {
    slug: "alphabet",
    number: 11,
    name: "Alphabet (A-T)",
    icon: "🔤",
    description: "20 letters A-T with fun objects — learn & color",
    scene:
      "a playful backdrop with floating stars, sparkles, small dots, and a few tiny doodles (clouds, hearts, squiggles) surrounding the letter and its paired object",
    coverScene:
      "a colorful letter A next to a red apple, a blue letter B with a bouncing ball, and a yellow letter C next to a smiling cat, with more alphabet letters scattered around on a playful background",
    coverTitle: "ABC Alphabet Coloring Book",
    kdp: {
      title:
        "ABC Alphabet Coloring Book for Kids Ages 3-6: 20 Letters A-T with Fun Objects | Learn & Color",
      description:
        "The perfect early-learning coloring book that teaches the alphabet! 20 letters from A-T each paired with a fun object.",
      keywords: [
        "alphabet coloring book kids",
        "ABC coloring book toddler ages 3-6",
        "letter coloring book preschool",
        "learn alphabet coloring book children",
        "phonics coloring book kindergarten",
        "single sided ABC coloring book",
        "A is for apple coloring book kids",
      ],
      coverPrompt:
        "Cartoon A with apple, B with ball, C with cat arranged playfully with more letter-object pairs around them.",
    },
    prompts: [
      {
        id: "11.01",
        name: "A for Apple",
        subject: "big letter A with an apple next to it",
      },
      { id: "11.02", name: "B for Ball", subject: "big letter B with a ball" },
      {
        id: "11.03",
        name: "C for Cat",
        subject: "big letter C with a smiling cat",
      },
      {
        id: "11.04",
        name: "D for Dog",
        subject: "big letter D with a wagging dog",
      },
      {
        id: "11.05",
        name: "E for Elephant",
        subject: "big letter E with a small elephant",
      },
      {
        id: "11.06",
        name: "F for Fish",
        subject: "big letter F with a friendly fish",
      },
      {
        id: "11.07",
        name: "G for Giraffe",
        subject: "big letter G with a giraffe",
      },
      { id: "11.08", name: "H for Hat", subject: "big letter H with a hat" },
      {
        id: "11.09",
        name: "I for Ice Cream",
        subject: "big letter I with an ice cream cone",
      },
      {
        id: "11.10",
        name: "J for Jellyfish",
        subject: "big letter J with a jellyfish",
      },
      {
        id: "11.11",
        name: "K for Kite",
        subject: "big letter K with a diamond kite",
      },
      {
        id: "11.12",
        name: "L for Lion",
        subject: "big letter L with a friendly lion",
      },
      {
        id: "11.13",
        name: "M for Mango",
        subject: "big letter M with a mango",
      },
      {
        id: "11.14",
        name: "N for Nest",
        subject: "big letter N with a bird nest and eggs",
      },
      {
        id: "11.15",
        name: "O for Owl",
        subject: "big letter O with an owl inside the O",
      },
      {
        id: "11.16",
        name: "P for Pineapple",
        subject: "big letter P with a pineapple",
      },
      {
        id: "11.17",
        name: "Q for Queen",
        subject: "big letter Q with a queen's crown",
      },
      {
        id: "11.18",
        name: "R for Rabbit",
        subject: "big letter R with a hopping rabbit",
      },
      {
        id: "11.19",
        name: "S for Sun",
        subject: "big letter S with a smiling sun",
      },
      {
        id: "11.20",
        name: "T for Tiger",
        subject: "big letter T with a cartoon tiger",
      },
    ],
  },
  {
    slug: "toys",
    number: 12,
    name: "Toys",
    icon: "🧸",
    description: "20 fun toys — teddy bear, ball, doll & more",
    scene:
      "a cozy playroom scene with a toy shelf, a patterned rug, a window with curtains, scattered stars and building blocks on the floor, and a bright cheerful atmosphere",
    coverScene:
      "a brown teddy bear with a red bow tie, a small blue toy race car, and a colorful beach ball together in a playroom with building blocks and stars around them",
    coverTitle: "Toys Coloring Book",
    kdp: {
      title:
        "Toys Coloring Book for Kids Ages 3-6: 20 Fun Toy Drawings | Teddy Bear, Ball, Doll & More",
      description:
        "A playful coloring book featuring 20 big, simple drawings of favorite toys! Teddy bears, balls, kites, dolls, toy cars, building blocks, rocking horses, and more classic playthings.",
      keywords: [
        "toys coloring book kids",
        "teddy bear coloring book toddler",
        "toy coloring book ages 3-6",
        "preschool toys coloring book",
        "doll ball kite coloring book children",
        "single sided toy coloring book",
        "classic toys coloring book big lines",
      ],
      coverPrompt:
        "Happy cartoon teddy bear, toy car and ball together in a playroom scene with blocks and stuffed animals.",
    },
    prompts: [
      {
        id: "12.01",
        name: "Teddy Bear",
        subject: "sitting teddy bear with bow tie",
      },
      { id: "12.02", name: "Soccer Ball", subject: "soccer ball with pattern" },
      {
        id: "12.03",
        name: "Kite",
        subject: "diamond kite with tail and string",
      },
      {
        id: "12.04",
        name: "Rag Doll",
        subject: "rag doll with pigtails and dress",
      },
      { id: "12.05", name: "Toy Car", subject: "small toy racing car" },
      {
        id: "12.06",
        name: "Puzzle Pieces",
        subject: "three connected jigsaw puzzle pieces",
      },
      {
        id: "12.07",
        name: "Building Blocks",
        subject: "stack of wooden alphabet blocks",
      },
      {
        id: "12.08",
        name: "Rocking Horse",
        subject: "wooden rocking horse with mane",
      },
      {
        id: "12.09",
        name: "Toy Train",
        subject: "wooden toy train with three cars",
      },
      { id: "12.10", name: "Yo-Yo", subject: "yo-yo with string coming down" },
      {
        id: "12.11",
        name: "Spinning Top",
        subject: "wooden spinning top in motion",
      },
      { id: "12.12", name: "Jump Rope", subject: "jump rope with handles" },
      { id: "12.13", name: "Hula Hoop", subject: "circular hula hoop" },
      { id: "12.14", name: "Marbles", subject: "three marbles in a row" },
      {
        id: "12.15",
        name: "Action Figure",
        subject: "superhero action figure standing",
      },
      {
        id: "12.16",
        name: "Plush Bunny",
        subject: "plush bunny toy with long ears",
      },
      {
        id: "12.17",
        name: "Xylophone",
        subject: "xylophone with colorful bars and mallets",
      },
      { id: "12.18", name: "Drum", subject: "toy drum with drumsticks" },
      { id: "12.19", name: "Piggy Bank", subject: "piggy bank with coin slot" },
      { id: "12.20", name: "Balloon", subject: "balloon on a string" },
    ],
  },
  {
    slug: "dinosaurs",
    number: 13,
    name: "Dinosaurs",
    icon: "🦖",
    description: "20 roarsome dinos — T-Rex, Triceratops & more",
    scene:
      "a prehistoric jungle scene with palm trees, tall ferns, a small erupting volcano in the distance, rocky terrain, and a sky with a plain sun and puffy clouds",
    coverScene:
      "a friendly green T-Rex, a smiling blue triceratops, and a happy orange stegosaurus together in a prehistoric jungle, with a small volcano, palm trees, and ferns around them",
    coverTitle: "Dinosaurs Coloring Book",
    kdp: {
      title:
        "Dinosaurs Coloring Book for Kids Ages 3-6: 20 Roarsome Drawings | T-Rex, Triceratops & More",
      description:
        "A roaring good time for little paleontologists! 20 big, friendly drawings of famous dinosaurs — T-Rex, Triceratops, Stegosaurus, Brontosaurus, Pterodactyl, Velociraptor, and more.",
      keywords: [
        "dinosaurs coloring book kids",
        "dinosaur coloring book boys ages 3-6",
        "T-Rex triceratops coloring book",
        "preschool dinosaur coloring book",
        "cute dinosaur coloring book toddler",
        "single sided dinosaur coloring book",
        "kids dinosaur activity book big lines",
      ],
      coverPrompt:
        "Happy cartoon T-Rex, triceratops and stegosaurus together in a prehistoric jungle with volcano and palm trees.",
    },
    prompts: [
      {
        id: "13.01",
        name: "Tyrannosaurus Rex",
        subject: "T-Rex with big teeth and tiny arms",
      },
      {
        id: "13.02",
        name: "Stegosaurus",
        subject: "stegosaurus with plates on back",
      },
      {
        id: "13.03",
        name: "Triceratops",
        subject: "triceratops with three horns and frill",
      },
      {
        id: "13.04",
        name: "Brontosaurus",
        subject: "brontosaurus with long neck and tail",
      },
      {
        id: "13.05",
        name: "Pterodactyl",
        subject: "pterodactyl flying with wings spread",
      },
      { id: "13.06", name: "Velociraptor", subject: "velociraptor running" },
      {
        id: "13.07",
        name: "Ankylosaurus",
        subject: "ankylosaurus with armored back and club tail",
      },
      {
        id: "13.08",
        name: "Diplodocus",
        subject: "diplodocus with very long neck",
      },
      {
        id: "13.09",
        name: "Spinosaurus",
        subject: "spinosaurus with sail on back",
      },
      {
        id: "13.10",
        name: "Parasaurolophus",
        subject: "parasaurolophus with tube crest on head",
      },
      {
        id: "13.11",
        name: "Iguanodon",
        subject: "iguanodon standing on hind legs",
      },
      {
        id: "13.12",
        name: "Allosaurus",
        subject: "allosaurus standing with sharp teeth",
      },
      {
        id: "13.13",
        name: "Brachiosaurus",
        subject: "brachiosaurus reaching up to eat leaves",
      },
      {
        id: "13.14",
        name: "Compsognathus",
        subject: "tiny compsognathus running",
      },
      {
        id: "13.15",
        name: "Archaeopteryx",
        subject: "archaeopteryx with feathered wings",
      },
      {
        id: "13.16",
        name: "Mosasaurus",
        subject: "mosasaurus swimming in sea",
      },
      {
        id: "13.17",
        name: "Dinosaur Egg",
        subject: "cracked dinosaur egg with baby peeking out",
      },
      {
        id: "13.18",
        name: "Baby Dinosaur",
        subject: "small baby dinosaur hatching",
      },
      {
        id: "13.19",
        name: "Dinosaur Footprint",
        subject: "big three-toed dinosaur footprint",
      },
      {
        id: "13.20",
        name: "Volcano with Dinosaur",
        subject: "volcano erupting with dinosaur silhouette",
      },
    ],
  },
  {
    slug: "fantasy-magic",
    number: 14,
    name: "Fantasy & Magic",
    icon: "🦄",
    description: "20 magical — dragon, mermaid, fairy & more",
    scene:
      "a magical forest landscape with a fairytale castle in the distance, twinkling stars, a rainbow arc, whimsical mushrooms, tall curly trees, and sparkles scattered throughout",
    coverScene:
      "a beautiful white unicorn with a rainbow mane, a tiny pink fairy with sparkling wings, and a friendly green dragon breathing small flames — all together in a magical forest with a distant castle, stars, and a rainbow",
    coverTitle: "Unicorns & Fantasy Coloring Book",
    kdp: {
      title:
        "Unicorns & Fantasy Coloring Book for Kids Ages 3-6: 20 Magical Drawings | Dragon, Mermaid, Fairy",
      description:
        "Enter a magical world of unicorns, dragons, mermaids, fairies, and fantasy friends! 20 big, enchanting drawings perfect for kids who love fairy tales and imaginative play.",
      keywords: [
        "unicorn coloring book kids",
        "fantasy coloring book girls ages 3-6",
        "dragon mermaid fairy coloring book",
        "magical coloring book toddler preschool",
        "princess castle coloring book children",
        "single sided fantasy coloring book",
        "fairy tale coloring book big lines kids",
      ],
      coverPrompt:
        "Happy cartoon unicorn, fairy and friendly dragon together in a magical forest with castle and rainbow.",
    },
    prompts: [
      {
        id: "14.01",
        name: "Unicorn",
        subject: "unicorn with flowing mane and single horn",
      },
      {
        id: "14.02",
        name: "Dragon",
        subject: "friendly dragon with small wings breathing a small flame",
      },
      {
        id: "14.03",
        name: "Mermaid",
        subject: "mermaid sitting on a rock with fish tail",
      },
      {
        id: "14.04",
        name: "Fairy",
        subject: "fairy with butterfly wings holding wand",
      },
      {
        id: "14.05",
        name: "Wizard",
        subject: "wizard with pointy hat and long beard",
      },
      {
        id: "14.06",
        name: "Knight",
        subject: "knight in armor with sword and shield",
      },
      {
        id: "14.07",
        name: "Princess",
        subject: "princess with crown and long dress",
      },
      { id: "14.08", name: "Prince", subject: "prince with crown and cape" },
      {
        id: "14.09",
        name: "Castle",
        subject: "fairy tale castle with turrets and flag",
      },
      {
        id: "14.10",
        name: "Magic Wand",
        subject: "magic wand with star on top and sparkles",
      },
      {
        id: "14.11",
        name: "Treasure Chest",
        subject: "open treasure chest with coins and jewels",
      },
      {
        id: "14.12",
        name: "Crystal Ball",
        subject: "crystal ball on a stand with swirls inside",
      },
      {
        id: "14.13",
        name: "Genie",
        subject: "smiling genie coming out of a lamp",
      },
      {
        id: "14.14",
        name: "Phoenix",
        subject: "phoenix bird with flame feathers",
      },
      {
        id: "14.15",
        name: "Griffin",
        subject: "griffin with eagle head and lion body",
      },
      {
        id: "14.16",
        name: "Pegasus",
        subject: "pegasus winged horse standing",
      },
      {
        id: "14.17",
        name: "Friendly Witch",
        subject: "friendly witch with pointy hat and broomstick",
      },
      {
        id: "14.18",
        name: "Pirate",
        subject: "pirate with hat, eye patch and sword",
      },
      {
        id: "14.19",
        name: "Leprechaun",
        subject: "leprechaun with pot of gold and rainbow",
      },
      {
        id: "14.20",
        name: "Gnome",
        subject: "garden gnome with pointy hat and beard",
      },
    ],
  },
];

export const TOTAL_PROMPTS = CATEGORIES.reduce(
  (sum, c) => sum + c.prompts.length,
  0,
);

export function findCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
