// Get comprehensive analytics
fastify.get('/api/analytics/dashboard', async (request, reply) => {
  try {
    const { userId } = request.user;
    const { period = '7d' } = request.query;
    
    const periodMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    
    const daysAgo = periodMap[period] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    // Aggregate analytics data
    const [
      userStats,
      vibeCardStats,
      shareStats,
      engagementStats,
      topContent
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        { $match: { _id: userId } },
        {
          $lookup: {
            from: 'vibecards',
            localField: '_id',
            foreignField: 'userId',
            as: 'cards'
          }
        },
        {
          $project: {
            totalCards: { $size: '$cards' },
            totalPoints: '$vibePoints',
            currentStreak: '$streak',
            level: '$level',
            joinDate: '$createdAt'
          }
        }
      ]),
      
      // Vibe card performance
      VibeCard.aggregate([
        { 
          $match: { 
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            avgViralScore: { $avg: '$viralScore' },
            totalShares: { $sum: '$shareCount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Share analytics
      ShareLink.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalShares: { $sum: 1 },
            totalClicks: { $sum: '$clicks' },
            avgClickRate: { $avg: '$clicks' }
          }
        }
      ]),
      
      // Engagement metrics
      Analytics.aggregate([
        {
          $match: {
            userId,
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Top performing content
      VibeCard.find({ userId })
        .sort({ viralScore: -1, shareCount: -1 })
        .limit(5)
        .select('title viralScore shareCount createdAt template')
    ]);
    
    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };
    
    // Format response
    const analytics = {
      overview: {
        ...userStats[0],
        period,
        lastUpdated: new Date()
      },
      charts: {
        dailyCards: vibeCardStats,
        engagementTypes: engagementStats
      },
      shares: shareStats[0] || {
        totalShares: 0,
        totalClicks: 0,
        avgClickRate: 0
      },
      topContent,
      insights: {
        bestPerformingDay: vibeCardStats.reduce((max, day) => 
          day.count > (max?.count || 0) ? day : max, null
        ),
        viralPotential: (shareStats[0]?.avgClickRate || 0) > 10 ? 'High' : 'Medium',
        recommendedActions: generateInsights(userStats[0], vibeCardStats)
      }
    };
    
    return reply.send({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return reply.status(500).send({ error: 'Failed to fetch analytics' });
  }
});

// Helper function for insights
function generateInsights(userStats, cardStats) {
  const insights = [];
  
  if (userStats.currentStreak < 3) {
    insights.push({
      type: 'streak',
      message: 'Build your streak by creating daily vibes',
      priority: 'high'
    });
  }
  
  if (cardStats.length > 0) {
    const avgCards = cardStats.reduce((sum, d) => sum + d.count, 0) / cardStats.length;
    if (avgCards < 1) {
      insights.push({
        type: 'activity',
        message: 'Increase your activity to boost engagement',
        priority: 'medium'
      });
    }
  }
  
  return insights;
}