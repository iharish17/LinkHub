import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { LinkManager } from "./LinkManager";
import {
  LogOut,
  Copy,
  Check,
  ExternalLink,
  Upload,
  Trash2,
  Eye,
  MousePointerClick,
} from "lucide-react";
import toast from "react-hot-toast";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
}

export function Dashboard() {
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteAvatarModal, setShowDeleteAvatarModal] = useState(false);

  // ✅ Analytics
  const [totalViews, setTotalViews] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
    } catch (err: Error | unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Error fetching profile");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ✅ Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { count: viewsCount } = await supabase
        .from("profile_views")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id);

      const { count: clicksCount } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id);

      setTotalViews(viewsCount || 0);
      setTotalClicks(clicksCount || 0);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  useEffect(() => {
    if (profile?.id) fetchAnalytics();
  }, [profile?.id, fetchAnalytics]);

  const handleSaveProfile = async () => {
    if (!profile) return;

    if (!profile.username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    if (profile.username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(profile.username)) {
      setError(
        "Username can only contain letters, numbers, underscores, and hyphens"
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const toastId = toast.loading("Saving profile...");

      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username.toLowerCase().trim(),
          display_name: displayName,
          bio: bio,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Profile Updated Successfully ✅", { id: toastId });
      await fetchProfile();
    } catch (err: Error | unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Error updating profile");
      toast.error(error.message || "Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const profileUrl = profile?.username
    ? `${window.location.origin}/${profile.username}`
    : "";

  const copyToClipboard = async () => {
    if (!profileUrl) return;

    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Link copied 📌");

    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewProfile = () => {
    if (!profileUrl) return;

    // push a new entry and notify listeners so navigation happens without a full reload
    window.history.pushState(null, "", profileUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file ❌");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB ❌");
        return;
      }

      if (!user?.id) return;

      setUploadingAvatar(true);
      const toastId = toast.loading("Uploading avatar...");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated successfully 🎉", { id: toastId });

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
    } catch (err: Error | unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast.error(error.message || "Failed to upload avatar ❌");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Open the modal to confirm deletion
  const handleDeleteAvatar = () => {
    if (!profile?.avatar_url) {
      toast.error("No avatar to delete ❌");
      return;
    }

    setShowDeleteAvatarModal(true);
  };

  // Called when the user confirms deletion in the modal
  const confirmDeleteAvatar = async () => {
    setShowDeleteAvatarModal(false);

    try {
      const toastId = toast.loading("Deleting avatar...");

      const splitUrl = profile?.avatar_url?.split("/avatars/");

      if (!splitUrl || splitUrl.length < 2) {
        toast.error("Invalid avatar URL ❌", { id: toastId });
        return;
      }

      const filePath = splitUrl[1];

      const { error: deleteError } = await supabase.storage
        .from("avatars")
        .remove([filePath]);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: "" })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: "" } : prev));

      toast.success("Avatar deleted successfully 🗑️", { id: toastId });
    } catch (err: Error | unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast.error(error.message || "Failed to delete avatar ❌");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500">
              Manage your profile & links easily ✨
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleViewProfile}
              className="flex items-center gap-1 text-sm px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-rose-500 to-purple-500 text-white hover:from-rose-600 hover:to-purple-600 transition shadow-lg"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Profile
            </button>

            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition font-semibold text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-1 bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-pink-100/50 animate-slideInFromLeft">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Profile Settings
          </h2>

          {/* ✅ Analytics Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <Eye className="w-4 h-4" />
                Views
              </div>
              <p className="text-2xl font-extrabold text-gray-900 mt-2">
                {totalViews}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-2 text-purple-700 font-bold">
                <MousePointerClick className="w-4 h-4" />
                Clicks
              </div>
              <p className="text-2xl font-extrabold text-gray-900 mt-2">
                {totalClicks}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fadeIn">
              {error}
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-200 shadow-md bg-purple-50 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-extrabold text-rose-600">
                  {profile?.display_name?.[0]?.toUpperCase() ||
                    profile?.username?.[0]?.toUpperCase() ||
                    "U"}
                </span>
              )}
            </div>

            <label className="mt-4 cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-cyan-600 transition shadow-lg">
              <Upload className="w-4 h-4" />
              {uploadingAvatar ? "Uploading..." : "Upload Avatar"}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploadingAvatar}
              />
            </label>

            <p className="text-xs text-gray-500 mt-2">
              JPG/PNG only. Max 2MB.
            </p>

            {profile?.avatar_url && (
              <button
                onClick={handleDeleteAvatar}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete Avatar
              </button>
            )}
          </div>

          {/* Delete Avatar Confirmation Modal */}
          {showDeleteAvatarModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-full z-10 animate-zoomIn">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Delete Avatar
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete your avatar? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteAvatarModal(false)}
                    className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmDeleteAvatar}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Username */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Username
            </label>

            <input
              type="text"
              value={profile?.username || ""}
              onChange={(e) =>
                setProfile((prev) =>
                  prev
                    ? { ...prev, username: e.target.value.toLowerCase() }
                    : prev
                )
              }
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none transition-all bg-white/50"
              placeholder="username"
            />

            <p className="text-xs text-gray-500 mt-1">
              Only letters, numbers, _ and - allowed.
            </p>
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Display Name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none transition-all bg-white/50"
              placeholder="Your name"
            />
          </div>

          {/* Bio */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Bio
            </label>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none transition-all bg-white/50"
              placeholder="Write something about you..."
              rows={3}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 hover:from-rose-600 hover:via-purple-600 hover:to-cyan-600"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          {/* Profile URL */}
          {profileUrl && (
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Your Profile Link
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={profileUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm"
                />

                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 transition"
                  title="Copy Link"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-700" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2">
          {user?.id && <LinkManager userId={user.id} />}
        </div>
      </main>
    </div>
  );
}
