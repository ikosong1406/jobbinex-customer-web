import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaRocket,
} from "react-icons/fa";
import Api from "../components/Api";

const SUBSCRIPTION_ENDPOINT = `${Api}/customer/activate`;

type ActivationState = "pending" | "done" | "failed";

const Success: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activation, setActivation] = useState<ActivationState>("pending");
  const hasActivated = useRef(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (hasActivated.current) return;
    hasActivated.current = true;

    const activate = async () => {
      if (!sessionId) {
        setActivation("failed");
        return;
      }
      try {
        const token = await localforage.getItem("authToken");
        if (!token) {
          setActivation("failed");
          return;
        }
        await axios.post(
          SUBSCRIPTION_ENDPOINT,
          { sessionId },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setActivation("done");
      } catch (err) {
        const axiosError = err as AxiosError;
        console.error("Activation failed:", axiosError);
        setActivation("failed");
      }
    };

    activate();
  }, [sessionId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <FaCheckCircle size={26} />
        </div>

        <h1 className="mt-5 text-center text-xl font-bold text-[#17231a]">
          Payment complete
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Your plan is now active. Your career assistant will start applying on
          your behalf within 24 hours.
        </p>

        {/* Activation fallback — only shown if the background call failed */}
        {activation === "failed" && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-[11px] text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-900">
              Your payment went through, but we're still confirming it on our
              side. If your plan isn't active within the hour, contact support
              and mention this email.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#4eaa3c] shadow-sm">
              <FaRocket className="text-xs" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#17231a]">What's next</p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                Finish your profile if you haven't already — we need your
                contact number, job inbox, CV, and preferences before we can
                start.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/profile")}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4eaa3c] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-900/15 transition hover:bg-[#60bb4d]"
        >
          Go to profile
          <FaArrowRight className="text-xs" />
        </button>
      </div>
    </div>
  );
};

export default Success;
