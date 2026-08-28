import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CATEGORIES = [
  { name: 'Career', slug: 'career', durationMinutes: 30, price: 999, description: 'Guidance on career growth, job changes and professional success.' },
  { name: 'Marriage', slug: 'marriage', durationMinutes: 30, price: 999, description: 'Marriage timing, compatibility and married life predictions.' },
  { name: 'Love', slug: 'love', durationMinutes: 30, price: 799, description: 'Love life, relationship troubles and compatibility guidance.' },
  { name: 'Business', slug: 'business', durationMinutes: 45, price: 1499, description: 'Business growth, partnerships and financial decisions.' },
  { name: 'Health', slug: 'health', durationMinutes: 30, price: 899, description: 'Health-related astrological insights and remedies.' },
  { name: 'Education', slug: 'education', durationMinutes: 30, price: 799, description: 'Higher education, exams and study abroad guidance.' },
  { name: 'Property', slug: 'property', durationMinutes: 30, price: 999, description: 'Property purchase, disputes and real estate timing.' },
  { name: 'Foreign Settlement', slug: 'foreign-settlement', durationMinutes: 30, price: 1199, description: 'Foreign travel, visa and settlement abroad predictions.' },
  { name: 'Kundli Matching', slug: 'kundli-matching', durationMinutes: 30, price: 699, description: 'Detailed horoscope matching for marriage compatibility.' },
  { name: 'Child Birth', slug: 'child-birth', durationMinutes: 30, price: 899, description: 'Guidance on conception, pregnancy and child birth timing.' },
  { name: 'Finance', slug: 'finance', durationMinutes: 30, price: 999, description: 'Financial planning, wealth accumulation and money matters.' },
  { name: 'Family Problems', slug: 'family-problems', durationMinutes: 45, price: 1199, description: 'Resolving family disputes and improving family harmony.' },
  { name: 'Gemstone Guidance', slug: 'gemstone-guidance', durationMinutes: 30, price: 300, description: 'Expert recommendation of suitable gemstones based on your horoscope.' },
  { name: 'Full Kundli Analysis', slug: 'full-kundli-analysis', durationMinutes: 60, price: 700, description: 'Detailed, comprehensive analysis of your birth chart covering Dasha and spiritual remedies. (Special Offer: ₹700, Original: ₹1,100)' },
  { name: 'Muhurat Guidance', slug: 'muhurat-guidance', durationMinutes: 30, price: 300, description: 'Auspicious timings for marriage, business launch, and major new beginnings.' },
];

const COMBOS = [
  { name: 'Marriage + Career', slug: 'marriage-career', discountedPrice: 1599, description: 'Complete guidance on marriage and career together.', categories: ['marriage', 'career'] },
  { name: 'Career + Business', slug: 'career-business', discountedPrice: 1999, description: 'For professionals evaluating career vs. business decisions.', categories: ['career', 'business'] },
  { name: 'Love + Marriage', slug: 'love-marriage', discountedPrice: 1399, description: 'From relationship guidance to marriage timing.', categories: ['love', 'marriage'] },
  { name: 'Complete Life Analysis', slug: 'complete-life-analysis', discountedPrice: 2999, description: 'A holistic reading covering career, marriage, health and finance.', categories: ['career', 'marriage', 'health', 'finance'] },
];

