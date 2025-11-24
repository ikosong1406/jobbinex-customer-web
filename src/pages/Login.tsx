import React, { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import toast, { Toaster } from "react-hot-toast";
import localforage from "localforage"; // Import localforage
import bgImage from "../assets/background.jpg";
import Api from "../components/Api";
import logo from "../assets/logo1.png";

// --- Type Definitions ---
interface LoginData {
  email: string;
  password: string;
}

// Interface for API response data
interface LoginResponse {
  token: string;
  message: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false); // State for loading status

  // Placeholder for your API endpoint
  const LOGIN_ENDPOINT = `${Api}/customer/login`;

  // --- Utility Functions ---

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value, // Use 'id' which matches the state keys ('email', 'password')
    });
  };

  const validateForm = (): boolean => {
    const { email, password } = formData;

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    // Basic password length validation
    if (password.length < 8) {
      toast.error("Password is typically 8 or more characters.");
      return false;
    }

    return true;
  };

  // --- Event Handler ---

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return; // Stop if validation fails
    }

    setIsLoading(true);

    try {
      const response = await axios.post<LoginResponse>(
        LOGIN_ENDPOINT,
        formData
      );

      const { token, message } = response.data;

      // 1. Save the token to localforage
      await localforage.setItem("authToken", token);

      // 2. Display success message
      toast.success(message || "Login successful!", { duration: 3000 });

      // 3. Navigate to the customer dashboard
      navigate("/customer");
    } catch (error) {
      const axiosError = error as AxiosError;

      // Determine the error message
      let errorMessage = "Login failed. Please check your credentials.";

      // Attempt to get the error message from the API response
      if (
        axiosError.response &&
        axiosError.response.data &&
        (axiosError.response.data as any).message
      ) {
        errorMessage = (axiosError.response.data as any).message;
      } else if (axios.isAxiosError(error) && error.message) {
        errorMessage = error.message; // General Axios error
      }

      // 4. Display error message
      toast.error(errorMessage);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Component Render ---

  // NOTE: Assuming the primary color is the green: #4eaa3c
  const primaryColor = "#4eaa3c";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* React Hot Toast Toaster */}
      <Toaster position="top-right" reverseOrder={false} />

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
            <img src={logo} alt="" className="w-[90px]" />
          </div>
          <p className="text-sm text-gray-200 italic">
            LANDING JOBS MADE EFFORTLESS
          </p>
        </div>

        {/* Logo for Mobile View */}
        <div className="flex md:hidden flex-col items-center mb-10 text-white">
            <img src={logo} alt="" className="w-[90px]" />
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
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-gray-700 text-sm mb-2 font-medium"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-gray-700 text-sm mb-2 font-medium"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
                required
              />
            </div>

            {/* Remember Me / Forgot Password */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="accent-[#4eaa3c]" // Updated accent color for consistency
                />
                <span>Remember me</span>
              </label>
              <Link
                to="/forgot"
                className="hover:underline font-medium"
                style={{ color: primaryColor }}
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg transition-colors ${
                isLoading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-green-700"
              }`}
              style={{ "--color-primary": primaryColor } as React.CSSProperties}
            >
              {isLoading ? "Logging In..." : "Login"}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-sm text-gray-600 mt-4 text-center">
            Don’t have an account?{" "}
            <Link
              to="/signup"
              className="hover:underline font-medium"
              style={{ color: primaryColor }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
