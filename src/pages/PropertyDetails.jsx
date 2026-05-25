import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";

import Navbar from "../components/Navbar";
import ChatDrawer from "../components/ChatDrawer";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { API_BASE_URL } from "../services/api";

import {
  MapPin,
  Phone,
  ArrowLeft,
  Home,
  Maximize,
  Sofa,
  MessageCircle,
  ShieldCheck,
  BedDouble,
  Trees,
Shield,
Droplets,
Wifi,
Car,
Zap,
Dumbbell,
Waves,
  Building2,
  Baby,
  Crown,
} from "lucide-react";

import BrandLogo from "../components/BrandLogo";
import { getUserIdFromToken } from "../utlis/authSync";
import {
  FALLBACK_PROPERTY_IMAGE_DATA_URL,
  getImageCandidates,
  getPropertyImageNames,
} from "../utlis/propertyImages";
import { getCurrentPremiumStatus } from "../utlis/premiumStatus";

const FALLBACK_IMAGE = FALLBACK_PROPERTY_IMAGE_DATA_URL;

const facilityIcons = {
  LANDSCAPE_GARDEN: Trees,
  GATED_COMMUNITY: Shield,
  WATER_SUPPLY_24X7: Droplets,
  WIFI_SUPPLY_24X7: Wifi,
  CCTV_SECURITY: ShieldCheck,
  CHILDREN_PLAY_AREA: Baby,
  VISITOR_PARKING: Car,
  POWER_BACKUP: Zap,
  LIFT_FACILITY: Building2,
  GYMNASIUM: Dumbbell,
  SWIMMING_POOL: Waves,
};

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] =
    useState(null);

  const [facilities, setFacilities] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [premiumStatus, setPremiumStatus] =
    useState("");

  const [currentIndex, setCurrentIndex] =
    useState(0);
  const [currentImageCandidateIndex, setCurrentImageCandidateIndex] =
    useState(0);

  const [chatOpen, setChatOpen] =
    useState(false);

  const [chatCount, setChatCount] =
    useState(0);

  const [
    selectedPropertyForChat,
    setSelectedPropertyForChat,
  ] = useState(null);


  const [nearbyProperties, setNearbyProperties] = useState([]);

  const currentUserId =
    getUserIdFromToken();

  const isPremiumUser =
    premiumStatus === "APPROVED";

  const isPremiumRequestPending =
    premiumStatus === "PENDING";


    const [userName, setUserName] =
  useState("");

  const loadFacilities =
    useCallback(
      async (
        ownerId,
        propertyId
      ) => {
        try {
          if (
            !ownerId ||
            !propertyId
          ) {
            setFacilities([]);
            return;
          }

          const response =
            await fetch(
              `${API_BASE_URL}/owner/get-facilities?ownerId=${ownerId}&propertyId=${propertyId}`
            );

          if (!response.ok) {
setFacilities([]);
            return;
          }

          const text =
            await response.text();

          if (!text) {
            setFacilities([]);
            return;
          }

          const result =
            JSON.parse(text);
setFacilities(
            result?.data || []
          );
        } catch (err) {
setFacilities([]);
        }
      },
      []
    );




