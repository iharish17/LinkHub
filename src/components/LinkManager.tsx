import { useState, useEffect } from "react";
import { supabase, Link } from "../lib/supabase";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { FaXTwitter } from "react-icons/fa6";
import {
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaYoutube,
  FaFacebook,
  FaSnapchatGhost,
  FaDiscord,
  FaTelegram,
  FaWhatsapp,
  FaGlobe,
  FaPinterest,
  FaTiktok,
  FaReddit,
  FaMedium,
  FaStackOverflow,
  FaGoogleDrive,
} from "react-icons/fa";

type LinkManagerProps = {
  userId: string;
};

type PopularLink = {
  name: string;
  url: string;
  icon: JSX.Element;
};

const popularLinks: PopularLink[] = [
  { name: "GitHub", url: "https://github.com/", icon: <FaGithub className="text-black w-5 h-5" /> },
  { name: "LinkedIn", url: "https://linkedin.com/in/", icon: <FaLinkedin className="text-blue-600 w-5 h-5" /> },
  { name: "Instagram", url: "https://instagram.com/", icon: <FaInstagram className="text-pink-600 w-5 h-5" /> },
  { name: "YouTube", url: "https://youtube.com/", icon: <FaYoutube className="text-red-600 w-5 h-5" /> },
  { name: "Facebook", url: "https://facebook.com/", icon: <FaFacebook className="text-blue-700 w-5 h-5" /> },
  { name: "Twitter", url: "https://twitter.com/", icon: <FaXTwitter className="text-black w-5 h-5" /> },
  { name: "TikTok", url: "https://tiktok.com/@", icon: <FaTiktok className="text-black w-5 h-5" /> },
  { name: "Pinterest", url: "https://pinterest.com/", icon: <FaPinterest className="text-red-500 w-5 h-5" /> },
  { name: "Reddit", url: "https://reddit.com/user/", icon: <FaReddit className="text-orange-600 w-5 h-5" /> },
  { name: "Snapchat", url: "https://snapchat.com/add/", icon: <FaSnapchatGhost className="text-yellow-400 w-5 h-5" /> },
  { name: "Discord", url: "https://discord.gg/", icon: <FaDiscord className="text-indigo-600 w-5 h-5" /> },
  { name: "Telegram", url: "https://t.me/", icon: <FaTelegram className="text-sky-600 w-5 h-5" /> },
  { name: "WhatsApp", url: "https://wa.me/", icon: <FaWhatsapp className="text-green-600 w-5 h-5" /> },
  { name: "Medium", url: "https://medium.com/@", icon: <FaMedium className="text-black w-5 h-5" /> },
  { name: "Stack Overflow", url: "https://stackoverflow.com/users/", icon: <FaStackOverflow className="text-orange-500 w-5 h-5" /> },
  { name: "Google Drive", url: "https://drive.google.com/", icon: <FaGoogleDrive className="text-green-600 w-5 h-5" /> },
  { name: "Portfolio Website", url: "https://", icon: <FaGlobe className="text-green-600 w-5 h-5" /> },
];

