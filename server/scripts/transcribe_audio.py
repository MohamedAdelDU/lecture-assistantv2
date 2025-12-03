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
        
        # ABSOLUTE MAXIMUM quality settings for Whisper
        # Higher beam_size = better accuracy but slower
        # For GPU with large models, use ABSOLUTE MAXIMUM quality settings
        if is_gpu and is_large_model:
            # GPU + large model: use beam_size=20 for ABSOLUTE MAXIMUM accuracy
            beam_size = 20
            best_of = 20  # Maximum candidates for best quality
            patience = 3.0  # Higher patience for better results
            print(f"[Whisper] Using ABSOLUTE MAXIMUM quality settings for GPU + large model (beam_size={beam_size}, best_of={best_of}, patience={patience})", file=sys.stderr)
        elif is_gpu:
            # GPU + smaller model: use beam_size=15 for very high quality
            beam_size = 15
            best_of = 15
            patience = 2.5
        else:
            # CPU mode - use high quality settings
            beam_size = 10
            best_of = 10
            patience = 2.0
        
        # Prepare ULTRA-ENHANCED initial prompt for maximum accuracy (especially for Arabic)
        initial_prompt = None
        if language == "ar":
            # Ultra-enhanced Arabic prompt for maximum accuracy
            initial_prompt = "هذه محاضرة أكاديمية تعليمية باللغة العربية الفصحى. المتحدث يتحدث بوضوح وبطء معتدل. النص دقيق ومفصل مع استخدام المصطلحات العلمية والأكاديمية الصحيحة. علامات الترقيم والفواصل واضحة."
        elif language == "en":
            # Ultra-enhanced English prompt for maximum accuracy
            initial_prompt = "This is an academic educational lecture in clear English. The speaker speaks clearly and at a moderate pace. The text is accurate and detailed with proper use of scientific and academic terminology. Punctuation and pauses are clear."
        elif language and language != "None":
            # Enhanced prompt for other languages
            initial_prompt = f"This is an academic educational lecture in {language}. The speaker speaks clearly. The text is accurate and detailed with proper terminology."
        
        print(f"[Whisper] Transcribing audio file: {file_path} with ABSOLUTE MAXIMUM quality settings", file=sys.stderr)
        segments, info = model.transcribe(
            file_path,
            language=language,
            beam_size=beam_size,
            vad_filter=True,  # Voice Activity Detection filter
            vad_parameters=dict(
                min_silence_duration_ms=300,  # Lower for better detection
                threshold=0.3,  # Lower threshold for maximum detection
                min_speech_duration_ms=250,  # Minimum speech duration
            ),
            # ABSOLUTE MAXIMUM quality optimizations
            condition_on_previous_text=True,  # Always use context for better accuracy
            initial_prompt=initial_prompt,  # Ultra-enhanced prompt for maximum accuracy
            word_timestamps=True,  # Enable for better word-level accuracy
            temperature=0.0,  # Deterministic output (most accurate)
            compression_ratio_threshold=2.2,  # Stricter filter for better quality
            log_prob_threshold=-0.8,  # Higher threshold for better confidence
            no_speech_threshold=0.4,  # Lower threshold for maximum speech detection
            # ABSOLUTE MAXIMUM quality settings
            best_of=best_of,  # Maximum candidates for best quality
            patience=patience,  # Higher patience for better results
            # Additional quality parameters
            suppress_blank=True,  # Suppress blank outputs
            suppress_tokens=[-1],  # Suppress special tokens
            without_timestamps=False,  # Keep timestamps for better alignment
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

