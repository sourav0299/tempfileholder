import { NextResponse } from 'next/server';
import clientPromise from '../../mongodb';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const client = await clientPromise;
    const db = client.db('fileUploader');
    const filesCollection = db.collection('files');

    const result = await filesCollection.insertOne({ url, createdAt: new Date() });

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

    const files = await filesCollection.find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('Error retrieving files:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve files' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { url } = await request.json();
    const client = await clientPromise;
    const db = client.db('fileUploader');
    const filesCollection = db.collection('files');

    const result = await filesCollection.deleteOne({ url });

    if (result.deletedCount === 1) {
      return NextResponse.json({ success: true, message: 'File URL deleted from MongoDB' });
    } else {
      return NextResponse.json({ success: false, error: 'File URL not found in MongoDB' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error deleting file URL from MongoDB:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete file URL from MongoDB' }, { status: 500 });
  }
}