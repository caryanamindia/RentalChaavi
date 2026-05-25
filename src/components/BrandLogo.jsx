const BrandLogo = ({
  size = "md",
  showText = true,
  textClassName = "",
  className = "",
}) => {
  const sizes = {
    sm: {
      wrapper: "h-9 w-9 rounded-[14px]",
      image: "h-8 w-8",
      text: "text-[15px] min-[360px]:text-[16px] sm:text-xl md:text-2xl",
    },
    md: {
      wrapper: "h-10 w-10 rounded-xl",
      image: "h-9 w-9",
      text: "text-2xl",
    },
    lg: {
      wrapper: "h-11 w-11 rounded-[18px]",
      image: "h-10 w-10",
      text: "text-2xl",
    },
  };
 
  const selectedSize = sizes[size] || sizes.md;
 
  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <div
        className={`flex ${selectedSize.wrapper} items-center justify-center bg-black shadow-[0_14px_30px_rgba(255,116,56,0.24)] flex-shrink-0`}
      >
        <svg
          viewBox="0 0 96 96"
          role="img"
          aria-label="RentalChaavi"
          className={`${selectedSize.image} block`}
        >
          <path
            d="M18 38.5 48 12l30 26.5"
            fill="none"
            stroke="#fff8ec"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 38.5v14.7m48-14.7v21"
            fill="none"
            stroke="#fff8ec"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <rect
            x="42"
            y="32"
            width="5.5"
            height="5.5"
            rx="1"
            fill="#ff7a00"
          />
          <rect
            x="50.5"
            y="32"
            width="5.5"
            height="5.5"
            rx="1"
            fill="#ff7a00"
          />
          <rect
            x="42"
            y="40.5"
            width="5.5"
            height="5.5"
            rx="1"
            fill="#ff7a00"
          />
          <rect
            x="50.5"
            y="40.5"
            width="5.5"
            height="5.5"
            rx="1"
            fill="#ff7a00"
          />
          <path
            d="M32 61h39"
            fill="none"
            stroke="#ff7a00"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <circle
            cx="26"
            cy="61"
            r="10"
            fill="none"
            stroke="#ff7a00"
            strokeWidth="10"
          />
          <path
            d="M64 61v11m9-11v7"
            fill="none"
            stroke="#ff7a00"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>
 
      {showText && (
        <span
          className={`min-w-0 truncate font-black text-white font-serif whitespace-nowrap ${selectedSize.text} ${textClassName}`}
        >
          <span className="text-[#ff7438]">Rental</span>Chaavi
        </span>
      )}
    </div>
  );
};
 
export default BrandLogo;