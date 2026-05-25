import {
  useEffect,
  useState,
} from "react";

import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "../components/Navbar";
import Filter from "../components/Filter";
import PropertyList from "../components/PropertyList";
import ChatDrawer from "../components/ChatDrawer";
import BrandLogo from "../components/BrandLogo";

import {
  API_BASE_URL,
  ownerApi,
  propertyApi,
} from "../services/api";

import { getUserIdFromToken } from "../utlis/authSync";
import {
  FALLBACK_PROPERTY_IMAGE_DATA_URL,
  getPropertyImageCandidates,
} from "../utlis/propertyImages";
import { getCurrentPremiumStatus } from "../utlis/premiumStatus";

const USER_NAME_KEY = "userName";
const USER_NAME_BY_EMAIL_KEY = "userNameByEmail";

const getUserNameFromStorage = () => {
  const userName = String(localStorage.getItem(USER_NAME_KEY) || "").trim();
  return userName || "User";
};

const rememberUserName = (decoded) => {
  const userName = String(decoded?.fullName || decoded?.name || "").trim();

  if (!userName) return null;

  localStorage.setItem(USER_NAME_KEY, userName);

  const userEmail = String(decoded?.sub || "")
    .toLowerCase()
    .trim();

  if (userEmail) {
    let userNameMap = {};

    try {
      userNameMap = JSON.parse(
        localStorage.getItem(USER_NAME_BY_EMAIL_KEY) || "{}"
      );
    } catch {
      userNameMap = {};
    }

    userNameMap[userEmail] = userName;

    localStorage.setItem(
      USER_NAME_BY_EMAIL_KEY,
      JSON.stringify(userNameMap)
    );
  }

  return userName;
};

