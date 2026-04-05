"""Smart Crop v4 — DNN face detection + active speaker tracking.

Uses OpenCV DNN (res10 SSD) for robust face detection.
Filters static faces (posters, images on wall).
Tracks lip movement for active speaker.
Smooth cinematic panning with hold times.
"""

import logging
import subprocess
from pathlib import Path

import cv2
import numpy as np

log = logging.getLogger("smart_crop")

MODEL_DIR = Path(__file__).parent.parent.parent / "models"
PROTO = str(MODEL_DIR / "face_detect.prototxt")
MODEL = str(MODEL_DIR / "face_detect.caffemodel")

# Tuning
MIN_HOLD_SECONDS = 4.0
ENERGY_SWITCH_RATIO = 2.0
ENERGY_FLOOR = 3.5
SMOOTH_WINDOW_SECONDS = 2.5
SPEAKER_WINDOW_SECONDS = 1.5
FACE_CONFIDENCE = 0.45
STATIC_FACE_THRESHOLD = 2.0  # faces with less than this avg movement are posters


def _get_dnn_detector():
    return cv2.dnn.readNetFromCaffe(PROTO, MODEL)


def _detect_faces_dnn(frame, net, confidence_thresh=FACE_CONFIDENCE):
    """Detect faces using DNN. Returns [(x, y, w, h, confidence)]."""
    h, w = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(frame, 1.0, (300, 300), (104.0, 177.0, 123.0))
    net.setInput(blob)
    detections = net.forward()

    faces = []
    for i in range(detections.shape[2]):
        conf = float(detections[0, 0, i, 2])
        if conf < confidence_thresh:
            continue
        box = detections[0, 0, i, 3:7] * [w, h, w, h]
        x1, y1, x2, y2 = box.astype(int)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 > x1 and y2 > y1:
            faces.append((x1, y1, x2 - x1, y2 - y1, conf))

    return faces


