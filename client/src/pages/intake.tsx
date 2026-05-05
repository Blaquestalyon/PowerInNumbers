import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { intakeSchema, type IntakePayload } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadButton } from "@/components/FileUploadButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  User,
  Globe,
  Target,
  ShieldAlert,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Hexagon,
} from "lucide-react";

const STEPS = [
  { label: "Profile", icon: User, key: "i1_profile" },
  { label: "Context", icon: Globe, key: "i2_context" },
  { label: "Objectives", icon: Target, key: "i3_objectives" },
  { label: "Constraints", icon: ShieldAlert, key: "i4_constraints" },
  { label: "Review", icon: FileCheck, key: "i5_meta" },
] as const;

const SECTOR_OPTIONS = [
  "Agriculture",
  "Technology",
  "Healthcare",
  "Education",
  "Financial Services",
  "Manufacturing",
  "Real Estate",
  "Energy",
  "Tourism",
  "Retail",
];

const REVENUE_TIERS = [
  "<$100K",
  "$100K-$500K",
  "$500K-$1M",
  "$1M-$5M",
  "$5M-$10M",
  "$10M+",
];

const AFRICA_EXP = ["None", "Exploratory", "Some", "Significant"];

const PRIMARY_GOALS = [
  "Market Entry",
  "Joint Venture",
  "Franchise",
  "Direct Investment",
  "Export",
  "Partnership",
];

const TIME_HORIZONS = ["6 months", "1 year", "2 years", "3-5 years"];

const INVESTMENT_RANGES = [
  "<$50K",
  "$50K-$100K",
  "$100K-$250K",
  "$250K-$500K",
  "$500K-$1M",
  "$1M+",
];

const RISK_TOLERANCES = ["Conservative", "Moderate", "Aggressive"];

