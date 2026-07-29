require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  const restaurant = await prisma.business.create({
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
        specials: 'Chef\'s special: Butter Chicken - $12.99 (Mon-Thurs)',
        deliveryAvailable: true,
        deliveryFee: 3.99,
        minimumOrder: 15.00,
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

  console.log('✅ Created restaurant:', restaurant.name);

  const realEstate = await prisma.business.create({
    data: {
      name: 'Prime Properties Real Estate',
      type: 'real-estate',
      phone: '+1987654321',
      email: 'info@primeproperties.com',
      address: '456 Business Ave, City',
      description: 'Premium real estate services for buying, selling, and renting',
      knowledgeBase: {
        services: [
          'Property Buying',
          'Property Selling',
          'Property Renting',
          'Property Management',
          'Investment Consulting',
        ],
        featuredProperties: [
          {
            id: 'P001',
            type: 'Apartment',
            location: 'Downtown',
            price: 450000,
            bedrooms: 2,
            bathrooms: 2,
            sqft: 1200,
            features: ['City view', 'Modern kitchen', 'Gym access'],
          },
          {
            id: 'P002',
            type: 'House',
            location: 'Suburbia',
            price: 750000,
            bedrooms: 4,
            bathrooms: 3,
            sqft: 2500,
            features: ['Backyard', 'Garage', 'Pool'],
          },
        ],
        areas: ['Downtown', 'Suburbia', 'Midtown', 'Uptown'],
      },
      rules: {
        viewingPolicy: '48 hours advance booking required',
        commissionRate: '3% for buyers, 5% for sellers',
        consultationFee: 'Free initial consultation',
      },
    },
  });

  console.log('✅ Created real estate:', realEstate.name);

  const ecommerce = await prisma.business.create({
    data: {
      name: 'TechStore Online',
      type: 'ecommerce',
      phone: '+1555123456',
      email: 'support@techstore.com',
      address: '789 Commerce St, City',
      description: 'Premium electronics and gadgets online store',
      knowledgeBase: {
        categories: [
          'Smartphones',
          'Laptops',
          'Tablets',
          'Accessories',
          'Audio',
        ],
        featuredProducts: [
          { name: 'ProPhone X', price: 999.99, category: 'Smartphones', stock: 50 },
          { name: 'UltraBook Pro', price: 1499.99, category: 'Laptops', stock: 30 },
          { name: 'AirPods Max', price: 549.99, category: 'Audio', stock: 100 },
        ],
        shippingInfo: {
          standard: { days: '5-7', cost: 4.99 },
          express: { days: '2-3', cost: 12.99 },
          overnight: { days: '1', cost: 24.99 },
        },
        returnPolicy: '30-day return policy for unused items',
      },
      rules: {
        freeShippingOver: 50,
        returnWindowDays: 30,
        warrantyPeriod: '1 year standard warranty',
      },
    },
  });

  console.log('✅ Created e-commerce:', ecommerce.name);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Business IDs:');
  console.log(`   Restaurant: ${restaurant.id}`);
  console.log(`   Real Estate: ${realEstate.id}`);
  console.log(`   E-commerce: ${ecommerce.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
