import Report from '../models/Report.js';

// @desc    Create a safety or content report
// @route   POST /api/reports
export const createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'targetType (listing or user), targetId, and reason are required',
      });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      details: details || '',
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted. Our moderation team will review this promptly.',
      report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports (Admin only)
// @route   GET /api/reports
export const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'name email')
      .populate('targetId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    next(error);
  }
};
