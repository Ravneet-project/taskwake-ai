import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { motion } from "framer-motion";

import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();

  const { login, loading } = useAuth();

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const result = await login(form);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-page">

      <motion.div
        className="auth-left"
        initial={{
          opacity: 0,
          x: -70,
        }}
        animate={{
          opacity: 1,
          x: 0,
        }}
        transition={{
          duration: 0.7,
        }}
      >

        <div className="brand">
          <div className="brand-icon">
            <BellRing size={21} />
          </div>

          <span>
            TaskWake
            <strong> AI</strong>
          </span>
        </div>

        <div className="auth-content">

          <span className="eyebrow">
            <Sparkles size={15} />
            Welcome back
          </span>

          <h1>
            Your tasks shouldn't
            <span> get forgotten.</span>
          </h1>

          <p>
            Stay focused while TaskWake
            automatically handles missed tasks
            and keeps your priorities organized.
          </p>

          <div className="feature-list">

            <div>
              <CheckCircle2 />
              Never lose an unfinished task
            </div>

            <div>
              <CheckCircle2 />
              Smart daily scheduling
            </div>

            <div>
              <CheckCircle2 />
              Productivity insights
            </div>

          </div>

        </div>

        <div className="auth-decoration decoration-one" />

        <div className="auth-decoration decoration-two" />

      </motion.div>

      <motion.div
        className="auth-right"
        initial={{
          opacity: 0,
          x: 70,
        }}
        animate={{
          opacity: 1,
          x: 0,
        }}
        transition={{
          duration: 0.7,
        }}
      >

        <div className="auth-form-card">

          <div className="form-heading">
            <span>
              Welcome back
            </span>

            <h2>
              Sign in to TaskWake
            </h2>

            <p>
              Continue where you left off.
            </p>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="input-group">

              <label>
                Email address
              </label>

              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />

            </div>

            <div className="input-group">

              <label>
                Password
              </label>

              <div className="password-field">

                <input
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >

                  {showPassword
                    ? <EyeOff size={18} />
                    : <Eye size={18} />}

                </button>

              </div>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >

              {loading
                ? "Signing in..."
                : "Sign in"}

              {!loading && (
                <ArrowRight size={18} />
              )}

            </button>

          </form>

          <div className="auth-switch">

            Don't have an account?

            <Link to="/register">
              Create one
            </Link>

          </div>

        </div>

      </motion.div>

    </div>
  );
};

export default Login;