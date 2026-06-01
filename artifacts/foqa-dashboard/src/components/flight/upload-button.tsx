import { useRef } from "react";
import { useUploadFlight, getListFlightsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFlight = useUploadFlight();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    uploadFlight.mutate(
      { request: { body: formData } as any },
      {
        onSuccess: () => {
          toast({
            title: "Log Uploaded",
            description: `Successfully processed ${file.name}`,
          });
          queryClient.invalidateQueries({ queryKey: getListFlightsQueryKey() });
        },
        onError: (error) => {
          toast({
            title: "Upload Failed",
            description: error.error || "There was an error uploading the flight log.",
            variant: "destructive",
          });
        },
        onSettled: () => {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      }
    );
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv"
      />
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={uploadFlight.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono"
      >
        {uploadFlight.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <UploadCloud className="w-4 h-4 mr-2" />
        )}
        UPLOAD G3X LOG
      </Button>
    </div>
  );
}