const BrowseProperties = () => {
  const [tempFilters, setTempFilters] =
    useState({
      type: "",
      city: "",
      address: "",
      minPrice: "",
      maxPrice: "",
      pgType: "",
    });

  const [properties, setProperties] =
    useState([]);

  const [addressOptions, setAddressOptions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [premiumStatus, setPremiumStatus] =
    useState("");

  const [chatOpen, setChatOpen] =
    useState(false);

  const [chatCount, setChatCount] =
    useState(0);

  const [
    selectedPropertyForChat,
    setSelectedPropertyForChat,
  ] = useState(null);

  const [userName, setUserName] =
    useState(getUserNameFromStorage);

  const currentUserId =
    getUserIdFromToken();

  const isPremiumUser =
    premiumStatus === "APPROVED";

  // =========================================
  // FETCH USER PREMIUM STATUS
  // =========================================
  const fetchPremiumStatus =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "userToken"
          );

        if (!token) return;

        const userId =
          getUserIdFromToken();

        if (!userId) return;

        const response =
          await fetch(
            `${API_BASE_URL}/user/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        const result =
          await response.json();
setPremiumStatus(
          getCurrentPremiumStatus(
            result?.data
              ?.premiumStatus
          )
        );
      } catch (err) {
}
    };

  // =========================================
  // TYPE MAPPER
  // =========================================
  const mapUiTypeToBackend = (
    uiType
  ) => {
    if (
      !uiType ||
      uiType === "All" ||
      uiType === "ALL"
    ) {
      return null;
    }

    const type =
      uiType.toUpperCase();

    if (type === "APARTMENT")
      return "APARTMENT";

    if (
      type ===
      "INDEPENDENT_HOUSE"
    )
      return "INDEPENDENT_HOUSE";

    if (
      type ===
      "STANDALONE_BUILDING"
    )
      return "STANDALONE_BUILDING";

    return null;
  };

  // =========================================
  // BACKEND → UI
  // =========================================
  const mapBackendToUi = (
    dto
  ) => {
    const imageCandidates =
      getPropertyImageCandidates(
        dto
      );

    return {
      id:
        dto?.id ||
        dto?.propertyId,

      title:
        dto?.title ||
        "Untitled Property",

      propertyType:
        dto?.propertyType ||
        dto?.type ||
        "PROPERTY",

      type:
        dto?.propertyType ||
        dto?.type ||
        "PROPERTY",

      location:
        dto?.location ||
        `${dto?.city || ""} ${
          dto?.address || ""
        }`.trim(),

      city:
        dto?.city || "",

      address:
        dto?.address || "",

      bhkType:
        dto?.bhkType ||
        dto?.bhk ||
        "",

      price: Number(
        dto?.price || 0
      ),

      phone:
        dto?.mobileNumber ||
        dto?.mobile ||
        dto?.contactNumber ||
        "Not Available",

      details:
        dto?.description ||
        "No details available",

      image:
        imageCandidates[0] ||
        FALLBACK_PROPERTY_IMAGE_DATA_URL,

      imageCandidates,

      _raw: dto,
    };
  };

  // =========================================
  // FETCH ALL PROPERTIES
  // =========================================
  const fetchAll = async () => {
    setLoading(true);
    setError("");

    try {
      const res =
        await propertyApi.getAll();
const list =
        Array.isArray(
          res?.data
        )
          ? res.data
          : res?.data?.data || [];

      setProperties(
        list.map(
          mapBackendToUi
        )
      );
    } catch (e) {
setError(
        "Failed to load properties"
      );

      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // FETCH ADDRESSES BY CITY
  // =========================================
  const fetchAddressesByCity =
    async (city) => {
      try {
        if (!city) {
          setAddressOptions(
            []
          );

          return;
        }

        const response =
          await ownerApi.getAreasByCity(
            city.trim()
          );

        const areas =
          Array.isArray(
            response?.data?.data
          )
            ? response.data.data
            : [];

        setAddressOptions(
          areas
        );
      } catch (err) {
setAddressOptions(
          []
        );
      }
    };

  // =========================================
  // FILTER PROPERTIES
  // =========================================
  const applyBackendFilter =
    async (filters) => {
      setLoading(true);
      setError("");

      try {
        const minPrice =
          filters.minPrice === ""
            ? null
            : Number(
                filters.minPrice
              );

        const maxPrice =
          filters.maxPrice === ""
            ? null
            : Number(
                filters.maxPrice
              );

        if (
          minPrice !== null &&
          maxPrice !== null &&
          Number.isFinite(minPrice) &&
          Number.isFinite(maxPrice) &&
          maxPrice <= minPrice
        ) {
          setError(
            "Max price must be greater than min price"
          );
          return;
        }

        const userId =
          getUserIdFromToken();

        if (!userId) {
          setError(
            "User not logged in"
          );

          return;
        }

        const payload = {
          propertyType:
            mapUiTypeToBackend(
              filters.type
            ),

          city:
            filters.city === ""
              ? null
              : filters.city,

          address:
            filters.address === ""
              ? null
              : filters.address,

          minPrice:
            minPrice,

          maxPrice:
            maxPrice,

          pgType:
            filters.pgType === ""
              ? null
              : filters.pgType,
        };

        if (
          !payload.propertyType
        )
          delete payload.propertyType;

        if (!payload.city)
          delete payload.city;

        if (
          !payload.address
        )
          delete payload.address;

        if (
          !payload.minPrice ||
          Number.isNaN(
            payload.minPrice
          )
        ) {
          delete payload.minPrice;
        }

        if (
          !payload.maxPrice ||
          Number.isNaN(
            payload.maxPrice
          )
        ) {
          delete payload.maxPrice;
        }

        if (!payload.pgType) {
          delete payload.pgType;
        }
if (
          Object.keys(payload)
            .length === 0
        ) {
          return fetchAll();
        }

        const res =
          await propertyApi.filter(
            payload,
            userId
          );

        const list =
          Array.isArray(
            res?.data
          )
            ? res.data
            : res?.data
                ?.data || [];

        setProperties(
          list.map(
            mapBackendToUi
          )
        );
      } catch (e) {
setError(
          e?.message ||
            "Failed to filter properties"
        );
      } finally {
        setLoading(false);
      }
    };

  // =========================================
  // DECODE TOKEN AND SET USER NAME
  // =========================================
  useEffect(() => {
    const token =
      localStorage.getItem(
        "userToken"
      );

    if (!token) return;

    try {
      const decoded =
        jwtDecode(token);

      setUserName(
        rememberUserName(
          decoded
        ) ||
          getUserNameFromStorage()
      );
    } catch {
}
  }, []);

  // =========================================
  // INITIAL LOAD
  // =========================================
  useEffect(() => {
    fetchAll();
    fetchPremiumStatus();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <ToastContainer position="top-right" autoClose={3000} />
      <Navbar
        userName={userName}
        onOpenChat={
          isPremiumUser
            ? () =>
                setChatOpen(true)
            : undefined
        }
        chatCount={chatCount}
      />

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="max-w-7xl mx-auto px-3 sm:px-5 md:px-6 py-5 sm:py-8"
      >
        {/* HEADING */}
        <div className="mb-6">
          <h1 className="text-5xl font-black tracking-tight text-[#111827]">
            Browse{" "}
            <span className="text-[#F97316]">
              Properties
            </span>
          </h1>

          <p className="text-[#6B7280] mt-2 text-sm font-medium">
            Ocean inspired homes for you
          </p>

          <div className="w-24 h-1 bg-gradient-to-r from-[#F97316] to-[#FDBA74] rounded-full mt-4"></div>
        </div>

        {/* FILTER SECTION */}
        <div>
          <Filter
            tempFilters={
              tempFilters
            }
            setTempFilters={
              setTempFilters
            }
            addressOptions={
              addressOptions
            }
            fetchAddressesByCity={
              fetchAddressesByCity
            }
            applyFilters={() => {
              applyBackendFilter(
                tempFilters
              );
            }}
            clearFilters={() => {
              const reset = {
                type: "",
                city: "",
                address: "",
                minPrice: "",
                maxPrice: "",
                pgType: "",
              };

              setTempFilters(
                reset
              );

              setAddressOptions(
                []
              );

              fetchAll();
            }}
          />
        </div>

        {/* PROPERTY LIST */}
        <div className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1F2937]">
              Available Listings
            </h2>

            <p className="text-[#9CA3AF] text-sm">
              Properties Found
            </p>
          </div>

          {loading && (
            <p className="text-[#374151] font-semibold">
              Loading properties...
            </p>
          )}

          {error && (
            <p className="text-red-600 font-semibold">
              {error}
            </p>
          )}

          <PropertyList
            properties={
              properties
            }
            premiumStatus={
              premiumStatus
            }
            onChatClick={
              isPremiumUser
                ? (
                    property
                  ) => {
                    setSelectedPropertyForChat(
                      property
                    );

                    setChatOpen(
                      true
                    );
                  }
                : undefined
            }
          />
        </div>
      </motion.div>

      {/* FOOTER */}
      <footer className="bg-gradient-to-r from-[#020617] via-[#041833] to-[#020617] text-white py-12 px-4 md:px-6 mt-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BrandLogo size="md" />
              </div>

              <p className="text-slate-400 text-sm">
                India's first no-brokerage platform connecting property owners
                directly with tenants.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">
                Locations
              </h4>

              <ul className="space-y-2 text-slate-400 text-sm">
                <li>Pune</li>
                <li>PCMC</li>
               
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">
                Contact
              </h4>

              <ul className="space-y-2 text-slate-400 text-sm">
                <li>rentalchaavi@gmail.com</li>
                <li>+91 94218 73407</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>
              2026 Caryanam. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {isPremiumUser && (
        <ChatDrawer
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false);

            setSelectedPropertyForChat(
              null
            );
          }}
          currentRole="USER"
          currentUserId={
            currentUserId
          }
          selectedProperty={
            selectedPropertyForChat
          }
          onCountChange={
            setChatCount
          }
        />
      )}
    </div>
  );
};

export default BrowseProperties;
