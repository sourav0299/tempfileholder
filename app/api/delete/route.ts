import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json({ error: 'Public ID is required' }, { status: 400 });
    }

    console.log('Received public ID:', publicId);

    // Try deleting with the provided public ID
    let result = await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary delete result:', result);

    // If the first attempt fails, try prepending the folder name
    if (result.result !== 'ok') {
      const folderName = 'dezainahub'; // Replace with your actual folder name
      const fullPublicId = `${folderName}/${publicId}`;
      console.log('Attempting to delete with full public ID:', fullPublicId);
      result = await cloudinary.uploader.destroy(fullPublicId);
      console.log('Cloudinary delete result (with folder):', result);
    }

    if (result.result === 'ok') {
      return NextResponse.json({ message: 'File deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete file from Cloudinary', details: result }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in delete API route:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}