const loadNearbyProperties = useCallback(async (pincode) => {
  try {
    if (!pincode) return;

    const response = await fetch(
      `${API_BASE_URL}/area/nearby?nearbyPincode=${pincode}`
    );

    const result = await response.json();
setNearbyProperties(result || []);
  } catch (err) {
setNearbyProperties([]);
  }
}, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProperty() {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem(
            "userToken"
          );

        if (!token) {
          navigate(
            "/buy-premium"
          );
          return;
        }

        const payload = JSON.parse(
          atob(
            token.split(".")[1]
          )
        );

        const userId =
          payload.id ||
          payload.userId ||
          payload.sub;


          const loggedInUserName =
  payload.name ||
  payload.fullName ||
  payload.username ||
  "User";

setUserName(loggedInUserName);

        try {
          const userResponse =
            await fetch(
              `${API_BASE_URL}/user/${userId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

          const userResult =
            await userResponse.json();

          if (!cancelled) {
            setPremiumStatus(
              getCurrentPremiumStatus(
                userResult?.data
                  ?.premiumStatus
              )
            );
          }
        } catch {
          if (!cancelled) {
            setPremiumStatus("");
          }
        }

        const response =
          await fetch(
            `${API_BASE_URL}/user/properties/${userId}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.status >= 400
        ) {
          throw new Error(
            result.message ||
              "Failed to fetch properties"
          );
        }

        const propertyList =
          result.data || [];

        const selectedProperty =
          propertyList.find(
            (item) =>
              String(item.id) ===
                String(id) ||
              String(
                item.propertyId
              ) === String(id)
          );

        if (
          !selectedProperty
        ) {
          throw new Error(
            "Property not found"
          );
        }
const propertyId =
          selectedProperty.id ||
          selectedProperty.propertyId;

        const ownerId =
          selectedProperty.ownerId ||
          selectedProperty.userId;

          const areaPincode =
  selectedProperty.pincode ||
  selectedProperty.pinCode ||
  selectedProperty.areaPincode;
const normalizedProperty = {
  ...selectedProperty,
  ownerName:
    selectedProperty.ownerName ||
    selectedProperty.fullName ||
    selectedProperty.propertyOwnerName ||
    selectedProperty.owner?.fullName ||
    selectedProperty.owner?.name ||
    selectedProperty.ownerFullName ||
    selectedProperty.owner_name ||
    selectedProperty.name ||
    "Owner",

  mobileNumber:
    selectedProperty.mobileNumber ||
    selectedProperty.owner?.mobileNumber ||
    selectedProperty.ownerMobileNumber ||
    selectedProperty.phone ||
    "N/A",
};
if (!cancelled) {
          setProperty(
            normalizedProperty
          );

          loadFacilities(
            ownerId,
            propertyId
          );
//  loadNearbyProperties(propertyId);
loadNearbyProperties(areaPincode);
        }
      } catch (err) {
if (!cancelled) {
          setError(
            err.message ||
              "Something went wrong"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProperty();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    navigate,
    loadFacilities,
     loadNearbyProperties,
  ]);

  const imageCandidatesList = useMemo(
    () => {
      if (!property) {
        return [
          [FALLBACK_IMAGE],
        ];
      }

      const imageNames =
        getPropertyImageNames(
          property
        );

      const candidates =
        imageNames
          .map(
            getImageCandidates
          )
          .filter(
            (items) =>
              items.length > 0
          );

      if (candidates.length > 0) return candidates;

      return [
        [FALLBACK_IMAGE],
      ];
    },
    [property]
  );

  const imageUrls = useMemo(
    () =>
      imageCandidatesList.map(
        (candidates) =>
          candidates[0] ||
          FALLBACK_IMAGE
      ),
    [imageCandidatesList]
  );

  const currentImageCandidates =
    imageCandidatesList[
      currentIndex
    ] || [FALLBACK_IMAGE];

  const currentImageSrc =
    currentImageCandidates[
      currentImageCandidateIndex
    ] || FALLBACK_IMAGE;

  const nextSlide =
    useCallback(() => {
      if (
        imageUrls.length <= 1
      )
        return;

      setCurrentIndex(
        (prev) =>
          prev ===
          imageUrls.length - 1
            ? 0
            : prev + 1
      );
    }, [imageUrls]);

  useEffect(() => {
    setCurrentImageCandidateIndex(0);
  }, [
    currentIndex,
    imageCandidatesList,
  ]);

  useEffect(() => {
    if (
      imageUrls.length <= 1
    )
      return;

    const interval =
      setInterval(
        nextSlide,
        4000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [
    imageUrls,
    nextSlide,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f0e8] font-poppins">
        <Navbar />

        <div className="h-[80vh] flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-black animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f0e8] font-poppins">
        <Navbar />

        <div className="max-w-2xl mx-auto py-20 px-5">
          <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-500">
            <h2 className="text-3xl font-black mb-4">
              Failed to Load
              Property
            </h2>

            <p>{error}</p>

            <button
              onClick={() =>
                navigate(-1)
              }
              className="mt-6 bg-black text-white px-6 py-3 rounded-2xl"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f0e8] font-inter">
      <Navbar
        onOpenChat={
          isPremiumUser
            ? () =>
                setChatOpen(true)
            : undefined
        }
        chatCount={
          chatCount
        }
        userName={userName}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-5 sm:py-8">
        <button
          onClick={() =>
            navigate(-1)
          }
          className="flex items-center gap-2 text-slate-700 font-semibold mb-6"
        >
          <ArrowLeft size={18} />
          Back to
          Properties
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-8">
          <div className="xl:col-span-8 space-y-5 sm:space-y-8">
            <div className="bg-white rounded-[20px] sm:rounded-[32px] overflow-hidden shadow-xl">
              <div className="relative h-[260px] sm:h-[360px] md:h-[550px] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={
                      currentIndex
                    }
                    src={
                      currentImageSrc
                    }
                    onError={(
                      e
                    ) => {
                      if (
                        currentImageCandidateIndex <
                        currentImageCandidates.length -
                          1
                      ) {
                        setCurrentImageCandidateIndex(
                          (current) =>
                            current + 1
                        );
                        return;
                      }

                      e.currentTarget.src =
                        FALLBACK_IMAGE;
                    }}
                    className="w-full h-full object-cover"
                    initial={{
                      opacity: 0,
                      scale: 1.05,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.6,
                    }}
                  />
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-10"></div>

                {imageUrls.length >
                  1 && (
                  <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                    {imageUrls.map(
                      (
                        _,
                        index
                      ) => (
                        <button
                          key={
                            index
                          }
                          onClick={() =>
                            setCurrentIndex(
                              index
                            )
                          }
                          className={`rounded-full transition-all duration-300 ${
                            currentIndex ===
                            index
                              ? "w-8 h-3 bg-white"
                              : "w-3 h-3 bg-white/50"
                          }`}
                        />
                      )
                    )}
                  </div>
                )}

                <div className="absolute bottom-6 left-5 sm:bottom-8 sm:left-8 text-white z-20 max-w-[calc(100%-40px)]">
                  <h1 className="text-3xl sm:text-4xl md:text-6xl font-black drop-shadow-2xl break-words">
                    {
                      property?.title
                    }
                  </h1>

                  <div className="flex items-center gap-2 mt-3 text-white/90">
                    <MapPin
                      size={18}
                    />
                    <span className="text-lg">
                      {
                        property?.location
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/90 text-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 lg:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.28)] border border-white/10">
              <div className="flex items-start justify-between flex-wrap gap-5 mb-10">
                <div>
                  <h2 className="text-2xl sm:text-[28px] font-black text-white leading-tight">
                    Property
                    Overview
                  </h2>

                  <p className="text-[#ffbf8a] mt-2 text-[15px] font-semibold">
                    Verified
                    property
                    information
                  </p>
                </div>

                <div className="bg-white/10 border border-white/10 text-white px-5 sm:px-7 py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.24)] min-w-0 sm:min-w-[170px]">
                  <p className="text-xs uppercase tracking-[3px] text-[#f36c12] mb-1">
                    Price
                  </p>

                  <h2 className="text-3xl sm:text-4xl font-black text-[#f3ede7] break-words">
                    ₹
                    {property?.price ||
                      "25,000"}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <OverviewCard
                  icon={
                    <Home
                      size={24}
                    />
                  }
                  title="Property Type"
                  value={
                    property?.propertyType
                  }
                />

                <OverviewCard
                  icon={
                    <BedDouble
                      size={24}
                    />
                  }
                  title="BHK"
                  value={
                    property?.bhkType
                  }
                />

                <OverviewCard
                  icon={
                    <Sofa
                      size={24}
                    />
                  }
                  title="Furnishing"
                  value={
                    property?.furnishing
                  }
                />

                <OverviewCard
                  icon={
                    <Maximize
                      size={24}
                    />
                  }
                  title="Carpet Area"
                  value={
                    property?.carpetArea
                  }
                />
              </div>

              <div className="mt-12">
                <h2 className="text-[30px] font-black text-white mb-6">
                  Facilities
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {facilities.length >
                  0 ? (
                    facilities.map(
                      (
                        facility
                      ) => (
                        // <FacilityCard
                        //   key={
                        //     facility.id
                        //   }
                        //   title={facility.facilityName
                        //     ?.replaceAll(
                        //       "_",
                        //       " "
                        //     )
                        //     .toLowerCase()
                        //     .replace(
                        //       /\b\w/g,
                        //       (
                        //         c
                        //       ) =>
                        //         c.toUpperCase()
                        //     )}
                        //   status={
                        //     facility.status
                        //   }
                        // />
                        <FacilityCard
  key={
    facility.id
  }
  icon={
    facilityIcons[
      facility.facilityName
    ]
  }
  title={facility.facilityName
    ?.replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        c
      ) =>
        c.toUpperCase()
    )}
  status={
    facility.status
  }
/>
                      )
                    )
                  ) : (
                    <div className="text-white/70 text-sm">
                      No
                      facilities
                      available
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-12">
                <h2 className="text-[34px] font-black text-white mb-5">
                  About
                  Property
                </h2>

                <p className="text-white/75 leading-8 text-[16px]">
                  {property?.description ||
                    "No description available"}
                </p>

                {!isPremiumUser && (
                  <button
                    type="button"
                    disabled={isPremiumRequestPending}
                    onClick={() => {
                      if (isPremiumRequestPending) return;

                      navigate("/buy-premium");
                    }}
                    title={
                      isPremiumRequestPending
                        ? "Your premium request is pending admin approval"
                        : "Buy premium"
                    }
                    className={`mt-6 inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-3 text-white font-black shadow-[0_10px_30px_rgba(249,115,22,0.30)] transition-all duration-300 ${
                      isPremiumRequestPending
                        ? "cursor-not-allowed bg-slate-600 opacity-70"
                        : "bg-[#f97316] hover:bg-[#ea6a0a] hover:scale-[1.02]"
                    }`}
                  >
                    <Crown size={20} />
                    {isPremiumRequestPending
                      ? "Premium Request Pending"
                      : "Buy Premium"}
                  </button>
                )}
              </div>
            </div>
          </div>
          

          <div className="xl:col-span-4">
            <div className="sticky top-5 space-y-6">
              <div className="bg-black/90 text-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 lg:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.28)] border border-white/10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#ff7438] text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-[0_14px_30px_rgba(255,116,56,0.24)] flex-shrink-0">
                    {property?.ownerName
                      ?.charAt(
                        0
                      )
                      ?.toUpperCase() ||
                      "O"}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {property?.ownerName ||
                        "Owner"}
                    </h3>

                    <p className="flex items-center gap-1 text-sm text-[#ff7a00] font-semibold">
                      <ShieldCheck
                        size={16}
                      />
                      Verified
                      Seller
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-5 mb-6">
                  <p className="text-xs uppercase tracking-[3px] text-[#ffbf8a] mb-2">
                    Direct
                    Contact
                  </p>

                  <div className="flex items-center gap-3">
                    <Phone
                      size={20}
                      className="text-[#ff7a00]"
                    />

                    <span className="text-2xl sm:text-3xl font-black text-white break-all">
                      {property?.mobileNumber ||
                        "N/A"}
                    </span>
                  </div>
                </div>

                {isPremiumUser && (
                  <button
                    onClick={() => {
                      setSelectedPropertyForChat(
                        {
                          id: property?.id,
                          title:
                            property?.title,
                          ownerName:
                            property?.ownerName,
                          ownerId:
                            property?.ownerId ||
                            property?.userId,
                          _raw: property,
                        }
                      );

                      setChatOpen(
                        true
                      );
                    }}
                    className="w-full bg-[#f97316] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#ea6a0a] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(249,115,22,0.30)]"
                  >
                    <MessageCircle
                      size={22}
                    />
                    Chat with
                    Owner
                  </button>
                )}
              </div>
              {/* Safety Tips Card */}
<div className="bg-black/90 text-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] border border-white/10">
  <h3 className="text-xl font-black text-white mb-4">
    Safety Tips
  </h3>

  <ul className="space-y-3 text-sm text-white/75 leading-6 [&>li]:first-letter:text-[#ff7a00] [&>li]:first-letter:font-black">
    <li>✔ Always verify property ownership before payment</li>
    <li>✔ Never share OTP or sensitive banking details</li>
    <li>✔ Prefer visiting property in person before finalizing</li>
    <li>✔ Use trusted payment methods only</li>
  </ul>
</div>


{/* Nearby Properties Card */}
<div className="bg-black/90 text-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] border border-white/10">
  <h3 className="text-xl font-black text-white mb-4">
    Nearby Properties
  </h3>

 {nearbyProperties.length > 0 ? (
  <div className="max-h-[970px] space-y-4 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin] [scrollbar-color:#f97316_rgba(255,255,255,0.10)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#f97316]">
    {nearbyProperties.map((item, index) => (
      <div
        key={index}
        className="p-4 rounded-2xl bg-white/10 border border-white/10"
      >
        <h4 className="font-bold text-white">
          {item}
        </h4>

        <p className="text-sm text-white/65 mt-1">
          Nearby location
        </p>
      </div>
    ))}
  </div>
) : (
  <p className="text-sm text-white/65">
    No nearby properties found
  </p>
)}
</div>


{/* Quick Info Card */}
<div className="bg-black/90 text-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] border border-white/10">
  <h3 className="text-xl font-black text-white mb-4">
    Quick Info
  </h3>

  <div className="space-y-3 text-sm text-white/75">
    <div className="flex justify-between">
      <span>Property ID</span>
      <span className="font-semibold text-white">
        {property?.id || property?.propertyId || "N/A"}
      </span>
    </div>

    <div className="flex justify-between">
      <span>Type</span>
      <span className="font-semibold text-white">
        {property?.propertyType || "N/A"}
      </span>
    </div>

    <div className="flex justify-between">
      <span>Status</span>
      <span className="font-semibold text-[#ff7a00]">
        Available
      </span>
    </div>
  </div>
</div>
            </div>
            
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
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
              <h4 className="font-bold mb-4">Locations</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>Pune</li>
                <li>PCMC</li>
                
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>rentalchaavi@gmail.com</li>
                <li>+91 94218 73407</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p> 2026 Caryanam. All rights reserved.</p>
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

const OverviewCard = ({
  icon,
  title,
  value,
}) => (
  <div className="bg-white/10 border border-white/10 rounded-[20px] p-6 hover:bg-white/15 transition-all duration-300">
    <div className="w-14 h-14 rounded-2xl bg-black/40 text-[#ff7a00] border border-[#ff7a00]/30 flex items-center justify-center mb-6 shadow-[0_10px_25px_rgba(249,115,22,0.16)]">
      {icon}
    </div>

    <p className="text-white/70 text-[15px] mb-2">
      {title}
    </p>

    <h3 className="text-[22px] font-black text-white break-words leading-tight uppercase">
      {value || "N/A"}
    </h3>
  </div>
);


// const FacilityCard = ({
//   title,
//   status,
// }) => (
//   <div className="bg-[#f8fafc] border border-slate-200 rounded-[20px] p-5 flex items-center justify-between hover:shadow-md transition-all">
//     <span className="text-slate-700 font-semibold">
//       {title}
//     </span>

//     <span
//       className={`px-4 py-1 rounded-full text-sm font-bold ${
//         status ===
//         "ACTIVE"
//           ? "bg-green-100 text-green-700"
//           : "bg-red-100 text-red-600"
//       }`}
//     >
//       {status ===
//       "ACTIVE"
//         ? "Yes"
//         : "No"}
//     </span>
//   </div>
// );



const FacilityCard = ({
  title,
  status,
  icon: Icon,
}) => (
  <div className="bg-white/10 border border-white/10 rounded-[20px] p-5 flex items-center justify-between hover:bg-white/15 transition-all">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-black/40 text-[#ff7a00] border border-[#ff7a00]/30 flex items-center justify-center shadow-[0_10px_25px_rgba(249,115,22,0.16)]">
        {Icon ? <Icon size={18} /> : <Home size={18} />}
      </div>

      <span className="text-white font-semibold">
        {title}
      </span>
    </div>

    <span
      className={`px-4 py-1 rounded-full text-sm font-bold ${
        status === "ACTIVE"
          ? "bg-red-50  text-[#ff7a00] border border-red-200"
          : "bg-black/40 text-red-600 border border-[#ff7a00]/30"
      }`}
    >
      {status === "ACTIVE" ? "Yes" : "No"}
    </span>
  </div>
);
export default PropertyDetails;

