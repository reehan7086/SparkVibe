const multer = require('fastify-multer');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload media endpoint
fastify.post('/api/upload-media', 
  { preHandler: upload.single('media') },
  async (request, reply) => {
    try {
      if (!request.file) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      let processedBuffer = request.file.buffer;
      
      // Process image if needed
      if (request.file.mimetype.startsWith('image/')) {
        processedBuffer = await sharp(request.file.buffer)
          .resize(1080, 1080, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toBuffer();
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'sparkvibe',
            transformation: [
              { width: 1080, height: 1080, crop: 'limit' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(processedBuffer);
      });

      // Save media reference in database
      const media = await Media.create({
        userId: request.user.id,
        url: result.secure_url,
        publicId: result.public_id,
        type: request.file.mimetype.startsWith('image/') ? 'image' : 'video',
        size: request.file.size,
        metadata: {
          width: result.width,
          height: result.height,
          format: result.format
        }
      });

      return reply.send({
        success: true,
        media: {
          id: media._id,
          url: result.secure_url,
          type: media.type
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      return reply.status(500).send({ error: 'Failed to upload media' });
    }
  }
);