const GEMSTONES = [
  {
    name: 'Ceylon Yellow Sapphire (Pukhraj)',
    slug: 'yellow-sapphire-pukhraj',
    shortDescription: 'Premium Ceylon Yellow Sapphire for Jupiter (Guru) blessing, wealth & wisdom.',
    description: 'Natural Yellow Sapphire (Pukhraj) represents Jupiter, the planet of knowledge, prosperity, good luck, and spiritual growth.',
    benefits: 'Attracts financial abundance, academic success, marital bliss, and spiritual wisdom.',
    whoShouldWear: 'Ideal for Sagittarius (Dhanu) and Pisces (Meen) ascendants.',
    weightOptions: '3.5 Ratti, 4.25 Ratti, 5.5 Ratti, 7.1 Ratti',
    certification: 'Government Lab Certified Natural Ceylon Sapphire',
    careInstructions: 'Clean gently once a month. Wear on Index finger on Thursday morning.',
    price: 8500,
    isFeatured: true,
    images: ['/gemstones/yellow-sapphire.jpg'],
  },
  {
    name: 'Ceylon Blue Sapphire (Neelam)',
    slug: 'blue-sapphire-neelam',
    shortDescription: 'High Energy Natural Ceylon Blue Sapphire for Saturn (Shani) strength.',
    description: 'Blue Sapphire (Neelam) is one of the most powerful Vedic gemstones associated with Lord Shani. It brings instant clarity, wealth, and protection.',
    benefits: 'Brings quick opportunities, protection from enemies, career breakthroughs, and focus.',
    whoShouldWear: 'Recommended for Capricorn (Makar) and Aquarius (Kumbh) after Kundli analysis.',
    weightOptions: '4.0 Ratti, 5.25 Ratti, 6.5 Ratti',
    certification: 'IGI / GIA Certified Natural Untreated Sapphire',
    careInstructions: 'Always test for 3 days before permanent wearing in silver/white gold ring.',
    price: 12500,
    isFeatured: true,
    images: ['/gemstones/blue-sapphire.jpg'],
  },
  {
    name: 'Red Coral (Moonga)',
    slug: 'red-coral-moonga',
    shortDescription: 'Boosts Mars energy for courage, confidence & vitality.',
    description: 'Red Coral strengthens Mars, improving courage, vitality, and helps in overcoming obstacles.',
    benefits: 'Improves courage, vitality, leadership qualities and helps with Mars-related health issues.',
    whoShouldWear: 'Individuals with a weak Mars, or those in fields requiring courage and physical stamina (e.g. sports, defence, real estate).',
    weightOptions: '5 carats, 7 carats, 9 carats',
    certification: 'Comes with a government-approved lab certificate.',
    careInstructions: 'Avoid contact with chemicals. Store separately to prevent scratches. Clean with a soft, dry cloth.',
    price: 1999,
    isFeatured: true,
    images: ['/gemstones/red-coral.jpg'],
  },
  {
    name: 'Zambian Emerald (Panna)',
    slug: 'emerald-panna',
    shortDescription: 'Zambian Emerald for Mercury (Budh) intellect, communication & business.',
    description: 'Emerald (Panna) boosts Mercury power, sharpening memory, public speaking, trading, and mathematical skills.',
    benefits: 'Enhances communication skills, business profits, creative thinking, and concentration.',
    whoShouldWear: 'Best for Gemini (Mithun) and Virgo (Kanya) ascendants.',
    weightOptions: '3.0 Ratti, 4.5 Ratti, 6.0 Ratti',
    certification: 'Lab Certified 100% Natural Zambian Emerald',
    careInstructions: 'Avoid harsh impacts. Wear in gold or silver ring on Little finger on Wednesday.',
    price: 6200,
    isFeatured: true,
    images: ['/gemstones/emerald.jpg'],
  },
  {
    name: 'White Opal (Single Fire)',
    slug: 'white-opal-single-fire',
    shortDescription: 'Natural White Opal with Single-fire iridescence for Venus (Shukra) strength.',
    description: 'Iridescent White Opal is worn to strengthen Venus, enhancing luxury, artistic abilities, love relationships, and charm.',
    benefits: 'Brings luxury, beauty, artistic excellence, and improves love relationship bonding.',
    whoShouldWear: 'Recommended for Taurus (Vrishabha) and Libra (Tula) ascendants.',
    weightOptions: '3 carats, 5 carats, 7 carats',
    certification: '100% Government Approved Lab Certified Opal',
    careInstructions: 'Clean gently. Avoid ultrasonic cleaners and exposure to extreme dry heat.',
    price: 3500,
    isFeatured: true,
    images: ['/gemstones/opal.jpg'],
  },
  {
    name: 'White Opal (Double Fire)',
    slug: 'white-opal-double-fire',
    shortDescription: 'Premium Natural White Opal with double-sided sparkling fire play.',
    description: 'Double Fire Opal is highly prized for its brilliant double-sided color play (red, orange, green, blue fires), representing Venus.',
    benefits: 'Attracts magnetic charm, relationship prosperity, extreme luxury, and mental peace.',
    whoShouldWear: 'Suitable for individuals desiring strong Venus blessings in career and marriage.',
    weightOptions: '3.5 carats, 5.25 carats, 7 carats',
    certification: '100% Government Approved Lab Certified Opal',
    careInstructions: 'Clean gently. Avoid ultrasonic cleaners and exposure to extreme dry heat.',
    price: 5500,
    isFeatured: true,
    images: ['/gemstones/opal.jpg'],
  },
  {
    name: 'Natural Pearl (Motti)',
    slug: 'natural-pearl-motti',
    shortDescription: 'Natural White Pearl for Moon (Chandra) blessing & emotional stability.',
    description: 'Natural Pearl (Moti) represents the Moon, bringing mental peace, emotional stability, and cooling down anger.',
    benefits: 'Calms the mind, controls anger, improves mother-child relationship, and helps with sleep.',
    whoShouldWear: 'Recommended for Cancer (Karka) ascendants or those with a weak/afflicted Moon.',
    weightOptions: '3 Ratti, 5 Ratti, 7 Ratti',
    certification: 'Government Lab Certified Natural Pearl',
    careInstructions: 'Avoid contact with makeup/perfumes. Clean with a damp cloth.',
    price: 2999,
    isFeatured: true,
    images: ['/gemstones/pearl.jpg'],
  },
  {
    name: 'South Sea Golden Pearl',
    slug: 'south-sea-golden-pearl',
    shortDescription: 'Luxurious Golden South Sea Pearl for wealth, luxury & planetary strength.',
    description: 'Golden South Sea Pearl is one of the rarest pearls in the world, embodying prosperity, premium luxury, and strong Moon-Jupiter benefits.',
    benefits: 'Attracts major financial wealth, high status, mental peace, and luxury.',
    whoShouldWear: 'Suitable for business leaders, managers, and those seeking financial breakthrough.',
    weightOptions: '5 Ratti, 7.5 Ratti, 10 Ratti',
    certification: 'Comes with a government-approved lab certificate.',
    careInstructions: 'Avoid contact with makeup/perfumes. Clean with a damp cloth.',
    price: 7500,
    isFeatured: true,
    images: ['/gemstones/south-sea-pearl.jpg'],
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash },
    });
    console.log(`Seeded admin: ${adminEmail}`);
  } else {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin seed');
  }

  for (const category of CATEGORIES) {
    await prisma.consultationCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }
  console.log(`Seeded ${CATEGORIES.length} consultation categories`);

  for (const combo of COMBOS) {
    const { categories, ...rest } = combo;
    const categoryRows = await prisma.consultationCategory.findMany({
      where: { slug: { in: categories } },
      select: { id: true },
    });

    const existing = await prisma.comboOffer.findUnique({ where: { slug: combo.slug } });
    if (existing) {
      await prisma.comboOfferCategory.deleteMany({ where: { comboOfferId: existing.id } });
      await prisma.comboOffer.update({
        where: { id: existing.id },
        data: {
          ...rest,
          categories: { create: categoryRows.map((c) => ({ categoryId: c.id })) },
        },
      });
    } else {
      await prisma.comboOffer.create({
        data: {
          ...rest,
          categories: { create: categoryRows.map((c) => ({ categoryId: c.id })) },
        },
      });
    }
  }
  console.log(`Seeded ${COMBOS.length} combo offers`);

  // Monday(1) - Saturday(6), 10:00 - 19:00
  for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
    const existing = await prisma.weeklyAvailability.findFirst({ where: { dayOfWeek } });
    if (!existing) {
      await prisma.weeklyAvailability.create({
        data: { dayOfWeek, startTime: '10:00', endTime: '19:00', isActive: true },
      });
    }
  }
  console.log('Seeded weekly availability (Mon-Sat, 10:00-19:00)');

  const existingPaymentConfig = await prisma.paymentConfig.findFirst();
  if (!existingPaymentConfig) {
    await prisma.paymentConfig.create({
      data: {
        upiName: 'Kundli Kendra Official',
        upiId: 'atuldhiman.1998@okicici',
        qrImage: '/upi-qr.jpg',
        phone: '+91 98765 43210',
        instructions: 'Scan the Google Pay QR code using Google Pay, PhonePe, Paytm, or any UPI App. Enter the transaction ID and upload a screenshot of your payment confirmation.',
        isActive: true,
      },
    });
    console.log('Seeded payment config');
  }

  for (const gemstone of GEMSTONES) {
    const { images, ...rest } = gemstone;
    const existing = await prisma.gemstone.findUnique({ where: { slug: gemstone.slug } });
    if (existing) {
      await prisma.gemstoneImage.deleteMany({ where: { gemstoneId: existing.id } });
      await prisma.gemstone.update({
        where: { id: existing.id },
        data: {
          ...rest,
          image: images[0],
          images: { create: images.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder })) },
        },
      });
    } else {
      await prisma.gemstone.create({
        data: {
          ...rest,
          image: images[0],
          images: { create: images.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder })) },
        },
      });
    }
  }
  console.log(`Seeded ${GEMSTONES.length} gemstones`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