export default function IntakePage() {
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();

  const form = useForm<IntakePayload>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      stage: 1,
      i1_profile: {
        name: "",
        industry: "",
        role: "",
        yearsExperience: 0,
        competenciesRaw: "",
        revenueTier: "",
      },
      i2_context: {
        currentBusiness: "",
        africaExperience: "",
        sectorInterest: [],
        geographicFocus: "Ghana",
      },
      i3_objectives: {
        strategicIntent: "",
        primaryGoal: "",
        timeHorizon: "",
        investmentRange: "",
      },
      i4_constraints: {
        budget: "",
        timeline: "",
        riskTolerance: "",
        regulatoryConsiderations: "",
      },
      i5_meta: {
        summitAttendee: true,
        reportType: "full",
        additionalNotes: "",
      },
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: IntakePayload) => {
      const res = await apiRequest("POST", "/api/runs", data);
      const result = await res.json();
      // Start the pipeline immediately
      await apiRequest("POST", `/api/runs/${result.runId}/start`);
      return result;
    },
    onSuccess: (data: { runId: number }) => {
      navigate(`/report/${data.runId}`);
    },
  });

  const onSubmit = (data: IntakePayload) => {
    submitMutation.mutate(data);
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(step);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const progressPercent = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <Hexagon className="h-7 w-7 text-primary" strokeWidth={1.5} />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              AI Mirror
            </h1>
            <p className="text-xs text-muted-foreground">
              Ghana Market Intelligence Report
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isComplete = i < step;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    isActive
                      ? "text-primary font-medium"
                      : isComplete
                        ? "text-foreground cursor-pointer"
                        : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : isComplete
                          ? "bg-accent text-foreground border-primary/30"
                          : "bg-muted/50 text-muted-foreground border-border"
                    }`}
                  >
                    {isComplete ? (
                      <Icon className="h-3.5 w-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Form Card */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="border border-border">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {(() => {
                    const Icon = STEPS[step].icon;
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()}
                  Step {step + 1}: {STEPS[step].label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {step === 0 && <ProfileStep form={form} />}
                {step === 1 && <ContextStep form={form} />}
                {step === 2 && <ObjectivesStep form={form} />}
                {step === 3 && <ConstraintsStep form={form} />}
                {step === 4 && <ReviewStep form={form} />}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={step === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Report"
                  )}
                </Button>
              )}
            </div>

            {submitMutation.isError && (
              <p className="text-destructive text-sm mt-4 text-center">
                {submitMutation.error.message}
              </p>
            )}
          </form>
        </Form>
      </div>

    </div>
  );
}

function getFieldsForStep(step: number): string[] {
  switch (step) {
    case 0:
      return [
        "i1_profile.name",
        "i1_profile.industry",
        "i1_profile.role",
        "i1_profile.yearsExperience",
        "i1_profile.competenciesRaw",
        "i1_profile.revenueTier",
      ];
    case 1:
      return [
        "i2_context.currentBusiness",
        "i2_context.africaExperience",
        "i2_context.sectorInterest",
        "i2_context.geographicFocus",
      ];
    case 2:
      return [
        "i3_objectives.strategicIntent",
        "i3_objectives.primaryGoal",
        "i3_objectives.timeHorizon",
        "i3_objectives.investmentRange",
      ];
    case 3:
      return [
        "i4_constraints.budget",
        "i4_constraints.timeline",
        "i4_constraints.riskTolerance",
        "i4_constraints.regulatoryConsiderations",
      ];
    default:
      return [];
  }
}

function ProfileStep({ form }: { form: any }) {
  return (
    <>
      <FormField
        control={form.control}
        name="i1_profile.name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name</FormLabel>
            <FormControl>
              <Input placeholder="Your full name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="i1_profile.industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Technology, Agriculture" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="i1_profile.role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Input placeholder="e.g. CEO, Investor" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="i1_profile.yearsExperience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Years of Experience</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="i1_profile.revenueTier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Revenue Tier</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select revenue tier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {REVENUE_TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="i1_profile.competenciesRaw"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>Core Competencies</FormLabel>
              <FileUploadButton
                onExtracted={(text) => {
                  const current = (field.value || "").trim();
                  field.onChange(current ? `${current}\n\n${text}` : text);
                }}
              />
            </div>
            <FormControl>
              <Textarea
                placeholder="Describe your key skills, capabilities, and areas of expertise..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function ContextStep({ form }: { form: any }) {
  const [customSector, setCustomSector] = useState("");

  const handleAddCustomSector = () => {
    const trimmed = customSector.trim();
    if (!trimmed) return;
    const current: string[] = form.getValues("i2_context.sectorInterest") || [];
    if (!current.includes(trimmed)) {
      form.setValue("i2_context.sectorInterest", [...current, trimmed]);
    }
    setCustomSector("");
  };

  return (
    <>
      <FormField
        control={form.control}
        name="i2_context.currentBusiness"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>Current Business Description</FormLabel>
              <FileUploadButton
                onExtracted={(text) => {
                  const current = (field.value || "").trim();
                  field.onChange(current ? `${current}\n\n${text}` : text);
                }}
              />
            </div>
            <FormControl>
              <Textarea
                placeholder="Describe your current business, products/services, and market position..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="i2_context.africaExperience"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Africa Experience</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {AFRICA_EXP.map((exp) => (
                  <SelectItem key={exp} value={exp}>
                    {exp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="i2_context.sectorInterest"
        render={() => (
          <FormItem>
            <FormLabel>Sector Interests</FormLabel>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {SECTOR_OPTIONS.map((sector) => (
                <FormField
                  key={sector}
                  control={form.control}
                  name="i2_context.sectorInterest"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(sector)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            field.onChange(
                              checked
                                ? [...current, sector]
                                : current.filter((s: string) => s !== sector)
                            );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        {sector}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            {/* Custom sector input */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">
                Don't see your sector? Add it below.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Logistics, Mining, Telecommunications"
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSector();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomSector}
                  disabled={!customSector.trim()}
                >
                  Add
                </Button>
              </div>
              {/* Show custom sectors as removable badges */}
              <FormField
                control={form.control}
                name="i2_context.sectorInterest"
                render={({ field }) => {
                  const customEntries = (field.value || []).filter(
                    (s: string) => !SECTOR_OPTIONS.includes(s)
                  );
                  if (customEntries.length === 0) return <></>;
                  return (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {customEntries.map((s: string) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => {
                            field.onChange(
                              field.value.filter((v: string) => v !== s)
                            );
                          }}
                        >
                          {s} &times;
                        </Badge>
                      ))}
                    </div>
                  );
                }}
              />
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="i2_context.geographicFocus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Geographic Focus</FormLabel>
            <FormControl>
              <Input {...field} readOnly className="bg-muted/50" />
            </FormControl>
            <p className="text-xs text-muted-foreground mt-1.5">
              Ghana is currently the only country with curated market intelligence data. Additional countries will be added in future updates.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function ObjectivesStep({ form }: { form: any }) {
  return (
    <>
      <FormField
        control={form.control}
        name="i3_objectives.strategicIntent"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>Strategic Intent</FormLabel>
              <FileUploadButton
                onExtracted={(text) => {
                  const current = (field.value || "").trim();
                  field.onChange(current ? `${current}\n\n${text}` : text);
                }}
              />
            </div>
            <FormControl>
              <Textarea
                placeholder="What is your strategic vision for entering the Ghana market?"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="i3_objectives.primaryGoal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Goal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRIMARY_GOALS.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="i3_objectives.timeHorizon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time Horizon</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIME_HORIZONS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="i3_objectives.investmentRange"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Investment Range</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select investment range" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {INVESTMENT_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function ConstraintsStep({ form }: { form: any }) {
  return (
    <>
      <FormField
        control={form.control}
        name="i4_constraints.budget"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>Budget Constraints</FormLabel>
              <FileUploadButton
                onExtracted={(text) => {
                  const current = (field.value || "").trim();
                  field.onChange(current ? `${current}\n\n${text}` : text);
                }}
              />
            </div>
            <FormControl>
              <Textarea
                placeholder="Describe any budget limitations or funding structure..."
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="i4_constraints.timeline"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>Timeline Constraints</FormLabel>
              <FileUploadButton
                onExtracted={(text) => {
                  const current = (field.value || "").trim();
                  field.onChange(current ? `${current}\n\n${text}` : text);
                }}
              />
            </div>
            <FormControl>
              <Textarea
                placeholder="Any hard deadlines or timing considerations..."
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="i4_constraints.riskTolerance"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Risk Tolerance</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select risk tolerance" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {RISK_TOLERANCES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="i4_constraints.regulatoryConsiderations"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>Regulatory Considerations</FormLabel>
              <FileUploadButton
                onExtracted={(text) => {
                  const current = (field.value || "").trim();
                  field.onChange(current ? `${current}\n\n${text}` : text);
                }}
              />
            </div>
            <FormControl>
              <Textarea
                placeholder="Known regulatory hurdles, licensing requirements, compliance concerns..."
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function ReviewStep({ form }: { form: any }) {
  const values = form.getValues() as IntakePayload;

  return (
    <div className="space-y-6">
      {/* Profile summary */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Profile
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>{" "}
            {values.i1_profile.name}
          </div>
          <div>
            <span className="text-muted-foreground">Industry:</span>{" "}
            {values.i1_profile.industry}
          </div>
          <div>
            <span className="text-muted-foreground">Role:</span>{" "}
            {values.i1_profile.role}
          </div>
          <div>
            <span className="text-muted-foreground">Experience:</span>{" "}
            {values.i1_profile.yearsExperience} years
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Revenue Tier:</span>{" "}
            {values.i1_profile.revenueTier}
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Competencies:</span>{" "}
            {values.i1_profile.competenciesRaw}
          </div>
        </div>
      </div>

      {/* Context summary */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Context
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <span className="text-muted-foreground">Business:</span>{" "}
            {values.i2_context.currentBusiness}
          </div>
          <div>
            <span className="text-muted-foreground">Africa Exp:</span>{" "}
            {values.i2_context.africaExperience}
          </div>
          <div>
            <span className="text-muted-foreground">Focus:</span>{" "}
            {values.i2_context.geographicFocus}
          </div>
          <div className="col-span-2 flex flex-wrap gap-1.5">
            <span className="text-muted-foreground">Sectors:</span>
            {values.i2_context.sectorInterest.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Objectives summary */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Objectives
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <span className="text-muted-foreground">Strategic Intent:</span>{" "}
            {values.i3_objectives.strategicIntent}
          </div>
          <div>
            <span className="text-muted-foreground">Goal:</span>{" "}
            {values.i3_objectives.primaryGoal}
          </div>
          <div>
            <span className="text-muted-foreground">Timeline:</span>{" "}
            {values.i3_objectives.timeHorizon}
          </div>
          <div>
            <span className="text-muted-foreground">Investment:</span>{" "}
            {values.i3_objectives.investmentRange}
          </div>
        </div>
      </div>

      {/* Constraints summary */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Constraints
        </h3>
        <div className="text-sm space-y-2">
          <div>
            <span className="text-muted-foreground">Budget:</span>{" "}
            {values.i4_constraints.budget}
          </div>
          <div>
            <span className="text-muted-foreground">Timeline:</span>{" "}
            {values.i4_constraints.timeline}
          </div>
          <div>
            <span className="text-muted-foreground">Risk Tolerance:</span>{" "}
            {values.i4_constraints.riskTolerance}
          </div>
          <div>
            <span className="text-muted-foreground">Regulatory:</span>{" "}
            {values.i4_constraints.regulatoryConsiderations}
          </div>
        </div>
      </div>

      {/* Meta options */}
      <div className="border-t border-border pt-5 space-y-4">
        <FormField
          control={form.control}
          name="i5_meta.summitAttendee"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between">
              <FormLabel>Summit Attendee</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="i5_meta.reportType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Report Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="kiosk">Kiosk (Quick)</SelectItem>
                  <SelectItem value="full">Full Report</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="i5_meta.additionalNotes"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-2">
                <FormLabel>Additional Notes</FormLabel>
                <FileUploadButton
                  onExtracted={(text) => {
                    const current = (field.value || "").trim();
                    field.onChange(current ? `${current}\n\n${text}` : text);
                  }}
                />
              </div>
              <FormControl>
                <Textarea
                  placeholder="Anything else we should know..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
