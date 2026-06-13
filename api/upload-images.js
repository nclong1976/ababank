import { put } from '@vercel/blob';

// Danh sach anh can upload tu GitHub raw len Vercel Blob
const IMAGES = [
  {
    name: 'images/regenerated_image_1781076270907.png',
    url: 'https://raw.githubusercontent.com/nclong1976/ababank/main/src/assets/images/regenerated_image_1781076270907.png'
  },
  {
    name: 'images/regenerated_image_1781076349758.png',
    url: 'https://raw.githubusercontent.com/nclong1976/ababank/main/src/assets/images/regenerated_image_1781076349758.png'
  },
  {
    name: 'images/regenerated_image_1781076351185.png',
    url: 'https://raw.githubusercontent.com/nclong1976/ababank/main/src/assets/images/regenerated_image_1781076351185.png'
  },
  {
    name: 'images/regenerated_image_1781076471454.png',
    url: 'https://raw.githubusercontent.com/nclong1976/ababank/main/src/assets/images/regenerated_image_1781076471454.png'
  },
  {
    name: 'images/regenerated_image_1781076472059.png',
    url: 'https://raw.githubusercontent.com/nclong1976/ababank/main/src/assets/images/regenerated_image_1781076472059.png'
  },
  {
    name: 'images/regenerated_image_1781188262145.png',
    url: 'https://raw.githubusercontent.com/nclong1976/ababank/main/src/assets/images/regenerated_image_1781188262145.png'
  }
];

export default async function handler(req, res) {
  // Bao ve endpoint - chi cho phep POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Kiem tra secret key de bao ve endpoint
  const secret = req.headers['x-upload-secret'];
  if (secret !== process.env.UPLOAD_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {};
  const errors = [];

  for (const image of IMAGES) {
    try {
      // Fetch anh tu GitHub raw
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${image.url}: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();

      // Upload len Vercel Blob
      const blob = await put(image.name, buffer, {
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false
      });

      results[image.name] = blob.url;
      console.log(`Uploaded: ${image.name} -> ${blob.url}`);
    } catch (err) {
      console.error(`Error uploading ${image.name}:`, err);
      errors.push({ name: image.name, error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    uploaded: results,
    errors: errors
  });
}
