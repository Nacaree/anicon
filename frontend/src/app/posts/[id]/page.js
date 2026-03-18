"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Shared post links (/posts/{id}) redirect to the home page which opens
 * the post in a modal — consistent with notification clicks and feed clicks.
 */
export default function PostRedirect() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/?post=${id}`);
  }, [id, router]);

  return null;
}
