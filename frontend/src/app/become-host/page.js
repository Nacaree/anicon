'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { influencerApi } from '@/lib/api';
import { isInfluencer, canApplyForInfluencer } from '@/lib/roles';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { useSidebar } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, Trash2, CheckCircle, Clock, XCircle, Upload } from 'lucide-react';
import Link from 'next/link';

// Predefined platform options for social media links
const PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'Twitter/X'];

// Event types an applicant can choose from
const EVENT_TYPES = [
  'Watch parties',
  'Meetups',
  'Cosplay gatherings',
  'Art workshops',
  'Gaming sessions',
  'Other',
];

// Application page for fans who want to become verified hosts (influencers).
// Requires ID card, social proof, follower count, and event type selection.
export default function BecomeHostPage() {
  const { user, profile, isLoading: authLoading, fetchProfile } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const router = useRouter();

  // Form state
  const [idCardFile, setIdCardFile] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [socialLinks, setSocialLinks] = useState([{ platform: '', url: '' }]);
  const [followerCount, setFollowerCount] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);
  const [contentLink, setContentLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Existing application data (fetched on mount)
  const [application, setApplication] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);

  // Redirect: already an influencer -> go to event creation
  useEffect(() => {
    if (!authLoading && profile && isInfluencer(profile.roles)) {
      router.push('/host/create');
    }
  }, [authLoading, profile, router]);

  // Redirect: not authenticated -> login
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
    }
  }, [authLoading, profile, router]);

  // Fetch existing application status on mount
  useEffect(() => {
    if (!profile || isInfluencer(profile.roles)) return;

    influencerApi.getMyApplication()
      .then(setApplication)
      .catch(() => {
        // 404 = no application yet, which is fine
        setApplication(null);
      })
      .finally(() => setLoadingApp(false));
  }, [profile]);

  // Handle ID card file selection with preview
  const handleIdCardChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept images
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }

    setIdCardFile(file);
    setIdCardPreview(URL.createObjectURL(file));
    setError(null);
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: '', url: '' }]);
  };

  const updateSocialLink = (index, field, value) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const removeSocialLink = (index) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const toggleEventType = (type) => {
    setSelectedEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Validate form before submission
  const validateForm = () => {
    if (!idCardFile) {
      setError('Please upload your ID card photo');
      return false;
    }

    // Check at least one valid social link
    const validLinks = socialLinks.filter((l) => l.platform && l.url);
    if (validLinks.length === 0) {
      setError('Please add at least one social media link');
      return false;
    }

    const count = parseInt(followerCount, 10);
    if (!count || count < 100) {
      setError('Minimum 100 followers required');
      return false;
    }

    if (selectedEventTypes.length === 0) {
      setError('Please select at least one event type');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // Upload ID card image to Supabase Storage first
      const idCardImageUrl = await influencerApi.uploadIdCard(idCardFile, user.id);

      // Convert social links array to Map<String, String> for the backend
      const socialProofLinks = {};
      socialLinks.forEach((link) => {
        if (link.platform && link.url) {
          socialProofLinks[link.platform] = link.url;
        }
      });

      await influencerApi.submitApplication({
        idCardImageUrl,
        socialProofLinks,
        followerCount: parseInt(followerCount, 10),
        eventTypes: selectedEventTypes,
        contentLink: contentLink || null,
      });

      // Refresh profile so AuthContext picks up the new influencer role
      await fetchProfile();
      // Redirect to homepage with a success toast
      router.push('/');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('anicon-success', {
          detail: { message: "You're now an Influencer! You can host mini-events." },
        }));
      }, 300);
    } catch (err) {
      setError(err.message || 'Failed to submit application');
      setSubmitting(false);
    }
  };

  if (authLoading || loadingApp) return null;

  const roles = profile?.roles || [];

  // If user can't apply (already creator/organizer), show a message
  if (!canApplyForInfluencer(roles) && !isInfluencer(roles)) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className={`flex-1 pb-16 md:pb-0 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-18' : 'md:ml-60'}`}>
          <Header />
          <div className="max-w-2xl mx-auto px-6 pt-16 pb-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">You can already create events!</h1>
            <p className="text-muted-foreground">
              Your current role already allows you to create events.
            </p>
            <Link href="/host/create">
              <Button className="rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all">
                Create an Event
              </Button>
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Render pending/rejected/form based on application state
  const isPending = application?.status === 'pending';
  const isRejected = application?.status === 'rejected';
  const canReapply = isRejected && application?.canReapplyAt
    ? new Date() >= new Date(application.canReapplyAt)
    : isRejected;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className={`flex-1 pb-16 md:pb-0 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-18' : 'md:ml-60'}`}>
        <Header />
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-6 space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Become an Influencer</h1>
          </div>

          {/* Pending state — application is under review */}
          {isPending && (
            <div className="rounded-xl border p-6 space-y-3 text-center">
              <Clock className="w-12 h-12 text-yellow-500 mx-auto" />
              <h2 className="text-xl font-semibold">Application Under Review</h2>
              <p className="text-muted-foreground">
                We're reviewing your application. You'll be notified once a decision is made.
              </p>
              <p className="text-sm text-muted-foreground">
                Submitted on {new Date(application.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Rejected state */}
          {isRejected && !canReapply && (
            <div className="rounded-xl border border-red-200 p-6 space-y-3 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold">Application Not Approved</h2>
              {application.rejectionReason && (
                <p className="text-muted-foreground">{application.rejectionReason}</p>
              )}
              <p className="text-sm text-muted-foreground">
                You can reapply after {new Date(application.canReapplyAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Application form — show for new applicants or rejected users who can reapply */}
          {!isPending && (!isRejected || canReapply) && (
            <>
              <p className="text-muted-foreground">
                Host community meetups, watch parties, and small gatherings for anime fans.
                To verify your identity and community presence, please complete the application below.
              </p>

              {canReapply && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  Your previous application was not approved. You can submit a new one.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">

                {/* ID Card Upload — required */}
                <section className="space-y-2">
                  <label className="text-sm font-medium">
                    ID Card / Passport Photo <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Upload a clear photo of your national ID or passport for identity verification. This will be kept private.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdCardChange}
                    className="hidden"
                  />
                  {idCardPreview ? (
                    <div className="relative group">
                      <img
                        src={idCardPreview}
                        alt="ID card preview"
                        className="w-full max-h-48 object-contain rounded-lg border bg-muted"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIdCardFile(null);
                          setIdCardPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload your ID card</span>
                    </button>
                  )}
                </section>

                {/* Social media links — at least 1 required */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Social Media Links <span className="text-red-500">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSocialLink}
                      className="rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Plus className="w-3 h-3" /> Add link
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add at least one social media profile where you're active in the anime community.
                  </p>
                  {socialLinks.map((link, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Select value={link.platform} onValueChange={(val) => updateSocialLink(i, 'platform', val)}>
                        <SelectTrigger className="w-full sm:w-36 rounded-lg">
                          <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      {socialLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSocialLink(i)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </section>

                {/* Follower count — required, min 100 */}
                <section className="space-y-2">
                  <label className="text-sm font-medium">
                    Total Follower Count <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Approximate total followers across all your social media platforms. Minimum 100.
                  </p>
                  <input
                    type="number"
                    min="100"
                    value={followerCount}
                    onChange={(e) => setFollowerCount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </section>

                {/* Event types — at least 1 required */}
                <section className="space-y-3">
                  <label className="text-sm font-medium">
                    What type of events do you want to host? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {EVENT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleEventType(type)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          selectedEventTypes.includes(type)
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Content link — optional */}
                <section className="space-y-2">
                  <label className="text-sm font-medium">
                    Link to Your Best Content (optional)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    A post, video, or article that showcases your involvement in the anime community.
                  </p>
                  <input
                    type="url"
                    value={contentLink}
                    onChange={(e) => setContentLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </section>

                {/* Error message */}
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </form>
            </>
          )}

          <div className="h-8" />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
