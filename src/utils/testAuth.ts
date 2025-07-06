// Función de prueba para debuggear la autenticación
export async function testLogin() {
  const credentials = {
    correoElectronico: 'maria@example.com',
    contrasena: 'MiSecreta123!'
  };

  console.log('🔍 Iniciando prueba de login...');
  console.log('📤 Credenciales:', credentials);

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    console.log('📨 Respuesta del servidor:');
    console.log('   Status:', response.status);
    console.log('   StatusText:', response.statusText);
    console.log('   Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Contenido de la respuesta (texto):', responseText);

    try {
      const data = JSON.parse(responseText);
      console.log('📦 Datos parseados:', data);
      
      if (response.ok) {
        console.log('✅ Login exitoso!');
        return data;
      } else {
        console.log('❌ Error en login:', data);
        return data;
      }
    } catch (parseError) {
      console.error('❌ Error al parsear JSON:', parseError);
      console.log('📄 Respuesta sin parsear:', responseText);
    }

  } catch (error) {
    console.error('❌ Error en la petición:', error);
  }
}

// Para usar en la consola del navegador:
// Abre DevTools > Console y ejecuta: testLogin()
declare global {
  interface Window {
    testLogin: typeof testLogin;
  }
}

if (typeof window !== 'undefined') {
  window.testLogin = testLogin;
} 