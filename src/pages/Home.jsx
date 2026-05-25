import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  ArrowRight,
  Menu,
  X,
  ArrowUp,
  ShieldCheck,
  Handshake,
  HousePlus,
  UserRound,
} from "lucide-react";

import img4 from "../assets/img4.jpg";
import BrandLogo from "../components/BrandLogo";

const Home = () => {
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      const sectionIds = ["home", "features", "cta", "contact"];
      let currentSection = "home";

      sectionIds.forEach((sectionId) => {
        const section = document.getElementById(sectionId);

        if (section && section.offsetTop <= window.scrollY + 140) {
          currentSection = sectionId;
        }
      });

      setActiveSection(currentSection);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const features = [
    {
      icon: <Search size={28} />,
      title: "Smart Search",
      description:
        "Find your perfect property with advanced filters for location, price, and amenities",
    },
    {
      icon: <Star size={28} />,
      title: "Verified Listings",
      description:
        "All properties are verified by our team to ensure authenticity and safety",
    },
    {
      icon: <HousePlus size={28} />,
      title: "Direct Connect",
      description:
        "Chat directly with property owners without any middlemen or brokers",
    },
    {
      icon: <ArrowRight size={28} />,
      title: "No Brokerage",
      description:
        "Save thousands by connecting directly with owners - zero brokerage fees",
    },
  ];

  const trustHighlights = [
    {
      icon: <ShieldCheck size={36} strokeWidth={1.8} />,
      titleHi: "विश्वास",
      title: "Trust",
      note: "100% Transparent Deals",
    },
    {
      icon: <Handshake size={38} strokeWidth={1.8} />,
      titleHi: "सहभाग",
      title: "Partnership",
      note: "Direct Owner Connect",
    },
    {
      icon: <HousePlus size={38} strokeWidth={1.8} />,
      titleHi: "सुरक्षित व्यवहार",
      title: "Secure Deals",
      note: "Verified & Safe Listings",
    },
    {
      icon: <UserRound size={38} strokeWidth={1.8} />,
      titleHi: "नेहमी तुमच्या सोबत",
      title: "Always With You",
      note: "Support at Every Step",
    },
  ];

  const navItems = [
    { id: "home", label: "Home", href: "#home" },
    { id: "features", label: "Features", href: "#features" },
    { id: "cta", label: "Get Started", href: "#cta" },
    { id: "contact", label: "Contact", href: "#contact" },
  ];

  const navLinkClass = (sectionId) =>
    `relative font-bold transition-colors ${
      activeSection === sectionId
        ? "text-[#ff7438] after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-2 after:h-0.5 after:w-8 after:bg-[#ff7438] after:rounded-full"
        : "text-white hover:text-[#ff7438]"
    }`;

  const mobileNavLinkClass = (sectionId) =>
    `block py-2 font-semibold transition-colors ${
      activeSection === sectionId
        ? "text-[#ff7438]"
        : "text-white hover:text-[#ff7438]"
    }`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-[Poppins] scroll-smooth">
      {/* NAVBAR */}
      <nav className="fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-16px)] sm:w-[calc(100%-24px)] max-w-[1510px] bg-black/90 backdrop-blur-md z-50 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] rounded-2xl">
        <div className="px-4 sm:px-6 md:px-9 py-3.5 flex items-center justify-between">
          {/* LOGO */}
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
          </div>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-10 flex-grow justify-center text-[13px]">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setActiveSection(item.id)}
                className={navLinkClass(item.id)}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* DESKTOP BUTTONS */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-white text-[13px] font-bold hover:text-[#ff7438] transition-colors"
            >
              Login
            </button>

            <button
              onClick={() => navigate("/login")}
              className="px-7 py-3 bg-[#ff7438] text-white text-[13px] font-bold rounded-xl hover:bg-[#f05f24] hover:shadow-lg hover:shadow-[#ff7438]/25 transition-all duration-300"
            >
              Get Started
            </button>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:text-[#ff7438] transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-black/95 border-t border-white/10 overflow-hidden rounded-b-2xl"
            >
              <div className="px-4 py-4 space-y-4">
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={mobileNavLinkClass(item.id)}
                  >
                    {item.label}
                  </a>
                ))}

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="w-full px-6 py-3 text-white font-semibold border border-white/20 rounded-xl"
                  >
                    Login
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="w-full px-6 py-3 bg-[#ff7438] text-white font-semibold rounded-xl"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO SECTION */}
      <section
        id="home"
        className="relative overflow-hidden bg-[#e9ded0] px-2 sm:px-3 pt-2.5 pb-10 md:pb-16"
      >
        <div className="relative mx-auto min-h-screen md:min-h-[760px] max-w-[1510px] overflow-hidden rounded-[20px] border-[4px] md:border-[6px] border-[#d8b88c] bg-[#f6eadc] shadow-[0_24px_70px_rgba(89,63,32,0.20)]">
          {/* BACKGROUND */}
          <div className="absolute inset-0">
            <img
              src={img4}
              alt="Luxury property"
              className="h-full w-full object-cover object-[70%_center] opacity-90"
            />

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,246,235,0.98)_0%,rgba(255,246,235,0.92)_31%,rgba(255,246,235,0.54)_48%,rgba(255,246,235,0.08)_72%)]" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(255,184,103,0.38),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,239,216,0.16))]" />
          </div>

          {/* HERO CONTENT */}
          <div className="relative z-10 mx-auto flex min-h-screen md:min-h-[760px] max-w-[1300px] items-center px-4 sm:px-6 pb-[420px] sm:pb-[320px] md:pb-36 pt-24 md:px-10 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-[650px]"
            >
              {/* BADGE */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ffc49d] bg-white/70 px-3 py-1.5 text-[11px] sm:text-[12px] font-bold text-[#ff7438] shadow-sm backdrop-blur-sm">
                <Star size={14} fill="currentColor" />
                No Brokerage Platform
              </div>

              {/* TITLE */}
              <h1 className="mb-4 font-serif text-[36px] leading-tight font-black text-[#122231] sm:text-[48px] md:text-[64px] lg:text-[70px]">
                Find Your Dream{" "}
                <span className="text-[#ff7438]">Home</span>
                <br />
                Without Brokers
              </h1>

              {/* SUBTITLE */}
              <p className="mb-1 text-[15px] sm:text-[17px] font-extrabold text-[#f06d31] md:text-[19px]">
                तुमच्या प्रत्येक प्रॉपर्टी डीलमध्ये विश्वासाची साथ.
              </p>

              <p className="mb-6 text-[15px] sm:text-[17px] font-extrabold text-[#f06d31] md:text-[19px]">
                Your Trusted Partner In Every Property Deal.
              </p>

              {/* BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff7438] px-8 py-4 text-[14px] font-extrabold text-white shadow-[0_10px_22px_rgba(255,116,56,0.25)] hover:bg-[#f05f24] transition-all duration-300"
                >
                  Browse Properties
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => navigate("/login")}
                  className="w-full sm:w-auto rounded-xl border border-[#cbbcae] bg-white/74 px-8 py-4 text-[14px] font-extrabold text-[#172333] shadow-sm backdrop-blur-sm hover:border-[#ff7438] hover:text-[#ff7438] transition-all duration-300"
                >
                  List Your Property
                </button>
              </div>
            </motion.div>
          </div>

         {/* TRUST CARDS */}
<div className="absolute bottom-4 sm:bottom-6 left-1/2 z-20 w-[calc(100%-20px)] sm:w-[calc(100%-40px)] md:w-[calc(100%-64px)] max-w-[1280px] -translate-x-1/2">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-[28px] bg-white/92 shadow-[0_18px_38px_rgba(85,58,32,0.22)] backdrop-blur-md">
    
    {trustHighlights.map((item, index) => (
      <div
        key={item.title}
        className={`
          group
          flex items-center gap-4
          px-5 sm:px-6 lg:px-8
          py-5 sm:py-6
          transition-all duration-300 ease-out
          hover:scale-[1.03]
          hover:bg-[#fff7f2]
          cursor-pointer
          border-[#d7c7b5]

          ${index !== trustHighlights.length - 1
            ? "border-b sm:border-b-0 lg:border-r"
            : ""
          }
        `}
      >
        {/* ICON */}
        <div className="shrink-0 text-[#ff7438] transition-transform duration-300 group-hover:scale-110">
          {item.icon}
        </div>

        {/* TEXT */}
        <div className="min-w-0">
          <p className="text-[13px] sm:text-[14px] font-black leading-tight text-[#27313c]">
            {item.titleHi}
          </p>

          <p className="text-[14px] sm:text-[15px] lg:text-[16px] font-extrabold leading-tight text-[#ff7438]">
            {item.title}
          </p>

          <p className="mt-1 text-[11px] sm:text-[12px] font-semibold leading-tight text-[#25313d]">
            {item.note}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="py-20 px-4 md:px-6 bg-white"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4">
              Why Choose RentalChaavi?
            </h2>

            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              We make property hunting simple, transparent, and brokerage-free
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                }}
                viewport={{ once: true }}
                className="bg-slate-50 border border-slate-200 rounded-[24px] p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#ff7f50] to-[#ff9f80] rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>

                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        id="cta"
        className="py-20 px-4 md:px-6 bg-gradient-to-br from-[#ff7f50] to-[#ff9f80]"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6">
            Ready to Find Your Perfect Home?
          </h2>

          <p className="text-lg md:text-xl text-white/90 mb-8">
            Join thousands of happy users who found their dream property
            without paying brokerage
          </p>

          <button
            onClick={() => navigate("/login")}
            className="px-8 sm:px-10 py-4 sm:py-5 bg-white text-[#ff7f50] font-bold text-base sm:text-lg rounded-2xl hover:shadow-2xl transition-all duration-300 inline-flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

   {/* DOWNLOAD APP SECTION */}
      <section className="py-20 px-4 md:px-6 bg-[#fff7f2]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* LEFT CONTENT */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ffe7db] px-4 py-2 text-[#ff7438] font-bold text-sm mb-5">
                📱 Download Our App
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-6">
                Find Properties Faster <br />
                With Our Mobile App
              </h2>

              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Browse verified properties, connect directly with owners,
                and manage your property journey anytime, anywhere.
                Experience faster search, instant updates, and zero brokerage.
              </p>

              {/* FEATURES */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ff7438]/10 flex items-center justify-center text-[#ff7438]">
                    ✓
                  </div>

                  <p className="font-semibold text-slate-700">
                    Instant Property Alerts
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ff7438]/10 flex items-center justify-center text-[#ff7438]">
                    ✓
                  </div>

                  <p className="font-semibold text-slate-700">
                    Direct Owner Chat
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ff7438]/10 flex items-center justify-center text-[#ff7438]">
                    ✓
                  </div>

                  <p className="font-semibold text-slate-700">
                    Save & Compare Properties
                  </p>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-7 py-4 rounded-2xl bg-black text-white font-bold hover:scale-105 transition-all duration-300">
                  Download for Android
                </button>

                <button className="px-7 py-4 rounded-2xl border border-slate-300 bg-white text-slate-800 font-bold hover:border-[#ff7438] hover:text-[#ff7438] transition-all duration-300">
                  Download for iPhone
                </button>
              </div>
            </motion.div>

            {/* RIGHT IMAGE */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative flex justify-center"
            >
              <div className="relative">
                {/* PHONE */}
                <div className="w-[280px] sm:w-[330px] rounded-[40px] border-[10px] border-slate-900 bg-white shadow-[0_30px_60px_rgba(0,0,0,0.18)] overflow-hidden">
                  
                  {/* TOP BAR */}
                  <div className="h-7 bg-slate-900 flex items-center justify-center">
                    <div className="w-24 h-2 rounded-full bg-slate-700" />
                  </div>

                  {/* SCREEN */}
                  <div className="p-5 bg-gradient-to-br from-[#fff4ec] to-white min-h-[580px]">
                    <div className="bg-[#ff7438] rounded-3xl p-5 text-white mb-5">
                      <p className="text-sm font-medium mb-1">
                        Welcome to
                      </p>

                      <h3 className="text-2xl font-black">
                        RentalChaavi
                      </h3>

                      <p className="text-sm opacity-90 mt-2">
                        No Brokerage Property App
                      </p>
                    </div>

                    {/* MOCK PROPERTY CARD */}
                    <div className="bg-white rounded-3xl shadow-md p-4 mb-4">
                      <div className="h-40 rounded-2xl bg-[#ffe3d3] mb-4"></div>

                      <h4 className="font-bold text-slate-800 text-lg">
                        Luxury Apartment
                      </h4>

                      <p className="text-sm text-slate-500 mb-3">
                        Pune, Maharashtra
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#ff7438]">
                          ₹25,000/mo
                        </span>

                        <button className="px-4 py-2 rounded-xl bg-[#ff7438] text-white text-sm font-bold">
                          View
                        </button>
                      </div>
                    </div>

                    {/* MINI CARDS */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <p className="text-xs text-slate-500">
                          Listings
                        </p>

                        <h5 className="text-xl font-black text-slate-800">
                          5K+
                        </h5>
                      </div>

                      <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <p className="text-xs text-slate-500">
                          Users
                        </p>

                        <h5 className="text-xl font-black text-slate-800">
                          10K+
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FLOATING BADGE */}
                <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl px-5 py-3 border border-slate-100">
                  <p className="text-sm font-bold text-slate-800">
                    ⭐ 4.9 Rating
                  </p>

                  <p className="text-xs text-slate-500">
                    Trusted by users
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* FOOTER */}
      <footer
        id="contact"
        className="bg-slate-900 text-white py-12 px-4 md:px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BrandLogo size="md" />
              </div>

              <p className="text-slate-400 text-sm">
                India's first no-brokerage platform connecting property
                owners directly with tenants.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>

              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <button
                    onClick={() => navigate("/login")}
                    className="hover:text-[#ff7438] transition-colors"
                  >
                    Browse Properties
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => navigate("/login")}
                    className="hover:text-[#ff7438] transition-colors"
                  >
                    List Your Property
                  </button>
                </li>

              </ul>
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
            <p>© 2026 Caryanam. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* SCROLL TOP */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{
              opacity: 0,
              scale: 0,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-12 h-12 bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-slate-800/40 flex items-center justify-center z-50 transition-all duration-300 hover:scale-110"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
