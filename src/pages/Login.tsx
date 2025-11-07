import React from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import bgImage from "../assets/background.jpg";
import Logo from "../components/Logo";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault(); // stop form reload
    navigate("/customer");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${bgImage})`,
        }}
      ></div>
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch justify-end w-[95%] h-[600px]">
        {/* Left Section for Logo (Desktop) */}
        <div className="hidden md:flex flex-col justify-end text-white pb-10 pl-10 flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <Logo />
          </div>
          <p className="text-sm text-gray-200 italic">
            LANDING JOBS MADE EFFORTLESS
          </p>
        </div>

        {/* Logo for Mobile View */}
        <div className="flex md:hidden flex-col items-center mb-10 text-white">
          <Logo />
          <p className="text-sm text-gray-200 italic">
            LANDING JOBS MADE EFFORTLESS
          </p>
        </div>

        {/* Right-side Form Section */}
        <div className="w-full md:w-[45%] bg-white p-10 md:p-16 flex flex-col justify-center shadow-2xl rounded-xl">
          <h2 className="text-3xl font-bold text-gray-900">Hello there,</h2>
          <p className="mb-8 text-gray-700">
            Welcome Back, let’s have you logged in
          </p>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="email"
                className="block text-gray-700 text-sm mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[--color-primary)]"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-gray-700 text-sm mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[--color-primary)]"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="accent-red-500" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot" className="text-[#4eaa3c] hover:underline">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg transition-colors"
            >
              Login
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-4 text-center">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-[#4eaa3c] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
