const prisma = require('../config/db');

class AppointmentService {
  static async create(data) {
    return prisma.appointment.create({
      data: {
        businessId: data.businessId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        date: new Date(data.date),
        time: data.time,
        service: data.service,
        notes: data.notes,
        status: 'pending',
      },
    });
  }

  static async getByBusiness(businessId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: { date: 'asc' },
      }),
      prisma.appointment.count({ where: { businessId } }),
    ]);

    return {
      appointments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async updateStatus(id, status) {
    return prisma.appointment.update({
      where: { id },
      data: { status },
    });
  }

  static async getUpcoming(businessId) {
    const now = new Date();
    return prisma.appointment.findMany({
      where: {
        businessId,
        date: { gte: now },
        status: { in: ['pending', 'confirmed'] },
      },
      orderBy: { date: 'asc' },
      take: 10,
    });
  }
}

module.exports = AppointmentService;
