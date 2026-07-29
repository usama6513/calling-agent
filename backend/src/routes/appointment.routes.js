const express = require('express');
const router = express.Router();
const AppointmentService = require('../services/appointment.service');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/', asyncHandler(async (req, res) => {
  const { businessId, customerName, customerPhone, customerEmail, date, time, service, notes } = req.body;

  if (!businessId || !customerName || !customerPhone || !date || !time || !service) {
    return res.status(400).json({
      success: false,
      error: 'businessId, customerName, customerPhone, date, time, and service are required',
    });
  }

  const appointment = await AppointmentService.create({
    businessId, customerName, customerPhone, customerEmail,
    date, time, service, notes,
  });

  res.status(201).json({
    success: true,
    data: appointment,
  });
}));

router.get('/:businessId', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = await AppointmentService.getByBusiness(req.params.businessId, page, limit);

  res.json({
    success: true,
    data: result.appointments,
    pagination: result.pagination,
  });
}));

router.get('/:businessId/upcoming', asyncHandler(async (req, res) => {
  const appointments = await AppointmentService.getUpcoming(req.params.businessId);

  res.json({
    success: true,
    data: appointments,
  });
}));

router.put('/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Valid status is required (pending, confirmed, cancelled, completed)',
    });
  }

  const appointment = await AppointmentService.updateStatus(req.params.id, status);

  res.json({
    success: true,
    data: appointment,
  });
}));

module.exports = router;
