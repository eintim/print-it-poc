"use client";

import type { Id } from "@/convex/_generated/dataModel";
import WorkspaceClient from "@/components/WorkspaceClient";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OldCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") as Id<"refinementSessions"> | null;
  const [resetVersion, setResetVersion] = useState(0);
  const [forcedSessionId, setForcedSessionId] = useState<Id<"refinementSessions"> | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (sessionId === null) {
      setForcedSessionId(undefined);
    }
  }, [sessionId]);

  const handleStartOver = useCallback(() => {
    setForcedSessionId(null);
    setResetVersion((current) => current + 1);
    router.replace("/old/create");
  }, [router]);

  return (
    <WorkspaceClient
      initialSessionId={forcedSessionId === undefined ? sessionId : forcedSessionId}
      resetVersion={resetVersion}
      onStartOver={handleStartOver}
    />
  );
}
