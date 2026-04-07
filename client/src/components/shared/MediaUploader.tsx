/**
 * MediaUploader — reusable image/video picker + S3 upload component.
 * Renders a compact attach button. On file select, uploads to /api/upload
 * and calls onUploaded({ url, mimetype }) when done.
 * Shows a preview thumbnail/video thumbnail while uploading.
 */
import { useRef, useState } from "react";
import { ImagePlus, Video, X, Loader2 } from "lucide-react";

interface UploadedMedia {
  url: string;
  mimetype: string;
}

interface MediaUploaderProps {
  onUploaded: (media: UploadedMedia) => void;
  onRemove?: () => void;
  currentMedia?: UploadedMedia | null;
  accept?: string; // defaults to images + videos
  maxSizeMB?: number;
}

export function MediaUploader({
  onUploaded,
  onRemove,
  currentMedia,
  accept = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime",
  maxSizeMB = 50,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large (max ${maxSizeMB} MB)`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      onUploaded({ url: data.url, mimetype: data.mimetype });
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const isVideo = currentMedia?.mimetype?.startsWith("video/");

  return (
    <div className="flex items-center gap-2">
      {/* Attach button — hidden when media already attached */}
      {!currentMedia && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border hover:border-[#4DC820] hover:text-[#4DC820] transition-all text-muted-foreground disabled:opacity-50"
          title="Attach image or video"
        >
          {uploading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <ImagePlus size={11} />
          )}
          {uploading ? "Uploading…" : "Photo/Video"}
        </button>
      )}

      {/* Preview */}
      {currentMedia && (
        <div className="relative inline-flex items-center gap-1.5">
          {isVideo ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-[10px] font-bold text-foreground">
              <Video size={11} className="text-[#4DC820]" />
              Video attached
            </div>
          ) : (
            <img
              src={currentMedia.url}
              alt="Attached"
              className="h-10 w-10 object-cover rounded-lg border border-border"
            />
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
              title="Remove attachment"
            >
              <X size={9} className="text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <span className="text-[10px] text-red-500 font-medium">{error}</span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
