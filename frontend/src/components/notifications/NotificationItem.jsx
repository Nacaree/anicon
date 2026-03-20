"use client";

import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Repeat2, UserPlus, Image } from "lucide-react";

/**
 * Single notification row in the dropdown.
 * Shows actor avatar, action text, relative time, and unread indicator.
 * Clicking navigates to the relevant content and marks it read.
 */
export default function NotificationItem({ notification, onRead, onClose }) {
  const router = useRouter();
  const { type, targetId, referenceId, actorUsername, actorDisplayName, actorAvatarUrl, actorCount, isRead, createdAt } = notification;

  // Build the action text based on notification type
  const actorName = actorDisplayName || actorUsername || "Someone";
  const othersText = actorCount > 1 ? ` and ${actorCount - 1} other${actorCount > 2 ? "s" : ""}` : "";

  const actionMap = {
    like_post: "liked your post",
    comment_post: "commented on your post",
    reply_comment: "replied to your comment",
    like_comment: "liked your comment",
    repost_post: "reposted your post",
    like_portfolio: "liked your portfolio item",
    follow_user: "started following you",
  };

  const actionText = actionMap[type] || "interacted with your content";

  // Icon for each notification type
  const iconMap = {
    like_post: <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />,
    comment_post: <MessageCircle className="w-3.5 h-3.5 text-blue-500" />,
    reply_comment: <MessageCircle className="w-3.5 h-3.5 text-blue-500" />,
    like_comment: <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />,
    repost_post: <Repeat2 className="w-3.5 h-3.5 text-green-500" />,
    like_portfolio: <Image className="w-3.5 h-3.5 text-purple-500" />,
    follow_user: <UserPlus className="w-3.5 h-3.5 text-orange-500" />,
  };

  // Determine if this notification is post-related (should open modal, not navigate)
  const isPostRelated = ["like_post", "repost_post", "comment_post", "reply_comment", "like_comment"].includes(type);

  // For post-related: the post ID to open in the detail modal
  const getPostId = () => {
    switch (type) {
      case "like_post":
      case "repost_post":
        return targetId;
      case "comment_post":
      case "reply_comment":
      case "like_comment":
        return referenceId || targetId;
      default:
        return null;
    }
  };

  // For non-post notifications: navigate to a profile page
  const getProfileHref = () => {
    if (type === "follow_user") return `/profiles/${actorUsername}`;
    if (type === "like_portfolio") return `/profiles/${actorUsername}`;
    return "/";
  };

  const timeAgo = formatTimeAgo(createdAt);

  const handleClick = () => {
    // Mark as read
    if (!isRead && onRead && notification.id) {
      onRead(notification.id);
    }
    onClose?.();

    if (isPostRelated) {
      // Dispatch global event — PostModalContext listens and opens the modal
      // on whatever page the user is currently on, no navigation needed
      const postId = getPostId();
      if (postId) {
        window.dispatchEvent(new CustomEvent("anicon-open-post", { detail: { postId } }));
      }
    } else {
      // Navigate to profile for follow/portfolio notifications
      router.push(getProfileHref());
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
        !isRead ? "bg-orange-50/50 dark:bg-orange-950/10" : ""
      }`}
    >
      {/* Unread indicator dot — h-10 matches avatar height so dot is vertically centered */}
      <div className="flex-shrink-0 w-2 h-10 flex items-center">
        {!isRead && (
          <div className="w-2 h-2 rounded-full bg-orange-500" />
        )}
      </div>

      {/* Actor avatar with type icon overlay */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          {actorAvatarUrl ? (
            <img src={actorAvatarUrl} alt={actorName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
              {actorName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        {/* Type icon badge — bottom-right of avatar */}
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm">
          {iconMap[type]}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
          <span className="font-semibold">{actorName}</span>
          {othersText} {actionText}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo}</p>
      </div>
    </button>
  );
}

// Format timestamp to relative time
function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
