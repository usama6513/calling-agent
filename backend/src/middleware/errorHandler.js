const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry - this record already exists',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
      });
    }
  }

  // Never leak internal errors (AI provider rate limits, stack traces, DB
  // details) to the end user — log them server-side and send a friendly message.
  const status = err.statusCode || 500;
  if (status >= 500) {
    return res.status(status).json({
      success: false,
      error: 'Something went wrong. Please try again in a moment.',
    });
  }

  res.status(status).json({
    success: false,
    error: err.message || 'Request failed',
  });
};

module.exports = errorHandler;
