import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding achievements...');

  const achievements = [
    {
      code: 'FIRST_SESSION',
      name: 'First Keystrokes',
      description: 'Complete your first typing session.',
      icon: 'sparkles',
      category: 'General',
      xpReward: 100,
    },
    {
      code: 'STREAK_3',
      name: 'Consistent',
      description: 'Maintain a 3-day typing streak.',
      icon: 'flame',
      category: 'Streak',
      xpReward: 150,
    },
    {
      code: 'STREAK_7',
      name: 'Dedicated',
      description: 'Maintain a 7-day typing streak.',
      icon: 'award',
      category: 'Streak',
      xpReward: 300,
    },
    {
      code: 'WPM_60',
      name: 'Fast Fingers',
      description: 'Reach a typing speed of 60 WPM.',
      icon: 'zap',
      category: 'Speed',
      xpReward: 200,
    },
    {
      code: 'WPM_80',
      name: 'Speed Demon',
      description: 'Reach a typing speed of 80 WPM.',
      icon: 'gauge',
      category: 'Speed',
      xpReward: 350,
    },
    {
      code: 'WPM_100',
      name: 'Grandmaster Typist',
      description: 'Reach a typing speed of 100 WPM.',
      icon: 'crown',
      category: 'Speed',
      xpReward: 500,
    },
    {
      code: 'ACC_95',
      name: 'Sharpshooter I',
      description: 'Complete a session with at least 95% accuracy.',
      icon: 'target',
      category: 'Accuracy',
      xpReward: 200,
    },
    {
      code: 'ACC_98',
      name: 'Accuracy Master',
      description: 'Complete a session with at least 98% accuracy.',
      icon: 'crosshair',
      category: 'Accuracy',
      xpReward: 300,
    },
    {
      code: 'ACC_99',
      name: 'Laser Precision',
      description: 'Complete a session with at least 99% accuracy.',
      icon: 'crosshair',
      category: 'Accuracy',
      xpReward: 400,
    },
    {
      code: 'CHARS_10000',
      name: 'Novelist',
      description: 'Type a total of 10,000 characters.',
      icon: 'book-open',
      category: 'Volume',
      xpReward: 400,
    },
    {
      code: 'SESSIONS_100',
      name: 'Century Club',
      description: 'Complete 100 typing sessions.',
      icon: 'trophy',
      category: 'General',
      xpReward: 500,
    },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: ach,
      create: ach,
    });
  }

  console.log('Seeding daily challenges...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const challenges = [
    {
      type: 'DAILY',
      title: 'Daily Warmup',
      description: 'Complete 3 typing sessions today.',
      criteriaType: 'SESSIONS',
      targetValue: 3,
      xpReward: 50,
      expiresAt: tomorrow,
    },
    {
      type: 'DAILY',
      title: 'Precision Master',
      description: 'Complete a session with 96% accuracy or more.',
      criteriaType: 'ACCURACY',
      targetValue: 96,
      xpReward: 75,
      expiresAt: tomorrow,
    },
    {
      type: 'WEEKLY',
      title: 'Weekly Marathon',
      description: 'Type a total of 5,000 characters this week.',
      criteriaType: 'CHARS',
      targetValue: 5000,
      xpReward: 250,
      expiresAt: nextWeek,
    },
  ];

  for (const ch of challenges) {
    // Check if challenge with same title already exists
    const existing = await prisma.challenge.findFirst({
      where: { title: ch.title },
    });
    if (!existing) {
      await prisma.challenge.create({
        data: ch,
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
