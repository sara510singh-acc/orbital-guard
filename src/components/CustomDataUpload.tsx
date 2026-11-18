
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SatelliteData {
  name: string;
  orbit: string;
  velocity: string;
  launchDate: string;
}

const CustomDataUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedData, setUploadedData] =
    useState<SatelliteData | null>(null);
  const [prediction, setPrediction] = useState("");

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large", {
        description: "Please upload a file smaller than 10MB.",
      });
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "csv" && extension !== "json") {
      toast.error("Unsupported file format");
      return;
    }

    setUploading(true);
    setPrediction("");

    // Temporary mock processing.
    // Actual CSV/JSON parsing will be implemented separately.
    setTimeout(() => {
      const mockData: SatelliteData = {
        name: file.name.replace(/\.[^/.]+$/, ""),
        orbit: "LEO (550 km)",
        velocity: "7.57 km/s",
        launchDate: "2024-01-15",
      };

      setUploadedData(mockData);
      setUploading(false);

      toast.success("File selected successfully", {
        description: `Satellite: ${mockData.name}`,
      });
    }, 500);
  };

  const analyzeData = async () => {
    if (!uploadedData || analyzing) return;

    setAnalyzing(true);
    setPrediction("");

    toast.info("Analyzing satellite data", {
      description: "OrbitalGuard AI is preparing your assessment.",
    });

    try {
      const { data, error } = await supabase.functions.invoke(
        "predict-collision",
        {
          body: {
            satelliteData: {
              name: uploadedData.name,
              orbit: uploadedData.orbit,
              velocity: uploadedData.velocity,
              position: "Not provided",
            },
            debrisData: {
              count: "Not provided",
            },
            timeframe: "24-72 hours",
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Unable to contact analysis service.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.prediction) {
        throw new Error("No assessment was returned.");
      }

      setPrediction(data.prediction);

      toast.success("AI assessment completed", {
        description: "Your satellite assessment is ready.",
      });
    } catch (error) {
      console.error("OrbitalGuard analysis error:", error);

      toast.error("Analysis failed", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card-space">
      <div className="flex items-center gap-2 mb-6">
        <Upload className="w-5 h-5 text-secondary" />
        <h3 className="text-xl font-semibold text-foreground">
          Upload Custom Satellite Data
        </h3>
      </div>

      <div className="space-y-6">
        <div>
          <Label
            htmlFor="file-upload"
            className="text-foreground mb-2 block"
          >
            Upload CSV or JSON file
          </Label>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-secondary transition-colors cursor-pointer">
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />

            <label htmlFor="file-upload" className="cursor-pointer">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />

              <p className="text-sm text-foreground mb-1">
                Click to upload or drag and drop
              </p>

              <p className="text-xs text-muted-foreground">
                CSV or JSON files (Max 10MB)
              </p>
            </label>
          </div>
        </div>

        {uploading && (
          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary animate-pulse">
            <p className="text-sm text-center text-foreground">
              Processing file...
            </p>
          </div>
        )}

        {uploadedData && !uploading && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <p className="text-sm font-semibold text-foreground">
                  Data Selected Successfully
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Satellite Name
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedData.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Orbit
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedData.orbit}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Velocity
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedData.velocity}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Launch Date
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedData.launchDate}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={analyzeData}
              disabled={analyzing}
              className="w-full bg-secondary hover:bg-secondary/90"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Collision Risk"
              )}
            </Button>
          </div>
        )}

        {prediction && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <h4 className="font-semibold text-foreground">
                OrbitalGuard AI Assessment
              </h4>
            </div>

            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {prediction}
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-muted/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />

            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                Required Data Format:
              </p>

              <ul className="list-disc list-inside space-y-1">
                <li>Satellite name/ID</li>
                <li>Orbital parameters (altitude, inclination)</li>
                <li>Velocity vector</li>
                <li>Launch date (optional)</li>
              </ul>

              <p className="pt-2">
                Note: Actual CSV/JSON parsing and orbital calculations
                are not yet implemented.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CustomDataUpload;
