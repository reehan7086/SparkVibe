fastify.post('/api/generate-capsule', async (request, reply) => {
  const { mood, interests } = request.body;
  
  try {
    fastify.log.info(`Generating capsule for mood: ${mood}`);
    
    // Create mood-specific content
    const moodContent = {
      happy: {
        title: '✨ Sunshine Adventure',
        prompt: 'Your positive energy is contagious! Choose how to spread the joy today:',
        options: [
          'Send a cheerful message to a friend',
          'Do a happy dance and share it'
        ],
        moodBoost: 'Your happiness is lighting up the world! Keep shining! 🌟',
        habitNudge: 'Smile at 3 people today and watch the magic happen!'
      },
      chill: {
        title: '🌊 Zen Moment',
        prompt: 'Time to embrace the calm vibes. What sounds most relaxing?',
        options: [
          'Take 5 deep breaths and meditate',
          'Listen to your favorite chill music'
        ],
        moodBoost: 'Your chill energy brings peace to those around you 🧘‍♂️',
        habitNudge: 'Stretch for 2 minutes and feel the tension melt away'
      },
      curious: {
        title: '🔍 Discovery Quest',
        prompt: 'Your curiosity is your superpower! What sparks your interest?',
        options: [
          'Learn one fascinating fact today',
          'Ask someone an interesting question'
        ],
        moodBoost: 'Your curious mind makes the world more interesting! 🚀',
        habitNudge: 'Read about something completely new for 5 minutes'
      }
    };

    const selectedMood = moodContent[mood] || moodContent.happy;
    
    const capsule = {
      adventure: {
        title: selectedMood.title,
        prompt: selectedMood.prompt,
        options: selectedMood.options,
      },
      moodBoost: selectedMood.moodBoost,
      brainBite: {
        question: 'What percentage of your body is water?',
        answer: 'About 60%! Stay hydrated! 💧'
      },
      habitNudge: selectedMood.habitNudge,
    };

    fastify.log.info('Capsule generated successfully');
    reply.send(capsule);
    
  } catch (err) {
    fastify.log.error('Capsule generation error:', err);
    reply.code(500).send({ 
      error: 'Capsule generation failed',
      details: err.message 
    });
  }
});