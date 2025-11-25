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
  const [showPassword, setShowPassword] = useState(false); // State for password visibility

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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Hello there,
          </h2>
          <p className="mb-8 text-gray-700">
            Welcome Back, let's have you logged in
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
            <div className="relative">
              <label
                htmlFor="password"
                className="block text-gray-700 text-sm mb-2 font-medium"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
                  required
                />
                {/* Eye Icon Button */}
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  style={{ top: "50%", transform: "translateY(-50%)" }}
                >
                  {showPassword ? (
                    // Eye open icon (visible password)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    // Eye closed icon (hidden password)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                        clipRule="evenodd"
                      />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
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
            Don't have an account?{" "}
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
