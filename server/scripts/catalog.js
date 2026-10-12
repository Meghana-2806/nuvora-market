// Product catalog used by the seed script.
// emoji + gradient are used by the UI to render product tiles without external images.
const categories = {
  Electronics: { emoji: '📱', grad: ['#1e3a8a', '#3b82f6'] },
  Fashion: { emoji: '👕', grad: ['#9d174d', '#ec4899'] },
  'Home & Kitchen': { emoji: '🍳', grad: ['#92400e', '#f59e0b'] },
  Books: { emoji: '📚', grad: ['#115e59', '#14b8a6'] },
  Beauty: { emoji: '💄', grad: ['#6b21a8', '#c084fc'] },
  'Sports & Fitness': { emoji: '🏏', grad: ['#166534', '#4ade80'] },
  Toys: { emoji: '🧸', grad: ['#b91c1c', '#fb923c'] },
  Grocery: { emoji: '🛒', grad: ['#3f6212', '#a3e635'] }
};

// [title, brand, category, price, mrp, emoji, description, rating, reviews, stock]
const rows = [
  ['Galaxy Nova 5G Smartphone 128GB', 'Orbit', 'Electronics', 18999, 24999, '📱', '6.5" AMOLED display, 50MP camera, 5000mAh battery and 5G ready.', 4.4, 8421, 120],
  ['AirPulse Wireless Earbuds', 'Orbit', 'Electronics', 1999, 4999, '🎧', 'Active noise cancellation, 30 hours playback, IPX5 water resistant.', 4.2, 15302, 300],
  ['UltraBook 14 Laptop i5 16GB', 'Vertex', 'Electronics', 52990, 64990, '💻', '14" FHD, Intel i5, 16GB RAM, 512GB SSD, backlit keyboard.', 4.5, 3120, 60],
  ['SmartWatch Fit Pro', 'Vertex', 'Electronics', 2999, 7999, '⌚', 'AMOLED screen, SpO2, heart-rate, 7-day battery and GPS.', 4.1, 9876, 200],
  ['PowerCore 20000mAh Power Bank', 'ChargeX', 'Electronics', 1299, 2499, '🔋', '22.5W fast charging with dual output ports.', 4.3, 21045, 400],
  ['4K Smart LED TV 43"', 'ViewMax', 'Electronics', 25999, 39999, '📺', 'Ultra HD, Dolby Audio, built-in streaming apps, voice remote.', 4.3, 6702, 45],
  ['Bluetooth Speaker Boom Mini', 'Orbit', 'Electronics', 1499, 2999, '🔊', '360° sound, 12-hour battery, rugged and splash-proof.', 4.2, 11230, 250],

  ['Men\'s Classic Cotton T-Shirt (Pack of 3)', 'UrbanWear', 'Fashion', 799, 1799, '👕', '100% combed cotton, regular fit, breathable everyday wear.', 4.1, 18432, 500],
  ['Women\'s Floral Summer Kurti', 'Ethnique', 'Fashion', 1099, 2299, '👗', 'Soft rayon fabric with elegant floral print.', 4.3, 7650, 220],
  ['Running Sneakers AirFlex', 'StrideX', 'Fashion', 2499, 4999, '👟', 'Lightweight mesh upper with cushioned sole.', 4.4, 12980, 180],
  ['Slim Fit Denim Jeans', 'UrbanWear', 'Fashion', 1399, 2999, '👖', 'Stretch denim with comfortable mid-rise.', 4.0, 9321, 260],
  ['Leather Wallet - Bi-fold', 'Heritage', 'Fashion', 599, 1499, '👛', 'Genuine leather, RFID protection, 6 card slots.', 4.2, 5410, 340],
  ['Polarized Aviator Sunglasses', 'Shade', 'Fashion', 899, 2499, '🕶️', 'UV400 polarized lenses with metal frame.', 4.0, 4380, 150],

  ['Non-stick Cookware Set (5 pcs)', 'ChefMate', 'Home & Kitchen', 2299, 4599, '🍳', 'Induction-friendly with soft-touch handles.', 4.3, 10211, 140],
  ['Mixer Grinder 750W - 3 Jars', 'Spinwell', 'Home & Kitchen', 3299, 5999, '🥤', 'Powerful motor, stainless steel blades, 2-year warranty.', 4.4, 14033, 110],
  ['Air Fryer 4.2L Digital', 'ChefMate', 'Home & Kitchen', 5499, 9999, '🍟', 'Oil-free cooking with 8 preset menus.', 4.5, 8800, 90],
  ['Memory Foam Pillow (Set of 2)', 'DreamNest', 'Home & Kitchen', 999, 2199, '🛏️', 'Orthopedic cervical support, washable cover.', 4.2, 6540, 320],
  ['Stainless Steel Water Bottle 1L', 'HydroGo', 'Home & Kitchen', 449, 999, '🧴', 'Double-wall insulated, keeps cold 24h and hot 12h.', 4.4, 25610, 600],
  ['LED Study Desk Lamp', 'Lumina', 'Home & Kitchen', 749, 1599, '💡', 'Touch dimming with 3 colour modes and USB port.', 4.2, 4920, 210],

  ['Atomic Habits', 'Penguin', 'Books', 399, 799, '📘', 'An easy and proven way to build good habits and break bad ones.', 4.8, 52010, 700],
  ['The Psychology of Money', 'Jaico', 'Books', 299, 399, '📗', 'Timeless lessons on wealth, greed and happiness.', 4.7, 41322, 650],
  ['Database System Concepts', 'McGraw Hill', 'Books', 1099, 1499, '📕', 'Standard textbook on relational, NoSQL and transaction processing.', 4.5, 1840, 90],
  ['The Definitive Guide to Data', 'O\'Reilly', 'Books', 1599, 2199, '📙', 'Powerful and scalable data storage with real-world patterns.', 4.6, 960, 60],
  ['Fast Data in Action', 'Manning', 'Books', 1299, 1799, '📓', 'Practical guide to caching, queues, leaderboards and more.', 4.5, 710, 55],
  ['Ikigai', 'Penguin', 'Books', 249, 399, '📔', 'The Japanese secret to a long and happy life.', 4.5, 33210, 800],

  ['Vitamin C Face Serum 30ml', 'GlowLab', 'Beauty', 549, 999, '🧪', 'Brightening serum with hyaluronic acid.', 4.2, 17022, 380],
  ['Matte Liquid Lipstick Set (4)', 'Velvet', 'Beauty', 699, 1599, '💄', 'Long-lasting, smudge-proof matte finish.', 4.1, 9100, 290],
  ['Argan Oil Hair Shampoo 500ml', 'GlowLab', 'Beauty', 399, 749, '🧴', 'Sulphate free, nourishes and smoothens hair.', 4.3, 12044, 450],
  ['Men\'s Grooming Kit', 'Gentry', 'Beauty', 1299, 2599, '🪒', 'Trimmer, razor, beard oil and comb in a travel case.', 4.2, 5230, 160],

  ['Cricket Bat - English Willow', 'MasterBlast', 'Sports & Fitness', 3499, 6999, '🏏', 'Grade 2 willow, excellent pick-up and balance.', 4.3, 1820, 70],
  ['Yoga Mat 6mm Anti-slip', 'FlexFit', 'Sports & Fitness', 599, 1499, '🧘', 'Eco-friendly TPE with carrying strap.', 4.3, 14300, 420],
  ['Adjustable Dumbbell Set 20kg', 'IronCore', 'Sports & Fitness', 2799, 4999, '🏋️', 'Chrome plated with anti-slip grip handles.', 4.4, 6310, 100],
  ['Football Size 5 Match Ball', 'StrideX', 'Sports & Fitness', 799, 1499, '⚽', 'Machine stitched, durable PU surface.', 4.2, 3380, 230],

  ['Building Blocks 500 pcs Set', 'BrickKing', 'Toys', 999, 1999, '🧱', 'Colourful interlocking bricks to boost creativity.', 4.5, 7430, 310],
  ['Remote Control Racing Car', 'SpeedyToys', 'Toys', 1299, 2599, '🏎️', '2.4GHz rechargeable high-speed RC car.', 4.2, 5120, 190],
  ['Plush Teddy Bear 3ft', 'CuddleCo', 'Toys', 899, 1799, '🧸', 'Super soft and huggable gift for all ages.', 4.4, 8650, 140],
  ['Board Game - Business Tycoon', 'FunHouse', 'Toys', 549, 999, '🎲', 'Classic family game for 2-6 players.', 4.3, 9210, 260],

  ['Basmati Rice Premium 5kg', 'FarmFresh', 'Grocery', 649, 899, '🍚', 'Aged long-grain aromatic basmati rice.', 4.4, 27011, 900],
  ['Cold Pressed Groundnut Oil 1L', 'FarmFresh', 'Grocery', 249, 349, '🥜', 'Natural, chemical-free, wood pressed.', 4.3, 9805, 700],
  ['Assorted Dry Fruits Box 500g', 'NutriBite', 'Grocery', 599, 999, '🥜', 'Almonds, cashews, raisins and walnuts.', 4.4, 11420, 500],
  ['Green Tea Bags (100 count)', 'LeafLove', 'Grocery', 349, 599, '🍵', 'Antioxidant-rich, refreshing and light.', 4.2, 15600, 620]
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);

const products = rows.map((r, i) => ({
  sku: `SS${String(1000 + i)}`,
  slug: slug(r[0]),
  title: r[0],
  brand: r[1],
  category: r[2],
  price: r[3],
  mrp: r[4],
  emoji: r[5],
  description: r[6],
  rating: r[7],
  reviews: r[8],
  stock: r[9],
  sold: 0,
  grad: categories[r[2]].grad,
  discountPct: Math.round(((r[4] - r[3]) / r[4]) * 100),
  createdAt: new Date(Date.now() - i * 36e5 * 6)
}));

const cities = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Vijayawada'];

module.exports = { categories, products, cities };
