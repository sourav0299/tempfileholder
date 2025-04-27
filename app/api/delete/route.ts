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

    console.log('Attempting to delete file with public ID:', publicId);

    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary delete result:', result);

    if (result.result === 'ok') {
      return NextResponse.json({ success: true, message: 'File deleted successfully' });
    } else {
      console.error('Failed to delete from Cloudinary:', result);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete file from Cloudinary', 
        details: result 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in delete API route:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}