def establish_face_slots(video_path: str) -> list[dict]:
    """Detect stable face positions using DNN + filter out static (poster) faces."""
    cap = cv2.VideoCapture(video_path)
    vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    net = _get_dnn_detector()

    # Sample frames throughout first 10 seconds
    sample_count = min(int(fps * 10), total_frames)
    sample_interval = max(1, sample_count // 40)  # ~40 samples

    all_faces = []
    prev_gray = None
    face_movement = {}  # track movement per face cluster to filter posters

    frame_idx = 0
    while cap.isOpened() and frame_idx < sample_count:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_interval == 0:
            faces = _detect_faces_dnn(frame, net)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            for (x, y, w, h, conf) in faces:
                cx = x + w // 2
                cy = y + h // 2

                # Measure face region movement if we have prev frame
                movement = 0.0
                if prev_gray is not None:
                    face_region_curr = gray[y:y+h, x:x+w]
                    face_region_prev = prev_gray[y:y+h, x:x+w]
                    if face_region_curr.shape == face_region_prev.shape and face_region_curr.size > 0:
                        movement = float(np.mean(cv2.absdiff(face_region_curr, face_region_prev)))

                all_faces.append({
                    "x": cx, "y": cy, "w": w, "h": h,
                    "conf": conf, "movement": movement,
                })

            prev_gray = gray.copy()

        frame_idx += 1

    cap.release()

    if not all_faces:
        return []

    # Cluster by BOTH x AND y position (separates real faces from posters above/below)
    threshold_x = vid_w * 0.10
    threshold_y = vid_h * 0.20  # faces must be at similar vertical position

    clusters = []
    used = set()
    xs = np.array([f["x"] for f in all_faces])
    sorted_indices = np.argsort(xs)

    for idx in sorted_indices:
        idx = int(idx)
        if idx in used:
            continue
        cluster = [all_faces[idx]]
        used.add(idx)
        for other_idx in sorted_indices:
            other_idx = int(other_idx)
            if other_idx in used:
                continue
            if (abs(all_faces[other_idx]["x"] - all_faces[idx]["x"]) < threshold_x and
                abs(all_faces[other_idx]["y"] - all_faces[idx]["y"]) < threshold_y):
                cluster.append(all_faces[other_idx])
                used.add(other_idx)

        if len(cluster) >= 3:
            avg_movement = np.mean([f["movement"] for f in cluster if f["movement"] > 0])
            avg_conf = np.mean([f["conf"] for f in cluster])

            clusters.append({
                "x_center": int(np.median([f["x"] for f in cluster])),
                "y_center": int(np.median([f["y"] for f in cluster])),
                "avg_width": int(np.median([f["w"] for f in cluster])),
                "avg_height": int(np.median([f["h"] for f in cluster])),
                "count": len(cluster),
                "avg_movement": float(avg_movement) if not np.isnan(avg_movement) else 0,
                "avg_conf": float(avg_conf),
            })

    # FILTER 1: remove faces in top 30% of frame (posters, images on wall)
    clusters = [c for c in clusters if c["y_center"] > vid_h * 0.30]

    # FILTER 2: remove low-detection-count clusters (noise)
    clusters = [c for c in clusters if c["count"] >= 5]

    # FILTER 3: remove static faces (no movement = poster)
    if clusters:
        max_movement = max(c["avg_movement"] for c in clusters)
        if max_movement > 0:
            clusters = [c for c in clusters if c["avg_movement"] > STATIC_FACE_THRESHOLD
                        or c["avg_movement"] > max_movement * 0.3]

    clusters.sort(key=lambda c: c["x_center"])

    log.info("Found %d real face slots (filtered posters): %s",
             len(clusters),
             [(c["x_center"], f"mov={c['avg_movement']:.1f}", f"n={c['count']}") for c in clusters])

    return clusters


def detect_active_speaker(video_path: str, face_slots: list[dict]) -> list[dict]:
    """Track who's speaking via lip movement with stability controls."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    window_frames = max(1, int(fps * SPEAKER_WINDOW_SECONDS))
    min_hold_frames = int(fps * MIN_HOLD_SECONDS)

    prev_gray = None
    speaker_timeline = []
    slot_energy = [0.0] * len(face_slots)
    frame_count = 0
    current_speaker = 0
    frames_on_current = 0

    for frame_idx in range(total_frames):
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if prev_gray is not None:
            for slot_idx, slot in enumerate(face_slots):
                sx, sy = slot["x_center"], slot["y_center"]
                sw, sh = slot["avg_width"], slot["avg_height"]

                # Mouth region: lower 35%, center 50% width
                mx1 = max(0, sx - int(sw * 0.25))
                mx2 = min(vid_w, sx + int(sw * 0.25))
                my1 = max(0, sy + int(sh * 0.15))
                my2 = min(vid_h, sy + int(sh * 0.45))

                if mx2 <= mx1 or my2 <= my1:
                    continue

                curr = gray[my1:my2, mx1:mx2]
                prev = prev_gray[my1:my2, mx1:mx2]

                if curr.shape == prev.shape and curr.size > 0:
                    slot_energy[slot_idx] += float(np.mean(cv2.absdiff(curr, prev)))

        frame_count += 1
        frames_on_current += 1

        if frame_count >= window_frames:
            avg = [e / frame_count for e in slot_energy]
            candidate = int(np.argmax(avg))
            candidate_e = avg[candidate]
            current_e = avg[current_speaker]

            if (candidate != current_speaker and
                frames_on_current >= min_hold_frames and
                candidate_e > current_e * ENERGY_SWITCH_RATIO and
                candidate_e > ENERGY_FLOOR):
                current_speaker = candidate
                frames_on_current = 0

            speaker_timeline.append({
                "time_sec": round(frame_idx / fps, 2),
                "active_slot_idx": current_speaker,
            })

            slot_energy = [0.0] * len(face_slots)
            frame_count = 0

        prev_gray = gray.copy()

    cap.release()

    if speaker_timeline:
        counts = {}
        for t in speaker_timeline:
            s = t["active_slot_idx"]
            counts[s] = counts.get(s, 0) + 1
        log.info("Speaker distribution: %s (%d windows)", counts, len(speaker_timeline))

    return speaker_timeline


def smart_crop_video(
    input_path: str,
    output_path: str,
    output_width: int = 1080,
    output_height: int = 1920,
) -> bool:
    """Full pipeline: DNN faces → filter posters → track speaker → smooth pan render."""
    cap = cv2.VideoCapture(input_path)
    vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    if vid_w == 0 or vid_h == 0:
        return False

    # Already vertical
    if vid_h >= vid_w:
        r = subprocess.run([
            "ffmpeg", "-i", input_path,
            "-vf", f"scale={output_width}:{output_height}:force_original_aspect_ratio=decrease,"
                   f"pad={output_width}:{output_height}:(ow-iw)/2:(oh-ih)/2",
            "-c:v", "libx264", "-crf", "20", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", "-y", output_path,
        ], capture_output=True, text=True, timeout=120)
        return r.returncode == 0

    crop_w = int(vid_h * 9 / 16)
    if crop_w > vid_w:
        crop_w = vid_w

    # Phase 1
    log.info("Phase 1: DNN face detection...")
    face_slots = establish_face_slots(input_path)

    if not face_slots:
        log.warning("No faces — center crop")
        cx = (vid_w - crop_w) // 2
        return _ffmpeg_crop(input_path, output_path, crop_w, vid_h, cx, output_width, output_height)

    if len(face_slots) == 1:
        cx = max(0, min(face_slots[0]["x_center"] - crop_w // 2, vid_w - crop_w))
        log.info("Single speaker at x=%d", cx)
        return _ffmpeg_crop(input_path, output_path, crop_w, vid_h, cx, output_width, output_height)

    # Phase 2
    log.info("Phase 2: Speaker tracking (%d faces)...", len(face_slots))
    timeline = detect_active_speaker(input_path, face_slots)

    if not timeline:
        gc = int(np.mean([s["x_center"] for s in face_slots]))
        cx = max(0, min(gc - crop_w // 2, vid_w - crop_w))
        return _ffmpeg_crop(input_path, output_path, crop_w, vid_h, cx, output_width, output_height)

    # Phase 3: Render with jump cuts (instant snap to active speaker)
    log.info("Phase 3: Rendering with jump cuts...")

    # Build per-frame crop_x — NO smoothing, instant snap
    frame_cx = []
    ti = 0
    for fi in range(total_frames):
        t = fi / fps
        while ti < len(timeline) - 1 and timeline[ti + 1]["time_sec"] <= t:
            ti += 1
        slot = face_slots[timeline[ti]["active_slot_idx"]]
        cx = max(0, min(slot["x_center"] - crop_w // 2, vid_w - crop_w))
        frame_cx.append(int(cx))

    smoothed = frame_cx  # No smoothing — hard cuts

    # Extract audio
    audio_tmp = str(Path(output_path).with_suffix(".audio.aac"))
    subprocess.run(["ffmpeg", "-i", input_path, "-vn", "-c:a", "aac", "-b:a", "128k", "-y", audio_tmp],
                   capture_output=True, timeout=30)

    # Render video
    video_tmp = str(Path(output_path).with_suffix(".video.mp4"))
    cap = cv2.VideoCapture(input_path)
    writer = cv2.VideoWriter(video_tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (output_width, output_height))

    fi = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        cx = int(smoothed[fi]) if fi < len(smoothed) else int(smoothed[-1])
        cropped = frame[:, cx:cx + crop_w]
        resized = cv2.resize(cropped, (output_width, output_height), interpolation=cv2.INTER_LANCZOS4)
        writer.write(resized)
        fi += 1

    writer.release()
    cap.release()

    # Mux
    r = subprocess.run([
        "ffmpeg", "-i", video_tmp, "-i", audio_tmp,
        "-c:v", "libx264", "-crf", "20", "-preset", "fast",
        "-c:a", "copy", "-movflags", "+faststart", "-y", output_path,
    ], capture_output=True, text=True, timeout=180)

    Path(video_tmp).unlink(missing_ok=True)
    Path(audio_tmp).unlink(missing_ok=True)

    if r.returncode != 0:
        log.error("Mux failed: %s", r.stderr[:300])
        return False

    changes = sum(1 for i in range(1, len(timeline)) if timeline[i]["active_slot_idx"] != timeline[i-1]["active_slot_idx"])
    log.info("Done: %d frames, %d speaker switches", fi, changes)
    return True


def _ffmpeg_crop(input_path, output_path, cw, ch, cx, ow, oh):
    r = subprocess.run([
        "ffmpeg", "-i", input_path,
        "-vf", f"crop={cw}:{ch}:{cx}:0,scale={ow}:{oh}:flags=lanczos",
        "-c:v", "libx264", "-crf", "20", "-preset", "fast",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", "-y", output_path,
    ], capture_output=True, text=True, timeout=120)
    return r.returncode == 0
