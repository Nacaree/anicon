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
import { isCreator, isOrganizer, canHaveCommissions, canHaveSupportLinks } from '@/lib/roles';
import { Loader2, Plus, Trash2, Upload, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Settings page for editing creator-specific profile fields:
// banner image, creator type, commission status/info, and support links
export default function CreatorSettingsPage() {
  const { profile, isLoading: authLoading, fetchProfile } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const router = useRouter();

  // Form state — initialized from the user's current profile
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [creatorType, setCreatorType] = useState('');
  const [commissionStatus, setCommissionStatus] = useState('closed');
  const [turnaround, setTurnaround] = useState('');
  const [terms, setTerms] = useState('');
  const [contactMethod, setContactMethod] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [supportLinks, setSupportLinks] = useState([]);

  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [message, setMessage] = useState(null);

  const creatorTypes = [
    { value: '', label: 'Not a creator' },
    { value: 'cosplayer', label: 'Cosplayer' },
    { value: 'digital_artist', label: 'Digital Artist' },
    { value: 'traditional_artist', label: 'Traditional Artist' },
    { value: 'crafter', label: 'Crafter' },
    { value: 'writer', label: 'Writer' },
  ];

  const supportLinkTypes = [
    { value: 'aba', label: 'ABA' },
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
    setBannerImageUrl(profile.bannerImageUrl || '');
    setCreatorType(profile.creatorType || '');
    setCommissionStatus(profile.commissionStatus || 'closed');
    setTurnaround(profile.commissionInfo?.turnaround || '');
    setTerms(profile.commissionInfo?.terms || '');
    setContactMethod(profile.commissionInfo?.contactMethod || '');
    setMenuItems(profile.commissionInfo?.menu || []);
    setSupportLinks(profile.supportLinks || []);
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

  // Commission menu item helpers
  const addMenuItem = () => {
    setMenuItems([...menuItems, { name: '', price: '', description: '' }]);
  };

  const updateMenuItem = (index, field, value) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItems(updated);
  };

  const removeMenuItem = (index) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  // Support link helpers
  const addSupportLink = () => {
    setSupportLinks([...supportLinks, { type: 'other', label: '', url: '' }]);
  };

  const updateSupportLink = (index, field, value) => {
    const updated = [...supportLinks];
    updated[index] = { ...updated[index], [field]: value };
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
        bannerImageUrl: bannerImageUrl || null,
        creatorType: creatorType || null,
        commissionStatus,
        commissionInfo: {
          menu: menuItems.filter((m) => m.name && m.price),
          turnaround: turnaround || null,
          terms: terms || null,
          contactMethod: contactMethod || null,
        },
        supportLinks: supportLinks.filter((l) => l.url),
      });

      // Re-fetch profile from backend so AuthContext has the updated data
      await fetchProfile();
      setMessage({ type: 'success', text: 'Profile updated!' });
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
  const showCreatorType = isCreator(roles);
  const showCommissions = canHaveCommissions(roles);
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
              <Button variant="ghost" size="icon">
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

          {/* Banner Image */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Banner Image</h2>
            <div className="relative h-40 rounded-xl overflow-hidden bg-muted">
              {bannerImageUrl ? (
                <Image src={bannerImageUrl} alt="Banner" fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
              )}
              {/* Upload overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
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
          </section>

          {/* Creator Type — only visible to creators */}
          {showCreatorType && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Creator Type</h2>
              <select
                value={creatorType}
                onChange={(e) => setCreatorType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {creatorTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </section>
          )}

          {/* Commission Settings — creators and influencers only */}
          {showCommissions && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Commission Settings</h2>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Status</label>
              <select
                value={commissionStatus}
                onChange={(e) => setCommissionStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="open">Open</option>
                <option value="waitlist">Waitlist</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Turnaround */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Turnaround time</label>
              <input
                type="text"
                placeholder="e.g. 1-2 weeks"
                value={turnaround}
                onChange={(e) => setTurnaround(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Contact method */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Contact method</label>
              <input
                type="text"
                placeholder="e.g. DM on Instagram"
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Terms */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Terms</label>
              <textarea
                placeholder="e.g. 50% upfront payment required"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Commission Menu Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Price menu</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMenuItem}
                  className="hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add item
                </Button>
              </div>
              {menuItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Name"
                    value={item.name}
                    onChange={(e) => updateMenuItem(i, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="text"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateMenuItem(i, 'price', e.target.value)}
                    className="w-24 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={() => removeMenuItem(i)}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
          )}

          {/* Support Links — everyone except organizers */}
          {showSupportLinks && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Support / Tip Links</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={addSupportLink}
                className="hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-3 h-3 mr-1" /> Add link
              </Button>
            </div>
            {supportLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-start">
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
            className="w-full hover:scale-[1.02] active:scale-[0.98] transition-all hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
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
