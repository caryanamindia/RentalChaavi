import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Crown,
  ShieldCheck,
} from "lucide-react";
import qrImage from "../assets/QR.jpeg";
import { API_BASE_URL } from "../services/api";
import { getCurrentPremiumStatus } from "../utlis/premiumStatus";

const BuyPremium = () => {
  const navigate = useNavigate();

  const handlePremiumRequest =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "userToken"
          );

        if (!token) {
          toast.error(
            "Please login first"
          );
          return;
        }

        const decoded =
          jwtDecode(token);

        const userId =
          decoded.id ||
          decoded.userId ||
          decoded.sub;

        // ✅ CHECK USER PREMIUM STATUS
        const statusResponse =
          await axios.get(
            `${API_BASE_URL}/user/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        const userData =
          statusResponse.data?.data;
        const premiumStatus =
          getCurrentPremiumStatus(
            userData?.premiumStatus
          );

        // ✅ IF ALREADY APPROVED
        if (
          premiumStatus === "APPROVED" ||
          userData?.premiumActive ===
            true
        ) {
          toast.info(
            "Premium already activated"
          );

          navigate("/user");
          return;
        }

        // ✅ SEND REQUEST
        const response =
          await axios.post(
            `${API_BASE_URL}/user/buyPremium/${userId}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
toast.success(
          "Premium request sent successfully"
        );

        navigate("/user");
      } catch (error) {
if (
          error.response?.data
            ?.message ===
          "Payment already in process"
        ) {
toast.info(
            "Your premium request is already pending"
          );

          navigate("/user");
          return;
        }

        toast.error(
          error.response?.data
            ?.message ||
            "Failed to send request"
        );
      }
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex items-center justify-center px-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <motion.div
        initial={{
          opacity: 0,
          y: 35,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
        }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 sm:p-8 text-center border border-amber-100"
      >
        <div className="flex justify-center mb-4">
          <div className="bg-amber-500 text-white p-4 rounded-full shadow-lg">
            <Crown size={30} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-amber-900">
          Get Direct Owner Access
        </h1>

        <p className="text-amber-700 mt-2 mb-6 text-sm">
          Unlock premium properties and
          contact details instantly.
        </p>

        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <img
            src={qrImage}
            alt="QR Code"
            className="w-56 h-56 mx-auto rounded-xl shadow-md"
          />
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-amber-700">
          <ShieldCheck size={16} />
          Secure payment via QR scan
        </div>

        <button
          onClick={
            handlePremiumRequest
          }
          className="w-full mt-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition duration-200 shadow-md"
        >
          Send Premium Request
        </button>

        <button
          onClick={() =>
            navigate("/user")
          }
          className="w-full mt-3 py-3 border border-amber-200 rounded-xl text-amber-800 hover:bg-amber-50 transition duration-200"
        >
          Back to Browse
        </button>
      </motion.div>
    </div>
  );
};

export default BuyPremium;
