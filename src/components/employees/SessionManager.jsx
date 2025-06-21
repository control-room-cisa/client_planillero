import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";

const SessionManager = () => {
  const { setUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const maxInactivity = 60 * 60 * 1000;
    let timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        setUser(null);
      }, maxInactivity);
    };

    const activityEvents = ["mousemove", "keydown", "click", "scroll"];

    activityEvents.forEach(event =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer();

    return () => {
      clearTimeout(timeout);
      activityEvents.forEach(event =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [setUser, navigate]);

  return null;
};

export default SessionManager;
