import type { AnalysisStatus, TranscriptStatus } from "@prisma/client";
import { CheckIcon, ClockIcon, AlertIcon } from "@/components/icons";

export function AnalysisBadge({ status }: { status: AnalysisStatus }) {
  const map: Record<
    AnalysisStatus,
    { label: string; cls: string; Icon: typeof CheckIcon }
  > = {
    NOT_ANALYZED: {
      label: "Sin analizar",
      cls: "border-line bg-surface2/60 text-muted",
      Icon: AlertIcon,
    },
    ANALYZING: {
      label: "Analizando",
      cls: "border-warning/30 bg-warning/10 text-warning",
      Icon: ClockIcon,
    },
    ANALYZED: {
      label: "Analizado",
      cls: "border-accent/30 bg-accent/10 text-accent",
      Icon: CheckIcon,
    },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`badge ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function TranscriptBadge({ status }: { status: TranscriptStatus }) {
  const map: Record<
    TranscriptStatus,
    { label: string; cls: string; Icon: typeof CheckIcon }
  > = {
    NO_CAPTIONS: {
      label: "Sin transcripción",
      cls: "border-line bg-surface2/60 text-muted",
      Icon: AlertIcon,
    },
    PENDING_REVIEW: {
      label: "Pendiente de revisión",
      cls: "border-warning/30 bg-warning/10 text-warning",
      Icon: ClockIcon,
    },
    APPROVED: {
      label: "Aprobada",
      cls: "border-success/30 bg-success/10 text-success",
      Icon: CheckIcon,
    },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`badge ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
