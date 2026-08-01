const prisma = require('../config/db');

class BusinessService {
  static async create(data) {
    return prisma.business.create({
      data: {
        name: data.name,
        type: data.type || 'generic',
        phone: data.phone,
        email: data.email,
        address: data.address,
        website: data.website,
        description: data.description,
        knowledgeBase: data.knowledgeBase || {},
        rules: data.rules || {},
        workingHours: data.workingHours || {},
        aiModel: data.aiModel || null,
        temperature: data.temperature ?? null,
        maxTokens: data.maxTokens ?? null,
      },
    });
  }

  static async getById(id) {
    return prisma.business.findUnique({
      where: { id },
      include: {
        _count: {
          select: { conversations: true, appointments: true },
        },
      },
    });
  }

  static async getAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { conversations: true },
          },
        },
      }),
      prisma.business.count(),
    ]);

    return {
      businesses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async update(id, data) {
    return prisma.business.update({
      where: { id },
      data,
    });
  }

  static async updateKnowledgeBase(id, knowledgeBase) {
    return prisma.business.update({
      where: { id },
      data: { knowledgeBase },
    });
  }

  static async updateRules(id, rules) {
    return prisma.business.update({
      where: { id },
      data: { rules },
    });
  }

  static async delete(id) {
    return prisma.business.delete({ where: { id } });
  }
}

module.exports = BusinessService;
