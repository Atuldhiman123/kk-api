const fs = require('fs');
const dotenv = require('d:\\kundli kendra\\kundli kendra backend\\kk-api\\node_modules\\dotenv');
dotenv.config({ path: 'd:\\kundli kendra\\kundli kendra backend\\kk-api\\.env' });

const { PrismaClient } = require('d:\\kundli kendra\\kundli kendra backend\\kk-api\\node_modules\\@prisma\\client');
const { PrismaPg } = require('d:\\kundli kendra\\kundli kendra backend\\kk-api\\node_modules\\@prisma\\adapter-pg');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SEED_KNOWLEDGE_ENTRIES = [
  // 1. Sun (Surya)
  {
    title: 'Sun (Surya) in Vedic Astrology',
    category: 'planet',
    content: 'The Sun (Surya) is the soul (Atmakaraka), vitality, ego, authority, father, and government in Vedic astrology. It rules the sign Leo (Simha), gets exalted in Aries (Mesha) at 10 degrees, and gets debilitated in Libra (Tula) at 10 degrees. A strong Sun bestows leadership qualities, high self-esteem, robust health, and governmental favor.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Sun', rasi: 'Leo', exaltedIn: 'Aries', debilitatedIn: 'Libra' },
  },
  // 2. Moon (Chandra)
  {
    title: 'Moon (Chandra) in Vedic Astrology',
    category: 'planet',
    content: 'The Moon (Chandra) represents the mind (Manas), emotions, mother, peace, memory, and fertility. It rules Cancer (Karka), is exalted in Taurus (Vrishabha) at 3 degrees, and debilitated in Scorpio (Vrishchika) at 3 degrees. Moon controls public popularity, emotional equilibrium, and mental strength.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Moon', rasi: 'Cancer', exaltedIn: 'Taurus', debilitatedIn: 'Scorpio' },
  },
  // 3. Mars (Mangal)
  {
    title: 'Mars (Mangal) in Vedic Astrology',
    category: 'planet',
    content: 'Mars (Mangal) represents courage, energy, physical drive, siblings, real estate/land, surgery, and technical abilities. It rules Aries (Mesha) and Scorpio (Vrishchika), is exalted in Capricorn (Makara) at 28 degrees, and debilitated in Cancer (Karka) at 28 degrees. When placed in houses 1, 4, 7, 8, or 12, it forms Manglik Dosha.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Mars', rasi: ['Aries', 'Scorpio'], exaltedIn: 'Capricorn', debilitatedIn: 'Cancer' },
  },
  // 4. Mercury (Budha)
  {
    title: 'Mercury (Budha) in Vedic Astrology',
    category: 'planet',
    content: 'Mercury (Budha) governs intellect, analytical reasoning, communication, speech, commerce, accounting, and writing. It rules Gemini (Mithuna) and Virgo (Kanya), gets exalted in Virgo at 15 degrees, and is debilitated in Pisces (Meena) at 15 degrees. Strong Mercury creates exceptional business acumen and linguistic fluency.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Mercury', rasi: ['Gemini', 'Virgo'], exaltedIn: 'Virgo', debilitatedIn: 'Pisces' },
  },
  // 5. Jupiter (Guru)
  {
    title: 'Jupiter (Brihaspati / Guru) in Vedic Astrology',
    category: 'planet',
    content: 'Jupiter (Guru) is the supreme benefic, representing wisdom, higher knowledge, spirituality, dharma, wealth, children, and guru/teachers. It rules Sagittarius (Dhanu) and Pisces (Meena), is exalted in Cancer (Karka) at 5 degrees, and debilitated in Capricorn (Makara) at 5 degrees. Jupiter aspects 5th, 7th, and 9th houses from its placement.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Jupiter', rasi: ['Sagittarius', 'Pisces'], exaltedIn: 'Cancer', debilitatedIn: 'Capricorn' },
  },
  // 6. Venus (Shukra)
  {
    title: 'Venus (Shukra) in Vedic Astrology',
    category: 'planet',
    content: 'Venus (Shukra) represents love, romance, marriage, aesthetics, art, luxury, vehicles, and reproduction. It rules Taurus (Vrishabha) and Libra (Tula), gets exalted in Pisces (Meena) at 27 degrees, and is debilitated in Virgo (Kanya) at 27 degrees. A well-placed Venus brings marital harmony, creative genius, and luxurious comforts.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Venus', rasi: ['Taurus', 'Libra'], exaltedIn: 'Pisces', debilitatedIn: 'Virgo' },
  },
  // 7. Saturn (Shani)
  {
    title: 'Saturn (Shani) in Vedic Astrology',
    category: 'planet',
    content: 'Saturn (Shani) is the planet of karma, discipline, delay, perseverance, humility, longevity, and service. It rules Capricorn (Makara) and Aquarius (Kumbha), is exalted in Libra (Tula) at 20 degrees, and debilitated in Aries (Mesha) at 20 degrees. Saturn rewards patient dedication, righteous karma, and hard work.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Saturn', rasi: ['Capricorn', 'Aquarius'], exaltedIn: 'Libra', debilitatedIn: 'Aries' },
  },
  // 8. Rahu (North Node)
  {
    title: 'Rahu (North Node of Moon) in Vedic Astrology',
    category: 'planet',
    content: 'Rahu is a shadow planet (Chhaya Graha) representing ambition, foreign lands, obsession, modern technology, innovation, and unconventional success. Rahu amplifies the results of the lord of the house it occupies and acts akin to Saturn in giving worldly elevation.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Rahu', nature: 'Shadow Planet / Ambition' },
  },
  // 9. Ketu (South Node)
  {
    title: 'Ketu (South Node of Moon) in Vedic Astrology',
    category: 'planet',
    content: 'Ketu is the Moksha Karaka (significator of spiritual liberation), detachment, mysticism, occult sciences, intuition, and past-life mastery. It dissolves material attachment and deepens spiritual insight. Ketu operates similarly to Mars in intensity.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { planet: 'Ketu', nature: 'Moksha Karaka / Detachment' },
  },
  // 10. 1st House (Lagna / Tanu Bhava)
  {
    title: '1st House (Lagna / Tanu Bhava) in Vedic Astrology',
    category: 'house',
    content: 'The 1st house (Ascendant or Lagna) represents the physical body, self-identity, vital energy, appearance, general fortune, and overall life path. The strength of the Lagna and Lagna Lord (Ascendant Lord) is paramount for longevity, health, and success.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { house: 1, name: 'Tanu Bhava / Lagna' },
  },
  // 11. 2nd House (Dhana Bhava)
  {
    title: '2nd House (Dhana & Kutumba Bhava) in Vedic Astrology',
    category: 'house',
    content: 'The 2nd house signifies accumulated wealth, liquid assets, family lineage, speech, eating habits, and primary values. Benefic influences here create sweet speech and steady savings, while malefic aspects require discipline in finances and communication.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { house: 2, name: 'Dhana Bhava' },
  },
  // 12. 5th House (Putra & Poorva Punya Bhava)
  {
    title: '5th House (Putra & Buddhi Bhava) in Vedic Astrology',
    category: 'house',
    content: 'The 5th house governs intellect (Buddhi), creativity, progeny (children), romantic courtship, speculation, mantras, and past-life merits (Poorva Punya). It is a primary Trikona (auspicious dharma house) bringing wisdom and creative joy.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { house: 5, name: 'Putra Bhava' },
  },
  // 13. 7th House (Jaya / Kalatra Bhava)
  {
    title: '7th House (Jaya / Kalatra Bhava) in Vedic Astrology',
    category: 'house',
    content: 'The 7th house governs marriage, spouse, long-term relationships, business partnerships, commercial contracts, and public interactions. Venus and Jupiter benefic aspects enhance marital bonding and mutual trust, while Saturn brings maturity and Mars requires temper control.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { house: 7, name: 'Kalatra Bhava' },
  },
  // 14. 10th House (Karma Bhava)
  {
    title: '10th House (Karma & Rajya Bhava) in Vedic Astrology',
    category: 'house',
    content: 'The 10th house is the zenith of the chart representing career, profession, reputation, public status, government honors, authority, and legacy. Strong planets in the 10th house (like Sun, Mars, Saturn, or Mercury) grant leadership, executive power, and career distinction.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { house: 10, name: 'Karma Bhava' },
  },
  // 15. 11th House (Labha Bhava)
  {
    title: '11th House (Labha & Aya Bhava) in Vedic Astrology',
    category: 'house',
    content: 'The 11th house signifies major gains (Labha), income, fulfillment of desires, social circles, elder siblings, and networking influence. Almost all planets, including malefics, give prosperous material results when placed in the 11th house.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { house: 11, name: 'Labha Bhava' },
  },
  // 16. Nakshatras
  {
    title: 'Nakshatras (27 Lunar Mansions) in Vedic Astrology',
    category: 'nakshatra',
    content: 'Vedic astrology divides the 360-degree zodiac into 27 Nakshatras (13 degrees 20 minutes each), each subdivided into 4 Padas (3 degrees 20 minutes each). The Janma Nakshatra (birth star where Moon is placed) determines emotional nature, personality instincts, and starting Vimshottari Mahadasha balance.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { topic: 'Nakshatras', total: 27 },
  },
  // 17. Vimshottari Mahadasha System
  {
    title: 'Vimshottari Mahadasha Planetary Period System',
    category: 'dasha',
    content: 'The Vimshottari Dasha system spans 120 years across 9 planetary cycles: Ketu (7y), Venus (20y), Sun (6y), Moon (10y), Mars (7y), Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y). Events materialize according to the operating Mahadasha and Antardasha lords and their functional roles in the natal chart.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { topic: 'Vimshottari Dasha', totalYears: 120 },
  },
  // 18. Marriage & Relationship Astrology
  {
    title: 'Marriage & Relationship Analysis in Vedic Astrology',
    category: 'marriage',
    content: 'Marital compatibility and timing in Vedic astrology are judged through: 1) The 7th house and its lord, 2) Karakas (Venus for men, Jupiter and Venus for women), 3) The Navamsha (D9 chart), 4) Operating Mahadasha/Antardasha, and 5) Ashta Koota Kundli Matching for mutual harmony.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { lifeArea: 'Marriage', keyHouses: [7, 2, 4, 8, 12] },
  },
  // 19. Career & Wealth Astrology
  {
    title: 'Career & Financial Success in Vedic Astrology',
    category: 'career',
    content: 'Career direction and financial prosperity are determined by analyzing the Artha triangle (2nd, 6th, and 10th houses), Dhan Yogas (combinations between 1st, 2nd, 5th, 9th, and 11th lords), planetary strength (Shadbala), and the Dashamsha (D10) divisional chart.',
    source: 'General Vedic Astrology Knowledge',
    metadata: { lifeArea: 'Career & Wealth', keyHouses: [1, 2, 5, 9, 10, 11] },
  },
  // 20. Kundli Kendra Consultation Guidance
  {
    title: 'Kundli Kendra Astrological Consultations & Services',
    category: 'kundli_kendra',
    content: 'Kundli Kendra offers certified Vedic horoscope analysis, Kundli matching for marriage, career and business consultation, gemstone recommendations, and remedial solutions. Users can book a personalized 1-on-1 session with our expert astrologer through the Kundli Kendra platform.',
    source: 'Kundli Kendra Platform Guidance',
    metadata: { organization: 'Kundli Kendra', services: ['Horoscope Analysis', 'Kundli Matching', 'Live Consultation', 'Gemstone Advice'] },
  },
];

async function seedKnowledge() {
  console.log('Seeding ' + SEED_KNOWLEDGE_ENTRIES.length + ' astrology knowledge entries...');

  for (const entry of SEED_KNOWLEDGE_ENTRIES) {
    const existing = await prisma.astrologyKnowledge.findFirst({
      where: { title: entry.title },
    });

    if (!existing) {
      await prisma.astrologyKnowledge.create({
        data: {
          id: randomUUID(),
          title: entry.title,
          content: entry.content,
          category: entry.category,
          source: entry.source,
          metadata: entry.metadata,
        },
      });
      console.log('Inserted knowledge: ' + entry.title);
    } else {
      console.log('Already exists: ' + entry.title);
    }
  }

  console.log('Knowledge base seeding complete!');
}

// Write a copy to prisma directory as well
const prismaSeedPath = 'd:\\kundli kendra\\kundli kendra backend\\kk-api\\prisma\\seed-knowledge.js';
fs.writeFileSync(prismaSeedPath, fs.readFileSync(__filename, 'utf8'), 'utf8');
console.log('Copied seed-knowledge.js to prisma directory');

seedKnowledge()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
