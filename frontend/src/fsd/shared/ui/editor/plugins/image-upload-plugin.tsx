'use client';

import { useCallback, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createImageNode } from "@/fsd/shared/ui/editor/nodes/image-node";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { ImagePlus, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/fsd/shared/ui/dialog";
import { Button } from "@/fsd/shared/ui/button";
import { cn } from "@/fsd/shared/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<string | null>;
}

export function ImageUploadDialog({ isOpen, onClose, onUpload }: ImageUploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Неверный формат файла. Разрешены: JPG, PNG, GIF, WebP";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Файл слишком большой. Максимальный размер: 5 МБ";
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError(null);
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    const url = await onUpload(selectedFile);
    setIsUploading(false);
    
    if (url) {
      setSelectedFile(null);
      setPreview(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="size-5" />
            Вставить изображение
          </DialogTitle>
        </DialogHeader>

        {!selectedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-muted-foreground"
            )}
          >
            <Upload className="size-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Перетащите файл сюда или нажмите для выбора
            </p>
            <p className="text-xs text-muted-foreground">
              Формат файла: JPG, PNG, GIF. Не более 5 МБ
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleInputChange}
              className="hidden"
              id="image-upload"
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              Выбрать файл
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {preview && (
              <div className="relative">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-h-48 mx-auto rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 size-6"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} МБ)
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "Загрузка..." : "Подтвердить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use image upload
export function useImageUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [editor] = useLexicalComposerContext();

  const uploadImage = async (file: File): Promise<string | null> => {
    // In real implementation, upload to your server/CDN
    // For now, create a data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        // Insert into editor
        editor.update(() => {
          const imageNode = $createImageNode({ src: result, altText: file.name });
          $insertNodeToNearestRoot(imageNode);
        });
        
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  };

  return {
    isOpen,
    setIsOpen,
    uploadImage,
    ImageUploadDialog: (
      <ImageUploadDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUpload={uploadImage}
      />
    ),
  };
}
