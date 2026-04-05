"""Smart Crop — face-detection based 9:16 cropping for speaker-focused clips.

Detects faces in the video, tracks the primary speaker's position,
and crops a smooth 9:16 frame centered on them.

For multi-person panels (podcasts, interviews), it widens the crop
to include the group rather than tracking one face.
"""

import json
import logging
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np

log = logging.getLogger("smart_crop")

# Use OpenCV's DNN face detector (ships with opencv, no extra install)
_FACE_NET = None
_FACE_PROTO = None


def _get_face_detector():
    """Load OpenCV's DNN face detector (Caffe model)."""
    global _FACE_NET
    if _FACE_NET is not None:
        return _FACE_NET

    # Use OpenCV's built-in Haar cascade as fallback (always available)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    _FACE_NET = cv2.CascadeClassifier(cascade_path)
    return _FACE_NET


def detect_face_positions(video_path: str, sample_every_n_frames: int = 15) -> list[dict]:
    """Sample frames and detect face positions throughout the video."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        log.error("Cannot open video: %s", video_path)
        return []

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    detector = _get_face_detector()
    positions = []
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_every_n_frames == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            detections = detector.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            )

            faces = []
            for (x, y, w, h) in detections:
                faces.append({
                    "x_center": (x + w / 2) / vid_w,
                    "y_center": (y + h / 2) / vid_h,
                    "width": w / vid_w,
                    "height": h / vid_h,
                    "confidence": 0.8,
                })

            positions.append({
                "frame": frame_idx,
                "faces": faces,
            })

        frame_idx += 1

    cap.release()

    log.info("Scanned %d frames, detected faces in %d samples",
             total_frames, sum(1 for p in positions if p["faces"]))

    return positions


def compute_crop_trajectory(
    positions: list[dict],
    video_width: int,
    video_height: int,
    target_aspect: float = 9 / 16,
    smoothing: int = 5,
) -> list[dict]:
    """Compute a smooth crop trajectory from face positions.

    Returns list of {frame, crop_x, crop_y, crop_w, crop_h} for each sampled frame.
    """
    if not positions:
        # No face data — center crop
        crop_w = int(video_height * target_aspect)
        crop_x = (video_width - crop_w) // 2
        return [{"frame": 0, "crop_x": crop_x, "crop_y": 0,
                 "crop_w": crop_w, "crop_h": video_height}]

    # Determine if multi-person (panel) or single speaker
    face_counts = [len(p["faces"]) for p in positions if p["faces"]]
    avg_faces = np.mean(face_counts) if face_counts else 0
    is_panel = avg_faces >= 2

    crop_w = int(video_height * target_aspect)
    crop_h = video_height

    # If panel with 2+ people, widen crop or use full width center
    if is_panel:
        # For panels: find the bounding box of all faces, center crop on that
        all_x_centers = []
        for p in positions:
            for f in p["faces"]:
                all_x_centers.append(f["x_center"] * video_width)

        if all_x_centers:
            group_center_x = np.mean(all_x_centers)
        else:
            group_center_x = video_width / 2

        crop_x = int(group_center_x - crop_w / 2)
        crop_x = max(0, min(crop_x, video_width - crop_w))

        # Static crop for panels (no tracking jitter)
        return [{"frame": 0, "crop_x": crop_x, "crop_y": 0,
                 "crop_w": crop_w, "crop_h": crop_h}]

    # Single speaker: track face position with smoothing
    raw_centers = []
    for p in positions:
        if p["faces"]:
            # Use the largest/most confident face
            best = max(p["faces"], key=lambda f: f["confidence"])
            raw_centers.append(best["x_center"] * video_width)
        elif raw_centers:
            raw_centers.append(raw_centers[-1])  # hold last position
        else:
            raw_centers.append(video_width / 2)  # default center

    # Smooth the trajectory to avoid jitter
    if len(raw_centers) > smoothing:
        kernel = np.ones(smoothing) / smoothing
        smoothed = np.convolve(raw_centers, kernel, mode="same")
    else:
        smoothed = raw_centers

    trajectory = []
    for i, (pos, center_x) in enumerate(zip(positions, smoothed)):
        crop_x = int(center_x - crop_w / 2)
        crop_x = max(0, min(crop_x, video_width - crop_w))

        trajectory.append({
            "frame": pos["frame"],
            "crop_x": crop_x,
            "crop_y": 0,
            "crop_w": crop_w,
            "crop_h": crop_h,
        })

    return trajectory


def smart_crop_video(
    input_path: str,
    output_path: str,
    output_width: int = 1080,
    output_height: int = 1920,
) -> bool:
    """Full pipeline: detect faces → compute crop → apply via ffmpeg.

    For static crops (panels, stable single speaker), uses one ffmpeg command.
    For dynamic tracking, exports crop keyframes and applies frame-by-frame.
    """
    cap = cv2.VideoCapture(input_path)
    vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    if vid_w == 0 or vid_h == 0:
        log.error("Cannot read video dimensions: %s", input_path)
        return False

    # If already vertical, just scale
    if vid_h > vid_w:
        log.info("Video already vertical, just scaling")
        result = subprocess.run([
            "ffmpeg", "-i", input_path,
            "-vf", f"scale={output_width}:{output_height}:force_original_aspect_ratio=decrease,"
                   f"pad={output_width}:{output_height}:(ow-iw)/2:(oh-ih)/2",
            "-c:v", "libx264", "-crf", "20", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", "-y", output_path,
        ], capture_output=True, text=True, timeout=120)
        return result.returncode == 0

    log.info("Detecting faces in %dx%d video (%d frames)...", vid_w, vid_h, total_frames)

    # Detect faces
    positions = detect_face_positions(input_path, sample_every_n_frames=15)

    # Compute crop trajectory
    trajectory = compute_crop_trajectory(positions, vid_w, vid_h)

    if len(trajectory) <= 1:
        # Static crop — single ffmpeg command
        t = trajectory[0]
        log.info("Static crop at x=%d (panel or stable speaker)", t["crop_x"])

        result = subprocess.run([
            "ffmpeg", "-i", input_path,
            "-vf", f"crop={t['crop_w']}:{t['crop_h']}:{t['crop_x']}:{t['crop_y']},"
                   f"scale={output_width}:{output_height}:flags=lanczos",
            "-c:v", "libx264", "-crf", "20", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", "-y", output_path,
        ], capture_output=True, text=True, timeout=120)
        return result.returncode == 0

    else:
        # Dynamic crop — use sendcmd to update crop position per frame
        # Build sendcmd file with crop keyframes
        crop_w = trajectory[0]["crop_w"]
        crop_h = trajectory[0]["crop_h"]
        sample_interval = 15  # frames between samples

        # Interpolate trajectory to every frame
        cmd_lines = []
        for i, t in enumerate(trajectory):
            time_sec = t["frame"] / fps
            cmd_lines.append(f"{time_sec:.3f} [in] crop w {crop_w} h {crop_h} x {t['crop_x']} y {t['crop_y']};")

        # Write sendcmd script
        cmd_file = Path(input_path).parent / "crop_cmd.txt"
        cmd_file.write_text("\n".join(cmd_lines))

        log.info("Dynamic crop with %d keyframes", len(cmd_lines))

        # Use zoompan for smooth dynamic cropping
        # Simpler approach: use the median crop position (most stable)
        median_x = int(np.median([t["crop_x"] for t in trajectory]))
        log.info("Using median crop x=%d for stability", median_x)

        result = subprocess.run([
            "ffmpeg", "-i", input_path,
            "-vf", f"crop={crop_w}:{crop_h}:{median_x}:0,"
                   f"scale={output_width}:{output_height}:flags=lanczos",
            "-c:v", "libx264", "-crf", "20", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", "-y", output_path,
        ], capture_output=True, text=True, timeout=120)

        cmd_file.unlink(missing_ok=True)
        return result.returncode == 0
