import { useState, useEffect } from 'react';
import { supabase, Link } from '../lib/supabase';
import { Plus, Trash2, Edit2, GripVertical, Check, X, Eye, EyeOff } from 'lucide-react';

type LinkManagerProps = {
  userId: string;
};

export function LinkManager({ userId }: LinkManagerProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', url: '' });

  useEffect(() => {
    loadLinks();
  }, [userId]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();

    let url = formData.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      const maxPosition = links.length > 0 ? Math.max(...links.map(l => l.position)) : -1;

      const { error } = await supabase
        .from('links')
        .insert({
          user_id: userId,
          title: formData.title,
          url: url,
          position: maxPosition + 1,
          is_active: true,
        });

      if (error) throw error;

      setFormData({ title: '', url: '' });
      setShowAddForm(false);
      await loadLinks();
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const handleUpdateLink = async (id: string, updates: Partial<Link>) => {
    try {
      const { error } = await supabase
        .from('links')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await loadLinks();
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const handleToggleActive = async (link: Link) => {
    await handleUpdateLink(link.id, { is_active: !link.is_active });
  };

  const moveLink = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === links.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newLinks = [...links];
    const temp = newLinks[index];
    newLinks[index] = newLinks[newIndex];
    newLinks[newIndex] = temp;

    try {
      const updates = newLinks.map((link, idx) => ({
        id: link.id,
        position: idx,
      }));

      for (const update of updates) {
        await supabase
          .from('links')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      await loadLinks();
    } catch (error) {
      console.error('Error reordering links:', error);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading links...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Your Links</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddLink} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="My Website"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="example.com"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ title: '', url: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {links.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No links yet. Click "Add Link" to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
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
  onMove: (index: number, direction: 'up' | 'down') => void;
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
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Title"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="URL"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
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
    <div className={`p-4 border rounded-lg transition-all ${
      link.is_active
        ? 'bg-white border-gray-200'
        : 'bg-gray-50 border-gray-200 opacity-60'
    }`}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => onMove(index, 'down')}
            disabled={index === totalLinks - 1}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{link.title}</div>
          <div className="text-sm text-gray-500 truncate">{link.url}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleActive(link)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={link.is_active ? 'Hide link' : 'Show link'}
          >
            {link.is_active ? (
              <Eye className="w-4 h-4 text-gray-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={() => onEdit(link.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
