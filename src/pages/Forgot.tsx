import React, { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import bgImage from "../assets/background.jpg";
import Logo from "../components/Logo";

interface FormData {
  email: string;
  code: string[];
  newPassword: string;
  confirmPassword: string;
}

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    code: ["", "", "", ""],
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCodeChange = (index: number, value: string): void => {
    if (/^[0-9]?$/.test(value)) {
      const newCode = [...formData.code];
      newCode[index] = value;
      setFormData({ ...formData, code: newCode });
    }
  };

  const nextStep = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (step < 3) setStep(step + 1);
  };

  const prevStep = (): void => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    console.log(formData);
    alert("Password reset successful!");
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
            <Logo />
          </div>
          <p className="text-sm text-gray-200 italic">
            LANDING JOBS MADE EFFORTLESS
          </p>
        </div>

        {/* Mobile Logo */}
        <div className="flex md:hidden flex-col items-center mb-10 text-white">
          <Logo />
          <p className="text-sm italic text-white">
            LANDING JOBS MADE EFFORTLESS
          </p>
        </div>

        {/* Right Form Section */}
        <div className="w-full md:w-[45%] bg-white p-10 md:p-14 flex flex-col justify-center shadow-2xl rounded-xl">
          <h2 className="text-3xl font-bold text-gray-900">Forgot Password</h2>
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
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      className="w-16 h-16 text-center text-2xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4eaa3c]"
                      required
                    />
                  ))}
                </div>
              </>
            )}

            {/* Step 3 - New Password */}
            {step === 3 && (
              <>
                <label className="block text-gray-700 text-sm mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4eaa3c]"
                  required
                />
                <label className="block text-gray-700 text-sm mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4eaa3c]"
                  required
                />
              </>
            )}

            {/* Buttons */}
            <div className="flex justify-between items-center pt-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                >
                  Back
                </button>
              ) : (
                <div></div>
              )}
              <button
                type="submit"
                className="px-8 py-3 rounded-lg bg-[#4eaa3c] text-white font-semibold shadow-md transition"
              >
                {step === 3 ? "Reset Password" : "Next"}
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
