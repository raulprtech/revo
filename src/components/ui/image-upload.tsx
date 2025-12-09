"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    folder?: string; // e.g., "sponsors", "events", "avatars"
    className?: string;
    aspectRatio?: "square" | "video" | "banner"; // 1:1, 16:9, 3:1
    maxSizeMB?: number;
    placeholder?: string;
    disabled?: boolean;
}

export function ImageUpload({
    value,
    onChange,
    folder = "uploads",
    className,
    aspectRatio = "square",
    maxSizeMB = 5,
    placeholder = "Subir imagen",
    disabled = false,
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const aspectClasses = {
        square: "aspect-square",
        video: "aspect-video",
        banner: "aspect-[3/1]",
    };

    const handleUpload = useCallback(async (file: File) => {
        // Validate file type
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
        if (!validTypes.includes(file.type)) {
            toast({
                title: "Formato no válido",
                description: "Solo se permiten imágenes JPG, PNG, GIF, WebP o SVG",
                variant: "destructive",
            });
            return;
        }

        // Validate file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            toast({
                title: "Archivo muy grande",
                description: `El tamaño máximo es ${maxSizeMB}MB`,
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);

        try {
            const supabase = createClient();
            
            // Get current user for folder organization
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Error",
                    description: "Debes iniciar sesión para subir imágenes",
                    variant: "destructive",
                });
                return;
            }

            // Generate unique filename
            const timestamp = Date.now();
            const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
            const fileName = `${user.id}/${folder}/${timestamp}.${extension}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (error) {
                console.error('Upload error:', error);
                toast({
                    title: "Error al subir",
                    description: error.message || "No se pudo subir la imagen",
                    variant: "destructive",
                });
                return;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(data.path);

            setPreviewUrl(publicUrl);
            onChange(publicUrl);

            toast({
                title: "Imagen subida",
                description: "La imagen se ha subido correctamente",
            });
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Error",
                description: "Ocurrió un error al subir la imagen",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    }, [folder, maxSizeMB, onChange, toast]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (disabled || isUploading) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleRemove = async () => {
        if (!value || !previewUrl) return;

        try {
            const supabase = createClient();
            
            // Extract path from URL
            const url = new URL(previewUrl);
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)/);
            
            if (pathMatch) {
                const filePath = decodeURIComponent(pathMatch[1]);
                await supabase.storage.from('images').remove([filePath]);
            }
        } catch (error) {
            console.error('Error removing image:', error);
        }

        setPreviewUrl(null);
        onChange("");
        
        // Reset input
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const handleUrlInput = (url: string) => {
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            setPreviewUrl(url);
            onChange(url);
        } else if (!url) {
            setPreviewUrl(null);
            onChange("");
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            {/* Upload Area */}
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-lg transition-colors overflow-hidden",
                    aspectClasses[aspectRatio],
                    dragActive && "border-primary bg-primary/5",
                    !dragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
                    disabled && "opacity-50 cursor-not-allowed",
                    isUploading && "pointer-events-none"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {previewUrl ? (
                    // Preview
                    <div className="absolute inset-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay with remove button */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => inputRef.current?.click()}
                                disabled={disabled || isUploading}
                            >
                                <Upload className="h-4 w-4 mr-1" />
                                Cambiar
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={handleRemove}
                                disabled={disabled || isUploading}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Upload prompt
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-4"
                        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Subiendo...</p>
                            </>
                        ) : (
                            <>
                                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground text-center">
                                    {placeholder}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Arrastra o haz clic para subir
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Máx. {maxSizeMB}MB
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled || isUploading}
                />
            </div>

            {/* URL Input as fallback */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">o URL:</span>
                <Input
                    type="url"
                    placeholder="https://..."
                    value={previewUrl || ""}
                    onChange={(e) => handleUrlInput(e.target.value)}
                    disabled={disabled || isUploading}
                    className="h-8 text-xs"
                />
            </div>
        </div>
    );
}

// Compact version for inline use (like sponsor logos)
interface CompactImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    folder?: string;
    placeholder?: string;
    disabled?: boolean;
}

export function CompactImageUpload({
    value,
    onChange,
    folder = "uploads",
    placeholder = "Logo",
    disabled = false,
}: CompactImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleUpload = async (file: File) => {
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
        if (!validTypes.includes(file.type)) {
            toast({
                title: "Formato no válido",
                description: "Solo se permiten imágenes JPG, PNG, GIF, WebP o SVG",
                variant: "destructive",
            });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast({
                title: "Archivo muy grande",
                description: "El tamaño máximo es 2MB",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                toast({
                    title: "Error",
                    description: "Debes iniciar sesión",
                    variant: "destructive",
                });
                return;
            }

            const timestamp = Date.now();
            const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
            const fileName = `${user.id}/${folder}/${timestamp}.${extension}`;

            const { data, error } = await supabase.storage
                .from('images')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (error) {
                toast({
                    title: "Error al subir",
                    description: error.message,
                    variant: "destructive",
                });
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(data.path);

            onChange(publicUrl);
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Error",
                description: "No se pudo subir la imagen",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {value ? (
                <div className="relative h-10 w-10 rounded border overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={value} alt="Logo" className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className="h-10 w-10 rounded border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                    {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        <Upload className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>
            )}
            <Input
                type="url"
                placeholder={placeholder}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled || isUploading}
                className="h-10"
            />
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                }}
                disabled={disabled || isUploading}
            />
        </div>
    );
}
