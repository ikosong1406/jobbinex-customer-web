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
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribeClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowConfirmationModal(true);
  };

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
      status: "pending", // Payment entry created, waiting for Stripe payment
      paymentMethod: "stripe",
    };

    const response = await axios.post(
      CREATE_PAYMENT_ENTRY_ENDPOINT,
      paymentEntryData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data.paymentId; // Assuming backend returns a payment ID
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || !userDetails) {
      toast.error("Please select a plan and ensure you're logged in.");
      return;
    }

    setIsProcessing(true);
    const token = await localforage.getItem("authToken");

    if (!token) {
      toast.error("Authentication failed. Please log in again.");
      setIsProcessing(false);
      return;
    }

    try {
      const paymentId = await createPaymentEntry(selectedPlan, token);

      const { data } = await axios.post(
        CHECKOUT_ENDPOINT,
        {
          planName: selectedPlan.name,
          paymentId: paymentId, // Send payment ID to associate with Stripe session
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data.redirectUrl) {
        throw new Error("Missing redirect URL.");
      }

      toast.dismiss();

      // Step 3: Redirect to Stripe checkout
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      toast.dismiss();

      // Check if it's an Axios error
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        toast.error(`Payment setup failed: ${errorMessage}`);
      } else {
        toast.error(error.message || "Payment setup failed. Please try again.");
      }

      setIsProcessing(false);
      setShowConfirmationModal(false);
    }
  };

  const handleCloseModal = () => {
    setShowConfirmationModal(false);
    setSelectedPlan(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isActivePlan = plan.name === currentPlanName;

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
                  onClick={() => handleSubscribeClick(plan)}
                  className="mt-5 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: "#4eaa3c" }}
                >
                  Subscribe Now
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Confirm Subscription</h3>

            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">
                    {selectedPlan.name} Plan
                  </span>
                  <span className="text-2xl font-bold">
                    £{selectedPlan.price}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedPlan.description}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm">
                    You will be redirected to Stripe for secure payment
                    processing
                  </span>
                </div>
                <div className="flex items-start">
                  <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>Important:</strong> After successful payment, you
                    will be assigned a dedicated assistant within 24 hours.
                  </span>
                </div>
                <div className="flex items-start">
                  <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                  <span className="text-sm">
                    Your assistant will reach out via inbox to begin optimizing
                    your job search.
                  </span>
                </div>

                {/* Display user details being sent */}
                {userDetails && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">
                      <strong>Payment will be processed for:</strong>
                    </p>
                    <p className="text-xs text-gray-600">
                      {userDetails.firstname} {userDetails.lastname}
                    </p>
                    <p className="text-xs text-gray-600">{userDetails.email}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCloseModal}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#4eaa3c" }}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                    Creating Payment...
                  </span>
                ) : (
                  "Pay Now"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionPlans;
