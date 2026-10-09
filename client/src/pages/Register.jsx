
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    if (!payload.name || !payload.email || !payload.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (payload.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const result = await register(payload);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message || "Unable to create account");
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-left"
        initial={{ opacity: 0, x: -70 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
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
            Smart productivity
          </span>

          <h1>
            Never let an
            <span> unfinished task</span>
            disappear.
          </h1>

          <p>
            TaskWake automatically carries missed tasks
            forward, adjusts priority and keeps your
            day moving.
          </p>

          <div className="feature-list">
            <div>
              <CheckCircle2 />
              Automatic task carry-forward
            </div>

            <div>
              <CheckCircle2 />
              Intelligent priority detection
            </div>

            <div>
              <CheckCircle2 />
              Smart reminders and alarms
            </div>
          </div>
        </div>

        <div className="auth-decoration decoration-one" />
        <div className="auth-decoration decoration-two" />
      </motion.div>

      <motion.div
        className="auth-right"
        initial={{ opacity: 0, x: 70 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="auth-form-card">
          <div className="form-heading">
            <span>Get started</span>

            <h2>Create your account</h2>

            <p>
              Build a smarter and more productive routine.
            </p>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="register-name">
                Full name
              </label>

              <input
                id="register-name"
                name="name"
                type="text"
                placeholder="Enter your name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="register-email">
                Email address
              </label>

              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="register-password">
                Password
              </label>

              <div className="password-field">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Create account"}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?

            <Link to="/login">
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
