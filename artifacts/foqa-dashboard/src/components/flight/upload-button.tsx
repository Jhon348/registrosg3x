import { useRef, useState } from "react";
import { getListFlightsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsPending(true);
    try {
      const res = await fetch("/api/flights/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      toast({
        title: "Log Uploaded",
        description: `Successfully processed ${file.name}`,
      });
      queryClient.invalidateQueries({ queryKey: getListFlightsQueryKey() });
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err?.message ?? "There was an error uploading the flight log.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        disabled={isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <UploadCloud className="w-4 h-4 mr-2" />
        )}
        UPLOAD G3X LOG
      </Button>
    </div>
  );
}
