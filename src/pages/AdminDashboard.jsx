import { useState, useEffect, useRef } from "react";

import { useNavigate } from "react-router-dom";

import { jwtDecode } from "jwt-decode";

import { ownerApi } from "../services/api";

import { toast, ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import OwnerPremiumQrImage from "../assets/QR.jpeg";

import {
  AlignLeft,
  Armchair,
  BedDouble,
  Building2,
  FileText,
  IndianRupee,
  Landmark,
  LogOut,
  MapPin,
  MapPinned,
  MessageCircle,
  Navigation,
  Phone,
  Ruler,
  Upload,
  Users,
} from "lucide-react";

import ChatDrawer from "../components/ChatDrawer";
import BrandLogo from "../components/BrandLogo";
import {
  FALLBACK_PROPERTY_IMAGE_DATA_URL,
  getImageCandidates,
  parseImageList,
} from "../utlis/propertyImages";



const IMAGE_FALLBACK = FALLBACK_PROPERTY_IMAGE_DATA_URL;

const OWNER_PREMIUM_QR_IMAGE =

  OwnerPremiumQrImage || IMAGE_FALLBACK;

const OWNER_ID_BY_EMAIL_KEY = "ownerIdByEmail";

const OWNER_APPROVAL_STATUS_KEY = "ownerApprovalStatuses";

const PROPERTY_PAYMENT_STATUS_KEY = "propertyPaymentStatuses";

const OWNER_NAME_KEY = "ownerName";

const OWNER_NAME_BY_EMAIL_KEY = "ownerNameByEmail";

const PROPERTY_STATE = "Maharashtra";
const CITY_OPTIONS = [
  { label: "Pune", value: "Pune" },
  { label: "Pimpri-Chinchwad (PCMC)", value: "PCMC" },
];
const uploadFieldClass =
  "w-full pl-11 pr-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 focus:border-[#ff7a00] bg-[#f9f3ed] text-black placeholder:text-black";
const uploadSelectClass =
  "w-full pl-11 pr-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 focus:border-[#ff7a00] bg-[#f7f0e8] text-black";
const uploadReadonlyFieldClass =
  "w-full pl-11 pr-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 focus:border-[#ff7a00] bg-[#efe4d7] text-black placeholder:text-black";
const uploadIconClass =
  "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ff7a00]";
const uploadTextareaIconClass =
  "pointer-events-none absolute left-4 top-4 h-5 w-5 text-[#ff7a00]";



const readOwnerApprovalStatuses = () => {

  try {

    const parsed = JSON.parse(localStorage.getItem(OWNER_APPROVAL_STATUS_KEY) || "{}");

    return parsed && typeof parsed === "object" ? parsed : {};

  } catch {

    return {};

  }

};



const getStoredOwnerApprovalStatus = (ownerId) => {

  const approvalStatuses = readOwnerApprovalStatuses();

  const ownerEmail = String(localStorage.getItem("ownerEmail") || "").toLowerCase().trim();

  return (

    approvalStatuses[String(ownerId)] ||

    (ownerEmail ? approvalStatuses[`email:${ownerEmail}`] : "") ||

    ""

  );

};



const writeStoredOwnerApprovalStatus = (ownerId, status) => {

  const approvalStatuses = readOwnerApprovalStatuses();

  const ownerEmail = String(localStorage.getItem("ownerEmail") || "").toLowerCase().trim();

  if (ownerId) approvalStatuses[String(ownerId)] = status;

  if (ownerEmail) approvalStatuses[`email:${ownerEmail}`] = status;

  localStorage.setItem(OWNER_APPROVAL_STATUS_KEY, JSON.stringify(approvalStatuses));

};



const readPropertyPaymentStatuses = () => {

  try {

    const parsed = JSON.parse(localStorage.getItem(PROPERTY_PAYMENT_STATUS_KEY) || "{}");

    return parsed && typeof parsed === "object" ? parsed : {};

  } catch {

    return {};

  }

};



const getStoredPropertyPaymentStatus = (propertyId) => {

  if (!propertyId) return "";

  return String(readPropertyPaymentStatuses()[String(propertyId)] || "").toUpperCase();

};



const writeStoredPropertyPaymentStatus = (propertyId, status) => {

  if (!propertyId) return;

  const paymentStatuses = readPropertyPaymentStatuses();

  paymentStatuses[String(propertyId)] = status;

  localStorage.setItem(PROPERTY_PAYMENT_STATUS_KEY, JSON.stringify(paymentStatuses));

};



const getOwnerDisplayNameFromStorage = () => {

  const ownerName = String(localStorage.getItem(OWNER_NAME_KEY) || "").trim();

  if (ownerName) return ownerName;



  const ownerEmail = String(localStorage.getItem("ownerEmail") || "").toLowerCase().trim();

  if (!ownerEmail) return "Property Owner";



  try {

    const namesByEmail = JSON.parse(localStorage.getItem(OWNER_NAME_BY_EMAIL_KEY) || "{}");

    return String(namesByEmail?.[ownerEmail] || "").trim() || "Property Owner";

  } catch {

    return "Property Owner";

  }

};



const rememberOwnerDisplayName = (decoded) => {

  const ownerName = String(decoded?.fullName || decoded?.name || "").trim();

  const ownerEmail = String(decoded?.sub || "").toLowerCase().trim();

  if (!ownerName) return "";



  localStorage.setItem(OWNER_NAME_KEY, ownerName);

  if (ownerEmail) {

    let namesByEmail = {};

    try {

      namesByEmail = JSON.parse(localStorage.getItem(OWNER_NAME_BY_EMAIL_KEY) || "{}");

    } catch {

      namesByEmail = {};

    }

    namesByEmail[ownerEmail] = ownerName;

    localStorage.setItem(OWNER_NAME_BY_EMAIL_KEY, JSON.stringify(namesByEmail));

  }



  return ownerName;

};



const PropertyThumbnail = ({ imageNames, title }) => {

  const candidates = (Array.isArray(imageNames) ? imageNames : [imageNames])

    .flatMap(getImageCandidates);

  const [candidateIndex, setCandidateIndex] = useState(0);

  const imageUrl = candidates[candidateIndex] || IMAGE_FALLBACK;



  return (

    <img

      src={imageUrl}

      alt={title || "Property"}

      className="w-full h-full object-cover"

      onError={(event) => {

        if (candidateIndex < candidates.length - 1) {

          setCandidateIndex((current) => current + 1);

          return;

        }

        event.currentTarget.src = IMAGE_FALLBACK;

      }}

    />

  );

};



const FACILITY_OPTIONS = [

  "LANDSCAPE_GARDEN",

  "GATED_COMMUNITY",

  "WATER_SUPPLY_24X7",

  "WIFI_SUPPLY_24X7",

  "CCTV_SECURITY",

  "CHILDREN_PLAY_AREA",

  "VISITOR_PARKING",

  "POWER_BACKUP",

  "LIFT_FACILITY",

  "GYMNASIUM",

  "SWIMMING_POOL",

];



const formatFacilityName = (facilityName) =>

  String(facilityName || "")

    .toLowerCase()

    .split("_")

    .map((word) => (word === "24x7" ? "24x7" : word.charAt(0).toUpperCase() + word.slice(1)))

    .join(" ");



const mergeFacilitiesWithBackendOptions = (facilitiesData = []) => {

  const backendStatusByName = new Map(

    facilitiesData

      .filter((facility) => FACILITY_OPTIONS.includes(facility?.facilityName))

      .map((facility) => [facility.facilityName, facility.status])

  );



  return FACILITY_OPTIONS.map((facilityName) => ({

    facilityName,

    status: backendStatusByName.get(facilityName) === "ACTIVE" ? "ACTIVE" : "INACTIVE",

  }));

};



const createFacilitiesPayload = (selectedFacilities) =>

  FACILITY_OPTIONS.map((facilityName) => ({

    facilityName,

    status: selectedFacilities.has(facilityName) ? "ACTIVE" : "INACTIVE",

  }));



const PropertyOwnerDashboard = () => {

  const [formData, setFormData] = useState({

    propertyTitle: "",

    price: "",

    propertyType: "",

    pgType: "",

    apartmentName: "",

    location: "",

    city: "",

    address: "",

    state: "",

    pincode: "",

    mobileNumber: "",

    description: "",

    bhkType: "",

    furnishing: "",

    carpetArea: "",

  });



  const [images, setImages] = useState([]);

  const [imagePreviews, setImagePreviews] = useState([]);

  const [properties, setProperties] = useState([]);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [editingProperty, setEditingProperty] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [premiumLoading, setPremiumLoading] = useState(false);

  const [pendingPropertyId, setPendingPropertyId] = useState(null);

  const [ownerPremiumStatus, setOwnerPremiumStatus] = useState("NONE");

  const [ownerApprovalStatus, setOwnerApprovalStatus] = useState("");

  const [ownerDisplayName, setOwnerDisplayName] = useState(getOwnerDisplayNameFromStorage);

  const [propertyFetchMessage, setPropertyFetchMessage] = useState("");

  const [areaOptions, setAreaOptions] = useState([]);

  const [areaLoading, setAreaLoading] = useState(false);

  const [areaMessage, setAreaMessage] = useState("");

  const [resolvedCity, setResolvedCity] = useState("");

  const latestPreviewsRef = useRef([]);

  const [ownerId, setOwnerId] = useState(null);

 

  const [ownerSessionMessage, setOwnerSessionMessage] = useState("");

  const [manualOwnerId, setManualOwnerId] = useState("");

  const [showManualIdInput, setShowManualIdInput] = useState(false);



  const [chatOpen, setChatOpen] = useState(false);

  const [chatCount, setChatCount] = useState(0);



  const [facilities, setFacilities] = useState(() => mergeFacilitiesWithBackendOptions());

  const [facilitiesLoading, setFacilitiesLoading] = useState(false);

  const [selectedFacilities, setSelectedFacilities] = useState(new Set());



  const navigate = useNavigate();



  const resolveOwnerIdFromToken = (decoded) => {

    if (!decoded || typeof decoded !== "object") return null;



    const directCandidates = [

      decoded.ownerId,

      decoded.ownerID,

      decoded.owner_id,

      decoded.id,

      decoded.userId,

      decoded.userID,

      decoded.subId,

      decoded.sub,

    ];



    for (const candidate of directCandidates) {

      const numeric = Number(candidate);

      if (Number.isFinite(numeric) && numeric > 0) return numeric;

    }



    for (const [key, value] of Object.entries(decoded)) {

      if (!/id/i.test(key)) continue;

      const numeric = Number(value);

      if (Number.isFinite(numeric) && numeric > 0) return numeric;

    }



    return null;

  };



const handleLogout = () => {

  localStorage.removeItem("ownerToken");

  localStorage.removeItem("ownerId");

  localStorage.removeItem(OWNER_NAME_KEY);

  localStorage.setItem("ownerLogout", Date.now());

  const channel = new BroadcastChannel("owner-auth");

  channel.postMessage("logout");

  navigate("/login");

};



const handleManualOwnerIdSubmit = () => {

  const numericId = Number(manualOwnerId);

  if (!Number.isFinite(numericId) || numericId <= 0) {

    toast.error("Please enter a valid owner ID");

    return;

  }

  setOwnerId(numericId);

  localStorage.setItem("ownerId", String(numericId));

  

  // Also save by email if available

  const token = localStorage.getItem("ownerToken");

  if (token) {

    try {

      const decoded = jwtDecode(token);

      const ownerEmail = String(decoded?.sub || "").toLowerCase().trim();

      if (ownerEmail) {

        let ownerIdMap = {};

        try {

          ownerIdMap = JSON.parse(localStorage.getItem(OWNER_ID_BY_EMAIL_KEY) || "{}");

        } catch {

          ownerIdMap = {};

        }

        ownerIdMap[ownerEmail] = numericId;

        localStorage.setItem(OWNER_ID_BY_EMAIL_KEY, JSON.stringify(ownerIdMap));

        localStorage.setItem(`ownerId:${ownerEmail}`, String(numericId));

      }

    } catch {
}

  }

  

  setOwnerSessionMessage("");

  setShowManualIdInput(false);

  setManualOwnerId("");

  toast.success("Owner ID set successfully");

  };




  const imageLabels = [

    "Door (Closed)",

    "Hall",

    "Bedroom",

    "Balcony",

    "Kitchen",

    "Bathroom 1",

    "Bathroom 2",

    "Parking",

    "Society Image 1",

    "Society Image 2",

  ];



  useEffect(() => {

    const token = localStorage.getItem("ownerToken");

    if (!token) return;

    try {

      const decoded = jwtDecode(token);

      setOwnerDisplayName(rememberOwnerDisplayName(decoded) || getOwnerDisplayNameFromStorage());

      const ownerEmail = String(decoded?.sub || "").toLowerCase().trim();

      if (ownerEmail) {

        localStorage.setItem("ownerEmail", ownerEmail);

      }

      const tokenOwnerId = resolveOwnerIdFromToken(decoded);

      if (tokenOwnerId) {

        setOwnerId(Number(tokenOwnerId));

        localStorage.setItem("ownerId", String(Number(tokenOwnerId)));

        if (ownerEmail) {

          let ownerIdMap = {};

          try {

            ownerIdMap = JSON.parse(localStorage.getItem(OWNER_ID_BY_EMAIL_KEY) || "{}");

          } catch {

            ownerIdMap = {};

          }

          ownerIdMap[ownerEmail] = Number(tokenOwnerId);

          localStorage.setItem(OWNER_ID_BY_EMAIL_KEY, JSON.stringify(ownerIdMap));

          localStorage.setItem(`ownerId:${ownerEmail}`, String(Number(tokenOwnerId)));

        }

        setOwnerSessionMessage("");

        return;

      }



      if (ownerEmail) {

        let ownerIdMap = {};

        try {

          ownerIdMap = JSON.parse(localStorage.getItem(OWNER_ID_BY_EMAIL_KEY) || "{}");

        } catch {

          ownerIdMap = {};

        }

        const mappedOwnerId = Number(

          ownerIdMap?.[ownerEmail] || localStorage.getItem(`ownerId:${ownerEmail}`)

        );

        if (Number.isFinite(mappedOwnerId) && mappedOwnerId > 0) {

          setOwnerId(mappedOwnerId);

          localStorage.setItem("ownerId", String(mappedOwnerId));

          setOwnerSessionMessage("");

          return;

        }

      }



      setOwnerId(null);

      localStorage.removeItem("ownerId");

      setOwnerSessionMessage(

        "Owner profile id is not available from the current backend login response. New owner registrations are saved automatically; existing owners need a backend login response that includes ownerId."

      );

      return;

    } catch {

      setOwnerId(null);

      localStorage.removeItem("ownerId");

      setOwnerSessionMessage("Invalid owner session. Please login again.");

    }

  }, [navigate]);



  useEffect(() => {

    if (!ownerId) return;

    const syncOwnerApprovalStatus = () => {

      const status = getStoredOwnerApprovalStatus(ownerId);

      setOwnerApprovalStatus(status);

      if (status) setOwnerPremiumStatus(status);

    };



    syncOwnerApprovalStatus();

    setProperties([]);

    fetchProperties();

    fetchOwnerPremiumStatus();



    window.addEventListener("storage", syncOwnerApprovalStatus);



    return () => {

      window.removeEventListener("storage", syncOwnerApprovalStatus);

    };

  }, [ownerId]);



  useEffect(() => {

    latestPreviewsRef.current = imagePreviews;

  }, [imagePreviews]);



  useEffect(() => {

    return () => {

      latestPreviewsRef.current.forEach((preview) => {

        if (preview) URL.revokeObjectURL(preview);

      });

    };

  }, []);



  const clearSelectedImages = () => {

    imagePreviews.forEach((preview) => {

      if (preview) URL.revokeObjectURL(preview);

    });

    setImages([]);

    setImagePreviews([]);

  };



  const parseDoctypeImages = (value) => {

    return parseImageList(value);

  };



  const getDetailImages = (detailData) => [

    detailData?.coverImageData,

    detailData?.coverImageBase64,

    detailData?.imageData,

    detailData?.imageBase64,

    detailData?.base64Image,

    detailData?.imageContent,

    detailData?.coverImage,

    detailData?.imagePath,

    detailData?.imageName,

    ...(Array.isArray(detailData?.doctypeImageBase64List)
      ? detailData.doctypeImageBase64List
      : []),

    ...parseDoctypeImages(detailData?.doctypeImages),

  ].filter(Boolean);



  const getPropertyImageNames = (property) => [

    property?.coverImageData,

    property?.coverImageBase64,

    property?.imageData,

    property?.imageBase64,

    property?.base64Image,

    property?.imageContent,

    property?.coverImage,

    property?.imagePath,

    property?.imageName,

    ...(Array.isArray(property?.doctypeImageBase64List)
      ? property.doctypeImageBase64List
      : []),

    ...parseDoctypeImages(property?.doctypeImages),

    ...(Array.isArray(property?.images) ? property.images : []),

  ].filter(Boolean);



  const normalizePropertyForDashboard = (property) => {

    const detailImages = getDetailImages(property || {});

    const propertyId = property?.id || property?.propertyId;

    const backendPaymentStatus = String(property?.paymentStatus || "").toUpperCase();

    if (
      propertyId &&
      (backendPaymentStatus === "APPROVED" ||
        backendPaymentStatus === "REJECTED" ||
        backendPaymentStatus === "PENDING")
    ) {
      writeStoredPropertyPaymentStatus(propertyId, backendPaymentStatus);
    }

    return {

      ...property,

      images: detailImages,

    };

  };



  const fetchProperties = async ({ preserveCurrent = false, silent = false } = {}) => {

    if (!ownerId) return;

    try {

      if (!silent) setLoading(true);

      setPropertyFetchMessage("");



      const response = await ownerApi.getOwnerProperties(ownerId);

      // Handle new response structure with properties wrapped in an object

      let apiProperties = [];

      if (Array.isArray(response?.data?.data?.properties)) {

        apiProperties = response.data.data.properties;

      } else if (Array.isArray(response?.data?.properties)) {

        apiProperties = response.data.properties;

      } else if (Array.isArray(response?.data?.data)) {

        apiProperties = response.data.data;

      } else if (Array.isArray(response?.data)) {

        apiProperties = response.data;

      }



      const fetchedProperties = apiProperties

        .filter((property) => String(property?.status || "").toUpperCase() !== "INACTIVE")

        .map(normalizePropertyForDashboard);



      if (fetchedProperties.length === 0) {

        setProperties([]);

        setPropertyFetchMessage("No properties found in the database. Add a property to get started.");

        return;

      }



      setProperties(fetchedProperties);

      setPropertyFetchMessage("");

    } catch (err) {
if (!preserveCurrent) {

        setProperties([]);

      }

      setPropertyFetchMessage(

        "Could not fetch properties from the database. Please check your owner session and backend API."

      );

    } finally {

      if (!silent) setLoading(false);

    }

  };



  const fetchOwnerPremiumStatus = async ({ silent = false } = {}) => {

    if (!ownerId) return;

    try {

      const response = await ownerApi.getOwnerProperties(ownerId);

      const premiumStatus = response?.data?.data?.premiumStatus || response?.data?.premiumStatus;

      const premiumActive = response?.data?.data?.premiumActive || response?.data?.premiumActive;



      if (premiumStatus) {

        const status = String(premiumStatus).toUpperCase();

        if (status === "APPROVED" || status.includes("APPROVED")) {

          writeStoredOwnerApprovalStatus(ownerId, "APPROVED");

          setOwnerApprovalStatus("APPROVED");

          setOwnerPremiumStatus("APPROVED");

        } else if (status === "REJECTED" || status.includes("REJECTED")) {

          writeStoredOwnerApprovalStatus(ownerId, "REJECTED");

          setOwnerApprovalStatus("REJECTED");

          setOwnerPremiumStatus("REJECTED");

        } else if (status === "PENDING" || status.includes("PENDING")) {

          writeStoredOwnerApprovalStatus(ownerId, "PENDING");

          setOwnerApprovalStatus("PENDING");

          setOwnerPremiumStatus("PENDING");

        }

      }

    } catch (err) {

      if (!silent) {
}

    }

  };



  const fetchFacilities = async (propertyId) => {

    if (!ownerId || !propertyId) {

      setFacilities(mergeFacilitiesWithBackendOptions());

      setSelectedFacilities(new Set());

      return;

    }

    try {

      setFacilitiesLoading(true);

      const response = await ownerApi.getFacilities(ownerId, propertyId);

      // Handle both response structures: direct array or nested under data key

      let facilitiesData = response?.data?.data || response?.data || [];

      // Ensure it's an array

      if (!Array.isArray(facilitiesData)) {

        facilitiesData = [];

      }

      const mergedFacilities = mergeFacilitiesWithBackendOptions(facilitiesData);

      setFacilities(mergedFacilities);



      // Set selected facilities based on ACTIVE status

      const activeFacilities = mergedFacilities

        .filter((f) => f.status === "ACTIVE")

        .map((f) => f.facilityName);

      setSelectedFacilities(new Set(activeFacilities));

    } catch (err) {
setFacilities(mergeFacilitiesWithBackendOptions());

      setSelectedFacilities(new Set());

    } finally {

      setFacilitiesLoading(false);

    }

  };



  const handleFacilityToggle = (facilityValue) => {

    const newSelected = new Set(selectedFacilities);

    if (newSelected.has(facilityValue)) {

      newSelected.delete(facilityValue);

    } else {

      newSelected.add(facilityValue);

    }

    setSelectedFacilities(newSelected);

  };



  const saveFacilitiesForProperty = async (propertyId) => {

    if (!ownerId || !propertyId) return;

    const facilitiesPayload = createFacilitiesPayload(selectedFacilities);

    await ownerApi.saveFacilities(ownerId, propertyId, facilitiesPayload);

  };



  const resolvePropertyApprovalStatus = (property) => {

    const propertyId = property?.id || property?.propertyId;

    // Backend property payment status takes precedence over local cache.
    const propertyPaymentStatus = String(property?.paymentStatus || "").toUpperCase();

    if (
      propertyPaymentStatus === "APPROVED" ||
      propertyPaymentStatus === "REJECTED" ||
      propertyPaymentStatus === "PENDING"
    ) {
      return propertyPaymentStatus;
    }

    const storedPropertyStatus = getStoredPropertyPaymentStatus(propertyId);

    if (storedPropertyStatus === "PENDING" || storedPropertyStatus === "REJECTED") {

      return storedPropertyStatus;

    }

    // Do not use property.premiumStatus here. Backend may copy owner-level
    // premium state into this field, which can incorrectly mark new properties
    // as APPROVED/PENDING before this property's payment flow starts.

    const backendStatus = String(property?.status || "").toUpperCase();

    if (backendStatus === "PENDING") return "PAYMENT_DUE";

    if (backendStatus === "INACTIVE") return "REJECTED";

    if (backendStatus === "ACTIVE") return "PAYMENT_DUE";

    return "PAYMENT_DUE";

  };



  const getApprovalBadgeClasses = (status) => {

    if (status === "APPROVED") {

      return "bg-green-100 text-green-700 border border-green-200";

    }

    if (status === "REJECTED") {

      return "bg-red-100 text-red-700 border border-red-200";

    }

    if (status === "PAYMENT_DUE") {

      return "bg-orange-100 text-orange-700 border border-orange-200";

    }

    return "bg-amber-100 text-amber-700 border border-amber-200";

  };



  const loadImageElement = (file) =>

    new Promise((resolve, reject) => {

      const imageUrl = URL.createObjectURL(file);

      const image = new Image();

      image.onload = () => {

        URL.revokeObjectURL(imageUrl);

        resolve(image);

      };

      image.onerror = () => {

        URL.revokeObjectURL(imageUrl);

        reject(new Error("Could not read selected image"));

      };

      image.src = imageUrl;

    });



  const canvasToBlob = (canvas, quality) =>

    new Promise((resolve, reject) => {

      canvas.toBlob(

        (blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare image"))),

        "image/jpeg",

        quality

      );

    });



  const prepareImageForBackend = async (file, index, suffix = "") => {

    const image = await loadImageElement(file);

    const maxDimension = 960;

    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));

    const width = Math.max(1, Math.round(image.width * scale));

    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");

    canvas.width = width;

    canvas.height = height;

    const context = canvas.getContext("2d");

    context.fillStyle = "#fff";

    context.fillRect(0, 0, width, height);

    context.drawImage(image, 0, 0, width, height);



    let blob = null;

    for (const quality of [0.72, 0.62, 0.52, 0.42]) {

      blob = await canvasToBlob(canvas, quality);

      if (blob.size <= 700 * 1024) break;

    }



    const originalName = file.name.toLowerCase();

    const baseName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]/g, "-");

    const uniqueSuffix = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}${suffix}`;

    return new File([blob], `${baseName || "property-image"}-${uniqueSuffix}.jpg`, {

      type: "image/jpeg",

      lastModified: Date.now(),

    });

  };



  // Validate image

  const validateImage = (file) => {

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!validTypes.includes(file.type)) {

      throw new Error("Only JPG, JPEG, and PNG images are allowed");

    }

    if (file.size > 20 * 1024 * 1024) {

      throw new Error("Image size must be less than 20MB");

    }

    return true;

  };



  // Handle image selection

  const handleImageSelect = async (index, e) => {

    const file = e.target.files[0];

    if (!file) return;



    try {

      validateImage(file);

      const backendReadyFile = await prepareImageForBackend(file, index);



      const newImages = [...images];

      const newPreviews = [...imagePreviews];



      if (newPreviews[index]) {

        URL.revokeObjectURL(newPreviews[index]);

      }



      newImages[index] = backendReadyFile;

      newPreviews[index] = URL.createObjectURL(backendReadyFile);



      setImages(newImages);

      setImagePreviews(newPreviews);

    } catch (err) {

      toast.error(err.message);

    } finally {

      // Allow selecting the same file again by resetting input value.

      e.target.value = "";

    }

  };



  // Allow removing a selected image before upload

  const handleRemoveImage = (index) => {

    if (!imagePreviews[index]) return;



    const newImages = [...images];

    const newPreviews = [...imagePreviews];

    URL.revokeObjectURL(newPreviews[index]);

    newImages[index] = undefined;

    newPreviews[index] = undefined;

    setImages(newImages);

    setImagePreviews(newPreviews);

  };



  const handleCityChange = async (selectedCity) => {

    setFormData((current) => ({

      ...current,

      city: selectedCity,

      location: "",

      pincode: "",

      state: selectedCity ? PROPERTY_STATE : "",

    }));

    setAreaOptions([]);

    setAreaMessage("");

    setResolvedCity("");



    if (!selectedCity) return;



    try {

      setAreaLoading(true);

      const response = await ownerApi.getAreasByCity(selectedCity.trim());

      const areas = Array.isArray(response?.data?.data) ? response.data.data : [];

      setAreaOptions(areas);

      setResolvedCity(selectedCity);

      if (areas.length === 0) {

        setAreaMessage("No areas found for this city.");

      }


    } catch (error) {

      setAreaOptions([]);

      setResolvedCity(selectedCity);

      setAreaMessage(

        error?.response?.data?.message ||

          "Could not load areas for this city."

      );

    } finally {

      setAreaLoading(false);

    }

  };



  const handleLocationChange = async (selectedLocation) => {

    setFormData((current) => ({

      ...current,

      location: selectedLocation,

      pincode: "",

    }));

    setAreaMessage("");



    if (!formData.city || !selectedLocation) return;



    try {

      const city = (resolvedCity || formData.city).trim();

      const response = await ownerApi.getPincode(city, selectedLocation);

      const pincode = response?.data?.data || "";



      if (!pincode) throw new Error("Pincode not found");

      setResolvedCity(city);

      setFormData((current) => ({

        ...current,

        location: selectedLocation,

        pincode,

      }));

    } catch (error) {

      setFormData((current) => ({

        ...current,

        location: selectedLocation,

        pincode: "",

      }));

      setAreaMessage(error?.response?.data?.message || "Could not auto-fill pincode.");

    }

  };



  const getApiErrorMessage = (error, fallback) => {

    const payload = error?.response?.data;

    if (typeof payload?.message === "string" && payload.message.trim()) {

      return payload.message;

    }

    if (payload?.data && typeof payload.data === "object") {

      const firstValidationMessage = Object.values(payload.data).find(Boolean);

      if (firstValidationMessage) return firstValidationMessage;

    }

    return error?.message || fallback;

  };



  const getPropertyValidationError = ({ requireImages = false } = {}) => {

    const title = formData.propertyTitle.trim();

    const city = (resolvedCity || formData.city).trim();

    const state = formData.state.trim();

    const pincode = formData.pincode.trim();

    const mobileNumber = formData.mobileNumber.trim();

    if (!title) return "Title is required";

    if (/\d/.test(title)) return "Title should not contain numbers";

    if (!formData.price) return "Price is required";

    if (!Number.isFinite(Number(formData.price))) return "Price must be a valid number";

    if (Number(formData.price) <= 0) return "Price must be greater than 0";

    if (!formData.location.trim()) return "Location is required";

    if (!formData.address.trim()) return "Address is required";

    if (!city) return "City is required";

    if (!/^[A-Za-z ]+$/.test(city)) return "City must contain only letters";

    if (!state) return "State is required";

    if (!/^[A-Za-z ]+$/.test(state)) return "State must contain only letters";

    if (!pincode) return "Pincode is required";

    if (!/^\d{6}$/.test(pincode)) return "Pincode must be 6 digits";

    if (!formData.description.trim()) return "Description is required";

    if (!formData.propertyType) return "Property type is required";

    if (!formData.bhkType) return "BHK type is required";

    if (!formData.furnishing) return "Furnishing is required";

    if (!String(formData.carpetArea).trim()) return "Carpet area is required";

    if (!mobileNumber) return "Mobile number is required";

    if (!/^\d{10}$/.test(mobileNumber)) return "Mobile number must be 10 digits";

    if (!formData.apartmentName.trim()) return "Apartment name is required";



    if (requireImages) {

      const uploadedImages = images.filter((img) => img !== undefined);

      if (uploadedImages.length < 4) return "Minimum 4 images are required";

      if (!images[0]) return "Door image is required and will be used as the cover photo";

    }



    return "";

  };



  const validateBeforeUpload = () => {

    const validationError = getPropertyValidationError({ requireImages: true });

    if (validationError) {

      toast.error(validationError);

      return false;

    }



    return true;

  };



  const handleOpenPreview = () => {

    if (!validateBeforeUpload()) return;

    setShowPreviewModal(true);

  };



  // Handle form submission after preview confirmation

  const handleSubmit = async () => {

    if (uploading || loading) return;

    const uploadedImages = [images[0], ...images.slice(1).filter(img => img !== undefined)].filter(Boolean);



    let createdPropertyId = null;

    try {

      setLoading(true);

      setUploading(true);

      setShowPreviewModal(false);



      // Prepare property data

      const propertyData = {

        title: formData.propertyTitle,

        price: parseFloat(formData.price),

        propertyType: formData.propertyType,

        pgType: formData.pgType || null,

        location: formData.location,

        city: resolvedCity || formData.city,

        address: formData.address,

        state: formData.state || PROPERTY_STATE,

        pincode: formData.pincode,

        mobileNumber: formData.mobileNumber,

        description: formData.description,

        bhkType: formData.bhkType,

        furnishing: formData.furnishing,

        carpetArea: String(formData.carpetArea),

        apartmentName: formData.apartmentName,

      };



      // Add property

      const propertyResponse = await ownerApi.addProperty(ownerId, propertyData);

      

      if (propertyResponse.data && propertyResponse.data.data) {

        const propertyId = propertyResponse.data.data.id;

        createdPropertyId = propertyId;



        const buildImageFormData = (imagesToUpload) => {

          const formDataImages = new FormData();

          imagesToUpload.forEach((image) => {

            if (!image) return;

            formDataImages.append("files", image, image.name);

          });

          return formDataImages;

        };



        const uploadPreparedImages = async (imagesToUpload) => {

          const [doorImage, ...otherImages] = imagesToUpload;



          await ownerApi.uploadPropertyImages(

            propertyId,

            buildImageFormData([doorImage])

          );



          if (otherImages.length === 0) return;



          try {

            await ownerApi.uploadPropertyImages(

              propertyId,

              buildImageFormData(otherImages)

            );

          } catch (error) {
}

        };



        try {

          setFacilitiesLoading(true);

          await saveFacilitiesForProperty(propertyId);

        } catch (facilityErr) {
toast.error(facilityErr?.response?.data?.message || "Property added, but facilities were not saved");

        } finally {

          setFacilitiesLoading(false);

        }



        try {

          await uploadPreparedImages(uploadedImages);

          const responseMessage =

            propertyResponse?.data?.message || "Property added successfully!";

          toast.success(responseMessage);

        } catch (uploadErr) {
try {

            const retryFiles = await Promise.all(

              uploadedImages.map((image, index) =>

                prepareImageForBackend(image, index, "-retry")

              )

            );

            await uploadPreparedImages(retryFiles);

            toast.success("Images uploaded after retry with optimized size.");

          } catch (retryErr) {
toast.error(

              retryErr?.response?.data?.message ||

                retryErr?.message ||

                "Property added, but image upload failed"

            );

          }

        }

        

        setPropertyFetchMessage("");

        toast.info("Property uploaded. You can complete payment anytime from this property card.");



        // Reset form

        setFormData({

          propertyTitle: "",

          price: "",

          propertyType: "",

          pgType: "",

          apartmentName: "",

          location: "",

          city: "",

          address: "",

          state: "",

          pincode: "",

          mobileNumber: "",

          description: "",

          bhkType: "",

          furnishing: "",

          carpetArea: "",

        });

        setFacilities(mergeFacilitiesWithBackendOptions());

        setSelectedFacilities(new Set());

        clearSelectedImages();



        await fetchProperties({ preserveCurrent: true });

      }

    } catch (err) {
if (createdPropertyId) {

        toast.error("Property added, but something failed after creation");

      } else {

        toast.error(getApiErrorMessage(err, "Failed to add property"));

      }

    } finally {

      setLoading(false);

      setUploading(false);

    }

  };



  // Handle delete property

  const handleDeleteProperty = async (propertyId) => {

    if (!window.confirm("Are you sure you want to delete this property?")) {

      return;

    }



    try {

      const response = await ownerApi.deleteProperty(propertyId);

      toast.success(response?.data?.message || "Property deactivated successfully");

      await fetchProperties({ preserveCurrent: true });

    } catch (err) {
toast.error(err.response?.data?.message || err.message || "Failed to delete property");

    }

  };



  const handleOpenPropertyPayment = (property) => {

    const propertyId = property?.id || property?.propertyId;

    if (!propertyId) {

      toast.error("Property ID is missing for this listing.");

      return;

    }

    setPendingPropertyId(propertyId);

    setShowPremiumModal(true);

  };



  const handleClosePremiumModal = () => {

    setShowPremiumModal(false);

    setPendingPropertyId(null);

  };



  // Handle edit property

  const handleEditProperty = async (property) => {

    const propertyId = property.id || property.propertyId;

    setEditingProperty(property);

    setFormData({

      propertyTitle: property.title || "",

      price: property.price || "",

      propertyType: property.propertyType || "",

      pgType: property.pgType || "",

      apartmentName: property.apartmentName || "",

      location: property.location || "",

      city: property.city || "",

      address: property.address || "",

      state: property.state || PROPERTY_STATE,

      pincode: property.pincode || "",

      mobileNumber: property.mobileNumber || "",

      description: property.description || "",

      bhkType: property.bhkType || "",

      furnishing: property.furnishing || "",

      carpetArea: property.carpetArea || "",

    });

    setResolvedCity(property.city || "");

    setAreaOptions([]);

    setAreaMessage("");

    if (property.city) {

      try {

        setAreaLoading(true);

        const response = await ownerApi.getAreasByCity(property.city);

        const areas = Array.isArray(response?.data?.data) ? response.data.data : [];

        setAreaOptions(property.location && !areas.includes(property.location)

          ? [property.location, ...areas]

          : areas);

      } catch (error) {

        setAreaMessage(error?.response?.data?.message || "Could not load areas for this city.");

      } finally {

        setAreaLoading(false);

      }

    }

    fetchFacilities(propertyId);

    setShowEditModal(true);

  };



  // Handle update property

  const handleUpdateProperty = async (e) => {

    e.preventDefault();



    if (!editingProperty) return;



    const validationError = getPropertyValidationError();

    if (validationError) {

      toast.error(validationError);

      return;

    }



    try {

      setLoading(true);



      const propertyData = {

        title: formData.propertyTitle,

        price: parseFloat(formData.price),

        propertyType: formData.propertyType,

        pgType: formData.pgType || null,

        location: formData.location,

        city: resolvedCity || formData.city,

        address: formData.address,

        state: formData.state || PROPERTY_STATE,

        pincode: formData.pincode,

        mobileNumber: formData.mobileNumber,

        description: formData.description,

        bhkType: formData.bhkType,

        furnishing: formData.furnishing,

        carpetArea: String(formData.carpetArea),

        apartmentName: formData.apartmentName,

      };



      const editingPropertyId = editingProperty.id || editingProperty.propertyId;

      const response = await ownerApi.updateProperty(editingPropertyId, propertyData);

      await saveFacilitiesForProperty(editingPropertyId);

      toast.success(response?.data?.message || "Property updated successfully");

      setShowEditModal(false);

      setEditingProperty(null);

      // Reset form data after update

      setFormData({

        propertyTitle: "",

        price: "",

        propertyType: "",

        pgType: "",

        apartmentName: "",

        location: "",

        city: "",

        address: "",

        state: "",

        pincode: "",

        mobileNumber: "",

        description: "",

        bhkType: "",

        furnishing: "",

        carpetArea: "",

      });

      setAreaOptions([]);

      setAreaMessage("");

      setResolvedCity("");

      setSelectedFacilities(new Set());

      clearSelectedImages();

      await fetchProperties({ preserveCurrent: true });

    } catch (err) {
toast.error(getApiErrorMessage(err, "Failed to update property"));

    } finally {

      setLoading(false);

    }

  };



  // Close edit modal

  const handleCloseEditModal = () => {

    setShowEditModal(false);

    setEditingProperty(null);

    setFormData({

      propertyTitle: "",

      price: "",

      propertyType: "",

      pgType: "",

      apartmentName: "",

      location: "",

      city: "",

      address: "",

      state: "",

      pincode: "",

      mobileNumber: "",

      description: "",

      bhkType: "",

      furnishing: "",

      carpetArea: "",

    });

    setFacilities(mergeFacilitiesWithBackendOptions());

    setSelectedFacilities(new Set());

  };



  const handlePremiumDone = async () => {

    if (!ownerId) {

      toast.error("Owner session missing. Please login again.");

      return;

    }



    try {

      setPremiumLoading(true);

      const response = await ownerApi.buyPremium(ownerId, pendingPropertyId);

      const status =

        response?.data?.data?.status ||

        response?.data?.status ||

        "PENDING";

      const nextStatus = String(status).toUpperCase() === "APPROVED" ? "APPROVED" : "PENDING";

      writeStoredOwnerApprovalStatus(ownerId, nextStatus);

      writeStoredPropertyPaymentStatus(pendingPropertyId, nextStatus);

      setOwnerPremiumStatus(nextStatus);

      setOwnerApprovalStatus(nextStatus);

      toast.success(

        `Payment request submitted for property ${pendingPropertyId || ''}. Admin can now approve or reject your property.`

      );

      setShowPremiumModal(false);

      setPendingPropertyId(null);

      await fetchProperties();

    } catch (err) {

      toast.error(err?.response?.data?.message || "Failed to submit premium request");

    } finally {

      setPremiumLoading(false);

    }

  };



  return (
    <div className="min-h-screen bg-[#f7f0e8] flex flex-col">
      {/* Header */}

      <div className="flex justify-between items-center gap-2 px-3 sm:px-5 md:px-6 py-3 sm:py-4 bg-black/90 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">

        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">

          <BrandLogo size="sm" />

        </div>



        <div className="flex items-center gap-2 sm:gap-4 text-sm flex-shrink-0">

          <span className="hidden sm:block text-white font-bold max-w-[120px] md:max-w-none truncate">

            {ownerDisplayName}

          </span>

          <button

            onClick={() => setChatOpen(true)}

            className="relative text-white hover:text-[#ff7438]"

            title="Messages"

          >

            <MessageCircle className="w-6 h-6" />

            {chatCount > 0 && (

              <span className="absolute -top-1 -right-1 bg-[#f97316] text-white text-xs rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">

                {chatCount}

              </span>

            )}

          </button>

          <button 

          onClick={handleLogout}

          className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-[16px] sm:rounded-[24px] shadow-[0_12px_24px_rgba(220,38,38,0.28)] transition-all duration-300 active:scale-95">

            <LogOut size={18} />

            <span className="hidden sm:inline">Logout</span>

          </button>

        </div>

      </div>



      <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 md:px-6 py-5 sm:py-8 flex-grow">

        <div>

          <h1 className="text-3xl font-bold text-[#1a1a1a]">

            Dashboard

          </h1>

          <p className="text-[#3d3127] mt-1">

            Manage property listings

          </p>

        </div>



        {ownerSessionMessage && (

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">

            <p className="text-sm text-amber-800 mb-3">

              {ownerSessionMessage}

            </p>

            {!showManualIdInput && (

              <button

                onClick={() => setShowManualIdInput(true)}

                className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-md transition-colors"

              >

                Enter Owner ID Manually

              </button>

            )}

            {showManualIdInput && (

              <div className="flex gap-2 mt-2">

                <input

                  type="number"

                  value={manualOwnerId}

                  onChange={(e) => setManualOwnerId(e.target.value)}

                  placeholder="Enter your Owner ID"

                  className="flex-1 px-3 py-1.5 border border-amber-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"

                />

                <button

                  onClick={handleManualOwnerIdSubmit}

                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-md text-sm transition-colors"

                >

                  Set ID

                </button>

                <button

                  onClick={() => {

                    setShowManualIdInput(false);

                    setManualOwnerId("");

                  }}

                  className="bg-[#d8c2a8] hover:bg-[#c9af91] text-[#3d3127] px-4 py-1.5 rounded-md text-sm transition-colors"

                >

                  Cancel

                </button>

              </div>

            )}

          </div>

        )}



        <div className="upload-property-panel mt-6 sm:mt-8 bg-[#050505] rounded-[20px] sm:rounded-[24px] border-2 border-[#1f1f1f] shadow-[0_25px_80px_rgba(0,0,0,0.28)] p-4 sm:p-6 lg:p-8 overflow-hidden">

          <div className="flex items-center gap-3 mb-6">

            <Upload className="w-6 h-6 text-[#ff7a00]" aria-hidden="true" />

            <h2 className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">

              Upload Property

            </h2>

          </div>



          <div className="space-y-6">

            {/* First Row: Property Title, Price, Property Type, PG Type */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">

              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Property Title <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <FileText className={uploadIconClass} aria-hidden="true" />
                  <input
                    type="text"
                    className={uploadFieldClass}
                    placeholder="Enter property title"
                    value={formData.propertyTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, propertyTitle: e.target.value })
                    }
                  />
                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Price <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <IndianRupee className={uploadIconClass} aria-hidden="true" />
                  <input
                    type="text"
                    className={uploadFieldClass}
                    placeholder="Enter price"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Property Type <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <Building2 className={uploadIconClass} aria-hidden="true" />
                  <select
                    className={uploadSelectClass}
                    value={formData.propertyType}
                    onChange={(e) => {
                      setFormData({ ...formData, propertyType: e.target.value, pgType: "" });
                    }}
                  >
                    <option value="">Select property type</option>
                    <option value="APARTMENT">Apartment</option>
                    <option value="INDEPENDENT_HOUSE">Independent House</option>
                    <option value="STANDALONE_BUILDING">Standalone Building</option>
                  </select>
                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  PG Type 

                </label>

                <div className="relative">
                  <Users className={uploadIconClass} aria-hidden="true" />
                  <select
                    className={uploadSelectClass}
                    value={formData.pgType}
                    onChange={(e) =>
                      setFormData({ ...formData, pgType: e.target.value })
                    }
                  >
                    <option value="">Select PG type</option>
                    <option value="GIRLS_ONLY">Girls PG</option>
                    <option value="BOYS_ONLY">Boys PG</option>
                    <option value="CO_ED">Co-Ed PG</option>
                  </select>
                </div>

              </div>

            </div>



            {/* Second Row: City, Location, Apartment Name */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  City <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <MapPinned className={uploadIconClass} aria-hidden="true" />
                  <select
                    className={uploadSelectClass}
                    value={formData.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                  >
                    <option value="">Select city</option>
                    {CITY_OPTIONS.map((city) => (
                      <option key={city.value} value={city.value}>
                        {city.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Location <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <MapPin className={uploadIconClass} aria-hidden="true" />
                  <select
                    className={uploadSelectClass}
                    value={formData.location}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    disabled={!formData.city || areaLoading}
                  >
                    <option value="">{areaLoading ? "Loading areas..." : "Select location"}</option>
                    {areaOptions.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                {areaMessage && (

                  <p className="text-xs text-amber-600 mt-2">{areaMessage}</p>

                )}

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Apartment Name <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <Landmark className={uploadIconClass} aria-hidden="true" />
                  <input
                    type="text"
                    className={uploadFieldClass}
                    placeholder="Enter apartment name"
                    value={formData.apartmentName}
                    onChange={(e) =>
                      setFormData({ ...formData, apartmentName: e.target.value })
                    }
                  />
                </div>

              </div>

            </div>



            {/* Third Row: Address, State */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Address <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <Navigation className={uploadIconClass} aria-hidden="true" />
                  <input
                    type="text"
                    className={uploadFieldClass}
                    placeholder="Enter address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  State <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <MapPinned className={uploadIconClass} aria-hidden="true" />
                  <input
                    type="text"
                    className={uploadReadonlyFieldClass}
                    placeholder="Auto-filled from city"
                    value={formData.state}
                    readOnly
                  />
                </div>

              </div>

            </div>



            {/* Fourth Row: Pincode, Mobile Number */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Pincode <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <MapPin className={uploadIconClass} aria-hidden="true" />
                  <input
                    type="text"
                    className={uploadReadonlyFieldClass}
                    placeholder="Auto-filled based on location"
                    value={formData.pincode}
                    readOnly
                  />
                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Mobile Number <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <Phone className={uploadIconClass} aria-hidden="true" />
                  <input
                    type="text"
                    className={uploadFieldClass}
                    placeholder="Enter mobile number"
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, mobileNumber: e.target.value })
                    }
                  />
                </div>

              </div>

            </div>



            {/* Fifth Row: Description */}

            <div>

              <label className="block text-sm font-medium text-[#3d3127] mb-2">

                Description <span className="text-red-500">*</span>

              </label>

              <div className="relative">
                <AlignLeft className={uploadTextareaIconClass} aria-hidden="true" />
                <textarea
                  className={`${uploadFieldClass} min-h-[112px] resize-y`}
                  placeholder="Enter property description"
                  rows="4"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

            </div>



            {/* Sixth Row: BHK Type, Furnishing and Carpet Area */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  BHK Type <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <BedDouble className={uploadIconClass} aria-hidden="true" />
                  <select
                    className={uploadSelectClass}
                    value={formData.bhkType}
                    onChange={(e) =>
                      setFormData({ ...formData, bhkType: e.target.value })
                    }
                  >
                    <option value="">Select BHK type</option>
                    <option value="ONE_BHK">1BHK</option>
                    <option value="TWO_BHK">2BHK</option>
                    <option value="THREE_BHK">3BHK</option>
                    <option value="FOUR_BHK">4BHK</option>
                    <option value="STUDIO">Studio</option>
                  </select>
                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Furnishing <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <Armchair className={uploadIconClass} aria-hidden="true" />
                  <select
                    className={uploadSelectClass}
                    value={formData.furnishing}
                    onChange={(e) =>
                      setFormData({ ...formData, furnishing: e.target.value })
                    }
                  >
                    <option value="">Select furnishing type</option>
                    <option value="FULLY_FURNISHED">Fully Furnished</option>
                    <option value="SEMI_FURNISHED">Semi Furnished</option>
                    <option value="UNFURNISHED">Unfurnished</option>
                  </select>
                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Carpet Area <span className="text-red-500">*</span>

                </label>

                <div className="relative">
                  <Ruler className={uploadIconClass} aria-hidden="true" />
                  <input
                    type="text"
                    className={uploadFieldClass}
                    placeholder="Enter carpet area"
                    value={formData.carpetArea}
                    onChange={(e) =>
                      setFormData({ ...formData, carpetArea: e.target.value })
                    }
                  />
                </div>

              </div>

            </div>



            {/* Property Images */}

            <div>

              <div className="flex items-center gap-3 mb-4">

                <svg

                  className="w-6 h-6 text-[#ff7a00]"

                  fill="none"

                  stroke="currentColor"

                  viewBox="0 0 24 24"

                >

                  <path

                    strokeLinecap="round"

                    strokeLinejoin="round"

                    strokeWidth={2}

                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"

                  />

                </svg>

                <label className="text-sm font-medium text-[#3d3127]">

                  Property Images <span className="text-red-500">(Minimum 4 images required, Door image mandatory)</span>

                </label>

              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">

                {imageLabels.map((label, index) => (

                  <div key={index} className="relative">

                    <input

                      type="file"

                      id={`image-${index}`}

                      className="hidden"

                      accept="image/jpeg,image/jpg,image/png"

                      onChange={(e) => handleImageSelect(index, e)}

                    />

                    <label

                      htmlFor={`image-${index}`}

                      className={`image-upload-tile group border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors cursor-pointer min-h-[120px] ${

                        imagePreviews[index]

                          ? "border-green-500 bg-green-50"

                          : index === 0

                            ? "border-[#ff7a00] bg-[#fff3e7]"

                          : "border-[#d9c7b2] hover:border-[#ff7a00] hover:bg-[#fff3e7]"

                      }`}

                    >

                      {imagePreviews[index] ? (

                        <img

                          src={imagePreviews[index]}

                          alt={label}

                          className="w-full h-full object-cover rounded"

                        />

                      ) : (

                        <>

                          <svg

                            className="w-10 h-10 text-[#ff7a00] mb-3"

                            fill="none"

                            stroke="currentColor"

                            viewBox="0 0 24 24"

                          >

                            <path

                              strokeLinecap="round"

                              strokeLinejoin="round"

                              strokeWidth={2}

                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"

                            />

                          </svg>

                          <span className="text-xs text-[#7d6c5c] text-center font-medium transition-colors group-hover:text-black">

                            {label}

                            {index === 0 ? " *" : ""}

                          </span>

                        </>

                      )}

                    </label>

                    {imagePreviews[index] && (

                      <button

                        type="button"

                        onClick={() => handleRemoveImage(index)}

                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500 text-white text-lg leading-none flex items-center justify-center shadow hover:bg-red-600"

                        aria-label={`Remove ${label}`}

                        title="Remove image"

                      >

                        ×

                      </button>

                    )}

                  </div>

                ))}

              </div>

            </div>



            {/* Facilities Section */}

            <div className="mt-8 bg-[#efe4d7] rounded-[24px] p-6">

                <div className="flex items-center justify-between mb-4">

                  <div className="flex items-center gap-3">

                    <svg

                      className="w-5 h-5 text-[#ff7a00]"

                      fill="none"

                      stroke="currentColor"

                      viewBox="0 0 24 24"

                    >

                      <path

                        strokeLinecap="round"

                        strokeLinejoin="round"

                        strokeWidth={2}

                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"

                      />

                    </svg>

                    <h3 className="text-lg font-semibold text-[#1a1a1a]">

                      Facilities

                    </h3>

                  </div>

                  <span className="text-sm text-black">

                    Saved after preview

                  </span>

                </div>



                {facilitiesLoading && facilities.length === 0 ? (

                  <div className="text-center py-4">

                    <p className="text-black text-sm">Loading facilities...</p>

                  </div>

                ) : facilities.length === 0 ? (

                  <div className="text-center py-4">

                    <p className="text-black text-sm">Facilities are unavailable right now.</p>

                  </div>

                ) : (

                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

                    {facilities.map((facility) => (

                      <label

                        key={facility.facilityName}

                        className="flex items-center gap-2 p-3 bg-[#f7f0e8] border border-[#d9c7b2] rounded-xl text-black hover:bg-[#efe4d7] cursor-pointer transition-colors"

                      >

                        <input

                          type="checkbox"

                          checked={selectedFacilities.has(facility.facilityName)}

                          onChange={() => handleFacilityToggle(facility.facilityName)}

                          className="sr-only peer"

                        />

                        <span className="w-4 h-4 rounded-full border border-[#8b8178] bg-[#f7f0e8] flex-shrink-0 peer-checked:border-[#ff7a00] peer-checked:bg-[#f97316] peer-focus:ring-2 peer-focus:ring-[#ff7a00]/30 peer-focus:ring-offset-1" />

                        <span className="text-sm font-medium !text-black">

                          {formatFacilityName(facility.facilityName)}

                        </span>

                      </label>

                    ))}

                  </div>

                )}

              </div>



            {/* Submit Button */}

            <div className="pt-6">

              <button

                type="submit"

                onClick={handleOpenPreview}

                disabled={loading || !ownerId}

                className="w-full bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#ea6a0a] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.12)] disabled:bg-[#c9af91] disabled:cursor-not-allowed"

              >

                {!ownerId

                  ? "Owner session not found"

                  : loading

                    ? "Uploading..."

                    : "Preview Property"}

              </button>

            </div>

          </div>

        </div>



        {/* Properties Section */}

        <div className="mt-8 bg-[#f7f0e8] rounded-[20px] sm:rounded-[24px] border-2 border-[#d8c2a8] shadow-[0_25px_80px_rgba(0,0,0,0.28)] p-4 sm:p-6 lg:p-8 overflow-hidden">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">

            <div className="flex items-center gap-3">

              <svg

                className="w-6 h-6 text-[#ff7a00]"

                fill="none"

                stroke="currentColor"

                viewBox="0 0 24 24"

              >

                <path

                  strokeLinecap="round"

                  strokeLinejoin="round"

                  strokeWidth={2}

                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"

                />

              </svg>

              <h2 className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">

                Properties

              </h2>

            </div>

            <span className="text-sm text-[#7d6c5c]">

              {properties.length} Properties

            </span>

          </div>



          {loading ? (

            <div className="text-center py-8">

              <p className="text-[#7d6c5c]">Loading properties...</p>

            </div>

          ) : properties.length === 0 ? (

            <div className="text-center py-8">

              <p className="text-[#7d6c5c]">

                {propertyFetchMessage || "No properties found"}

              </p>

            </div>

          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">

              {properties.map((property) => {

                const approvalStatus = resolvePropertyApprovalStatus(property);

                const shouldShowPaymentButton =
                  approvalStatus !== "APPROVED" && approvalStatus !== "PENDING";

                return (

                <div

                  key={property.id || property.propertyId}

                  className="border border-[#d9c7b2] bg-[#f9f3ed] rounded-xl overflow-hidden hover:shadow-[0_14px_34px_rgba(249,115,22,0.16)] transition-shadow"

                >

                  <div className="h-48 bg-[#d8c2a8]">

                    <PropertyThumbnail

                      imageNames={getPropertyImageNames(property)}

                      title={property.title}

                    />

                  </div>

                  <div className="p-4">

                    <div className="flex items-start justify-between gap-2 mb-2">

                      <h3 className="font-semibold text-[#1a1a1a]">

                        {property.title}

                      </h3>

                      <span

                        className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getApprovalBadgeClasses(

                          approvalStatus

                        )}`}

                      >

                        {approvalStatus === "PAYMENT_DUE" ? "PAYMENT DUE" : approvalStatus}

                      </span>

                    </div>

                    <p className="text-xs text-[#8b8178] mb-1">ID: {property.id}</p>

                    <p className="text-sm text-[#7d6c5c] mb-1">

                      {property.location}

                    </p>

                    <p className="text-sm font-medium text-[#ff7a00] mb-1">

                      ₹{property.price?.toLocaleString()}

                    </p>

                    <p className="text-sm text-[#7d6c5c] mb-3">

                      {property.mobileNumber}

                </p>

                    <div className="flex flex-wrap gap-3">

                      {shouldShowPaymentButton && (

                        <button

                          type="button"

                          onClick={() => handleOpenPropertyPayment(property)}

                          className="inline-flex items-center justify-center rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(249,115,22,0.25)] hover:bg-[#ea6a0a] transition-colors"

                        >

                          {approvalStatus === "REJECTED" ? "Pay Again" : "Pay Now"}

                        </button>

                      )}


                      <button

                        onClick={() => handleEditProperty(property)}

                        className="text-[#ff7a00] hover:text-[#e36a00]"

                      >

                        <svg

                          className="w-5 h-5"

                          fill="none"

                          stroke="currentColor"

                          viewBox="0 0 24 24"

                        >

                          <path

                            strokeLinecap="round"

                            strokeLinejoin="round"

                            strokeWidth={2}

                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"

                          />

                        </svg>

                      </button>

                      <button

                        onClick={() => handleDeleteProperty(property.id)}

                        className="text-red-500 hover:text-red-700"

                      >

                        <svg

                          className="w-5 h-5"

                          fill="none"

                          stroke="currentColor"

                          viewBox="0 0 24 24"

                        >

                          <path

                            strokeLinecap="round"

                            strokeLinejoin="round"

                            strokeWidth={2}

                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"

                          />

                        </svg>

                      </button>

                    </div>

                  </div>

                </div>

                );

              })}


            </div>

          )}

        </div>



      </div>



      {showPremiumModal && (

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">

          <div className="bg-[#f7f0e8] rounded-[24px] shadow-xl max-w-md w-full mx-4 p-6">

            <h2 className="text-xl font-bold text-[#1a1a1a] text-center">

              Payment Required for Property

            </h2>

            <p className="text-sm text-[#5d5145] text-center mt-2">

              Scan this QR code, complete payment, then click Done to submit this property for admin approval.

            </p>

            {pendingPropertyId && (

              <p className="text-xs text-[#ff7a00] text-center mt-1 font-medium">

                Property ID: {pendingPropertyId}

              </p>

            )}



            <div className="mt-5">

              <img

                src={OWNER_PREMIUM_QR_IMAGE}

                alt="Owner premium payment QR"

                className="w-full rounded-xl border border-[#d9c7b2]"

              />

            </div>



            <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">

              After clicking Done, your request appears in admin dashboard for approval or rejection.

            </div>



            <div className="mt-5 flex gap-3">

              <button

                type="button"

                onClick={handleClosePremiumModal}

                className="flex-1 px-4 py-3 border border-[#d9c7b2] rounded-xl font-semibold hover:bg-[#efe4d7]"

              >

                Cancel

              </button>

              <button

                type="button"

                onClick={handlePremiumDone}

                disabled={premiumLoading}

                className="flex-1 bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#ea6a0a] disabled:bg-[#c9af91]"

              >

                {premiumLoading ? "Submitting..." : "Done"}

              </button>

            </div>



            <p className="text-xs text-[#7d6c5c] text-center mt-3">

              Current premium status: {ownerPremiumStatus}

            </p>

          </div>

        </div>

      )}



      <ChatDrawer

        isOpen={chatOpen}

        onClose={() => setChatOpen(false)}

        currentRole="PROPERTY_OWNER"

        currentUserId={ownerId}

        selectedProperty={null}

        onCountChange={setChatCount}

      />



      {/* Property Preview Modal */}

      {showPreviewModal && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-[#f7f0e8] rounded-[20px] sm:rounded-[24px] shadow-xl max-w-3xl w-full mx-3 sm:mx-4 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center gap-3 p-4 sm:p-6 border-b">

              <h2 className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">Preview Property</h2>

              <button

                type="button"

                onClick={() => setShowPreviewModal(false)}

                className="text-[#7d6c5c] hover:text-[#3d3127]"

                aria-label="Close preview"

              >

                <svg

                  className="w-6 h-6"

                  fill="none"

                  stroke="currentColor"

                  viewBox="0 0 24 24"

                >

                  <path

                    strokeLinecap="round"

                    strokeLinejoin="round"

                    strokeWidth={2}

                    d="M6 18L18 6M6 6l12 12"

                  />

                </svg>

              </button>

            </div>



            <div className="p-4 sm:p-6">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">

                <div><span className="font-semibold text-[#3d3127]">Title:</span> {formData.propertyTitle}</div>

                <div><span className="font-semibold text-[#3d3127]">Price:</span> ₹{Number(formData.price || 0).toLocaleString()}</div>

                <div><span className="font-semibold text-[#3d3127]">Type:</span> {formData.propertyType}</div>

                <div><span className="font-semibold text-[#3d3127]">BHK:</span> {formData.bhkType}</div>

                <div><span className="font-semibold text-[#3d3127]">Furnishing:</span> {formData.furnishing}</div>

                <div><span className="font-semibold text-[#3d3127]">Mobile:</span> {formData.mobileNumber}</div>

                <div className="md:col-span-2"><span className="font-semibold text-[#3d3127]">Location:</span> {formData.location}</div>

                <div className="md:col-span-2"><span className="font-semibold text-[#3d3127]">Description:</span> {formData.description}</div>

              </div>



              <div className="mt-6">

                <h3 className="font-semibold text-[#1a1a1a] mb-3">Selected Facilities</h3>

                {Array.from(selectedFacilities).length === 0 ? (

                  <p className="text-sm text-[#7d6c5c]">No facilities selected</p>

                ) : (

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

                    {FACILITY_OPTIONS.filter((facilityName) =>

                      selectedFacilities.has(facilityName)

                    ).map((facilityName) => (

                      <div

                        key={facilityName}

                        className="flex items-center gap-2 p-3 border border-[#d9c7b2] rounded-xl bg-[#efe4d7]"

                      >

                        <span className="w-4 h-4 rounded-full border border-[#ff7a00] bg-[#f97316] flex-shrink-0" />

                        <span className="text-sm text-[#3d3127]">

                          {formatFacilityName(facilityName)}

                        </span>

                      </div>

                    ))}

                  </div>

                )}

              </div>



              <div className="mt-6">

                <h3 className="font-semibold text-[#1a1a1a] mb-3">Selected Images</h3>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-5 gap-3">

                  {imagePreviews

                    .map((preview, index) => ({ preview, index }))

                    .filter((item) => Boolean(item.preview))

                    .map((item) => (

                      <div key={item.index} className="border rounded-xl p-2">

                        <img

                          src={item.preview}

                          alt={imageLabels[item.index]}

                          className="h-24 w-full object-cover rounded"

                        />

                        <p className="text-xs text-[#5d5145] mt-2 text-center">{imageLabels[item.index]}</p>

                      </div>

                    ))}

                </div>

              </div>



              <div className="flex gap-3 pt-6">

                <button

                  type="button"

                  onClick={() => setShowPreviewModal(false)}

                  className="flex-1 px-4 py-3 border border-[#d9c7b2] rounded-xl font-semibold hover:bg-[#efe4d7] transition-colors"

                >

                  Back to Edit

                </button>

                <button

                  type="button"

                  onClick={handleSubmit}

                  disabled={uploading}

                  className="flex-1 bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#ea6a0a] transition-colors disabled:bg-[#c9af91]"

                >

                  {uploading ? "Uploading..." : "Confirm & Upload"}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* Edit Property Modal */}

      {showEditModal && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-[#f7f0e8] rounded-[20px] sm:rounded-[24px] shadow-xl max-w-2xl w-full mx-3 sm:mx-4 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center gap-3 p-4 sm:p-6 border-b">

              <h2 className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">Edit Property</h2>

              <button

                onClick={handleCloseEditModal}

                className="text-[#7d6c5c] hover:text-[#3d3127]"

              >

                <svg

                  className="w-6 h-6"

                  fill="none"

                  stroke="currentColor"

                  viewBox="0 0 24 24"

                >

                  <path

                    strokeLinecap="round"

                    strokeLinejoin="round"

                    strokeWidth={2}

                    d="M6 18L18 6M6 6l12 12"

                  />

                </svg>

              </button>

            </div>



            <form onSubmit={handleUpdateProperty} className="p-4 sm:p-6 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                <div>

                  <label className="block text-sm font-medium text-[#3d3127] mb-2">

                    Property Title <span className="text-red-500">*</span>

                  </label>

                  <input

                    type="text"

                    className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                    value={formData.propertyTitle}

                    onChange={(e) =>

                      setFormData({ ...formData, propertyTitle: e.target.value })

                    }

                  />

                </div>



                <div>

                  <label className="block text-sm font-medium text-[#3d3127] mb-2">

                    Price <span className="text-red-500">*</span>

                  </label>

                  <input

                    type="text"

                    className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                    value={formData.price}

                    onChange={(e) =>

                      setFormData({ ...formData, price: e.target.value })

                    }

                  />

                </div>



                <div>

                  <label className="block text-sm font-medium text-[#3d3127] mb-2">

                    Property Type <span className="text-red-500">*</span>

                  </label>

                  <select

                    className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f7f0e8]"

                    value={formData.propertyType}

                    onChange={(e) => {

                      setFormData({ ...formData, propertyType: e.target.value, pgType: "" });

                    }}

                  >

                    <option value="">Select property type</option>

                    <option value="APARTMENT">Apartment</option>

                    <option value="INDEPENDENT_HOUSE">Independent House</option>

                    <option value="STANDALONE_BUILDING">Standalone Building</option>

                  </select>

                </div>



                <div>

                  <label className="block text-sm font-medium text-[#3d3127] mb-2">

                    PG Type

                  </label>

                  <select

                    className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f7f0e8]"

                    value={formData.pgType}

                    onChange={(e) =>

                      setFormData({ ...formData, pgType: e.target.value })

                    }

                  >

                    <option value="">Select PG type</option>

                    <option value="GIRLS_ONLY">Girls PG</option>

                    <option value="BOYS_ONLY">Boys PG</option>

                    <option value="CO_ED">Co-Ed PG</option>

                  </select>

                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Apartment Name <span className="text-red-500">*</span>

                </label>

                <input

                  type="text"

                  className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                  value={formData.apartmentName}

                  onChange={(e) =>

                    setFormData({ ...formData, apartmentName: e.target.value })

                  }

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Location <span className="text-red-500">*</span>

                </label>

                <input

                  type="text"

                  className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                  value={formData.location}

                  onChange={(e) =>

                    setFormData({ ...formData, location: e.target.value })

                  }

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  City <span className="text-red-500">*</span>

                </label>

                <input

                  type="text"

                  className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                  value={formData.city}

                  onChange={(e) =>

                    setFormData({ ...formData, city: e.target.value })

                  }

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Address <span className="text-red-500">*</span>

                </label>

                <input

                  type="text"

                  className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                  value={formData.address}

                  onChange={(e) =>

                    setFormData({ ...formData, address: e.target.value })

                  }

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  State <span className="text-red-500">*</span>

                </label>

                <input

                  type="text"

                  className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#efe4d7]"

                  placeholder="Auto-filled from city"

                  value={formData.state}

                  readOnly

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Pincode <span className="text-red-500">*</span>

                </label>

                <input

                  type="text"

                  className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                  value={formData.pincode}

                  onChange={(e) =>

                    setFormData({ ...formData, pincode: e.target.value })

                  }

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Mobile Number <span className="text-red-500">*</span>

                </label>

                <input

                  type="text"

                  className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                  value={formData.mobileNumber}

                  onChange={(e) =>

                    setFormData({ ...formData, mobileNumber: e.target.value })

                  }

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-[#3d3127] mb-2">

                  Description <span className="text-red-500">*</span>

                </label>

                <textarea

                  className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                  rows="4"

                  value={formData.description}

                  onChange={(e) =>

                    setFormData({ ...formData, description: e.target.value })

                  }

                />

              </div>



              <div className="grid grid-cols-3 gap-4">

                <div>

                  <label className="block text-sm font-medium text-[#3d3127] mb-2">

                    BHK Type <span className="text-red-500">*</span>

                  </label>

                  <select

                    className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f7f0e8]"

                    value={formData.bhkType}

                    onChange={(e) =>

                      setFormData({ ...formData, bhkType: e.target.value })

                    }

                  >

                    <option value="">Select BHK type</option>

                    <option value="ONE_BHK">1BHK</option>

                    <option value="TWO_BHK">2BHK</option>

                    <option value="THREE_BHK">3BHK</option>

                    <option value="FOUR_BHK">4BHK</option>

                    <option value="STUDIO">Studio</option>

                  </select>

                </div>



                <div>

                  <label className="block text-sm font-medium text-[#3d3127] mb-2">

                    Furnishing <span className="text-red-500">*</span>

                  </label>

                  <select

                    className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f7f0e8]"

                    value={formData.furnishing}

                    onChange={(e) =>

                      setFormData({ ...formData, furnishing: e.target.value })

                    }

                  >

                    <option value="">Select furnishing type</option>

                    <option value="FULLY_FURNISHED">Fully Furnished</option>

                    <option value="SEMI_FURNISHED">Semi Furnished</option>

                    <option value="UNFURNISHED">Unfurnished</option>

                  </select>

                </div>



                <div>

                  <label className="block text-sm font-medium text-[#3d3127] mb-2">

                    Carpet Area <span className="text-red-500">*</span>

                  </label>

                  <input

                    type="text"

                    className="w-full px-4 py-3 border border-[#d9c7b2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7a00]/30 bg-[#f9f3ed]"

                    value={formData.carpetArea}

                    onChange={(e) =>

                      setFormData({ ...formData, carpetArea: e.target.value })

                    }

                  />

                </div>

              </div>



              <div className="bg-[#efe4d7] rounded-[24px] p-5">

                <div className="flex items-center justify-between mb-4">

                  <h3 className="text-lg font-semibold text-[#1a1a1a]">

                    Facilities

                  </h3>

                  {facilitiesLoading && (

                    <span className="text-sm text-[#7d6c5c]">Loading...</span>

                  )}

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

                  {facilities.map((facility) => (

                    <label

                      key={facility.facilityName}

                      className="flex items-center gap-2 p-3 bg-[#f7f0e8] border border-[#d9c7b2] rounded-xl hover:bg-[#efe4d7] cursor-pointer transition-colors"

                    >

                      <input

                        type="checkbox"

                        checked={selectedFacilities.has(facility.facilityName)}

                        onChange={() => handleFacilityToggle(facility.facilityName)}

                        className="sr-only peer"

                      />

                      <span className="w-4 h-4 rounded-full border border-[#8b8178] bg-[#f7f0e8] flex-shrink-0 peer-checked:border-[#ff7a00] peer-checked:bg-[#f97316] peer-focus:ring-2 peer-focus:ring-[#ff7a00]/30 peer-focus:ring-offset-1" />

                      <span className="text-sm font-medium !text-black">

                        {formatFacilityName(facility.facilityName)}

                      </span>

                    </label>

                  ))}

                </div>

              </div>



              <div className="flex gap-3 pt-4">

                <button

                  type="button"

                  onClick={handleCloseEditModal}

                  className="flex-1 px-4 py-3 border border-[#d9c7b2] rounded-xl font-semibold hover:bg-[#efe4d7] transition-colors"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={loading}

                  className="flex-1 bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#ea6a0a] transition-colors disabled:bg-[#c9af91]"

                >

                  {loading ? "Updating..." : "Update Property"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}
   


      <ToastContainer position="top-right" autoClose={3000} />

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BrandLogo size="lg" />
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
            <p>&copy; 2026 Caryanam. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>

  );

};



export default PropertyOwnerDashboard;

