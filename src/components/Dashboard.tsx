import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { LinkManager } from "../components/LinkManager";
import { LogOut, Copy, Check, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
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
    } catch (err: any) {
      setError(err.message || "Error fetching profile");
    } finally {
      setLoading(false);
    }
  };

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

      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username.toLowerCase().trim(),
          display_name: displayName,
          bio: bio,
        })
        .eq("id", user?.id);

      if (error) throw error;

      alert("Profile Updated Successfully ✅");
    } catch (err: any) {
      setError(err.message || "Error updating profile");
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

    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewProfile = () => {
    if (!profileUrl) return;
    window.open(profileUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Username Editable */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="username"
            />

            <p className="text-xs text-gray-500 mt-1">
              Only letters, numbers, _ and - allowed.
            </p>
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Your name"
            />
          </div>

          {/* Bio */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Write something about you..."
              rows={3}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          {/* Profile URL */}
          {profileUrl && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Profile Link
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={profileUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm"
                />

                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition"
                  title="Copy Link"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-700" />
                  )}
                </button>
              </div>

              {/* View Public Profile Button */}
              <button
                onClick={handleViewProfile}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                <ExternalLink className="w-4 h-4" />
                View Public Profile
              </button>
            </div>
          )}
        </div>

        {/* Link Manager */}
        <div className="lg:col-span-2">
          {user?.id && <LinkManager userId={user.id} />}
        </div>
      </main>
    </div>
  );
}
