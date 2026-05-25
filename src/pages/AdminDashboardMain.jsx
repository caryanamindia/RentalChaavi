import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminModerationApi } from "../services/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Building2, Clock, LogOut, ShieldCheck, Users } from "lucide-react";
import BrandLogo from "../components/BrandLogo";

const OWNER_APPROVAL_STATUS_KEY = "ownerApprovalStatuses";

const writeOwnerApprovalStatus = (owner, status) => {
  const ownerId = owner?.ownerId ?? owner?.id ?? owner;
  const ownerEmail = String(owner?.email || "").toLowerCase().trim();
  if (!ownerId && !ownerEmail) return;
  let approvalStatuses = {};
  try {
    approvalStatuses = JSON.parse(localStorage.getItem(OWNER_APPROVAL_STATUS_KEY) || "{}");
  } catch {
    approvalStatuses = {};
  }
  if (ownerId) approvalStatuses[String(ownerId)] = status;
  if (ownerEmail) approvalStatuses[`email:${ownerEmail}`] = status;
  localStorage.setItem(OWNER_APPROVAL_STATUS_KEY, JSON.stringify(approvalStatuses));
  // Trigger storage event for cross-tab sync
  window.dispatchEvent(new StorageEvent('storage', {
    key: OWNER_APPROVAL_STATUS_KEY,
    newValue: JSON.stringify(approvalStatuses),
    oldValue: localStorage.getItem(OWNER_APPROVAL_STATUS_KEY),
    url: window.location.href,
    storageArea: localStorage
  }));
};

