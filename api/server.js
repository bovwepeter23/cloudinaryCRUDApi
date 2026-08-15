// File path: /server.js

import express from 'express';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config'; // To load .env file for local development

// --- Environment Variable Validation ---
// Ensure all required environment variables are set before starting the server.
const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Missing required environment variable: ${envVar}. Please check your .env file.`);
    process.exit(1); // Exit the process with a failure code
  }
}
// --- Configuration ---
// The Cloudinary SDK is configured using environment variables.
// For local development, these can be stored in a `.env` file.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Middleware ---
// This configuration restricts incoming requests to a specific origin,
// which is a crucial security measure.


const allowedOrigins = ['http://127.0.0.1:5500', 'http://localhost:5500', 'https://tradaura.web.app'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};
app.use(cors(corsOptions));
// --- Middleware ---
// This is crucial to parse JSON bodies from incoming requests.
app.use(express.json());

// --- Route Handler ---
/**
 * API endpoint to securely delete an image from Cloudinary.
 * Expects a POST request to /api/delete-image with a JSON body containing `public_id`.
 *
 * @param {import('express').Request} req The incoming request object.
 * @param {import('express').Response} res The response object.
 */
async function deleteImageHandler(req, res) {
  // 1. Validate and Extract Request Body
  const { public_id } = req.body;
  if (!public_id) {
    return res.status(400).json({ success: false, message: 'The `public_id` is required in the request body.' });
  }

  // 2. Execute Deletion and Handle Response
  try {
    // The `destroy` method deletes the asset. We specify the resource_type
    // in case you are deleting assets other than images (e.g., 'video', 'raw').
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'image',
    });

    // Analyze the result from Cloudinary to provide a meaningful response.
    if (result.result === 'ok') {
      return res.status(200).json({ success: true, message: `Asset '${public_id}' deleted successfully.` });
    }
    if (result.result === 'not found') {
      return res.status(404).json({ success: false, message: `Asset '${public_id}' not found.` });
    }
    
    // If the result is neither 'ok' nor 'not found', it's an unexpected state.
    throw new Error(result.result || 'An unknown error occurred during deletion.');

  } catch (error) {
    console.error('Cloudinary Deletion Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while communicating with Cloudinary.',
      error: error.message 
    });
  }
}

// --- Routes ---
// We strictly allow only POST requests to this endpoint.
app.post('/api/delete-image', deleteImageHandler);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});