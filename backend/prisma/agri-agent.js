require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.business.findFirst({ where: { name: 'Agriculture Expert' } });
  if (existing) {
    console.log('Already exists:', existing.id);
    await prisma.$disconnect();
    return;
  }

  const agri = await prisma.business.create({
    data: {
      name: 'Agriculture Expert',
      type: 'agriculture',
      phone: '+923000000000',
      email: 'support@agricultureexpert.com',
      website: 'https://agricultureexpert.com',
      description:
        'A complete AI agriculture expert agent. Knows everything about farming: crop selection, soil preparation, planting, crop diseases and prevention, benefits and risks, market value in different countries, what agriculture can provide, modern farming techniques, irrigation, organic farming, and more. Ask it anything about agriculture.',
      knowledgeBase: {
        about:
          'This agent is a comprehensive agricultural knowledge assistant. It helps farmers, students, and agripreneurs with practical farming guidance.',
        whatAgricultureProvides: [
          'Food for humans and animals',
          'Employment and income for millions of people',
          'Raw materials for industry (cotton for textiles, sugarcane for sugar, timber, rubber)',
          'Exports and foreign exchange earnings for countries',
          'Livelihood for rural communities',
          'Environmental benefits: oxygen, soil conservation, carbon capture',
          'Biofuel and renewable energy sources',
          'Medicinal plants and herbs',
          'Sustainable food security for nations',
        ],
        soilTypes: {
          alluvial: { description: 'Fertile, found near rivers. Best for wheat, rice, sugarcane, cotton, maize.', crops: ['Wheat', 'Rice', 'Sugarcane', 'Cotton', 'Maize'] },
          black: { description: 'Rich in clay, good water retention, found in volcanic regions. Best for cotton, soybean, groundnut.', crops: ['Cotton', 'Soybean', 'Groundnut', 'Millets'] },
          red: { description: 'Lower fertility, needs fertilizers. Best for pulses, millets, groundnut.', crops: ['Pulses', 'Millets', 'Groundnut', 'Potato'] },
          laterite: { description: 'Leached soil, acidic. Best for tea, coffee, cashew.', crops: ['Tea', 'Coffee', 'Cashew', 'Rubber'] },
          sandy: { description: 'Drains fast, low water retention. Best for watermelon, carrots, onions, potatoes.', crops: ['Watermelon', 'Carrots', 'Onions', 'Potatoes', 'Groundnut'] },
          clay: { description: 'Holds water well but poor drainage. Best for rice, cauliflower, broccoli.', crops: ['Rice', 'Cauliflower', 'Broccoli', 'Cabbage'] },
          loamy: { description: 'Best all-round soil, mix of sand, silt and clay. Ideal for most crops.', crops: ['Vegetables', 'Wheat', 'Maize', 'Fruits'] },
        },
        cropPreparationSteps: [
          '1. Test the soil to know its pH, nutrients and type',
          '2. Clear the land of weeds, stones and previous crop residues',
          '3. Plow/till the land to loosen the soil (tilling depth depends on crop)',
          '4. Add organic matter: compost or farmyard manure',
          '5. Apply fertilizers (NPK - Nitrogen, Phosphorus, Potassium) based on soil test',
          '6. Level the field for even water distribution',
          '7. Prepare beds or ridges as required by the crop',
          '8. Irrigate lightly before sowing if the soil is dry',
          '9. Sow seeds at the correct depth and spacing',
          '10. Maintain irrigation, weeding and pest control through the season',
        ],
        commonCrops: {
          wheat: { season: 'Winter (Rabi)', soil: 'Alluvial/loamy', water: 'Moderate', duration: '110-150 days', market: 'High demand worldwide; top producers: China, India, Russia, US', uses: 'Bread, flour, animal feed, biofuel' },
          rice: { season: 'Summer (Kharif)', soil: 'Alluvial/clay (needs standing water)', water: 'High', duration: '100-150 days', market: 'World staple; top producers: China, India, Indonesia', uses: 'Food staple for half the world' },
          cotton: { season: 'Summer (Kharif)', soil: 'Black/alluvial', water: 'Moderate', duration: '150-200 days', market: 'Top exporters: US, Brazil, India; used in textiles', uses: 'Textiles, clothing, oil, animal feed' },
          sugarcane: { season: 'Year-round (12-18 months)', soil: 'Alluvial/loamy', water: 'High', duration: '12-18 months', market: 'Top producers: Brazil, India, China', uses: 'Sugar, ethanol, biofuel, jaggery' },
          maize: { season: 'Both Kharif and Rabi', soil: 'Loamy/alluvial', water: 'Moderate', duration: '90-120 days', market: 'Top producers: US, China, Brazil', uses: 'Food, animal feed, corn syrup, ethanol' },
          soybean: { season: 'Summer', soil: 'Black/loamy', water: 'Moderate', duration: '90-120 days', market: 'Top producers: Brazil, US, Argentina', uses: 'Oil, protein meal, soy milk, tofu' },
          potato: { season: 'Cool season', soil: 'Sandy loam (well-drained)', water: 'Moderate', duration: '70-120 days', market: 'Top producers: China, India, Russia', uses: 'Food, starch, processed food, fries' },
          onion: { season: 'Both Kharif and Rabi', soil: 'Sandy loam', water: 'Moderate', duration: '90-150 days', market: 'Top producers: China, India, US, Egypt', uses: 'Cooking staple worldwide, dehydrated products' },
          mango: { season: 'Perennial (seasonal fruit)', soil: 'Well-drained loamy, pH 5.5-7.5', water: 'Low-moderate', duration: '3-5 years to first harvest', market: 'Top producers: India, China, Thailand, Indonesia', uses: 'Fresh fruit, juice, pulp, dried mango' },
          tomato: { season: 'Warm season', soil: 'Well-drained loamy, pH 6-7', water: 'Moderate', duration: '60-90 days', market: 'Top producers: China, India, Turkey, US', uses: 'Fresh, sauces, ketchup, canning' },
        },
        diseasesAndPrevention: [
          { disease: 'Wheat Rust (Yellow/Brown/Black)', symptom: 'Orange/brown/black pustules on leaves', prevention: 'Use resistant varieties, early sowing, fungicide spray (triazole), remove infected plants' },
          { disease: 'Rice Blast', symptom: 'Diamond-shaped grey-white spots on leaves', prevention: 'Use resistant varieties, balanced nitrogen, avoid excess water, apply fungicide (tricyclazole)' },
          { disease: 'Cotton Pink Bollworm', symptom: 'Pink larvae inside cotton bolls, damaged fiber', prevention: 'Bt cotton, pheromone traps, early picking, destroy crop residues' },
          { disease: 'Late Blight (Potato/Tomato)', symptom: 'Dark water-soaked patches on leaves, white mold under leaf', prevention: 'Resistant varieties, proper spacing, copper-based fungicide, avoid wet foliage' },
          { disease: 'Powdery Mildew', symptom: 'White powdery coating on leaves', prevention: 'Good air circulation, sulfur spray, avoid overhead watering, resistant varieties' },
          { disease: 'Root Rot', symptom: 'Wilting, yellowing, decaying roots', prevention: 'Well-drained soil, avoid overwatering, crop rotation, treat seeds with fungicide' },
          { disease: 'Aphid Infestation', symptom: 'Curling leaves, sticky honeydew, ants around plants', prevention: 'Neem oil spray, ladybugs (natural predator), remove infected leaves, insecticidal soap' },
          { disease: 'Leaf Curl Virus (Tomato/Chilli)', symptom: 'Curling and yellowing leaves, stunted growth', prevention: 'Control whitefly, resistant varieties, remove infected plants, use nets' },
        ],
        generalDiseasePreventionTips: [
          'Use certified and disease-free seeds',
          'Practice crop rotation (do not grow same crop in same field every year)',
          'Maintain proper plant spacing for air flow',
          'Avoid overwatering; water at the base of plants',
          'Remove and destroy infected plants immediately',
          'Use organic options first: neem oil, garlic spray, compost tea',
          'Apply balanced fertilizers - too much nitrogen invites disease',
          'Keep the field clean of weeds and residues',
          'Monitor fields regularly for early signs of disease',
          'Use resistant crop varieties whenever available',
        ],
        benefitsOfAgriculture: [
          'Provides food security and nutrition',
          'Creates jobs (farming, processing, transport, sales)',
          'Generates income and supports economies',
          'Supports industry with raw materials',
          'Helps the environment: captures carbon, produces oxygen',
          'Preserves rural culture and communities',
          'Enables exports and trade between countries',
        ],
        risksAndDrawbacks: [
          'Weather dependence - drought, flood, storms can destroy crops',
          'Pest and disease outbreaks can cause huge losses',
          'Market price fluctuations - prices can drop sharply',
          'High initial costs (land, seeds, equipment, fertilizers)',
          'Hard physical labor',
          'Water scarcity and soil degradation with over-farming',
          'Long payback periods for some crops (trees/fruits)',
          'Climate change is making farming riskier',
        ],
        modernFarmingTechniques: [
          'Drip irrigation - saves up to 60% water',
          'Greenhouse / tunnel farming - grow year-round',
          'Hydroponics and aquaponics - soil-free farming',
          'Precision agriculture with drones and sensors',
          'Organic farming - no chemical pesticides',
          'Smart irrigation using soil moisture sensors',
          'Crop rotation and intercropping for soil health',
        ],
        marketValueNote:
          'Market value of crops changes with season, demand, export markets and quality. The agent can give general global price trends but always verify current local prices. Major global crops by trade value: wheat, corn (maize), soybeans, rice, cotton, coffee, sugar.',
        worldMarketHighlights: [
          'Wheat: largest export markets - Russia, US, EU, Australia, Canada; prices vary with weather and war/supply shocks',
          'Rice: top exporters - India, Thailand, Vietnam, Pakistan; premium for basmati/jasmine',
          'Cotton: top exporters - Brazil, US, Australia; India and China are biggest producers/consumers',
          'Soybean: Brazil and US dominate exports; China is largest buyer',
          'Coffee: Brazil, Vietnam, Colombia lead; prices depend on arabica/robusta quality',
          'Sugar: Brazil, Thailand, India lead; prices tied to ethanol demand and weather',
          'Maize: US, Brazil, Argentina lead exports; used heavily for animal feed and ethanol',
        ],
      },
      rules: {
        language: 'Always respond in ENGLISH only.',
        tone: 'Be practical, clear and easy to understand. Farmers prefer simple language.',
        advice: 'Give step-by-step guidance when explaining how to do something.',
        disclaimer: 'For specific disease diagnosis, suggest confirming with a local agriculture officer or expert when uncertain.',
      },
    },
  });

  console.log('Created Agriculture Expert:', agri.id);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
