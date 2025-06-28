// netlify/functions/delete-account.js
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "iccms-2025-conference",
      clientEmail: "firebase-adminsdk-fbsvc@iccms-2025-conference.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    const db = admin.firestore();
    
    // Check if user exists
    const userDoc = await db.collection('user_details').doc(email).get();
    if (!userDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const userData = userDoc.data();
    const userRole = userData.role;

    // Delete from Firebase Auth
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(userRecord.uid);
    } catch (authError) {
      console.log('User not found in Auth:', authError);
    }

    // Delete user documents
    const batch = db.batch();
    batch.delete(db.collection('user_details').doc(email));
    batch.delete(db.collection('meal_pass').doc(email));
    batch.delete(db.collection('user_login_info').doc(email));
    await batch.commit();

    // Update statistics
    const getRoleKey = (role) => {
      return `${role.toLowerCase().replaceAll(' ', '_').replaceAll('&', 'and')}_registered`;
    };

    const roleKey = getRoleKey(userRole);
    await db.doc('statistics/iccms_statistics').update({
      'registered': admin.firestore.FieldValue.increment(-1),
      [roleKey]: admin.firestore.FieldValue.increment(-1),
    });

    // Log deletion
    await db.collection('deletion_logs').add({
      email: email,
      role: userRole,
      deleted_at: admin.firestore.FieldValue.serverTimestamp(),
      deletion_method: 'netlify_function',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to delete account',
      }),
    };
  }
};

