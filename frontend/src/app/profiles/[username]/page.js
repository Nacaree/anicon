'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { profileApi } from '@/lib/api';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { CreatorTypeBadge } from '@/components/creator/CreatorTypeBadge';
import { SupportLinksDisplay } from '@/components/creator/SupportLinksDisplay';
import { PortfolioGrid } from '@/components/creator/PortfolioGrid';
import { CommissionMenu } from '@/components/creator/CommissionMenu';
import { RoleBadge } from '@/components/profile/RoleBadge';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { canHavePortfolio, canHaveCommissions, canHaveSupportLinks } from '@/lib/roles';
import { MapPin, Calendar, Link as LinkIcon, Settings } from 'lucide-react';
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
                <div className="w-[168px] h-[168px] rounded-full bg-muted border-4 border-background -mt-[84px]" />
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
          <div className="relative h-[280px] md:h-[350px] overflow-hidden bg-muted shadow-md">
            {profile.bannerImageUrl ? (
              <Image
                src={profile.bannerImageUrl}
                alt="Profile banner"
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
            )}
          </div>

          {/* Centered content container below the banner — narrower, like Facebook */}
          <div className="max-w-[940px] mx-auto px-4">

            {/* Avatar + Name row — avatar overlaps the banner */}
            <div className="flex items-start justify-between pb-4">
              <div className="flex gap-5">
                <Avatar className="w-[168px] h-[168px] border-4 border-background shadow-lg -mt-[20px] shrink-0">
                  <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                  <AvatarFallback className="text-3xl bg-muted">{initials}</AvatarFallback>
                </Avatar>
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

              {/* Role + creator type badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <RoleBadge roles={profile.roles} />
                {profile.creatorType && (
                  <CreatorTypeBadge type={profile.creatorType} />
                )}
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
              {canHaveCommissions(profile.roles) && profile.commissionInfo?.menu?.length > 0 && (
                <CommissionMenu
                  info={profile.commissionInfo}
                  status={profile.commissionStatus}
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
