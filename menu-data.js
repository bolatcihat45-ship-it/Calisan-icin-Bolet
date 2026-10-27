// Shared menu for customer UI, server-side order validation, AI catalog and staff receipts.
// Prices are trusted only on the server. MENU_VERIFIED stays false until BOLET confirms the complete list.
const entry = (id, name, german, category, priceCents, extra = {}) => ({
  id, name, german, category, priceCents, ...extra
});

const products = [
  entry("chicken-doner", "Tavuk Döner Sandviç", "Hühner Döner Sandwich", "doner", 490, { aliases: ["tavuk döner", "hühner döner", "chicken doner"] }),
  entry("chicken-durum", "Tavuk Döner Dürüm", "Hühner Döner Dürüm", "doner", 650),
  entry("chicken-box", "Tavuk Döner Box", "Hühner Döner Box", "doner", 690),
  entry("chicken-plate", "Tavuk Döner Tabak", "Hühner Döner Teller", "doner", 1190),
  entry("beef-doner", "Et Döner Sandviç", "Rind Döner Sandwich", "doner", 590, { aliases: ["et döner", "rind döner", "beef doner"] }),
  entry("beef-durum", "Et Döner Dürüm", "Rind Döner Dürüm", "doner", 750),
  entry("beef-box", "Et Döner Box", "Rind Döner Box", "doner", 790),
  entry("beef-plate", "Et Döner Tabak", "Rind Döner Teller", "doner", 1390),

  entry("schnitzel-sandwich", "Şinitzel Sandviç", "Schnitzel Sandwich", "other", 550),
  entry("schnitzel-durum", "Şinitzel Dürüm", "Schnitzel Dürüm", "other", 650),
  entry("schnitzel-box", "Şinitzel Box", "Schnitzel Box", "other", 650),
  entry("schnitzel-plate", "Şinitzel Tabak", "Schnitzel Teller", "other", 1190),
  entry("falafel-sandwich", "Falafel Sandviç", "Falafel Sandwich", "other", 500),
  entry("falafel-durum", "Falafel Dürüm", "Falafel Dürüm", "other", 600),
  entry("falafel-box", "Falafel Box", "Falafel Box", "other", 600),
  entry("falafel-plate", "Falafel Tabak", "Falafel Teller", "other", 990),
  entry("veggie-sandwich", "Sebzeli Sandviç", "Veggie Sandwich", "other", 500),
  entry("veggie-durum", "Sebzeli Dürüm", "Veggie Dürüm", "other", 600),
  entry("veggie-box", "Sebzeli Box", "Veggie Box", "other", 600),

  entry("pizza-margherita-33", "Margherita · 33 cm", "Margherita · 33 cm", "pizza", 890),
  entry("pizza-margherita-50", "Margherita · 50 cm", "Margherita · 50 cm", "pizza", 1790),
  entry("pizza-salami-33", "Salamlı Pizza · 33 cm", "Salami Pizza · 33 cm", "pizza", 990),
  entry("pizza-salami-50", "Salamlı Pizza · 50 cm", "Salami Pizza · 50 cm", "pizza", 1790),
  entry("pizza-tonno-33", "Ton Balıklı Pizza · 33 cm", "Tonno Pizza · 33 cm", "pizza", 990),
  entry("pizza-tonno-50", "Ton Balıklı Pizza · 50 cm", "Tonno Pizza · 50 cm", "pizza", 1790),
  entry("pizza-schinken-33", "Jambonlu Pizza · 33 cm", "Schinken Pizza · 33 cm", "pizza", 990),
  entry("pizza-schinken-50", "Jambonlu Pizza · 50 cm", "Schinken Pizza · 50 cm", "pizza", 1790),
  entry("pizza-champignon-33", "Mantarlı Pizza · 33 cm", "Champignon Pizza · 33 cm", "pizza", 990),
  entry("pizza-champignon-50", "Mantarlı Pizza · 50 cm", "Champignon Pizza · 50 cm", "pizza", 1790),
  entry("pizza-chicken-doner-33", "Tavuk Dönerli Pizza · 33 cm", "Döner Pizza Huhn · 33 cm", "pizza", 990),
  entry("pizza-chicken-doner-50", "Tavuk Dönerli Pizza · 50 cm", "Döner Pizza Huhn · 50 cm", "pizza", 1790),
  entry("pizza-beef-doner-33", "Et Dönerli Pizza · 33 cm", "Döner Pizza Rind · 33 cm", "pizza", 1090),
  entry("pizza-beef-doner-50", "Et Dönerli Pizza · 50 cm", "Döner Pizza Rind · 50 cm", "pizza", 1990),
  entry("pizza-slice", "Pizza Schnitte", "Pizza Schnitte", "pizza", 200),
  entry("family-pizza", "Familienpizza", "Familienpizza", "pizza", 1800),

  entry("fries", "Patates Kızartması", "Pommes", "sides", 290),
  entry("rice", "Pilav", "Reis", "sides", 290),
  entry("salad-box", "Salata Box", "Salat Box", "sides", 290),
  entry("bread", "Ekmek", "Brot", "sides", 100),
  entry("white-cheese", "Beyaz Peynir", "Weichkäse", "sides", 50),
  entry("canned-drink", "Kutu İçecek", "Dosengetränk", "drinks", 250),
  entry("bottled-drink", "Şişe İçecek", "Flaschengetränk", "drinks", 300),
  entry("pepsi", "Pepsi", "Pepsi", "drinks", 200),
  entry("ayran", "Ayran", "Ayran", "drinks", 200),
  entry("wild-dragon", "Wild Dragon", "Wild Dragon", "drinks", 250),
  entry("red-bull", "Red Bull", "Red Bull", "drinks", 300),
  entry("mineral-water", "Maden Suyu", "Mineralwasser", "drinks", 200),

  // Keep the previously exposed generic Schnitzel entry unavailable; its price was only approximate.
  entry("schnitzel", "Şinitzel (fiyat teyidi gerekli)", "Schnitzel (Preis bitte bestätigen)", "other", 500, { approximate: true })
];

export const menuProducts = products.map((product) => ({
  badge: "BOLET MENÜSÜNDEN",
  description: product.name,
  art: product.category === "pizza" ? "pizza" : product.category === "doner" ? "doner" : "schnitzel",
  image: "",
  ...product
}));

export function formatPrice(cents) {
  const amount = (cents / 100).toFixed(2).replace(".", ",");
  return `${amount} €`;
}
