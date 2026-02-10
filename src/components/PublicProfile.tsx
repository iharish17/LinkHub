import { useState, useEffect } from "react";
import { supabase, Profile, Link } from "../lib/supabase";
import { ExternalLink, Link2, Globe } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { FaGithub, FaLinkedin, FaInstagram, FaYoutube } from "react-icons/fa";

type PublicProfileProps = {
  username: string;
};

export function PublicProfile({ username }: PublicProfileProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // if avatar image fails to load
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setNotFound(false);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: linksData, error: linksError } = await supabase
        .from("links")
        .select("*")
        .eq("user_id", profileData.id)
        .eq("is_active", true)
        .order("position", { ascending: true });

      if (linksError) throw linksError;

      setLinks(linksData || []);
    } catch (error) {
      console.error("Error loading profile:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // Detect icon based on URL
  const getLinkIcon = (url: string) => {
    const lower = url.toLowerCase();

    if (lower.includes("github.com")) {
      return <FaGithub className="w-5 h-5 text-gray-800" />;
    }

    if (lower.includes("linkedin.com")) {
      return <FaLinkedin className="w-5 h-5 text-blue-600" />;
    }

    if (lower.includes("instagram.com")) {
      return <FaInstagram className="w-5 h-5 text-pink-600" />;
    }

    if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
      return <FaYoutube className="w-5 h-5 text-red-600" />;
    }

    if (lower.includes("twitter.com") || lower.includes("x.com")) {
      return <FaXTwitter className="w-5 h-5 text-black" />;
    }

    return <Globe className="w-5 h-5 text-green-600" />;
  };

  const getInitials = () => {
    return (
      profile?.display_name?.[0]?.toUpperCase() ||
      profile?.username?.[0]?.toUpperCase() ||
      "U"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-700 font-medium">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-2xl mb-4">
            <Link2 className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Profile Not Found
          </h1>
          <p className="text-gray-600">
            The profile you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto animate-fadeIn">
        <div className="text-center mb-10">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            {profile?.avatar_url && !avatarError ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                onError={() => setAvatarError(true)}
                className="w-28 h-28 rounded-full object-cover shadow-xl border-4 border-white"
              />
            ) : (
              <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full text-white text-4xl font-extrabold shadow-xl">
                {getInitials()}
              </div>
            )}
          </div>

          {profile?.display_name && (
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              {profile.display_name}
            </h1>
          )}

          <p className="text-lg text-gray-600 mb-4 font-medium">
            @{profile?.username}
          </p>

          {profile?.bio && (
            <p className="text-gray-700 max-w-md mx-auto leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-4">
          {links.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium">
                No links available yet
              </p>
            </div>
          ) : (
            links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-5 bg-white/90 backdrop-blur-xl hover:bg-white border border-gray-200 hover:border-indigo-400 rounded-2xl transition-all duration-300 shadow-md hover:shadow-xl group hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gray-100 group-hover:bg-indigo-50 transition">
                      {getLinkIcon(link.url)}
                    </div>

                    <span className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {link.title}
                    </span>
                  </div>

                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </a>
            ))
          )}
        </div>

        <div className="text-center mt-14">
          <p className="text-sm text-gray-500">
            Create your own link page with{" "}
            <a
              href="/"
              className="text-indigo-600 hover:underline font-semibold"
            >
              LinkHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
