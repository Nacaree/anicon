'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { eventApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { canCreateMiniEvent } from '@/lib/roles';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Upload, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Event categories available for mini-events
const CATEGORIES = [
  { value: 'meetup', label: 'Meetup' },
  { value: 'screening', label: 'Watch Party / Screening' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'competition', label: 'Competition' },
  { value: 'convention', label: 'Convention' },
  { value: 'concert', label: 'Concert' },
];

// Page for verified hosts (influencers) to create free mini-events.
// Creators and organizers can also use this page.
export default function CreateMiniEventPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('meetup');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tags, setTags] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState(null);

  // Redirect: not authenticated → login
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
    }
  }, [authLoading, profile, router]);

  // Redirect: fan without hosting permission → become-host
  useEffect(() => {
    if (!authLoading && profile && !canCreateMiniEvent(profile.roles)) {
      router.push('/become-host');
    }
  }, [authLoading, profile, router]);

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Cover image must be under 10MB');
      return;
    }

    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `event-${Date.now()}.${ext}`;
      // Store event covers in the user's portfolio bucket subfolder
      const path = `${profile.id}/events/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(path);

      setCoverImageUrl(publicUrl);
    } catch (err) {
      console.error('Cover upload failed:', err);
      setError('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Parse tags from comma-separated string
      const tagList = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const result = await eventApi.createEvent({
        title,
        description: description || null,
        eventDate,
        eventTime,
        location,
        category,
        // Mini-events are always free — hardcoded
        eventType: 'mini_event',
        isFree: true,
        ticketPrice: null,
        maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
        coverImageUrl: coverImageUrl || null,
        tags: tagList.length > 0 ? tagList : null,
      });

      // Navigate to the newly created event's detail page
      router.push(`/events/${result.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  // Today's date as min value for the date picker
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
        <Header />
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-6 space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/events">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Host a Meetup</h1>
              <p className="text-sm text-muted-foreground">Create a free community gathering for anime fans</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Cover Image */}
            <section className="space-y-2">
              <label className="text-sm font-medium">Cover Image</label>
              <div className={`relative h-40 rounded-xl overflow-hidden group ${coverImageUrl ? 'bg-muted' : 'border-2 border-dashed border-muted-foreground/30 bg-muted/50'}`}>
                {coverImageUrl ? (
                  <>
                    <Image src={coverImageUrl} alt="Event cover" fill className="object-cover" />
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl('')}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    {uploadingCover ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs">Upload cover image</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                      disabled={uploadingCover}
                    />
                  </label>
                )}
              </div>
            </section>

            {/* Title */}
            <section className="space-y-2">
              <label className="text-sm font-medium">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
                placeholder="e.g., Naruto Watch Party, Cosplay Photoshoot"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </section>

            {/* Description */}
            <section className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What's the meetup about? What should people bring?"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </section>

            {/* Date + Time — side by side */}
            <div className="grid grid-cols-2 gap-4">
              <section className="space-y-2">
                <label className="text-sm font-medium">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  min={today}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </section>
              <section className="space-y-2">
                <label className="text-sm font-medium">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </section>
            </div>

            {/* Location */}
            <section className="space-y-2">
              <label className="text-sm font-medium">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="e.g., Brown Coffee, BKK1"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </section>

            {/* Category + Max Capacity — side by side */}
            <div className="grid grid-cols-2 gap-4">
              <section className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </section>
              <section className="space-y-2">
                <label className="text-sm font-medium">Max Attendees</label>
                <input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  min={2}
                  max={50}
                  placeholder="No limit"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[11px] text-muted-foreground">Recommended: 5-20 for a cozy meetup</p>
              </section>
            </div>

            {/* Tags */}
            <section className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., naruto, cosplay, watch-party (comma separated)"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </section>

            {/* Free event badge — informational */}
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <span className="text-lg">🎉</span>
              Community meetups are always free. Attendees can join with one click.
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || uploadingCover}
              className="w-full rounded-full hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Meetup'
              )}
            </Button>
          </form>

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
