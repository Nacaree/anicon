'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { profileApi, creatorApi } from '@/lib/api';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { SupportLinksDisplay } from '@/components/creator/SupportLinksDisplay';
import { PortfolioGrid } from '@/components/creator/PortfolioGrid';
import { CommissionMenu } from '@/components/creator/CommissionMenu';
import { CommissionEditModal } from '@/components/creator/CommissionEditModal';
import { RoleBadge } from '@/components/profile/RoleBadge';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { canHavePortfolio, canHaveCommissions, canHaveSupportLinks } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { MapPin, Calendar, Link as LinkIcon, Settings, Move, Camera, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePage() {
  const { username } = useParams();
  const { profile: myProfile } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if the viewer is the profile owner
  const isOwner = myProfile?.username === username;

  // Banner reposition state
  const [repositioning, setRepositioning] = useState(false);
  const [bannerPosY, setBannerPosY] = useState(50);
  const [savedPosY, setSavedPosY] = useState(50);
  const [savingBanner, setSavingBanner] = useState(false);
  const bannerRef = useRef(null);
  const dragState = useRef(null);

  // Sync banner position when profile loads
  useEffect(() => {
    if (profile?.bannerPositionY != null) {
      setBannerPosY(profile.bannerPositionY);
      setSavedPosY(profile.bannerPositionY);
    }
  }, [profile?.bannerPositionY]);

  // Drag-to-reposition handlers
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragState.current = { startY: clientY, startPos: bannerPosY };

    const handleDragMove = (moveEvent) => {
      const moveY = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const containerHeight = bannerRef.current?.offsetHeight || 350;
      // Moving mouse down should show higher parts of the image (lower Y%), and vice versa
      const delta = ((moveY - dragState.current.startY) / containerHeight) * -100;
      const newPos = Math.max(0, Math.min(100, dragState.current.startPos + delta));
      setBannerPosY(newPos);
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  }, [bannerPosY]);

  // Save the new banner position to the backend
  const saveBannerPosition = async () => {
    setSavingBanner(true);
    try {
      await creatorApi.updateCreatorProfile({
        displayName: profile.displayName || null,
        bio: profile.bio || null,
        bannerImageUrl: profile.bannerImageUrl || null,
        bannerPositionY: Math.round(bannerPosY),
        creatorType: profile.creatorType || null,
        commissionStatus: profile.commissionStatus || 'closed',
        commissionInfo: profile.commissionInfo || {},
        supportLinks: profile.supportLinks || [],
      });
      setSavedPosY(bannerPosY);
      setRepositioning(false);
    } catch (err) {
      console.error('Failed to save banner position:', err);
    } finally {
      setSavingBanner(false);
    }
  };

  const cancelReposition = () => {
    setBannerPosY(savedPosY);
    setRepositioning(false);
  };

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploadingAvatar(true);
    try {
      const filename = `avatar-${Date.now()}.${file.name.split('.').pop()}`;
      const path = `${profile.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(path);

      // Save avatar URL to backend
      await creatorApi.updateCreatorProfile({
        displayName: profile.displayName || null,
        bio: profile.bio || null,
        avatarUrl: publicUrl,
        bannerImageUrl: profile.bannerImageUrl || null,
        bannerPositionY: profile.bannerPositionY ?? 50,
        creatorType: profile.creatorType || null,
        commissionStatus: profile.commissionStatus || 'closed',
        commissionInfo: profile.commissionInfo || {},
        supportLinks: profile.supportLinks || [],
      });

      // Update local profile state so avatar refreshes immediately
      setProfile((prev) => ({ ...prev, avatarUrl: publicUrl }));
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Commission edit modal state
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  useEffect(() => {
    if (!username) return;

    profileApi.getProfileByUsername(username)
      .then(setProfile)
      .catch((err) => setError(err.message || 'Profile not found'))
      .finally(() => setLoading(false));
  }, [username]);

  const initials = profile?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
          <Header />
          <div className="animate-pulse">
            <div className="h-[280px] md:h-[350px] bg-muted" />
            <div className="max-w-[940px] mx-auto px-4">
              <div className="flex items-end gap-4 -mt-[42px] pb-4">
                <div className="w-[176px] h-[176px] rounded-full bg-muted -mt-[84px]" />
                <div className="space-y-2 pb-2">
                  <div className="h-8 w-48 bg-muted rounded" />
                  <div className="h-4 w-28 bg-muted rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
          <Header />
          <div className="max-w-[940px] mx-auto px-4 text-center py-20">
            <p className="text-muted-foreground text-lg">{error || 'Profile not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
        <Header />
        <div className="space-y-0">

          {/* Banner — spans full width like Facebook cover photo */}
          <div
            ref={bannerRef}
            className={`relative h-[280px] md:h-[350px] overflow-hidden bg-muted shadow-md ${repositioning ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={repositioning ? handleDragStart : undefined}
            onTouchStart={repositioning ? handleDragStart : undefined}
          >
            {profile.bannerImageUrl ? (
              <Image
                src={profile.bannerImageUrl}
                alt="Profile banner"
                fill
                className="object-cover"
                style={{ objectPosition: `center ${bannerPosY}%` }}
                priority
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
            )}

            {/* Reposition overlay — dimmed background with instructions */}
            {repositioning && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <p className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-full">
                  Drag to reposition
                </p>
              </div>
            )}

            {/* Reposition button — visible to owner when not repositioning */}
            {isOwner && profile.bannerImageUrl && !repositioning && (
              <button
                onClick={() => setRepositioning(true)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              >
                <Move className="w-3.5 h-3.5" />
                Reposition
              </button>
            )}

            {/* Save / Cancel controls during reposition */}
            {repositioning && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={cancelReposition}
                  className="bg-white/90 hover:bg-white text-gray-800 text-xs font-medium px-4 py-1.5 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBannerPosition}
                  disabled={savingBanner}
                  className="bg-[#FF7927] hover:bg-[#E66B1F] text-white text-xs font-medium px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
                >
                  {savingBanner ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Centered content container below the banner — narrower, like Facebook */}
          <div className="max-w-[940px] mx-auto px-4">

            {/* Avatar + Name row — avatar overlaps the banner */}
            <div className="flex items-start justify-between pb-4">
              <div className="flex gap-5">
                <div className="relative group shrink-0 -mt-[20px] size-[176px] rounded-full overflow-hidden">
                  <Avatar className="!size-[176px]">
                    <AvatarImage src={profile.avatarUrl} alt={profile.displayName} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-muted">{initials}</AvatarFallback>
                  </Avatar>
                  {/* Avatar upload overlay — visible on hover for profile owner */}
                  {isOwner && (
                    <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                      {uploadingAvatar ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      ) : (
                        <Camera className="w-8 h-8 text-white" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                  )}
                </div>
                <div className="pt-7 space-y-2">
                  <h1 className="text-[28px] font-bold leading-tight">{profile.displayName || profile.username}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                  {/* Follower count inline like Facebook's friend count */}
                  <p className="text-sm text-muted-foreground">
                    {profile.followerCount || 0} followers · {profile.followingCount || 0} following
                  </p>
                  {joinedDate && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Joined {joinedDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Settings button for owner */}
              {isOwner && (
                <div className="pt-7">
                  <Link href="/settings/creator">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Profile content below the divider */}
            <div className="py-4 space-y-6">

              {/* Role badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <RoleBadge roles={profile.roles} />
              </div>

              {/* Bio + meta info */}
              <div className="space-y-3">
                {profile.bio && (
                  <p className="text-foreground">{profile.bio}</p>
                )}

                {/* Social links */}
                {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(profile.socialLinks).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <LinkIcon className="w-3 h-3" />
                        {platform}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Support Links — everyone except organizers */}
              {canHaveSupportLinks(profile.roles) && profile.supportLinks?.length > 0 && (
                <SupportLinksDisplay links={profile.supportLinks} />
              )}

              {/* Portfolio Section — creator only */}
              {canHavePortfolio(profile.roles) && (
                <PortfolioGrid userId={profile.id} isOwner={isOwner} />
              )}

              {/* Commission Menu — creator + influencer only */}
              {canHaveCommissions(profile.roles) && (
                <>
                  {profile.commissionInfo?.menu?.length > 0 ? (
                    <div className="relative">
                      <CommissionMenu
                        info={profile.commissionInfo}
                        status={profile.commissionStatus}
                      />
                      {/* Edit button for owner */}
                      {isOwner && (
                        <button
                          onClick={() => setShowCommissionModal(true)}
                          className="absolute top-0 right-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors duration-300"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                    </div>
                  ) : isOwner ? (
                    // Empty state — let owner add commissions
                    <button
                      onClick={() => setShowCommissionModal(true)}
                      className="w-full py-6 border-2 border-dashed border-muted-foreground/30 rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors duration-300 text-sm"
                    >
                      + Add Commission Menu
                    </button>
                  ) : null}
                </>
              )}

              {/* Commission edit modal */}
              {showCommissionModal && (
                <CommissionEditModal
                  profile={profile}
                  onClose={() => setShowCommissionModal(false)}
                  onSaved={() => {
                    setShowCommissionModal(false);
                    // Re-fetch profile to reflect changes
                    profileApi.getProfileByUsername(username).then(setProfile);
                  }}
                />
              )}

            </div>

            {/* Tab section — Home (placeholder) + Events (role-based) */}
            <ProfileTabs profile={profile} isOwner={isOwner} />
          </div>

        </div>
      </div>
    </div>
  );
}
