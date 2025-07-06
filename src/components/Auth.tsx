import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  const handleRegistrationSuccess = () => {
    // Cambiar a login después de un registro exitoso
    setIsLogin(true);
  };

  return (
    <>
      {isLogin ? (
        <Login onToggleMode={toggleMode} />
      ) : (
        <Register 
          onRegistrationSuccess={handleRegistrationSuccess}
          onToggleMode={toggleMode}
        />
      )}
    </>
  );
} 