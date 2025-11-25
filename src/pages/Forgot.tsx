import React, { useState, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import axios, { AxiosError } from "axios"; // Added axios
import toast from "react-hot-toast"; // Added toast
import bgImage from "../assets/background.jpg";
import logo from "../assets/logo1.png";
import Api from "../components/Api"; // Assuming Api is imported here

const ENDPOINTS = {
  STEP1_SEND_CODE: `${Api}/customer/forgot`,
  STEP2_VERIFY_CODE: `${Api}/customer/verify`,
  STEP3_RESET_PASSWORD: `${Api}/customer/reset`,
};

interface FormData {
  email: string;
  code: string[];
  newPassword: string;
  confirmPassword: string;
}

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    code: ["", "", "", ""],
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false); // State for new password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State for confirm password visibility

  // Ref array for OTP inputs for automatic focus
  const codeInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(null);
  };

  const handleCodeChange = (index: number, value: string): void => {
    if (/^[0-9]?$/.test(value)) {
      const newCode = [...formData.code];
      newCode[index] = value;
      setFormData({ ...formData, code: newCode });
      setError(null);

      // Automatic focus on the next input
      if (value !== "" && index < 3) {
        codeInputsRef.current[index + 1]?.focus();
      }
      // If the last digit is entered, trigger next step check (if you want)
      if (index === 3 && value !== "") {
        // Optionally trigger step 2 check here or wait for button click
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ): void => {
    if (e.key === "Backspace" && e.currentTarget.value === "" && index > 0) {
      // Move focus to the previous input on backspace if current field is empty
      codeInputsRef.current[index - 1]?.focus();
    }
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const prevStep = (): void => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  // --- API Handlers ---

  // Step 1: Send Email and Request Code
  const handleStep1 = async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      await axios.post(ENDPOINTS.STEP1_SEND_CODE, {
        email: formData.email,
      });
      toast.success("Reset code sent to your email!");
      return true;
    } catch (err) {
      const axiosError = err as AxiosError<{ msg: string }>;
      const errorMsg =
        axiosError.response?.data?.msg ||
        "Failed to send code. Please check your email.";
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code
  const handleStep2 = async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    const codeString = formData.code.join("");

    if (codeString.length !== 4) {
      setError("Please enter the complete 4-digit code.");
      setLoading(false);
      return false;
    }

    try {
      await axios.post(ENDPOINTS.STEP2_VERIFY_CODE, {
        email: formData.email,
        resetCode: codeString, // Send the joined code string
      });
      toast.success("Code verified successfully! Set your new password.");
      return true;
    } catch (err) {
      const axiosError = err as AxiosError<{ msg: string }>;
      const errorMsg =
        axiosError.response?.data?.msg ||
        "Invalid code or email. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleStep3 = async (): Promise<void> => {
    setError(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New password and confirm password must match.");
      return;
    }

    if (formData.newPassword.length < 6) {
      // Basic length check
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    const codeString = formData.code.join("");

    try {
      await axios.post(ENDPOINTS.STEP3_RESET_PASSWORD, {
        email: formData.email,
        newPassword: formData.newPassword,
        resetCode: codeString, // Include code for verification on the final step
      });

      toast.success("Password reset successful! You can now log in.");
      navigate("/", { replace: true }); // Redirect to login page
    } catch (err) {
      const axiosError = err as AxiosError<{ msg: string }>;
      const errorMsg =
        axiosError.response?.data?.msg ||
        "Failed to reset password. Please verify your code and try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // --- Form Submission Logic ---

  const nextStep = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (loading) return;

    let success = false;

    if (step === 1) {
      if (!formData.email) {
        setError("Email is required.");
        return;
      }
      success = await handleStep1();
    } else if (step === 2) {
      success = await handleStep2();
    }

    if (success && step < 3) {
      setStep(step + 1);
      setError(null); // Clear error after successful step transition
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (loading) return;
    if (step === 3) {
      handleStep3();
    }
  };

  const progressWidth = `${(step / 3) * 100}%`;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch justify-end w-[95%] h-[650px]">
        {/* Left Logo Section (Desktop) */}
        <div className="hidden md:flex flex-col justify-end text-white pb-10 pl-10 flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <img src={logo} alt="" className="w-[90px]" />
          </div>
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

        {/* Right Form Section */}
        <div className="w-full md:w-[45%] bg-white p-10 md:p-14 flex flex-col justify-center shadow-2xl rounded-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Forgot Password
          </h2>
          <p className="mb-8 text-gray-700">
            {step === 1
              ? "Enter your email to receive a reset code."
              : step === 2
              ? "Enter the 4-digit code sent to your email."
              : "Set your new password below."}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-2 rounded-full mb-8">
            <div
              className="h-2 bg-[#4eaa3c] rounded-full transition-all duration-500"
              style={{ width: progressWidth }}
            ></div>
          </div>

          {/* Error Message Display */}
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form
            onSubmit={step === 3 ? handleSubmit : nextStep}
            className="space-y-6"
          >
            {/* Step 1 - Email */}
            {step === 1 && (
              <>
                <label className="block text-gray-700 text-sm mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4eaa3c]"
                  required
                />
              </>
            )}

            {/* Step 2 - Code Verification */}
            {step === 2 && (
              <>
                <label className="block text-gray-700 text-sm mb-2">
                  Verification Code
                </label>
                <div className="flex justify-between space-x-4">
                  {formData.code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        codeInputsRef.current[index] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="w-16 h-16 text-center text-2xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4eaa3c] transition"
                      required
                    />
                  ))}
                </div>
              </>
            )}

            {/* Step 3 - New Password */}
            {step === 3 && (
              <>
                {/* New Password Field */}
                <div className="relative">
                  <label className="block text-gray-700 text-sm mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      placeholder="Enter new password"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4eaa3c]"
                      required
                    />
                    {/* Eye Icon Button */}
                    <button
                      type="button"
                      onClick={toggleNewPasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      style={{ top: "50%", transform: "translateY(-50%)" }}
                    >
                      {showNewPassword ? (
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

                {/* Confirm Password Field */}
                <div className="relative">
                  <label className="block text-gray-700 text-sm mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4eaa3c]"
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
              </>
            )}

            {/* Buttons */}
            <div className="flex justify-between items-center pt-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Back
                </button>
              ) : (
                <div></div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-lg bg-[#4eaa3c] text-white font-semibold shadow-md transition hover:bg-[#3d8c2d] disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center"
              >
                {loading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : step === 3 ? (
                  "Reset Password"
                ) : (
                  "Next"
                )}
              </button>
            </div>
          </form>

          <p className="text-sm text-gray-600 mt-6 text-center">
            Remembered your password?{" "}
            <Link to="/" className="text-[#4eaa3c] hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
