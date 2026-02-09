import { useState, useEffect } from 'react';
import { supabase, Profile, Link } from '../lib/supabase';
import { ExternalLink, Link2 } from 'lucide-react';

type PublicProfileProps = {
  username: string;
};

export function PublicProfile({ username }: PublicProfileProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (linksError) throw linksError;

      setLinks(linksData || []);
    } catch (error) {
      console.error('Error loading profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-2xl mb-4">
            <Link2 className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">The profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 text-white text-3xl font-bold">
            {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'U'}
          </div>

          {profile?.display_name && (
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {profile.display_name}
            </h1>
          )}

          <p className="text-lg text-gray-600 mb-3">@{profile?.username}</p>

          {profile?.bio && (
            <p className="text-gray-700 max-w-md mx-auto leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {links.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No links available yet</p>
            </div>
          ) : (
            links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-5 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {link.title}
                  </span>
                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </a>
            ))
          )}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Create your own link page with{' '}
            <a href="/" className="text-blue-600 hover:underline font-medium">
              LinkHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
