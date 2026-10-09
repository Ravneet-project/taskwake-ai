
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

const getSavedUser = () => {
  try {
    const savedUser = localStorage.getItem("taskwake_user");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getSavedUser);
  const [loading, setLoading] = useState(false);

  const saveSession = (data) => {
    if (!data?.token || !data?.user) {
      throw new Error("Invalid authentication response");
    }

    localStorage.setItem("taskwake_token", data.token);
    localStorage.setItem(
      "taskwake_user",
      JSON.stringify(data.user)
    );

    setUser(data.user);
  };

  const getErrorMessage = (error, fallback) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.code === "ECONNABORTED") {
      return "Server response timed out. Please try again.";
    }

    if (!error.response) {
      return "Unable to connect to the server. Please try again.";
    }

    return fallback;
  };

  const register = async (formData) => {
    setLoading(true);

    try {
      const payload = {
        name: String(formData.name || "").trim(),
        email: String(formData.email || "")
          .trim()
          .toLowerCase(),
        password: formData.password || "",
      };

      if (!payload.name || !payload.email || !payload.password) {
        return {
          success: false,
          message: "Please fill in all required fields",
        };
      }

      if (payload.password.length < 6) {
        return {
          success: false,
          message: "Password must be at least 6 characters",
        };
      }

      const { data } = await api.post(
        "/auth/register",
        payload
      );

      if (!data?.success) {
        return {
          success: false,
          message: data?.message || "Unable to create account",
        };
      }

      saveSession(data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Registration request failed:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });

      return {
        success: false,
        message: getErrorMessage(
          error,
          "Unable to create account"
        ),
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (formData) => {
    setLoading(true);

    try {
      const payload = {
        email: String(formData.email || "")
          .trim()
          .toLowerCase(),
        password: formData.password || "",
      };

      const { data } = await api.post(
        "/auth/login",
        payload
      );

      if (!data?.success) {
        return {
          success: false,
          message: data?.message || "Unable to login",
        };
      }

      saveSession(data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Login request failed:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });

      return {
        success: false,
        message: getErrorMessage(
          error,
          "Unable to login"
        ),
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
    const token = localStorage.getItem("taskwake_token");

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
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
