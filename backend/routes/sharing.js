const QRCode = require('qrcode');
const shortid = require('shortid');

// Generate shareable QR code for vibe card
fastify.post('/api/generate-share-qr', async (request, reply) => {
  try {
    const { vibeCardId, userId } = request.body;
    
    // Create unique share link
    const shareId = shortid.generate();
    const shareUrl = `${process.env.FRONTEND_URL}/vibe/${shareId}`;
    
    // Store share link in database
    await ShareLink.create({
      shareId,
      vibeCardId,
      userId,
      url: shareUrl,
      clicks: 0,
      createdAt: new Date()
    });
    
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return reply.send({
      success: true,
      shareUrl,
      qrCode: qrCodeDataUrl,
      shareId
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return reply.status(500).send({ error: 'Failed to generate QR code' });
  }
});

// Track QR code scans
fastify.get('/api/share/:shareId', async (request, reply) => {
  try {
    const { shareId } = request.params;
    
    // Increment click counter
    const shareLink = await ShareLink.findOneAndUpdate(
      { shareId },
      { $inc: { clicks: 1 } },
      { new: true }
    ).populate('vibeCardId');
    
    if (!shareLink) {
      return reply.status(404).send({ error: 'Share link not found' });
    }
    
    // Track analytics
    await Analytics.create({
      type: 'qr_scan',
      shareId,
      timestamp: new Date(),
      referrer: request.headers.referer
    });
    
    return reply.send({
      success: true,
      vibeCard: shareLink.vibeCardId,
      totalScans: shareLink.clicks
    });
  } catch (error) {
    console.error('Share tracking error:', error);
    return reply.status(500).send({ error: 'Failed to track share' });
  }
});