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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { Loader2, ArrowLeft, Upload, X, CalendarIcon, Clock, Users } from 'lucide-react';
import { TagInput } from '@/components/creator/TagInput';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Event categories available for mini-events
const CATEGORIES = [
  { value: 'meetup', label: 'Meetup' },
  { value: 'screening', label: 'Watch Party / Screening' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'cosplay', label: 'Cosplay' },
  { value: 'competition', label: 'Competition' },
  { value: 'convention', label: 'Convention' },
  { value: 'concert', label: 'Concert' },
];

// Time options in 30-minute increments — PM first (events are usually in the afternoon/evening)
const TIME_OPTIONS = [];
// PM: 12:00 PM → 11:30 PM
for (let h = 12; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour = h.toString().padStart(2, '0');
    const min = m.toString().padStart(2, '0');
    const value = `${hour}:${min}`;
    const displayHour = h > 12 ? h - 12 : h;
    const label = `${displayHour}:${min} PM`;
    TIME_OPTIONS.push({ value, label });
  }
}
// AM: 12:00 AM → 11:30 AM
for (let h = 0; h < 12; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour = h.toString().padStart(2, '0');
    const min = m.toString().padStart(2, '0');
    const value = `${hour}:${min}`;
    const displayHour = h === 0 ? 12 : h;
    const label = `${displayHour}:${min} AM`;
    TIME_OPTIONS.push({ value, label });
  }
}

// Max attendees options
const CAPACITY_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

// Page for verified hosts (influencers) to create free mini-events.
// Creators and organizers can also use this page.
export default function CreateMiniEventPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const router = useRouter();

  // Form state — date stored as Date object for the calendar, converted to string on submit
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(null);
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [category, setCategory] = useState('meetup');
  const [maxCapacity, setMaxCapacity] = useState('5');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tags, setTags] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState(null);
  const [dateOpen, setDateOpen] = useState(false);

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

    if (!eventDate) {
      setError('Please select a date');
      setSubmitting(false);
      return;
    }
    if (!eventTime) {
      setError('Please select a time');
      setSubmitting(false);
      return;
    }

    try {
      // Tags are already an array from TagInput component
      const tagList = tags;

      // Convert Date object to YYYY-MM-DD string for the backend
      const dateString = format(eventDate, 'yyyy-MM-dd');

      const result = await eventApi.createEvent({
        title,
        description: description || null,
        eventDate: dateString,
        eventTime,
        location,
        locationUrl,
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
              <h1 className="text-2xl font-bold">Host a Mini-Event</h1>
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
                placeholder="What's the event about? What should people bring?"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </section>

            {/* Date + Time — shadcn popover calendar + select */}
            <div className="grid grid-cols-2 gap-4">
              <section className="space-y-2">
                <label className="text-sm font-medium">
                  Date <span className="text-red-500">*</span>
                </label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className={cn(
                        "w-full justify-start text-left font-normal rounded-lg h-10",
                        !eventDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, 'MMM d, yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => {
                        setEventDate(date);
                        setDateOpen(false);
                      }}
                      disabled={(date) => date < today}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </section>

              <section className="space-y-2">
                <label className="text-sm font-medium">
                  Time <span className="text-red-500">*</span>
                </label>
                {/* Hybrid: preset time slots + custom time input */}
                <Select
                  value={TIME_OPTIONS.some(t => t.value === eventTime) ? eventTime : 'custom'}
                  onValueChange={(val) => {
                    if (val === 'custom') {
                      setEventTime('');
                    } else {
                      setEventTime(val);
                    }
                  }}
                >
                  <SelectTrigger className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Pick a time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom...</SelectItem>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Scroll-wheel time picker when custom is selected */}
                {!TIME_OPTIONS.some(t => t.value === eventTime) && (
                  <div className="mt-2">
                    <TimePicker value={eventTime} onChange={setEventTime} placeholder="Pick exact time" />
                  </div>
                )}
              </section>
            </div>

            {/* Location name + Google Maps link */}
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
            <section className="space-y-2">
              <label className="text-sm font-medium">
                Google Maps Link <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                required
                placeholder="https://maps.google.com/..."
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </section>

            {/* Category + Max Capacity — shadcn selects */}
            <div className="grid grid-cols-2 gap-4">
              <section className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              <section className="space-y-2">
                <label className="text-sm font-medium">Max Attendees</label>
                {/* Hybrid: dropdown presets + custom number input */}
                <Select
                  value={CAPACITY_OPTIONS.includes(Number(maxCapacity)) ? maxCapacity : 'custom'}
                  onValueChange={(val) => {
                    if (val === 'custom') {
                      setMaxCapacity('');
                    } else {
                      setMaxCapacity(val);
                    }
                  }}
                >
                  <SelectTrigger className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom...</SelectItem>
                    {CAPACITY_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} people</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Show number input when custom is selected */}
                {!CAPACITY_OPTIONS.includes(Number(maxCapacity)) && (
                  <input
                    type="number"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    min={2}
                    placeholder="Enter number"
                    autoFocus
                    className="w-full mt-2 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </section>
            </div>

            {/* Tags — reuses the chip-style TagInput from portfolio */}
            <section className="space-y-2">
              <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(optional)</span></label>
              <TagInput tags={tags} onChange={setTags} />
            </section>

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
                'Create Mini-Event'
              )}
            </Button>
          </form>

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
