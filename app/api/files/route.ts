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