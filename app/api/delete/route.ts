import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure MongoDB
const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not defined in the environment variables');
}
const client = new MongoClient(uri);

export async function POST(request: NextRequest) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json({ error: 'No public ID provided' }, { status: 400 });
    }


    const cloudinaryResult = await cloudinary.uploader.destroy(publicId);

    if (cloudinaryResult.result !== 'ok') {
      throw new Error('Failed to delete from Cloudinary');
    }


    await client.connect();
    const database = client.db('fileUploader');
    const collection = database.collection('files');

    const result = await collection.deleteOne({ publicId: publicId });

    if (result.deletedCount === 0) {
      throw new Error('File not found in database');
    }

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  } finally {
    await client.close();
  }
}