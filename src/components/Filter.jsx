import { useMemo, useState } from "react";
import {
  Building2,
  IndianRupee,
  MapPinned,
  Navigation,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";

const CITY_OPTIONS = [
  { label: "Pune", value: "Pune" },
  { label: "Pimpri-Chinchwad (PCMC)", value: "PCMC" },
];

const Filter = ({
  tempFilters,
  setTempFilters,
  applyFilters,
  clearFilters,
  addressOptions,
  fetchAddressesByCity,
}) => {
  const [priceError, setPriceError] = useState("");

  const getPriceNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if ((name === "minPrice" || name === "maxPrice") && Number(value) < 0) {
      return;
    }

    const currentMin = getPriceNumber(tempFilters.minPrice);
    const currentMax = getPriceNumber(tempFilters.maxPrice);

    const updated = {
      ...tempFilters,
      [name]: value,
    };

    if (name === "minPrice") {
      const nextMin = getPriceNumber(value);
      if (nextMin !== null && currentMax !== null && currentMax <= nextMin) {
        updated.maxPrice = "";
        setPriceError("Max price must be greater than min price.");
      } else {
        setPriceError("");
      }
    }

    if (name === "maxPrice") {
      const nextMax = getPriceNumber(value);
      if (nextMax !== null && currentMin !== null && nextMax <= currentMin) {
        setPriceError("Max price must be greater than min price.");
      } else {
        setPriceError("");
      }
    }

    if (name === "city") {
      updated.address = "";

      if (value) {
        await fetchAddressesByCity(value);
      }
    }

    setTempFilters(updated);
  };

  const handleApply = () => {
    const minPrice = getPriceNumber(tempFilters.minPrice);
    const maxPrice = getPriceNumber(tempFilters.maxPrice);

    if (minPrice !== null && maxPrice !== null && maxPrice <= minPrice) {
      setPriceError("Max price must be greater than min price.");
      return;
    }

    setPriceError("");
    applyFilters();
  };

  const handleClear = () => {
    setPriceError("");
    clearFilters();
  };

  const inputStyle =
    "w-full mt-2 pl-11 pr-4 py-4 bg-[#f9f3ed] border border-[#d9c7b2] rounded-xl focus:ring-2 focus:ring-[#ff7a00]/30 focus:border-[#ff7a00] transition-all outline-none text-black placeholder:text-black text-[15px]";
  const selectStyle =
    "w-full mt-2 pl-11 pr-4 py-4 bg-[#f7f0e8] border border-[#d9c7b2] rounded-xl focus:ring-2 focus:ring-[#ff7a00]/30 focus:border-[#ff7a00] transition-all outline-none text-black text-[15px] appearance-none cursor-pointer";
  const labelStyle = "block text-sm font-medium text-[#fff7ed] ml-1";
  const fieldIconStyle =
    "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ff7a00]";

  const filteredAddresses = useMemo(
    () => [
      ...new Set(
        (addressOptions || [])
          .map((item) =>
            typeof item === "string"
              ? item
              : item?.address || item?.location || item?.area
          )
          .filter(Boolean)
      ),
    ],
    [addressOptions]
  );

  const maxMinValue =
    tempFilters.minPrice !== "" && tempFilters.minPrice !== undefined
      ? Number(tempFilters.minPrice) + 1
      : 0;

  return (
    <div className="bg-[#050505] p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border-2 border-[#1f1f1f] shadow-[0_25px_80px_rgba(0,0,0,0.28)] overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
        <div>
          <label className={labelStyle}>Property Type</label>
          <div className="relative">
            <Building2 className={fieldIconStyle} aria-hidden="true" />
            <select
              name="type"
              value={tempFilters.type || ""}
              onChange={handleChange}
              className={selectStyle}
            >
              <option value="">All Properties</option>
              <option value="APARTMENT">APARTMENT</option>
              <option value="INDEPENDENT_HOUSE">INDEPENDENT_HOUSE</option>
              <option value="STANDALONE_BUILDING">STANDALONE_BUILDING</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelStyle}>PG Type</label>
          <div className="relative">
            <Users className={fieldIconStyle} aria-hidden="true" />
            <select
              name="pgType"
              value={tempFilters.pgType || ""}
              onChange={handleChange}
              className={selectStyle}
            >
              <option value="">Select PG Type</option>
              <option value="GIRLS_ONLY">GIRLS_ONLY</option>
              <option value="BOYS_ONLY">BOYS_ONLY</option>
              <option value="CO_ED">CO_ED</option>
              <option value="ALL">ALL</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelStyle}>City</label>
          <div className="relative">
            <MapPinned className={fieldIconStyle} aria-hidden="true" />
            <select
              name="city"
              value={tempFilters.city || ""}
              onChange={handleChange}
              className={selectStyle}
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
          <label className={labelStyle}>Location</label>
          <div className="relative">
            <Navigation className={fieldIconStyle} aria-hidden="true" />
            <select
              name="address"
              value={tempFilters.address || ""}
              onChange={handleChange}
              disabled={!tempFilters.city}
              className={selectStyle}
            >
              <option value="">
                {tempFilters.city ? "Select location" : "Select city first"}
              </option>
              {filteredAddresses.map((address, index) => (
                <option key={index} value={address}>
                  {address}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelStyle}>Min Price</label>
          <div className="relative">
            <IndianRupee className={fieldIconStyle} aria-hidden="true" />
            <input
              type="number"
              name="minPrice"
              min={0}
              placeholder="Rs. 10,000"
              value={tempFilters.minPrice || ""}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className={labelStyle}>Max Price</label>
          <div className="relative">
            <IndianRupee className={fieldIconStyle} aria-hidden="true" />
            <input
              type="number"
              name="maxPrice"
              min={maxMinValue}
              placeholder="Rs. 2,00,000"
              value={tempFilters.maxPrice || ""}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>
          {priceError && (
            <p className="mt-2 text-xs font-medium text-amber-300">
              {priceError}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button
          onClick={handleClear}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 bg-[#f7f0e8] border border-[#d9c7b2] rounded-xl text-black font-semibold hover:bg-[#efe4d7] active:scale-95 transition-all"
        >
          <RotateCcw size={18} />
          <span>Reset</span>
        </button>

        <button
          onClick={handleApply}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-9 py-4 bg-[#f97316] text-white font-semibold rounded-xl hover:bg-[#ea6a0a] shadow-[0_10px_30px_rgba(249,115,22,0.35)] active:scale-95 transition-all"
        >
          <Search size={18} />
          <span>Apply</span>
        </button>
      </div>
    </div>
  );
};

export default Filter;
