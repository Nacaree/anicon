'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { influencerApi } from '@/lib/api';
import { isInfluencer, canApplyForInfluencer } from '@/lib/roles';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Plus, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

// Application page for fans who want to become verified hosts (influencers).
// Shows the form, pending status, or rejection info depending on application state.
export default function BecomeHostPage() {
  const { profile, isLoading: authLoading, fetchProfile } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const router = useRouter();

  const [reason, setReason] = useState('');
  const [communityInvolvement, setCommunityInvolvement] = useState('');
  // Social proof links as key-value pairs: [{ platform, url }]
  const [socialLinks, setSocialLinks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Existing application data (fetched on mount)
  const [application, setApplication] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);

  // Redirect: already an influencer → go to event creation
  useEffect(() => {
    if (!authLoading && profile && isInfluencer(profile.roles)) {
      router.push('/host/create');
    }
  }, [authLoading, profile, router]);

  // Redirect: not authenticated → login
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Convert social links array to Map<String, String> for the backend
      const socialProofLinks = {};
      socialLinks.forEach((link) => {
        if (link.platform && link.url) {
          socialProofLinks[link.platform] = link.url;
        }
      });

      const result = await influencerApi.submitApplication({
        reason,
        communityInvolvement: communityInvolvement || null,
        socialProofLinks: Object.keys(socialProofLinks).length > 0 ? socialProofLinks : null,
      });

      setApplication(result);
      // Refresh profile so AuthContext picks up the new influencerStatus
      await fetchProfile();
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
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
        <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
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
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
        <Header />
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-6 space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Become a Verified Host</h1>
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
                Once approved, you'll be able to create free mini-events.
              </p>

              {canReapply && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  Your previous application was not approved. You can submit a new one.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Reason — required */}
                <section className="space-y-2">
                  <label className="text-sm font-medium">
                    Why do you want to host events? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={4}
                    maxLength={1000}
                    placeholder="Tell us about the events you'd like to organize..."
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </section>

                {/* Community involvement — optional */}
                <section className="space-y-2">
                  <label className="text-sm font-medium">
                    Community involvement (optional)
                  </label>
                  <textarea
                    value={communityInvolvement}
                    onChange={(e) => setCommunityInvolvement(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Past events you've organized, communities you're part of..."
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </section>

                {/* Social proof links — optional */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Social media links (optional)</label>
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
                  {socialLinks.map((link, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Platform"
                        value={link.platform}
                        onChange={(e) => updateSocialLink(i, 'platform', e.target.value)}
                        className="w-32 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button
                        type="button"
                        onClick={() => removeSocialLink(i)}
                        className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
    </div>
  );
}
