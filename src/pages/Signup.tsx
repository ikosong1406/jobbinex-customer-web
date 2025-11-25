import React, { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import axios, { AxiosError } from "axios"; // Import axios and AxiosError
import toast, { Toaster } from "react-hot-toast"; // Import toast and Toaster
import bgImage from "../assets/background.jpg";
import logo from "../assets/logo1.png";
import Api from "../components/Api";

// --- Type Definitions ---
interface FormData {
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  password: string;
  confirmPassword: string; // Added confirmPassword
}

// Interface for API response data (adjust based on your actual API)
interface SignupResponse {
  message: string;
  // potentially other fields like user or token
}

const Signup: React.FC = () => {
  const navigate = useNavigate(); // Hook for navigation
  const [formData, setFormData] = useState<FormData>({
    firstname: "",
    lastname: "",
    email: "",
    phonenumber: "",
    password: "",
    confirmPassword: "", // Initialize
  });
  const [isLoading, setIsLoading] = useState(false); // State for loading status
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State for confirm password visibility

  // Placeholder for your API endpoint
  const SIGNUP_ENDPOINT = `${Api}/customer/signup`;

  // --- Utility Functions ---

  const validateForm = () => {
    const {
      firstname,
      lastname,
      email,
      phonenumber,
      password,
      confirmPassword,
    } = formData;

    if (
      !firstname.trim() ||
      !lastname.trim() ||
      !email.trim() ||
      !phonenumber.trim() ||
      !password ||
      !confirmPassword
    ) {
      toast.error("All fields are required.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    // Basic phone number validation (adjust regex for specific country codes if needed)
    if (!/^\+?[0-9]{7,15}$/.test(phonenumber)) {
      toast.error(
        "Please enter a valid phone number (7-15 digits, optional +)."
      );
      return false;
    }

    // Password strength check (e.g., min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error("Password must contain uppercase, lowercase, and a number.");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }

    return true;
  };

  // --- Event Handlers ---

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return; // Stop if validation fails
    }

    setIsLoading(true); // Start loading

    // Destructure data for API payload, excluding confirmPassword
    const { confirmPassword, ...signupData } = formData;

    try {
      // Simulate API call delay if needed, otherwise just use the axios call
      // await new Promise(resolve => setTimeout(resolve, 1000));

      await axios.post<SignupResponse>(SIGNUP_ENDPOINT, signupData);

      // Success Notification
      toast.success(
        "Account created successfully! Please log in with your credentials.",
        { duration: 5000 } // Display for 5 seconds
      );

      // Delayed Redirect
      setTimeout(() => {
        navigate("/"); // Redirect to the login page (assuming '/' is login)
      }, 2000); // 2 second delay
    } catch (error) {
      const axiosError = error as AxiosError;

      // Determine the error message
      let errorMessage = "Registration failed. Please try again.";
      if (
        axiosError.response &&
        axiosError.response.data &&
        (axiosError.response.data as any).message
      ) {
        // Use the error message from the API response
        errorMessage = (axiosError.response.data as any).message;
      } else if (axios.isAxiosError(error)) {
        errorMessage = error.message; // General Axios error
      }

      // Error Notification
      toast.error(errorMessage);
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // --- Component Render ---

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* React Hot Toast Toaster */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch justify-end w-[95%] h-[650px]">
        {" "}
        {/* Added max-w-6xl for better centering */}
        {/* Left Logo Section (Desktop) */}
        <div className="hidden md:flex flex-col justify-end text-white pb-10 pl-10 flex-1">
          <img src={logo} alt="" className="w-[90px]" />
          <p className="text-sm text-gray-200 italic">
            LANDING JOBS MADE EFFORTLESS
          </p>
        </div>
        {/* Mobile Logo */}
        <div className="flex md:hidden flex-col items-center mb-10 text-white">
          <img src={logo} alt="" className="w-[90px]" />
          <p className="text-sm italic text-white">
            LANDING JOBS MADE EFFORTLESS
          </p>
        </div>
        {/* Signup Form Section */}
        <div className="w-full md:w-[45%] bg-white p-10 md:p-14 flex flex-col justify-center shadow-2xl rounded-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Create your account
          </h2>
          <p className="mb-8 text-gray-700">
            Let's get you started with your profile
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* First Name / Last Name */}
            <div className="flex gap-4">
              <input
                type="text"
                name="firstname"
                placeholder="First Name"
                value={formData.firstname}
                onChange={handleChange}
                className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
                required
              />
              <input
                type="text"
                name="lastname"
                placeholder="Last Name"
                value={formData.lastname}
                onChange={handleChange}
                className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
                required
              />
            </div>

            {/* Email */}
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
              required
            />

            {/* Phone Number */}
            <input
              type="tel"
              name="phonenumber"
              placeholder="Phone Number"
              value={formData.phonenumber}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
              required
            />

            {/* Password with Toggle */}
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
                  name="password"
                  placeholder="Create Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
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

            {/* Confirm Password with Toggle */}
            <div className="relative">
              <label
                htmlFor="confirmPassword"
                className="block text-gray-700 text-sm mb-2 font-medium"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
                  required
                />
                {/* Eye Icon Button */}
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  style={{ top: "50%", transform: "translateY(-50%)" }}
                >
                  {showConfirmPassword ? (
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading} // Disable button while loading
              className={`w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg transition-colors ${
                isLoading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-green-700" // Added hover effect for better UX
              }`}
              style={{ "--color-primary": "#4eaa3c" } as React.CSSProperties} // Example primary color
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-sm text-gray-600 mt-6 text-center">
            Already have an account?{" "}
            <Link
              to="/"
              className="text-[var(--color-primary)] hover:underline font-medium"
              style={{ "--color-primary": "#4eaa3c" } as React.CSSProperties} // Example primary color
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
