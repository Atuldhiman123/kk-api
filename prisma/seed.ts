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
];

const COMBOS = [
  { name: 'Marriage + Career', slug: 'marriage-career', discountedPrice: 1599, description: 'Complete guidance on marriage and career together.', categories: ['marriage', 'career'] },
  { name: 'Career + Business', slug: 'career-business', discountedPrice: 1999, description: 'For professionals evaluating career vs. business decisions.', categories: ['career', 'business'] },
  { name: 'Love + Marriage', slug: 'love-marriage', discountedPrice: 1399, description: 'From relationship guidance to marriage timing.', categories: ['love', 'marriage'] },
  { name: 'Complete Life Analysis', slug: 'complete-life-analysis', discountedPrice: 2999, description: 'A holistic reading covering career, marriage, health and finance.', categories: ['career', 'marriage', 'health', 'finance'] },
];

const GEMSTONES = [
  {
    name: 'Yellow Sapphire (Pukhraj)',
    slug: 'yellow-sapphire-pukhraj',
    shortDescription: 'Strengthens Jupiter for wisdom, wealth and marital harmony.',
    description: 'Yellow Sapphire is worn to strengthen a weak or afflicted Jupiter, bringing wisdom, wealth, and marital harmony.',
    benefits: 'Improves wisdom, financial growth, marital harmony and overall Jupiter-related life areas.',
    whoShouldWear: 'Individuals with a weak Jupiter placement, or those seeking marriage, wealth or career growth. Recommended after consultation.',
    weightOptions: '3 carats, 5 carats, 7 carats',
    certification: 'Comes with a government-approved lab certificate.',
    careInstructions: 'Avoid contact with chemicals/perfumes. Clean gently with a soft cloth. Remove before strenuous physical activity.',
    price: 4999,
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1518544866330-4d2b6ce7e5b1'],
  },
  {
    name: 'Blue Sapphire (Neelam)',
    slug: 'blue-sapphire-neelam',
    shortDescription: 'Powerful Saturn gemstone for career and discipline.',
    description: 'Blue Sapphire is one of the most powerful gemstones, associated with Saturn, known for fast and strong results.',
    benefits: 'Boosts career growth, discipline, focus, and helps overcome obstacles linked to Saturn.',
    whoShouldWear: 'Only recommended after checking compatibility via consultation — Blue Sapphire can give very fast, strong results (positive or negative).',
    weightOptions: '3 carats, 5 carats, 7 carats',
    certification: 'Comes with a government-approved lab certificate.',
    careInstructions: 'Avoid contact with chemicals/perfumes. Clean gently with a soft cloth. Remove before strenuous physical activity.',
    price: 7999,
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1518544801976-3e159e50e5bb'],
  },
  {
    name: 'Red Coral (Moonga)',
    slug: 'red-coral-moonga',
    shortDescription: 'Boosts Mars energy for courage and vitality.',
    description: 'Red Coral strengthens Mars, improving courage, vitality, and helps in overcoming obstacles.',
    benefits: 'Improves courage, vitality, leadership qualities and helps with Mars-related health issues.',
    whoShouldWear: 'Individuals with a weak Mars, or those in fields requiring courage and physical stamina (e.g. sports, defence, real estate).',
    weightOptions: '5 carats, 7 carats, 9 carats',
    certification: 'Comes with a government-approved lab certificate.',
    careInstructions: 'Avoid contact with chemicals. Store separately to prevent scratches. Clean with a soft, dry cloth.',
    price: 1999,
    images: ['https://images.unsplash.com/photo-1519452575417-564c1401ecc0'],
  },
  {
    name: 'Emerald (Panna)',
    slug: 'emerald-panna',
    shortDescription: 'Enhances Mercury for intellect and communication.',
    description: 'Emerald strengthens Mercury, improving intellect, communication skills, and business acumen.',
    benefits: 'Sharpens intellect, improves communication and boosts business/trade-related success.',
    whoShouldWear: 'Students, business professionals and communicators with a weak Mercury placement.',
    weightOptions: '3 carats, 5 carats, 7 carats',
    certification: 'Comes with a government-approved lab certificate.',
    careInstructions: 'Emerald is delicate — avoid ultrasonic cleaning, sudden temperature changes, and hard knocks.',
    price: 3499,
    images: ['https://images.unsplash.com/photo-1500336624523-d727130c3328'],
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
