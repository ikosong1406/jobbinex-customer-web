import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios, { AxiosError } from "axios";
import toast, { Toaster } from "react-hot-toast";
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
  confirmPassword: string;
  referralCode: string;
}

// Interface for API response data (adjust based on your actual API)
interface SignupResponse {
  message: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstname: "",
    lastname: "",
    email: "",
    phonenumber: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const SIGNUP_ENDPOINT = `${Api}/customer/signup`;

  // Progress bar width based on current step
  const progressWidth = currentStep === 1 ? "50%" : "100%";

  // Prefill referral code from URL (?ref=CODE) on mount
  useEffect(() => {
    const refFromUrl = searchParams.get("ref");
    if (refFromUrl && refFromUrl.trim()) {
      setFormData((prev) => ({
        ...prev,
        referralCode: refFromUrl.trim(),
      }));
    }
  }, [searchParams]);

  // --- Utility Functions ---

  const validateStep1 = () => {
    const { firstname, lastname, email, phonenumber } = formData;

    if (
      !firstname.trim() ||
      !lastname.trim() ||
      !email.trim() ||
      !phonenumber.trim()
    ) {
      toast.error("All fields are required.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (!/^\+?[0-9]{7,15}$/.test(phonenumber)) {
      toast.error(
        "Please enter a valid phone number (7-15 digits, optional +)."
      );
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const { password, confirmPassword } = formData;

    if (!password || !confirmPassword) {
      toast.error("All fields are required.");
      return false;
    }

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

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);

    // Destructure data for API payload, excluding confirmPassword
    const { confirmPassword, ...signupData } = formData;

    try {
      await axios.post<SignupResponse>(SIGNUP_ENDPOINT, signupData);

      toast.success(
        "Account created successfully! Please log in with your credentials.",
        { duration: 5000 }
      );

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      const axiosError = error as AxiosError;

      let errorMessage = "Registration failed. Please try again.";
      if (
        axiosError.response &&
        axiosError.response.data &&
        (axiosError.response.data as any).message
      ) {
        errorMessage = (axiosError.response.data as any).message;
      } else if (axios.isAxiosError(error)) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Component Render ---

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Toaster position="top-right" reverseOrder={false} />

      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch justify-end w-[95%] h-[650px]">
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
        <div className="w-full md:w-[45%] bg-white p-5 md:p-12 flex flex-col justify-center shadow-2xl rounded-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mb-5 text-gray-700">
            {currentStep === 1
              ? "Let's start with your personal details"
              : "Set up your password to secure your account"}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-2 rounded-full mb-8">
            <div
              className="h-2 bg-[#4eaa3c] rounded-full transition-all duration-500"
              style={{ width: progressWidth }}
            ></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ===== STEP 1 FIELDS ===== */}
            {currentStep === 1 && (
              <>
                {/* First Name / Last Name */}
                <div className="flex gap-2">
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

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg transition-colors hover:bg-green-700"
                  style={
                    { "--color-primary": "#4eaa3c" } as React.CSSProperties
                  }
                >
                  Next
                </button>
              </>
            )}

            {/* ===== STEP 2 FIELDS ===== */}
            {currentStep === 2 && (
              <>
                {/* Password with Toggle */}
                <div className="relative">
                  <label
                    htmlFor="password"
                    className="block text-gray-700 text-sm mb-1 font-medium"
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
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      style={{ top: "50%", transform: "translateY(-50%)" }}
                    >
                      {showPassword ? (
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
                    className="block text-gray-700 text-sm mb-1 font-medium"
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
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      style={{ top: "50%", transform: "translateY(-50%)" }}
                    >
                      {showConfirmPassword ? (
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

                {/* Referral Code (Optional) */}
                <div>
                  <label
                    htmlFor="referralCode"
                    className="block text-gray-700 text-sm mb-1 font-medium"
                  >
                    Referral Code{" "}
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="referralCode"
                    type="text"
                    name="referralCode"
                    placeholder="Enter referral code"
                    value={formData.referralCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
                  />
                  {searchParams.get("ref") && (
                    <p className="text-xs text-[#4eaa3c] mt-1 font-medium">
                      Referral code applied from your invite link.
                    </p>
                  )}
                </div>

                {/* Back + Submit Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-1/2 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors hover:bg-gray-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-1/2 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg transition-colors ${
                      isLoading
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:bg-green-700"
                    }`}
                    style={
                      { "--color-primary": "#4eaa3c" } as React.CSSProperties
                    }
                  >
                    {isLoading ? "Creating..." : "Sign Up"}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Login Link */}
          <p className="text-sm text-gray-600 mt-6 text-center">
            Already have an account?{" "}
            <Link
              to="/"
              className="text-[var(--color-primary)] hover:underline font-medium"
              style={{ "--color-primary": "#4eaa3c" } as React.CSSProperties}
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