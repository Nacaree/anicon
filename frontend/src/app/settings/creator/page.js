'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { creatorApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import { canHaveSupportLinks } from '@/lib/roles';
import { Loader2, Plus, Trash2, Upload, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Settings page for editing profile fields:
// avatar, banner image, display name, bio, and support links
export default function CreatorSettingsPage() {
  const { profile, isLoading: authLoading, fetchProfile } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const router = useRouter();

  // Form state — initialized from the user's current profile
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [supportLinks, setSupportLinks] = useState([]);
  const [showSupportLinksToggle, setShowSupportLinksToggle] = useState(true);

  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState(null);

  const supportLinkTypes = [
    { value: 'aba', label: 'ABA' },
    { value: 'acleda', label: 'ACLEDA' },
    { value: 'wing', label: 'Wing' },
    { value: 'kofi', label: 'Ko-fi' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'patreon', label: 'Patreon' },
    { value: 'other', label: 'Other' },
  ];

  // Populate form from existing profile data
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setBio(profile.bio || '');
    setAvatarUrl(profile.avatarUrl || '');
    setBannerImageUrl(profile.bannerImageUrl || '');
    setSupportLinks(profile.supportLinks || []);
    setShowSupportLinksToggle(profile.showSupportLinks ?? true);
  }, [profile]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
    }
  }, [authLoading, profile, router]);

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Banner must be under 10MB' });
      return;
    }

    setUploadingBanner(true);
    try {
      const filename = `banner-${Date.now()}.${file.name.split('.').pop()}`;
      const path = `${profile.id}/${filename}`;

      const { error } = await supabase.storage
        .from('portfolio')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(path);

      setBannerImageUrl(publicUrl);
    } catch (err) {
      console.error('Banner upload failed:', err);
      setMessage({ type: 'error', text: 'Failed to upload banner' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Avatar must be under 5MB' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const filename = `avatar-${Date.now()}.${file.name.split('.').pop()}`;
      const path = `${profile.id}/${filename}`;

      const { error } = await supabase.storage
        .from('portfolio')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(path);

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setMessage({ type: 'error', text: 'Failed to upload avatar' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Support link helpers
  const addSupportLink = () => {
    setSupportLinks([...supportLinks, { type: 'other', label: '', url: '' }]);
  };

  const updateSupportLink = (index, field, value) => {
    const updated = [...supportLinks];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-fill label from the type name when the user changes the type dropdown,
    // but only if the label is currently empty — avoids overwriting custom labels
    if (field === 'type' && !updated[index].label) {
      const match = supportLinkTypes.find((t) => t.value === value);
      if (match) updated[index].label = match.label;
    }
    setSupportLinks(updated);
  };

  const removeSupportLink = (index) => {
    setSupportLinks(supportLinks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await creatorApi.updateCreatorProfile({
        displayName: displayName || null,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        bannerImageUrl: bannerImageUrl || null,
        bannerPositionY: profile.bannerPositionY ?? 50,
        creatorType: profile.creatorType || null,
        commissionStatus: profile.commissionStatus || 'closed',
        commissionInfo: profile.commissionInfo || {},
        supportLinks: supportLinks.filter((l) => l.url),
        showSupportLinks: showSupportLinksToggle,
      });

      // Re-fetch profile from backend so AuthContext has the updated data
      await fetchProfile();
      // Navigate back to the user's profile page after a successful save
      router.push(`/profiles/${profile.username}`);
    } catch (err) {
      console.error('Save failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return null;

  // Role checks — determines which sections are visible
  const roles = profile?.roles || [];
  const showSupportLinks = canHaveSupportLinks(roles);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
        <Header />
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-6 space-y-8">

          {/* Header — title adapts to user's role */}
          <div className="flex items-center gap-3">
            <Link href={`/profiles/${profile?.username}`}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Edit Profile</h1>
          </div>

          {/* Display Name */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Display Name</h2>
            <input
              type="text"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </section>

          {/* Bio */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Bio</h2>
            <textarea
              placeholder="Tell people about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </section>

          {/* Profile Picture + Banner Image — side by side to save vertical space */}
          <section className="space-y-3">
            <div className="flex gap-6">
              {/* Profile Picture */}
              <div className="space-y-2 shrink-0">
                <h2 className="text-lg font-semibold">Profile Picture</h2>
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted group">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-2xl font-bold">
                      {profile?.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  {/* Upload overlay */}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                    {uploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
              </div>

              {/* Banner Image */}
              <div className="space-y-2 flex-1 min-w-0">
                <h2 className="text-lg font-semibold">Banner Image</h2>
                <div className={`relative h-32 rounded-xl overflow-hidden group ${bannerImageUrl ? 'bg-muted' : 'border-2 border-dashed border-muted-foreground/30 bg-muted/50'}`}>
                  {bannerImageUrl ? (
                    <Image src={bannerImageUrl} alt="Banner" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs">Upload banner</span>
                    </div>
                  )}
                  {/* Upload overlay */}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                    {uploadingBanner ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                      disabled={uploadingBanner}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Support Links — everyone except pure organizers */}
          {showSupportLinks && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Support / Tip Links</h2>
                {/* Toggle to show/hide support links on the public profile */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={showSupportLinksToggle}
                  onClick={() => setShowSupportLinksToggle(!showSupportLinksToggle)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    showSupportLinksToggle ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      showSupportLinksToggle ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs text-muted-foreground">
                  {showSupportLinksToggle ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addSupportLink}
                className="rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-3 h-3" /> Add link
              </Button>
            </div>
            {supportLinks.map((link, i) => (
              <div key={i} className={`flex gap-2 items-start ${!showSupportLinksToggle ? 'opacity-50' : ''}`}>
                <select
                  value={link.type}
                  onChange={(e) => updateSupportLink(i, 'type', e.target.value)}
                  className="w-28 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {supportLinkTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Label"
                  value={link.label}
                  onChange={(e) => updateSupportLink(i, 'label', e.target.value)}
                  className="w-28 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => updateSupportLink(i, 'url', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => removeSupportLink(i)}
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </section>
          )}

          {/* Save */}
          {message && (
            <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
              {message.text}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
