const { VolunteerProfile, VolunteerCategoryHours, HourRecord, Category, Reward } = require('../models/index');
const { createNotification } = require('./notifications');

/**
 * Award points and hours to a volunteer after org (or auto) approval.
 * Creates an HourRecord and updates VolunteerProfile totals + category breakdown.
 */
const awardPoints = async (volunteerId, task, gig, autoApproved = false) => {
  const category = await Category.findByPk(gig.categoryId);
  if (!category) throw new Error('Category not found');

  const hours = gig.estimatedHours;
  const points = Math.round(hours * category.pointsPerHour);

  const profile = await VolunteerProfile.findOne({ where: { userId: volunteerId } });
  if (!profile) throw new Error('Volunteer profile not found');

  await profile.increment({ totalVerifiedHours: hours, totalPoints: points });

  const [catHoursRow, created] = await VolunteerCategoryHours.findOrCreate({
    where: { volunteerId, categoryId: gig.categoryId },
    defaults: { hours: 0 },
  });
  await catHoursRow.increment('hours', { by: hours });

  await HourRecord.create({
    volunteerId,
    taskId: task.id,
    gigId: gig.id,
    categoryId: gig.categoryId,
    hours,
    pointsAwarded: points,
    approvedBy: gig.orgId,
    approvedAt: new Date(),
    autoApproved,
  });

  await createNotification(
    volunteerId,
    `${hours} hours and ${points} points credited for completing "${gig.title}"`,
    'points',
    '/volunteer-dashboard'
  );

  return { hours, points };
};

const checkEligibility = async (volunteerId, rewardId) => {
  const [profile, reward] = await Promise.all([
    VolunteerProfile.findOne({ where: { userId: volunteerId } }),
    Reward.findByPk(rewardId),
  ]);

  if (!profile) return { eligible: false, reason: 'Volunteer profile not found.' };
  if (!reward) return { eligible: false, reason: 'Reward not found.' };
  if (!reward.isActive || reward.isRetired) return { eligible: false, reason: 'This reward is no longer available.' };

  if (profile.totalPoints < reward.pointsRequired)
    return { eligible: false, reason: `You need ${reward.pointsRequired} points (you have ${profile.totalPoints}).` };

  const catHours = await VolunteerCategoryHours.findOne({ where: { volunteerId, categoryId: reward.categoryId } });
  const hrs = catHours?.hours || 0;
  if (hrs < reward.categoryHoursRequired)
    return { eligible: false, reason: `You need ${reward.categoryHoursRequired} hours in this category (you have ${hrs.toFixed(1)}).` };

  return { eligible: true, reason: null };
};

module.exports = { awardPoints, checkEligibility };
