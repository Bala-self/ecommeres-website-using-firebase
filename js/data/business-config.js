
/**
 * KADAI — BUSINESS CONFIG + ADMIN STARTER SEED
 * ---------------------------------------------
 * NOT a product data source. The storefront catalog lives ONLY in Firebase.
 * This file holds (a) the shipping-fee business rules used by pricing.js
 * and (b) the one-click starter catalog an admin may seed into an EMPTY
 * Firebase project (Admin console). Sample prices/stock — replace with
 * real data (§19/§45).
 */

export const shippingConfig = {
  flatPaise: 4900,               // ₹49 flat delivery — confirm before launch
  freeThresholdPaise: 99900,     // free at ₹999+        — confirm before launch
};

export const demoCoupon = {
  code: "WELCOME10",
  type: "percent",               // percent | flat
  value: 10,
  minOrderPaise: 49900,
  maxDiscountPaise: 20000,
  active: true,
  expiresAt: null,
  note: "Demo coupon — 10% off (max ₹200) on orders ₹499+",
};

export const categories = [
  { id: "kitchen",  name: "Kitchen & Dining",        slug: "kitchen",
    description: "Cook, steam, serve — the hardworking classics." },
  { id: "storage",  name: "Storage & Organisation",  slug: "storage",
    description: "Jars, stacks and trays for a tidy, organized home." },
  { id: "table",    name: "Table & Serve",           slug: "table",
    description: "Brass, copper and steel for the table." },
  { id: "cleaning", name: "Home Care",               slug: "cleaning",
    description: "Coir, jute and cellulose — scrub without plastic." },
  { id: "bath",     name: "Bath & Laundry",          slug: "bath",
    description: "Woven cotton, built to last past the season." },
];