export function LinkManager({ userId }: LinkManagerProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPopularModal, setShowPopularModal] = useState(false);
  const [formData, setFormData] = useState({ title: "", url: "" });

  useEffect(() => {
    loadLinks();
  }, [userId]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error loading links:", error);
      toast.error("Failed to load links ❌");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();

    let url = formData.url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      const toastId = toast.loading("Adding link...");

      const maxPosition =
        links.length > 0 ? Math.max(...links.map((l) => l.position)) : -1;

      const { error } = await supabase.from("links").insert({
        user_id: userId,
        title: formData.title,
        url: url,
        position: maxPosition + 1,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Link added ✅", { id: toastId });

      setFormData({ title: "", url: "" });
      setShowAddForm(false);
      await loadLinks();
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Failed to add link ❌");
    }
  };

  const handleUpdateLink = async (id: string, updates: Partial<Link>) => {
    try {
      const toastId = toast.loading("Updating link...");

      const { error } = await supabase.from("links").update(updates).eq("id", id);

      if (error) throw error;

      toast.success("Link updated ✅", { id: toastId });
      await loadLinks();
    } catch (error) {
      console.error("Error updating link:", error);
      toast.error("Failed to update link ❌");
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const toastId = toast.loading("Deleting link...");

      const { error } = await supabase.from("links").delete().eq("id", id);

      if (error) throw error;

      toast.success("Link deleted 🗑️", { id: toastId });
      await loadLinks();
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to delete link ❌");
    }
  };

  const handleToggleActive = async (link: Link) => {
    await handleUpdateLink(link.id, { is_active: !link.is_active });
  };

  const moveLink = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === links.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newLinks = [...links];
    const temp = newLinks[index];
    newLinks[index] = newLinks[newIndex];
    newLinks[newIndex] = temp;

    try {
      for (let i = 0; i < newLinks.length; i++) {
        await supabase
          .from("links")
          .update({ position: i })
          .eq("id", newLinks[i].id);
      }

      await loadLinks();
    } catch (error) {
      console.error("Error reordering links:", error);
      toast.error("Failed to reorder ❌");
    }
  };

  const handleSelectPopular = (link: PopularLink) => {
    setFormData({
      title: link.name,
      url: link.url,
    });

    setShowPopularModal(false);
    setShowAddForm(true);

    toast.success(`${link.name} selected ✅`);
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200 shadow-lg p-6">
        <p className="text-gray-600 font-medium">Loading links...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Your Links</h2>
          <p className="text-xs text-gray-500">
            Add, edit, reorder and hide your links
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowPopularModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow hover:bg-gray-800 transition-all font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            Popular Links
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>
      </div>

      {/* Popular Links Modal */}
      {showPopularModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-extrabold text-gray-900">
                Popular Links
              </h3>

              <button
                onClick={() => setShowPopularModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {popularLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleSelectPopular(link)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition font-semibold text-gray-800"
                >
                  <div className="p-2 rounded-xl bg-gray-100">{link.icon}</div>
                  <span className="text-sm">{link.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Link Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddLink}
          className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-200 animate-fadeIn"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
                placeholder="My Website"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
                placeholder="example.com"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
              >
                Add Link
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ title: "", url: "" });
                }}
                className="px-5 py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {links.length === 0 ? (
        <div className="text-center py-14 text-gray-500">
          <p className="font-medium">
            No links yet. Click "Add Link" to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link, index) => (
            <LinkItem
              key={link.id}
              link={link}
              index={index}
              totalLinks={links.length}
              editingId={editingId}
              onEdit={setEditingId}
              onUpdate={handleUpdateLink}
              onDelete={handleDeleteLink}
              onToggleActive={handleToggleActive}
              onMove={moveLink}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type LinkItemProps = {
  link: Link;
  index: number;
  totalLinks: number;
  editingId: string | null;
  onEdit: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Link>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (link: Link) => Promise<void>;
  onMove: (index: number, direction: "up" | "down") => void;
};

function LinkItem({
  link,
  index,
  totalLinks,
  editingId,
  onEdit,
  onUpdate,
  onDelete,
  onToggleActive,
  onMove,
}: LinkItemProps) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const isEditing = editingId === link.id;

  const handleSave = async () => {
    await onUpdate(link.id, { title, url });
    onEdit(null);
  };

  const handleCancel = () => {
    setTitle(link.title);
    setUrl(link.url);
    onEdit(null);
  };

  if (isEditing) {
    return (
      <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-sm animate-fadeIn">
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
            placeholder="Title"
          />

          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
            placeholder="URL"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
            >
              <Check className="w-4 h-4" />
              Save
            </button>

            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-semibold"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-5 border rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md ${
        link.is_active
          ? "bg-white border-gray-200"
          : "bg-gray-50 border-gray-200 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onMove(index, "up")}
            disabled={index === 0}
            className="p-2 hover:bg-gray-100 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ArrowUp className="w-4 h-4 text-gray-500" />
          </button>

          <button
            onClick={() => onMove(index, "down")}
            disabled={index === totalLinks - 1}
            className="p-2 hover:bg-gray-100 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ArrowDown className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 truncate">{link.title}</div>
          <div className="text-sm text-gray-500 truncate">{link.url}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleActive(link)}
            className="p-2 hover:bg-gray-100 rounded-xl transition"
            title={link.is_active ? "Hide link" : "Show link"}
          >
            {link.is_active ? (
              <Eye className="w-4 h-4 text-gray-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <button
            onClick={() => onEdit(link.id)}
            className="p-2 hover:bg-gray-100 rounded-xl transition"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>

          <button
            onClick={() => onDelete(link.id)}
            className="p-2 hover:bg-red-50 rounded-xl transition"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
