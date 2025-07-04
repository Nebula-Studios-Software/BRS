import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Helper function to initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  // Vercel environment variables are automatically available in `process.env`
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    throw new Error('Firebase service account credentials are not set in environment variables.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(request: Request) {
  try {
    initializeFirebaseAdmin();

    const body = await request.json();
    const { deviceId, notification } = body;

    if (!deviceId || !notification) {
      return NextResponse.json({ success: false, error: 'Missing deviceId or notification payload' }, { status: 400 });
    }

    const token = deviceId; // Assuming the deviceId passed is the FCM token

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      token: token,
    };

    const response = await admin.messaging().send(message);

    console.log('Successfully sent message:', response);
    return NextResponse.json({ success: true, response });

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 