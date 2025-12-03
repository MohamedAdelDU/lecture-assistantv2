#!/usr/bin/env python3
"""
Audio Transcription using Faster Whisper
Converts audio/video files to text transcript
"""
import sys
import json
import os
from faster_whisper import WhisperModel
from model_cache import get_whisper_model

# Try to import torch for GPU detection (optional, won't fail if not available)
try:
    import torch
except ImportError:
    torch = None

def transcribe_audio(file_path, model_size="base", language=None, device="cpu"):
    """Transcribe audio file using Faster Whisper
    
    Args:
        file_path: Path to audio/video file
        model_size: Whisper model size (tiny, base, small, medium, large-v2, large-v3)
        language: Language code (e.g., 'ar', 'en') or None for auto-detection
        device: 'cpu' or 'cuda' for GPU acceleration
    
    Returns:
        Dictionary with transcription results
    """
    try:
        if not os.path.exists(file_path):
            return {
                "success": False,
                "error": f"File not found: {file_path}"
            }
        
        # Initialize Whisper model
        # Use appropriate compute type based on device
        # For GPU: use float16 for best performance on RunPod/GPU servers
        # For CPU: use int8 for better performance
        
        # Check if CUDA is actually available (optional - torch may not be installed)
        # faster-whisper will handle CUDA detection internally, but we can check with torch if available
        torch_module = None
        cuda_available = False
        
        try:
            import torch as torch_module
            if hasattr(torch_module, 'cuda') and torch_module.cuda:
                cuda_available = torch_module.cuda.is_available()
                if cuda_available:
                    print(f"[Whisper] CUDA available: {torch_module.cuda.get_device_name(0)}", file=sys.stderr)
        except ImportError:
            # torch not installed - faster-whisper will detect CUDA itself
            print(f"[Whisper] torch not installed, faster-whisper will detect CUDA automatically", file=sys.stderr)
            # If device is cuda/gpu, let faster-whisper try to use it
            cuda_available = (device == "cuda" or device == "gpu")
        
        # Try GPU if requested (faster-whisper will fallback to CPU if GPU not available)
        if (device == "cuda" or device == "gpu"):
            try:
                # Try float16 first for GPU (best performance on RunPod)
                print(f"[Whisper] Loading model: {model_size} on GPU with float16", file=sys.stderr)
                if torch_module and torch_module.cuda.is_available():
                    try:
                        print(f"[Whisper] GPU Device: {torch_module.cuda.get_device_name(0)}", file=sys.stderr)
                        print(f"[Whisper] GPU Memory: {torch_module.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB", file=sys.stderr)
                    except:
                        pass  # Skip GPU info if not available
                # Use cached model if available
                model = get_whisper_model(model_size, device="cuda", compute_type="float16")
                print(f"[Whisper] Model ready on GPU with float16", file=sys.stderr)
            except Exception as e:
                print(f"[Whisper] float16 not available, trying int8_float16: {e}", file=sys.stderr)
                try:
                    # Fallback to int8_float16 (still uses GPU)
                    model = get_whisper_model(model_size, device="cuda", compute_type="int8_float16")
                    print(f"[Whisper] Model ready on GPU with int8_float16", file=sys.stderr)
                except Exception as e2:
                    print(f"[Whisper] GPU initialization failed, falling back to CPU: {e2}", file=sys.stderr)
                    # Fallback to CPU if GPU fails
                    model = get_whisper_model(model_size, device="cpu", compute_type="int8")
        elif (device == "cuda" or device == "gpu") and not cuda_available:
            print(f"[Whisper] GPU requested but CUDA not available, falling back to CPU", file=sys.stderr)
            model = get_whisper_model(model_size, device="cpu", compute_type="int8")
        else:
            # CPU mode
            print(f"[Whisper] Loading model: {model_size} on CPU", file=sys.stderr)
            model = get_whisper_model(model_size, device="cpu", compute_type="int8")
        
        # Transcribe audio
        # Optimize settings based on device and model size
        # For GPU with large models, use higher beam_size for better accuracy
        # For CPU or smaller models, use lower beam_size for faster processing
        is_gpu = (device == "cuda" or device == "gpu")
        is_large_model = "large" in model_size.lower() or "medium" in model_size.lower()
        
        beam_size = 5
        if is_gpu and is_large_model:
            # Higher beam size for better accuracy on GPU with large models
            beam_size = 5
            print(f"[Whisper] Using optimized settings for GPU + large model (beam_size={beam_size})", file=sys.stderr)
        elif is_gpu:
            # Standard settings for GPU with smaller models
            beam_size = 5
        else:
            # CPU mode - use lower beam size for faster processing
            beam_size = 5
        
        print(f"[Whisper] Transcribing audio file: {file_path}", file=sys.stderr)
        segments, info = model.transcribe(
            file_path,
            language=language,
            beam_size=beam_size,
            vad_filter=True,  # Voice Activity Detection filter
            vad_parameters=dict(min_silence_duration_ms=500),
            # Additional optimizations for GPU
            condition_on_previous_text=True if is_gpu else False,  # Better context on GPU
            initial_prompt=None,  # Can be customized for better results
            word_timestamps=False,  # Disable for faster processing (enable if needed)
            temperature=0.0,  # Deterministic output
            compression_ratio_threshold=2.4,  # Filter out low-quality segments
            log_prob_threshold=-1.0,  # Filter out low-confidence segments
            no_speech_threshold=0.6,  # Threshold for detecting speech
        )
        
        # Extract detected language
        detected_language = info.language if hasattr(info, 'language') else language or 'unknown'
        print(f"[Whisper] Detected language: {detected_language}", file=sys.stderr)
        
        # Collect all segments
        full_text = ""
        segments_list = []
        
        for segment in segments:
            segment_text = segment.text.strip()
            if segment_text:
                full_text += segment_text + " "
                segments_list.append({
                    "text": segment_text,
                    "start": segment.start,
                    "end": segment.end
                })
        
        # Clean up text
        full_text = " ".join(full_text.split()).strip()
        
        print(f"[Whisper] Transcription complete: {len(full_text)} characters, {len(full_text.split())} words", file=sys.stderr)
        
        return {
            "success": True,
            "transcript": full_text,
            "wordCount": len(full_text.split()),
            "characterCount": len(full_text),
            "language": detected_language,
            "segments": segments_list
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Whisper] Error: {str(e)}", file=sys.stderr)
        print(f"[Whisper] Traceback: {error_trace}", file=sys.stderr)
        return {
            "success": False,
            "error": f"Transcription failed: {str(e)}",
            "details": error_trace
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "File path is required"
        }))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # Optional parameters
    model_size = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else "base"
    language = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
    device = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else "cpu"
    
    # If language is "None" string, convert to None
    if language == "None" or language == "":
        language = None
    
    result = transcribe_audio(file_path, model_size, language, device)
    print(json.dumps(result))

