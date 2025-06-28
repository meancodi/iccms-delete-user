// netlify/functions/delete-account.js
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "iccms-2025-conference",
      clientEmail: "firebase-adminsdk-fbsvc@iccms-2025-conference.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+NmGF6W5US0w5\nu0jPlvknVlCVvRzcKU6atnX2ZkKhaDU5gGF+482CkTHtP1SB8e0O/2YPEe/5ZgiY\n/fW9lNqaDl9zVx7uT9E+S2c25dNKwbo2YjiQcytRqB8hgyKPnmuACqBkZsRUmZVv\nr2juz2cGvOwDvD91jeiFCBm9H62AAPDq2xG159Bl5KYSeu8Pd7CHwGSrbMU1yprF\nMD55X/gIEabiAi1Ewuvs6s/LpfFAIjiYXeh+kP9cXbM78OyizTQrItUhDd0uKPib\nxrYdEefIYPPFTeNIZuuuUeTn8+PYi1MNeSeOJNwFBeOg/K7PWkbpZVAr9CDTamwZ\naD66mPQNAgMBAAECggEAC+hORUUjtFXdDmV8XWJ6HnhM0H2SPPC+YaO30WuoEtVP\nNQD7GX0b9Gcv1PD4qASDw+3rxFhpyWxrGrNrRX74CwTd/NPLX+fR6tsVjwjm0ps7\naQQlE7CMrwPzTvRtSXMFZR1FL9kvGTdeyisU9T45Q4wNdP5n3+1jolBWLCdmLnPE\nz5CZf1w5HsrCI/IXdAMC+yj8dbz0ms3Qs7M+n94LBxncS+libLwijHlUrlhpU4zS\nn6r6TU20il3hkUiQwgNE6Ycifj3lRYVmI97sBrW9renbi2avDhAq7s6w672uHok0\nQTV6OVfek78vzOBbHF9NR30YChvbU+mCuE6i0EqHEQKBgQD4JEqfPTgCQ8CHs1Dv\nT6/jglHRomssQ/8f4obXX3BE+s6JOsFZg47eRBMqQKLkDF5qHF5Fv7D5exbMAhP7\nueYFU2hqwgWBAmOjc9D/j6b0wxOeVi0BTYFkw0JXxoKxktEnG5+zqs7X2u1JQkyu\ncB41u4iVmP8iZFrt71qGzzg0IwKBgQDEPHNtkLTu+YxOtRfQ8aDtVTiE+Jxy8CVy\noy9fa1hubOJk7TNz8eF7hqfRqHqgoZ5QqJNwT2Oxg0dSxRYjFWmJunCI0ae25KLo\n62idqFjJsWJgAUBYPat51j4+BihIOR+VCh5K8e5wmGPCTQowVO8W1DF0J7irQBWm\n0Vz6S43iDwKBgQCoAUpUzkohnmW4evwNS1K3IwDqgqE1c0RE/kZ1g7Srv3QfDZzj\nUmNksYqYTPL8nDNAfLyHVOYpw+EHd1C4WoEWkgZcYckAM/HqNPwIS+aqSXn69jW6\ncBNveZRtgYXzXIgnhlh2eOta0mtd8nmgkWCi2Ln9L31ud6vo9OnB5IMVKQKBgGGe\nmOVWaUvAhJXa7KAas62dCWLMsjdTU621lClpozI7pFwEy+XP3BWxJObdYzNpcvI5\nCi+CrtttrRt1w89sJXZIcxb9BOuszYYFJaPYTWL4hTGxLas38ofHlmsQcRWMpTNl\nNzCdLbqBdI8B+CGW/uFiab+YyvsWBC9aU2CIGWrtAoGAYFQHRYS2ZkPryBClQLbu\nqpEAqFuU7u1pug1yA87BdEBbAityI5n+BY3uxLbfaS6KgNjeE6NSwFKBBlbIUesG\nVALNoy5520a4S9PIH8g+wWfCP5tOmfW6Op+nuaRa97gfqxeazn6KyK+hyUpSyfA9\nG3AOtci5E2DJO5Jz2hCwJpM=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
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