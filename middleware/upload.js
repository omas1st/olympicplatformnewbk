// middleware/upload.js
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage (file is stored as Buffer in memory)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPG, PNG, GIF, WEBP) and PDFs are allowed!'), false);
  }
};

// Create multer instance with memory storage
const multerUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, userId, mimetype, folder = 'olympic') => {
  return new Promise((resolve, reject) => {
    // Determine resource type
    let resource_type = 'auto';
    if (mimetype.startsWith('image/')) {
      resource_type = 'image';
    } else if (mimetype === 'application/pdf') {
      resource_type = 'raw';
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folder}/proof-of-payment`,
        public_id: `proof_${Date.now()}_${userId}`,
        resource_type: resource_type,
        ...(resource_type === 'image' && { transformation: [{ width: 1200, crop: 'limit' }] })
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    // Pipe the buffer to the Cloudinary upload stream
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Export both multer instance and upload function
module.exports = {
  multerUpload,
  uploadToCloudinary
};