export const products = [
  {
    id: "idli-steamer", name: "Stainless Steel Idli Steamer · 4 Tier",
    slug: "idli-steamer", categoryId: "kitchen",
    descriptionShort: "Four tiers, twenty idlis at a go. Works on induction and gas.",
    descriptionLong: "A heavy-base steamer that holds four idli plates — twenty idlis in one round. The base is thick enough to hold steam evenly, the plates lift out on a central pin, and the steel takes daily scrubbing without complaint.",
    specs: { "Material": "Stainless steel", "Tiers": "4 plates · 20 idlis", "Base": "Induction + gas compatible", "Diameter": "24 cm", "Care": "Dishwasher safe" },
    pricePaise: 129900, compareAtPricePaise: 159900, stock: 14,
    images: [{ url: "assets/products/idli-steamer.jpg", alt: "Four-tier stainless steel idli steamer with lid" }],
    keywords: ["idli", "steamer", "stainless", "steel", "induction", "kitchen"],
    featured: true, newArrival: false,
  },
  {
    id: "cast-iron-dosa-tawa", name: "Cast Iron Dosa Tawa · 28 cm",
    slug: "cast-iron-dosa-tawa", categoryId: "kitchen",
    descriptionShort: "Pre-seasoned flat griddle. Spreads thin, browns even.",
    descriptionLong: "Machined flat so dosa batter spreads to the edges without rocking. Comes pre-seasoned with gingelly oil — rinse, wipe, and it's ready. Grows better with every use.",
    specs: { "Material": "Cast iron", "Diameter": "28 cm", "Weight": "2.1 kg", "Pre-seasoned": "Yes · gingelly oil", "Care": "Dry immediately after wash" },
    pricePaise: 114900, compareAtPricePaise: null, stock: 9,
    images: [{ url: "assets/products/cast-iron-dosa-tawa.jpg", alt: "Round black cast iron dosa tawa" }],
    keywords: ["dosa", "tawa", "cast", "iron", "griddle", "kitchen"],
    featured: false, newArrival: false,
  },
  {
    id: "brass-urli", name: "Brass Urli Bowl · 10″",
    slug: "brass-urli", categoryId: "table",
    descriptionShort: "Hand-cast urli for floating flowers — or a serious payasam.",
    descriptionLong: "A wide hand-cast urli in solid brass, the traditional vessel for doorways filled with water and marigold. Thick walls, smooth rim, unlaquered so it develops character.",
    specs: { "Material": "Solid brass, unlaquered", "Diameter": "25 cm (10″)", "Weight": "1.4 kg", "Care": "Brass polish as needed" },
    pricePaise: 289900, compareAtPricePaise: 349900, stock: 4,
    images: [{ url: "assets/products/brass-urli.jpg", alt: "Round hand-cast brass urli bowl" }],
    keywords: ["brass", "urli", "bowl", "traditional", "decor", "serve"],
    featured: true, newArrival: false,
  },
  {
    id: "glass-jar-set", name: "Glass Storage Jar Set · 6 pc",
    slug: "glass-jar-set", categoryId: "storage",
    descriptionShort: "Six airtight bamboo-lid jars. Pantry, decanted.",
    descriptionLong: "Six borosilicate jars with silicone-sealed bamboo lids — dals, spices and chutney powders stay dry through the monsoon. Square footprint wastes no shelf.",
    specs: { "Material": "Borosilicate glass, bamboo lid", "Set": "3 × 550 ml + 3 × 950 ml", "Seal": "Silicone gasket, airtight", "Care": "Jar dishwasher safe · lid hand wash" },
    pricePaise: 89900, compareAtPricePaise: null, stock: 22,
    images: [{ url: "assets/products/glass-jar-set.jpg", alt: "Six glass storage jars with bamboo lids" }],
    keywords: ["glass", "jar", "storage", "pantry", "airtight", "organisation"],
    featured: false, newArrival: false,
  },
  {
    id: "bamboo-cutlery-tray", name: "Bamboo Cutlery Tray · Expandable",
    slug: "bamboo-cutlery-tray", categoryId: "storage",
    descriptionShort: "Slides open to fit your drawer. Six compartments.",
    descriptionLong: "An expandable bamboo tray that grows from 34 to 53 cm wide, so it seats your drawer instead of floating in it. Six compartments, felt feet, no splinters.",
    specs: { "Material": "Bamboo", "Width": "34–53 cm expandable", "Compartments": "6", "Care": "Wipe dry · oil monthly" },
    pricePaise: 54900, compareAtPricePaise: null, stock: 17,
    images: [{ url: "assets/products/bamboo-cutlery-tray.jpg", alt: "Expandable bamboo cutlery tray" }],
    keywords: ["bamboo", "cutlery", "tray", "drawer", "organiser", "organisation"],
    featured: false, newArrival: false,
  },
  {
    id: "coir-scrub-set", name: "Coconut Coir Scrub Set · 3 pc",
    slug: "coir-scrub-set", categoryId: "cleaning",
    descriptionShort: "Unbleached coir scrubs for vessels that hate scratches.",
    descriptionLong: "Three pads of unbleached coconut coir, densely felted so they hold shape when wet. Cuts through kedgeree pots without scratching steel or iron — compostable at end of life.",
    specs: { "Material": "Unbleached coconut coir", "Set": "3 pads · 12 × 8 cm", "Compostable": "Yes", "Care": "Rinse and sun-dry" },
    pricePaise: 19900, compareAtPricePaise: null, stock: 40,
    images: [{ url: "assets/products/coir-scrub-set.jpg", alt: "Three coconut coir scrub pads" }],
    keywords: ["coir", "scrub", "coconut", "cleaning", "vessel", "natural"],
    featured: false, newArrival: true,
  },
  {
    id: "cotton-bath-towel", name: "Handwoven Cotton Bath Towel",
    slug: "cotton-bath-towel", categoryId: "bath",
    descriptionShort: "Loom-woven, 500 GSM, dries fast in humid weather.",
    descriptionLong: "Woven on powerlooms in Erode from 500 GSM cotton — absorbent yet quick-drying, which matters in coastal humidity. Green border stripe, no loops to snag.",
    specs: { "Material": "100% cotton, handloom", "Weight": "500 GSM · 70 × 140 cm", "Colours": "Cream with green border", "Care": "Machine wash cold" },
    pricePaise: 64900, compareAtPricePaise: 79900, stock: 12,
    images: [{ url: "assets/products/cotton-bath-towel.jpg", alt: "Folded cream cotton bath towel with green border" }],
    keywords: ["towel", "cotton", "bath", "handwoven", "laundry"],
    featured: false, newArrival: false,
  },
  {
    id: "steel-tiffin-carrier", name: "Steel Lunch Carrier · 3 Tier",
    slug: "steel-tiffin-carrier", categoryId: "kitchen",
    descriptionShort: "Locking three-tier carrier. Office, site, travel.",
    descriptionLong: "The classic three-tier carrier with side locking clips and a steel handle — dal doesn't leak into the rice. Each tier is a serving-sized 350 ml.",
    specs: { "Material": "Stainless steel", "Tiers": "3 × 350 ml", "Closure": "Twin side clips", "Care": "Dishwasher safe" },
    pricePaise: 99900, compareAtPricePaise: null, stock: 11,
    images: [{ url: "assets/products/steel-tiffin-carrier.jpg", alt: "Three-tier stainless steel lunch carrier" }],
    keywords: ["tiffin", "carrier", "lunch", "steel", "office", "travel"],
    featured: true, newArrival: true,
  },
  {
    id: "neem-chopping-board", name: "Neem Wood Chopping Board",
    slug: "neem-chopping-board", categoryId: "kitchen",
    descriptionShort: "Single-piece neem, naturally antimicrobial. Knife-kind.",
    descriptionLong: "Cut from a single neem slab — no glue lines, no warping. Neem is naturally antimicrobial and gentle on edges. Hanging hole keeps it dry between uses.",
    specs: { "Material": "Single-piece neem wood", "Size": "35 × 25 × 2 cm", "Finish": "Food-safe oil", "Care": "Hand wash · oil monthly" },
    pricePaise: 74900, compareAtPricePaise: null, stock: 8,
    images: [{ url: "assets/products/neem-chopping-board.jpg", alt: "Neem wood chopping board with hanging hole" }],
    keywords: ["neem", "chopping", "board", "wood", "kitchen"],
    featured: false, newArrival: false,
  },
  {
    id: "copper-water-bottle", name: "Copper Water Bottle · 950 ml",
    slug: "copper-water-bottle", categoryId: "table",
    descriptionShort: "Hammered copper, leak-proof cap. Morning water, tradition.",
    descriptionLong: "A 950 ml hammered-copper bottle with a threaded leak-proof cap and a stable rounded base. Store water overnight; the copper does what tradition says it does.",
    specs: { "Material": "Pure copper, hammered", "Capacity": "950 ml", "Cap": "Threaded, leak-proof", "Care": "Hand wash · no scrubbers" },
    pricePaise: 119900, compareAtPricePaise: null, stock: 15,
    images: [{ url: "assets/products/copper-water-bottle.jpg", alt: "Hammered copper water bottle" }],
    keywords: ["copper", "bottle", "water", "table", "health"],
    featured: true, newArrival: false,
  },
];


