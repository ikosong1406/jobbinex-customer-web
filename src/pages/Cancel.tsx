import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaShieldAlt,
  FaLock,
  FaCheckCircle,
} from "react-icons/fa";

const Cancel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(3);

  const planName = searchParams.get("plan");

  // Auto-redirect to profile after 3 seconds
  useEffect(() => {
    if (countdown <= 0) {
      navigate("/profile", { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {/* Icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <FaArrowLeft size={20} />
          </div>

          {/* Title */}
          <h1 className="mt-5 text-center text-xl font-bold text-[#17231a]">
            Checkout cancelled
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
            No payment was taken, and nothing has changed on your account.
            You're free to come back whenever you're ready.
          </p>

          {/* What they were looking at */}
          {planName && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  You were viewing
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-gray-700">
                  {planName} plan
                </p>
              </div>
              <button
                onClick={() =>
                  navigate(
                    `/checkout?plan=${encodeURIComponent(planName)}`
                  )
                }
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Try again
              </button>
            </div>
          )}

          {/* Primary action */}
          <button
            onClick={() => navigate("/profile")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17231a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263d2a]"
          >
            Go to profile
            <FaArrowRight className="text-xs" />
          </button>

          {/* Reassurance strip */}
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-gray-100 pt-5">
            <Reassurance icon={<FaLock />} label="No charge" />
            <Reassurance icon={<FaShieldAlt />} label="Account safe" />
            <Reassurance icon={<FaCheckCircle />} label="No commitment" />
          </div>
        </div>

        {/* Countdown below the card */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Taking you to your profile in{" "}
          <span className="font-semibold text-gray-600">{countdown}s</span>…
        </p>
      </div>
    </div>
  );
};

const Reassurance = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <div className="flex flex-col items-center gap-1.5 text-center">
    <span className="text-[#4eaa3c] text-[13px]">{icon}</span>
    <span className="text-[10px] font-semibold text-gray-500">{label}</span>
  </div>
);

export default Cancel;