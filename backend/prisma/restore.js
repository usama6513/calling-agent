require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.business.findMany({ select: { name: true } });
  const existingNames = existing.map((b) => b.name);

  const created = [];

  if (!existingNames.includes('Spice Garden Restaurant')) {
    const spice = await prisma.business.create({
      data: {
        name: 'Spice Garden Restaurant',
        type: 'restaurant',
        phone: '+1234567890',
        email: 'info@spicegarden.com',
        address: '123 Main Street, City',
        description: 'Authentic Indian cuisine with modern twist',
        knowledgeBase: {
          menu: {
            appetizers: [
              { name: 'Samosa', price: 5.99, description: 'Crispy pastry with spiced potato filling' },
              { name: 'Onion Bhaji', price: 4.99, description: 'Deep-fried onion fritters' },
              { name: 'Chicken Tikka', price: 7.99, description: 'Marinated chicken grilled in tandoor' },
            ],
            mains: [
              { name: 'Butter Chicken', price: 14.99, description: 'Creamy tomato-based chicken curry' },
              { name: 'Lamb Biryani', price: 16.99, description: 'Fragrant rice with tender lamb' },
              { name: 'Palak Paneer', price: 12.99, description: 'Spinach curry with cottage cheese' },
            ],
            desserts: [
              { name: 'Gulab Jamun', price: 4.99, description: 'Deep-fried milk dumplings in syrup' },
              { name: 'Kheer', price: 3.99, description: 'Rice pudding with cardamom' },
            ],
          },
          specials: "Chef's special: Butter Chicken - $12.99 (Mon-Thurs)",
          deliveryAvailable: true,
          deliveryFee: 3.99,
          minimumOrder: 15.0,
        },
        rules: {
          maxPartySize: 10,
          reservationCancellationPolicy: '24 hours notice required',
          refundPolicy: 'Full refund if order cancelled within 30 minutes',
          operatingHours: 'Mon-Sun: 11:00 AM - 10:00 PM',
        },
        workingHours: {
          monday: { open: '11:00', close: '22:00' },
          tuesday: { open: '11:00', close: '22:00' },
          wednesday: { open: '11:00', close: '22:00' },
          thursday: { open: '11:00', close: '22:00' },
          friday: { open: '11:00', close: '23:00' },
          saturday: { open: '10:00', close: '23:00' },
          sunday: { open: '10:00', close: '22:00' },
        },
      },
    });
    created.push(spice.name);
    console.log('Restored: Spice Garden Restaurant');
  }

  if (!existingNames.includes('Panaversity Institute')) {
    const panaversity = await prisma.business.create({
      data: {
        name: 'Panaversity Institute',
        type: 'consulting',
        phone: '+923330000000',
        email: 'info@panaversity.org',
        address: 'Karachi, Pakistan',
        website: 'https://panaversity.org',
        description:
          'Panaversity Institute is a cutting-edge educational institute in Pakistan focused on training the next generation of professionals in Artificial Intelligence, Cloud Computing, Blockchain, DevOps, and emerging technologies. Founded by Sir Zia Khan with a mission to make cutting-edge tech education accessible, practical, and industry-aligned. The institute also runs GIAIC (Governor Initiative for AI and Cloud Computing) programs.',
        knowledgeBase: {
          founder: 'Sir Zia Khan',
          faculty: [
            {
              name: 'Sir Ameen Alam',
              role: 'Dean of Faculty',
              qualifications:
                'Founder & CEO of Doblier Inc., leads the AORBIT platform, expert in enterprise AI, Agentic AI and Private LLMs, trains thousands of people and reaches 500,000+ learners. LinkedIn: https://sa.linkedin.com/in/ameen-alam',
            },
            { name: 'Sir Aneeq Khatri', role: 'Faculty Member' },
          ],
          courses: [
            'Certified AI Engineer (CAIE) Program',
            'Certified Data Scientist (CDS) Program',
            'Certified Machine Learning Engineer (CMLE) Program',
            'Artificial Intelligence and Machine Learning (AI & ML) Certification',
            'Data Science with Python Certification',
            'Deep Learning with TensorFlow Certification',
            'Agentic AI / Agent Development Programs',
          ],
          website: 'https://panaversity.org',
          courseCatalog: 'https://agentfactory.panaversity.org',
          giaic: 'Panaversity also runs GIAIC (Governor Initiative for AI and Cloud) programs with assessments and certifications.',
          assessment: 'Exams and assessments are conducted through GIAIC ensuring programs meet industry standards.',
        },
        rules: {
          examPolicy: 'Exams and assessments are conducted through GIAIC.',
          admissionNote: 'Course fees vary by program; refer to panaversity.org or agentfactory.panaversity.org for current pricing.',
          language: 'Always respond in ENGLISH only.',
        },
      },
    });
    created.push(panaversity.name);
    console.log('Restored: Panaversity Institute');
  }

  console.log(`\nDone. Created: ${created.length ? created.join(', ') : 'nothing new (all present)'}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
