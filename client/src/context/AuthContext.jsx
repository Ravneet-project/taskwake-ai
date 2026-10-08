import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("taskwake_user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const [loading, setLoading] = useState(false);

  const register = async (formData) => {
    try {
      setLoading(true);

      const { data } = await api.post(
        "/auth/register",
        formData
      );

      localStorage.setItem(
        "taskwake_token",
        data.token
      );

      localStorage.setItem(
        "taskwake_user",
        JSON.stringify(data.user)
      );

      setUser(data.user);

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Unable to create account",
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (formData) => {
    try {
      setLoading(true);

      const { data } = await api.post(
        "/auth/login",
        formData
      );

      localStorage.setItem(
        "taskwake_token",
        data.token
      );

      localStorage.setItem(
        "taskwake_user",
        JSON.stringify(data.user)
      );

      setUser(data.user);

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Unable to login",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("taskwake_token");
    localStorage.removeItem("taskwake_user");

    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem(
      "taskwake_token"
    );

    if (!token) {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};