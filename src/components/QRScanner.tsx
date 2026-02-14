"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ScanLine, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scanningRef = useRef(true);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let animFrameId: number;

    const startScanning = async () => {
      // Check for BarcodeDetector support
      if (!("BarcodeDetector" in window)) {
        setError("QR scanning is not supported on this browser. Please enter the address manually.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // @ts-expect-error BarcodeDetector is not yet in TS lib
        const detector = new BarcodeDetector({ formats: ["qr_code"] });

        const scan = async () => {
          if (!scanningRef.current || !videoRef.current) return;

          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              if (value) {
                stopCamera();
                onScan(value);
                return;
              }
            }
          } catch {
            // Detection can fail on some frames — ignore
          }

          if (scanningRef.current) {
            animFrameId = requestAnimationFrame(scan);
          }
        };

        // Start scanning loop
        animFrameId = requestAnimationFrame(scan);
      } catch (err) {
        if ((err as Error).name === "NotAllowedError") {
          setError("Camera access denied. Please allow camera access to scan QR codes.");
        } else {
          setError("Could not access camera. Please enter the address manually.");
        }
      }
    };

    startScanning();

    return () => {
      cancelAnimationFrame(animFrameId);
      stopCamera();
    };
  }, [onScan, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Close button */}
      <button
        onClick={() => {
          stopCamera();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <p className="text-white text-sm font-medium mb-4">Scan QR Code</p>

      {error ? (
        <div className="px-6 text-center space-y-4">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Close
          </Button>
        </div>
      ) : (
        <div className="relative w-72 h-72 rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {/* Scan overlay */}
          <div className="absolute inset-0 border-2 border-white/30 rounded-2xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ScanLine className="h-48 w-48 text-primary/50 animate-pulse" />
          </div>
          {/* Corner markers */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        Point your camera at a wallet QR code
      </p>
    </div>
  );
}
