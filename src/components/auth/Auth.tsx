import { useState } from "react";
import Login from "./Login";
import Register from "./Register";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const handleRegistrationSuccess = () => {
    // Cambiar a login después de un registro exitoso
    setIsLogin(true);
  };

  return (
    <>
      {isLogin ? (
        <Login />
      ) : (
        <Register onRegistrationSuccess={handleRegistrationSuccess} />
      )}
    </>
  );
}
