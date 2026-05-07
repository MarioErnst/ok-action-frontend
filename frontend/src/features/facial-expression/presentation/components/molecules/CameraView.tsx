import type { RefObject } from 'react'

type CameraViewProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  isActive: boolean
}

// playsinline is mandatory on iOS: without it the browser opens the video fullscreen.
// muted + autoPlay are required for getUserMedia streams to play without user interaction.
export function CameraView({ videoRef, isActive }: CameraViewProps) {
  return (
    <div className="relative w-full aspect-[4/3] bg-surface rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
          Cámara inactiva
        </div>
      )}
    </div>
  )
}
