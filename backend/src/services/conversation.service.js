const prisma = require('../config/db');

class ConversationService {
  static async getByBusiness(businessId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 5,
          },
          customer: true,
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.conversation.count({ where: { businessId } }),
    ]);

    return {
      conversations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id) {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        customer: true,
        business: true,
      },
    });
  }

  static async close(id) {
    return prisma.conversation.update({
      where: { id },
      data: { status: 'closed' },
    });
  }

  static async transfer(id) {
    return prisma.conversation.update({
      where: { id },
      data: { status: 'transferred' },
    });
  }

  static async getStats(businessId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalConversations, todayConversations, channelStats] = await Promise.all([
      prisma.conversation.count({ where: { businessId } }),
      prisma.conversation.count({
        where: {
          businessId,
          createdAt: { gte: today },
        },
      }),
      prisma.conversation.groupBy({
        by: ['channel'],
        where: { businessId },
        _count: true,
      }),
    ]);

    return {
      totalConversations,
      todayConversations,
      channelStats: channelStats.map((s) => ({
        channel: s.channel,
        count: s._count,
      })),
    };
  }
}

module.exports = ConversationService;
