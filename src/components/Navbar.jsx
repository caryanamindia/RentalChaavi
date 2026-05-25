import { useNavigate } from "react-router-dom";
import { LogOut, MessageCircle } from "lucide-react";
import BrandLogo from "./BrandLogo";
 
const Navbar = ({ onOpenChat, chatCount = 0, userName = "" }) => {
  const navigate = useNavigate();
 
  const handleLogout = () => {
    const adminToken = localStorage.getItem("adminToken");
    const ownerToken = localStorage.getItem("ownerToken");
    const userToken = localStorage.getItem("userToken");
 
    if (adminToken) {
      try {
        const adminChannel = new BroadcastChannel("admin-auth");
        adminChannel.postMessage("logout");
        adminChannel.close();
      } catch {
        // ignore
      }
      localStorage.removeItem("adminToken");
      localStorage.setItem("adminLogout", Date.now());
    }
 
    if (ownerToken) {
      try {
        const ownerChannel = new BroadcastChannel("owner-auth");
        ownerChannel.postMessage("logout");
        ownerChannel.close();
      } catch {
        // ignore
      }
      localStorage.removeItem("ownerToken");
      localStorage.removeItem("ownerId");
      localStorage.setItem("ownerLogout", Date.now());
    }
 
    if (userToken) {
      const userEmail = localStorage.getItem("userEmail");
 
      try {
        const channelName = userEmail
          ? `user-auth-${userEmail}`
          : "user-auth";
 
        const userChannel =
          new BroadcastChannel(channelName);
 
        userChannel.postMessage("logout");
        userChannel.close();
      } catch {
        // ignore
      }
 
      localStorage.removeItem("userToken");
      localStorage.setItem("userLogout", Date.now());
    }
 
    window.location.href = "/login";
  };
 
  const isAdmin = Boolean(
    localStorage.getItem("adminToken")
  );
 
  return (
  <div className="flex justify-between items-center gap-2 px-2.5 sm:px-5 md:px-6 py-3 sm:py-4 bg-black/90 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] w-full overflow-hidden">
   
    {/* Logo Section */}
    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
      <BrandLogo size="sm" />
    </div>
 
    {/* Right Section */}
    <div className="flex items-center gap-1.5 sm:gap-4 text-sm ml-1 flex-shrink-0">
     
      {/* Username */}
      {userName && (
        <span className="hidden sm:block text-white font-semibold tracking-wide whitespace-nowrap max-w-[120px] md:max-w-none truncate">
          {userName}
        </span>
      )}
 
      {/* Chat Button */}
      {typeof onOpenChat === "function" && (
        <button
          onClick={() => onOpenChat()}
          className="relative text-[#E2E8F0] hover:text-[#F97316] transition-all duration-300 flex-shrink-0"
          title="Messages"
        >
          <MessageCircle size={21} />
 
          {chatCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-[10px] flex items-center justify-center font-bold shadow-lg">
              {chatCount}
            </span>
          )}
        </button>
      )}
 
      {/* Logout Button */}
      <button
  onClick={handleLogout}
  className="flex items-center justify-center px-2.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r bg-red-600 hover:bg-red-700 hover:opacity-95 text-white font-semibold rounded-lg sm:rounded-xl shadow-[0_10px_25px_rgba(249,115,22,0.35)] transition-all duration-300 active:scale-95"
>
  <LogOut size={17} />
 
  {/* Hide text on mobile */}
  <span className="hidden sm:block ml-2">Logout</span>
</button>
    </div>
  </div>
);
};
 
export default Navbar;