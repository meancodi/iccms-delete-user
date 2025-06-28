// // netlify/functions/delete-account.js
// const admin = require('firebase-admin');

// // Initialize Firebase Admin (you'll need to add your service account key)
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: "iccms-2025-conference",
//       clientEmail: "firebase-adminsdk-fbsvc@iccms-2025-conference.iam.gserviceaccount.com",
//     privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
//     }),
//   });
// }

// exports.handler = async (event, context) => {
//   // Handle CORS
//   const headers = {
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Headers': 'Content-Type',
//     'Access-Control-Allow-Methods': 'POST, OPTIONS',
//   };

//   // Handle preflight requests
//   if (event.httpMethod === 'OPTIONS') {
//     return {
//       statusCode: 204,
//       headers,
//       body: '',
//     };
//   }

//   // Only allow POST requests
//   if (event.httpMethod !== 'POST') {
//     return {
//       statusCode: 405,
//       headers,
//       body: JSON.stringify({ error: 'Method not allowed' }),
//     };
//   }

//   try {
//     const { email } = JSON.parse(event.body);

//     if (!email) {
//       return {
//         statusCode: 400,
//         headers,
//         body: JSON.stringify({ error: 'Email is required' }),
//       };
//     }

//     const db = admin.firestore();
    
//     // Check if user exists
//     const userDoc = await db.collection('user_details').doc(email).get();
//     if (!userDoc.exists) {
//       return {
//         statusCode: 404,
//         headers,
//         body: JSON.stringify({ error: 'User not found' }),
//       };
//     }

//     const userData = userDoc.data();
//     const userRole = userData.role;

//     // Delete from Firebase Auth
//     try {
//       const userRecord = await admin.auth().getUserByEmail(email);
//       await admin.auth().deleteUser(userRecord.uid);
//     } catch (authError) {
//       console.log('User not found in Auth:', authError);
//     }

//     // Delete user documents
//     const batch = db.batch();
//     batch.delete(db.collection('user_details').doc(email));
//     batch.delete(db.collection('meal_pass').doc(email));
//     batch.delete(db.collection('user_login_info').doc(email));
//     await batch.commit();

//     // Update statistics
//     const getRoleKey = (role) => {
//       return `${role.toLowerCase().replaceAll(' ', '_').replaceAll('&', 'and')}_registered`;
//     };

//     const roleKey = getRoleKey(userRole);
//     await db.doc('statistics/iccms_statistics').update({
//       'registered': admin.firestore.FieldValue.increment(-1),
//       [roleKey]: admin.firestore.FieldValue.increment(-1),
//     });

//     // Log deletion
//     await db.collection('deletion_logs').add({
//       email: email,
//       role: userRole,
//       deleted_at: admin.firestore.FieldValue.serverTimestamp(),
//       deletion_method: 'netlify_function',
//     });

//     return {
//       statusCode: 200,
//       headers,
//       body: JSON.stringify({
//         success: true,
//         message: 'Account deleted successfully',
//       }),
//     };

//   } catch (error) {
//     console.error('Error:', error);
//     return {
//       statusCode: 500,
//       headers,
//       body: JSON.stringify({
//         error: 'Internal server error',
//         message: 'Failed to delete account',
//       }),
//     };
//   }
// };



// netlify/functions/delete-account.js
const admin = require('firebase-admin');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Debug: Log environment and context
  console.log('=== DEBUG INFO ===');
  console.log('Context:', JSON.stringify(context, null, 2));
  console.log('Environment variables available:', Object.keys(process.env));
  console.log('FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);
  console.log('FIREBASE_PRIVATE_KEY length:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0);
  console.log('HTTP Method:', event.httpMethod);
  console.log('Request body:', event.body);
  console.log('==================');

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
    // Validate request body exists
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { email } = requestData;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    // Check environment variable before Firebase initialization
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      console.error('FIREBASE_PRIVATE_KEY environment variable is missing');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          message: 'Firebase credentials not configured' 
        }),
      };
    }

    // Initialize Firebase Admin with better error handling
    if (!admin.apps.length) {
      try {
        console.log('Initializing Firebase Admin...');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: "iccms-2025-conference",
            clientEmail: "firebase-adminsdk-fbsvc@iccms-2025-conference.iam.gserviceaccount.com",
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
        console.log('Firebase Admin initialized successfully');
      } catch (initError) {
        console.error('Firebase initialization error:', initError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Firebase initialization failed',
            message: initError.message 
          }),
        };
      }
    }

    const db = admin.firestore();
    
    // Test Firebase connection
    try {
      console.log('Testing Firebase connection...');
      const testDoc = await db.collection('user_details').doc(email).get();
      console.log('Firebase connection successful, user exists:', testDoc.exists);
    } catch (connectionError) {
      console.error('Firebase connection error:', connectionError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database connection failed',
          message: connectionError.message 
        }),
      };
    }

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

    console.log('User found:', email, 'Role:', userRole);

    // Delete from Firebase Auth
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(userRecord.uid);
      console.log('User deleted from Auth:', email);
    } catch (authError) {
      console.log('User not found in Auth:', authError.message);
      // Continue with deletion even if user not in Auth
    }

    // Delete user documents
    const batch = db.batch();
    batch.delete(db.collection('user_details').doc(email));
    batch.delete(db.collection('meal_pass').doc(email));
    batch.delete(db.collection('user_login_info').doc(email));
    await batch.commit();

    console.log('User documents deleted successfully');

    // Update statistics
    const getRoleKey = (role) => {
      return `${role.toLowerCase().replaceAll(' ', '_').replaceAll('&', 'and')}_registered`;
    };

    const roleKey = getRoleKey(userRole);
    await db.doc('statistics/iccms_statistics').update({
      'registered': admin.firestore.FieldValue.increment(-1),
      [roleKey]: admin.firestore.FieldValue.increment(-1),
    });

    console.log('Statistics updated');

    // Log deletion
    await db.collection('deletion_logs').add({
      email: email,
      role: userRole,
      deleted_at: admin.firestore.FieldValue.serverTimestamp(),
      deletion_method: 'netlify_function',
    });

    console.log('Deletion logged successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'Failed to delete account',
        stack: error.stack
      }),
    };
  }
};