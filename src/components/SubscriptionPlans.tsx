import React, { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { toast } from "react-hot-toast";
import axios from "axios";
import Api from "../components/Api";
import localforage from "localforage";

interface Plan {
  name: string;
  price: number;
  oldPrice: number | null;
  duration: string;
  description: string;
  features: string[];
  discount: number;
  highlight: boolean;
}

interface UserDetails {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  plan?: {
    name: string;
    expiresAt: string;
  };
}

interface SubscriptionPlansProps {
  plans: Plan[];
  currentPlanName?: string;
  userDetails?: UserDetails;
  onSubscriptionSuccess?: () => void;
}

const CHECKOUT_ENDPOINT = `${Api}/customer/checkout`;
const CREATE_PAYMENT_ENTRY_ENDPOINT = `${Api}/customer/createPayment`;

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  plans,
  currentPlanName,
  userDetails,
}) => {
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const createPaymentEntry = async (plan: Plan, token: string) => {
    if (!userDetails) {
      throw new Error("User details not available");
    }

    const paymentEntryData = {
      userId: userDetails._id,
      userFirstName: userDetails.firstname,
      userLastName: userDetails.lastname,
      userEmail: userDetails.email,
      userPhone: userDetails.phonenumber,
      planName: plan.name,
      planPrice: plan.price,
      planDuration: plan.duration,
      status: "pending",
      paymentMethod: "stripe",
    };

    const response = await axios.post(
      CREATE_PAYMENT_ENTRY_ENDPOINT,
      paymentEntryData,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.data.paymentId;
  };

  const handleConfirmPayment = async (plan: Plan) => {
    if (!userDetails) {
      toast.error("Please ensure you're logged in.");
      return;
    }
    const token = await localforage.getItem<string>("authToken");

    if (!token) {
      toast.error("Authentication failed. Please log in again.");
      return;
    }

    setProcessingPlan(plan.name);

    try {
      const paymentId = await createPaymentEntry(plan, token);

      const { data } = await axios.post(
        CHECKOUT_ENDPOINT,
        {
          planName: plan.name,
          paymentId: paymentId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!data.redirectUrl) {
        throw new Error("Missing redirect URL.");
      }

      toast.dismiss();

      window.location.href = data.redirectUrl;
    } catch (error: any) {
      toast.dismiss();

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        toast.error(`Payment setup failed: ${errorMessage}`);
      } else {
        toast.error(error.message || "Payment setup failed. Please try again.");
      }
      setProcessingPlan(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isActivePlan = plan.name === currentPlanName;
          const isProcessing = processingPlan === plan.name;

          return (
            <div
              key={plan.name}
              className={`rounded-2xl p-5 border flex flex-col justify-between ${
                plan.highlight
                  ? "border-4 border-yellow-500 shadow-lg"
                  : "border-gray-300"
              } ${isActivePlan ? "bg-green-50 border-green-500" : "bg-white"}`}
            >
              <div>
                {plan.highlight && (
                  <span className="text-xs font-bold text-white bg-yellow-500 px-3 py-1 rounded-full absolute -mt-8 -ml-5">
                    MOST POPULAR
                  </span>
                )}

                <h3 className="font-semibold text-2xl">{plan.name}</h3>

                <div className="my-2">
                  <span className="text-3xl font-extrabold mr-1">
                    £{plan.price}
                  </span>
                  {plan.oldPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      £{plan.oldPrice}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">{plan.duration}</span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{plan.description}</p>

                <ul className="text-sm text-gray-700 space-y-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start">
                      <FaCheckCircle className="text-green-500 mt-1 mr-2" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {isActivePlan ? (
                <button
                  disabled
                  className="mt-5 px-4 py-2 bg-green-500 text-white rounded-lg"
                >
                  <FaCheckCircle className="inline mr-2" />
                  Active Plan
                </button>
              ) : (
                <button
                  onClick={() => handleConfirmPayment(plan)}
                  disabled={processingPlan !== null}
                  className="mt-5 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#4eaa3c" }}
                >
                  {isProcessing ? "Redirecting…" : "Subscribe Now"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default SubscriptionPlans;