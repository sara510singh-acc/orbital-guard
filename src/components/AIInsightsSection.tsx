import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Satellite, ShieldAlert, Sparkles } from "lucide-react";

const PRESETS = [
  {
    label: "ISS (ZARYA)",
    name: "ISS (ZARYA)",
    orbit: "LEO (~408 km, 51.6° inclination)",
    velocity: "7.66 km/s",
    position: "Lat 28.5°, Lon -80.6°",
    debrisCount: "14",
    timeframe: "24-72 hours",
  },
  {
    label: "Starlink-3142",
    name: "Starlink-3142",
    orbit: "LEO (~550 km, 53.0° inclination)",
    velocity: "7.59 km/s",
    position: "Lat 41.2°, Lon 12.4°",
    debrisCount: "27",
    timeframe: "24 hours",
  },
  {
    label: "Sentinel-2A",
    name: "Sentinel-2A",
    orbit: "Sun-Synchronous LEO (~786 km)",
    velocity: "7.45 km/s",
    position: "Lat -15.8°, Lon 74.1°",
    debrisCount: "9",
    timeframe: "72 hours",
  },
];

const AIInsightsSection = () => {
  const [name, setName] = useState(PRESETS[0].name);
  const [orbit, setOrbit] = useState(PRESETS[0].orbit);
  const [velocity, setVelocity] = useState(PRESETS[0].velocity);
  const [position, setPosition] = useState(PRESETS[0].position);
  const [debrisCount, setDebrisCount] = useState(PRESETS[0].debrisCount);
  const [timeframe, setTimeframe] = useState(PRESETS[0].timeframe);

  const [prediction, setPrediction] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setName(preset.name);
    setOrbit(preset.orbit);
    setVelocity(preset.velocity);
    setPosition(preset.position);
    setDebrisCount(preset.debrisCount);
    setTimeframe(preset.timeframe);
    setError("");
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPrediction("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "predict-collision",
        {
          body: {
            satelliteData: {
              name: name.trim(),
              orbit: orbit.trim(),
              velocity: velocity.trim(),
              position: position.trim(),
            },
            debrisData: {
              count: Number(debrisCount) || debrisCount.trim(),
            },
            timeframe,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Failed to invoke predict-collision");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.prediction) {
        throw new Error("No assessment returned from AI service.");
      }

      setPrediction(data.prediction);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to generate AI assessment."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="ai-insights" className="py-20 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30 text-secondary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>OrbitalGuard AI Risk Assessment</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            AI Insights
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Enter satellite telemetry and nearby debris metrics to generate a structured collision-risk assessment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Form */}
          <Card className="lg:col-span-5 p-6 bg-card border-border space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Quick Telemetry Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sat-name">Satellite Name</Label>
                <Input
                  id="sat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., ISS (ZARYA)"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sat-orbit">Orbital Regime / Altitude</Label>
                <Input
                  id="sat-orbit"
                  value={orbit}
                  onChange={(e) => setOrbit(e.target.value)}
                  placeholder="e.g., LEO (~408 km)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sat-velocity">Velocity</Label>
                  <Input
                    id="sat-velocity"
                    value={velocity}
                    onChange={(e) => setVelocity(e.target.value)}
                    placeholder="e.g., 7.66 km/s"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="debris-count">Nearby Debris Count</Label>
                  <Input
                    id="debris-count"
                    type="number"
                    min="0"
                    value={debrisCount}
                    onChange={(e) => setDebrisCount(e.target.value)}
                    placeholder="e.g., 14"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sat-position">Current Position</Label>
                <Input
                  id="sat-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., Lat 28.5°, Lon -80.6°"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timeframe">Analysis Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger id="timeframe">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12 hours">Next 12 hours</SelectItem>
                    <SelectItem value="24 hours">Next 24 hours</SelectItem>
                    <SelectItem value="24-72 hours">24–72 hours</SelectItem>
                    <SelectItem value="7 days">Next 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Telemetry...
                  </>
                ) : (
                  <>
                    <Satellite className="w-4 h-4 mr-2" />
                    Run AI Risk Assessment
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Assessment Output */}
          <Card className="lg:col-span-7 p-6 bg-card border-border flex flex-col justify-between min-h-[420px]">
            {error ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">Assessment Failed</p>
                  <p>{error}</p>
                </div>
              </div>
            ) : prediction ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-secondary" />
                    <h3 className="font-semibold text-foreground">
                      Preliminary Assessment — {name || "Target Satellite"}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Window: {timeframe}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-normal">
                  {prediction}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-3">
                <Satellite className="w-12 h-12 text-secondary/50" />
                <p className="font-medium text-foreground">
                  Ready for Orbital Analysis
                </p>
                <p className="text-sm max-w-md">
                  Select a preset or enter satellite orbital telemetry on the left, then click{" "}
                  <span className="text-foreground font-medium">
                    Run AI Risk Assessment
                  </span>{" "}
                  to generate an OpenAI-powered safety briefing.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AIInsightsSection;