const AdminDashboardMain = () => {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingOwners, setPendingOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.setItem("adminLogout", Date.now().toString());
    const channel = new BroadcastChannel("admin-auth");
    channel.postMessage("logout");
    channel.close();
    navigate("/login");
  };

  const loadPendingData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [usersRes, ownersRes] = await Promise.all([
        adminModerationApi.getPendingUsers(),
        adminModerationApi.getPendingOwners(),
      ]);
      setPendingUsers(Array.isArray(usersRes?.data) ? usersRes.data : usersRes?.data?.data || []);
      setPendingOwners(Array.isArray(ownersRes?.data) ? ownersRes.data : ownersRes?.data?.data || []);
    } catch (error) {
      if (!silent) {
        toast.error(error?.response?.data?.message || "Failed to load admin data");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingData();
  }, []);

  const handleDecision = async ({ id, type, approve, owner }) => {
    const actionKey = `${type}-${id}-${approve ? "approve" : "reject"}`;
    setActionLoading(actionKey);
    try {
      if (type === "user") {
        if (approve) await adminModerationApi.approveUserPremium(id);
        else await adminModerationApi.rejectUserPremium(id);
      } else if (type === "property") {
        // Use property title from the existing data
        const propertyTitle = owner?.title || "property";

        if (approve) {
          await adminModerationApi.approveProperty(id);
          toast.success(`Property "${propertyTitle}" approved successfully`);
        } else {
          await adminModerationApi.rejectProperty(id);
          toast.success(`Property "${propertyTitle}" rejected successfully`);
        }
      } else {
        // Fallback to owner-level approval (old behavior)
        const ownerData = pendingOwners.find(o => (o?.ownerId ?? o?.id) === id);
        const currentStatus = String(ownerData?.premiumStatus || "").toUpperCase();
        const isAlreadyApproved = currentStatus.includes("APPROVED");

        if (isAlreadyApproved) {
          writeOwnerApprovalStatus(owner || id, "APPROVED");
          toast.success("Owner is already premium - no additional approval needed");
        } else {
          if (approve) {
            await adminModerationApi.approveOwnerPremium(id);
            writeOwnerApprovalStatus(owner || id, "APPROVED");
          } else {
            await adminModerationApi.rejectOwnerPremium(id);
            writeOwnerApprovalStatus(owner || id, "REJECTED");
          }
          const propertyTitle = owner?.title || "property";
          toast.success(`Property "${propertyTitle}" ${approve ? "approved" : "rejected"} successfully`);
        }
      }
      await loadPendingData();
    } catch (error) {
      if (error?.response?.data?.message?.includes("already approved")) {
        writeOwnerApprovalStatus(owner || id, "APPROVED");
        toast.success("Already approved - no additional action needed");
        await loadPendingData();
      } else {
        toast.error(error?.response?.data?.message || "Action failed");
      }
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f0e8] flex flex-col">
      <div className="flex justify-between items-center gap-2 px-3 sm:px-5 md:px-6 py-3 sm:py-4 bg-black/90 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <BrandLogo size="sm" />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-[0_12px_24px_rgba(220,38,38,0.28)] transition-all duration-300 active:scale-95"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto p-3 sm:p-5 md:p-6 flex-grow">
        <div className="mb-5">
       
          <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#1a1a1a]">Admin Dashboard</h2>
          <p className="text-[#f97316] mt-1">Approve or reject premium users and property requests.</p>
        </div>

        <div className="mb-8 rounded-[20px] sm:rounded-[24px] border border-white/10 bg-black/90 p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)]">
          <div className="flex justify-end">
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:w-auto">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[#f97316]">
                  <Users size={17} />
                  <span className="text-xs font-semibold uppercase">Users</span>
                </div>
                <p className="mt-1 text-2xl font-black text-white">{pendingUsers.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[#f97316]">
                  <Building2 size={17} />
                  <span className="text-xs font-semibold uppercase">Properties</span>
                </div>
                <p className="mt-1 text-2xl font-black text-white">{pendingOwners.length}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-[#ff7a00]/30 bg-black/40 px-4 py-3 text-white sm:col-span-1">
                <div className="flex items-center gap-2 text-[#f97316]">
                  <Clock size={17} />
                  <span className="text-xs font-semibold uppercase">Pending</span>
                </div>
                <p className="mt-1 text-2xl font-black">{pendingUsers.length + pendingOwners.length}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[24px] border-2 border-[#d8c2a8] bg-[#fff7ed] p-6 text-[#7d6c5c] shadow-[0_25px_80px_rgba(0,0,0,0.12)]">Loading pending requests...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] sm:rounded-[24px] border-2 border-[#d8c2a8] bg-[#fff7ed] p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.16)]">
              <h3 className="text-xl font-bold mb-4 text-[#1a1a1a]">
                Pending Users ({pendingUsers.length})
              </h3>
              {pendingUsers.length === 0 ? (
                <p className="text-[#7d6c5c]">No pending users</p>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((user) => {
                    const id = user?.userId ?? user?.id;
                    const keyPrefix = `user-${id}`;
                    return (
                      <div key={keyPrefix} className="rounded-2xl border border-[#d9c7b2] bg-[#f9f3ed] p-4">
                        <p className="font-semibold text-[#1a1a1a]">{user?.fullName || "Unnamed User"}</p>
                        <p className="text-sm text-[#7d6c5c]">{user?.email || "-"}</p>
                        <p className="text-sm text-[#7d6c5c]">{user?.mobileNumber || "-"}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleDecision({ id, type: "user", approve: true })}
                            disabled={actionLoading === `${keyPrefix}-approve`}
                            className="px-4 py-2 text-sm bg-[#198754] text-white rounded-xl hover:bg-[#157347] disabled:bg-[#c9af91] font-semibold transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecision({ id, type: "user", approve: false })}
                            disabled={actionLoading === `${keyPrefix}-reject`}
                            className="px-4 py-2 text-sm bg-[#dc3545] text-white rounded-xl hover:bg-[#bb2d3b] disabled:bg-[#c9af91] font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[20px] sm:rounded-[24px] border-2 border-[#d8c2a8] bg-[#fff7ed] p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.16)]">
              <h3 className="text-xl font-bold mb-4 text-[#1a1a1a]">
                Pending Property Approvals ({pendingOwners.length})
              </h3>
              <p className="text-sm text-[#7d6c5c] mb-4">
                Properties awaiting payment verification and admin approval
              </p>
              {pendingOwners.length === 0 ? (
                <p className="text-[#7d6c5c]">No pending property approvals</p>
              ) : (
                <div className="space-y-3">
                  {pendingOwners.map((item) => {
                    const propertyId = item?.propertyId;
                    const keyPrefix = `property-${propertyId}`;
                    return (
                      <div key={keyPrefix} className="rounded-2xl border border-[#d9c7b2] bg-[#f9f3ed] p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-[#1a1a1a]">{item?.title || "Untitled Property"}</p>
                            <p className="text-xs text-[#7d6c5c] mt-1">Property ID: {propertyId || "-"}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            item?.paymentStatus?.toUpperCase() === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            item?.paymentStatus?.toUpperCase() === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item?.paymentStatus?.toUpperCase() || "PENDING"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-sm text-[#5d5145] mb-3 sm:grid-cols-2">
                          <div>
                            <span className="font-medium">Owner:</span> {item?.fullName || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {item?.email || "-"}
                          </div>
                          <div>
                            <span className="font-medium">City:</span> {item?.city || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {item?.location || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Type:</span> {item?.propertyType || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Price:</span> {item?.price ? `Rs. ${Number(item.price).toLocaleString()}` : "-"}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleDecision({ id: propertyId, type: "property", approve: true, owner: item })}
                            disabled={actionLoading === `${keyPrefix}-approve`}
                            className="flex-1 px-3 py-2 text-sm bg-[#198754] text-white rounded-xl hover:bg-[#157347] disabled:bg-[#c9af91] font-semibold transition-colors"
                          >
                            {actionLoading === `${keyPrefix}-approve` ? "Approving..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleDecision({ id: propertyId, type: "property", approve: false, owner: item })}
                            disabled={actionLoading === `${keyPrefix}-reject`}
                            className="flex-1 px-3 py-2 text-sm bg-[#dc3545] text-white rounded-xl hover:bg-[#bb2d3b] disabled:bg-[#c9af91] font-semibold transition-colors"
                          >
                            {actionLoading === `${keyPrefix}-reject` ? "Rejecting..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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

export default AdminDashboardMain;

