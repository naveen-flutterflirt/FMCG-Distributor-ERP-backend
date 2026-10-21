async function testLogin() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin123',
      }),
    });

    const data = await res.json();
    console.log('LOGIN RESPONSE:', JSON.stringify(data, null, 2));

    if (data.data?.token) {
      const profileRes = await fetch('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${data.data.token}` },
      });
      const profileData = await profileRes.json();
      console.log('PROFILE RESPONSE:', JSON.stringify(profileData, null, 2));
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

testLogin();
