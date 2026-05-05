import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GenerationRun, GenerationSection } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Hexagon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Settings,
} from "lucide-react";

type RunWithSections = GenerationRun & {
  sections: GenerationSection[];
};

export default function AdminPage() {
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  const { data: runs, isLoading } = useQuery<RunWithSections[]>({
    queryKey: ["/api/runs"],
    refetchInterval: 5000,
  });

  const retryMutation = useMutation({
    mutationFn: async (sectionId: number) => {
      await apiRequest("POST", `/api/sections/${sectionId}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Hexagon className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <span className="font-semibold tracking-tight">AI Mirror</span>
          <Badge variant="secondary" className="ml-2">
            <Settings className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Generation Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !runs || runs.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No generation runs yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => {
                    const sections = run.sections ?? [];
                    const completed = sections.filter(
                      (s) => s.status === "complete"
                    ).length;
                    const failed = sections.filter(
                      (s) => s.status === "error"
                    ).length;
                    const total = sections.length;
                    const isExpanded = expandedRun === run.id;

                    return (
                      <TableRow key={run.id} className="group">
                        <TableCell className="font-mono text-sm">
                          {run.id}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={run.status} />
                        </TableCell>
                        <TableCell>
                          Stage {run.stage}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {completed}/{total}
                            {failed > 0 && (
                              <span className="text-destructive ml-1">
                                ({failed} failed)
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(run.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedRun(isExpanded ? null : run.id)
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* Expanded run details */}
            {expandedRun && runs && (
              <RunDetails
                run={runs.find((r) => r.id === expandedRun)!}
                onRetry={(sectionId) => retryMutation.mutate(sectionId)}
                retrying={retryMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RunDetails({
  run,
  onRetry,
  retrying,
}: {
  run: RunWithSections;
  onRetry: (id: number) => void;
  retrying: boolean;
}) {
  if (!run) return null;
  const sections = run.sections ?? [];

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="text-sm font-semibold mb-3">
        Run #{run.id} — Sections
      </h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>QA Score</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((section) => (
            <TableRow key={section.id}>
              <TableCell className="font-mono text-sm">{section.code}</TableCell>
              <TableCell className="text-sm">{section.title}</TableCell>
              <TableCell>
                <StatusBadge status={section.status} />
              </TableCell>
              <TableCell className="text-sm">
                {section.qaScore != null
                  ? `${section.qaScore.toFixed(1)}%`
                  : "—"}
              </TableCell>
              <TableCell>
                {section.status === "error" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(section.id)}
                    disabled={retrying}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, "default" | "destructive" | "secondary"> = {
    complete: "default",
    error: "destructive",
    running: "secondary",
    queued: "secondary",
    ready: "secondary",
  };
  return (
    <Badge variant={variant[status] || "secondary"}>
      {status}
    </Badge>
  );
}
