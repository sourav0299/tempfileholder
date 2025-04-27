import { NextResponse } from 'next/server';
import clientPromise from '../../mongodb';

export async function POST(request: Request) {
  try {
    const { url, public_id } = await request.json();
    const client = await clientPromise;
    const db = client.db('fileUploader');
    const filesCollection = db.collection('files');

    const result = await filesCollection.insertOne({ 
      url, 
      public_id,
      createdAt: new Date() 
    });

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Error storing file URL:', error);
    return NextResponse.json({ success: false, error: 'Failed to store file URL' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('fileUploader');
    const filesCollection = db.collection('files');
    
    const files = await filesCollection.find({}).toArray();
    return NextResponse.json({ 
      success: true, 
      files: files.map(file => ({ 
        url: file.url, 
        public_id: file.public_id 
      })) 
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch files' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { url } = await request.json();
    const client = await clientPromise;
    const db = client.db('fileUploader');
    const filesCollection = db.collection('files');

    const result = await filesCollection.deleteOne({ url });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 });
  }
}