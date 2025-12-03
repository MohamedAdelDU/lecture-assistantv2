#!/usr/bin/env python3
"""
Model Server for Whisper and Qwen models
Loads models once and keeps them in memory
Communicates via HTTP API
"""
import sys
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

# Global model cache
_models = {}
_lock = threading.Lock()

def load_whisper_model(model_size="large-v3", device="cuda", compute_type="float16"):
    """Load Whisper model"""
    cache_key = f"whisper_{model_size}_{device}_{compute_type}"
    
    with _lock:
        if cache_key in _models:
            print(f"[ModelServer] Using cached Whisper model: {cache_key}", file=sys.stderr)
            return _models[cache_key]
        
        print(f"[ModelServer] Loading Whisper model: {cache_key}", file=sys.stderr)
        from faster_whisper import WhisperModel
        
        try:
            if device == "cuda":
                model = WhisperModel(model_size, device="cuda", compute_type=compute_type)
            else:
                model = WhisperModel(model_size, device="cpu", compute_type="int8")
            
            _models[cache_key] = model
            print(f"[ModelServer] Whisper model loaded and cached: {cache_key}", file=sys.stderr)
            return model
        except Exception as e:
            print(f"[ModelServer] Error loading Whisper model: {e}", file=sys.stderr)
            raise

def load_qwen_model(device="cuda"):
    """Load Qwen model"""
    cache_key = f"qwen_3b_{device}"
    
    with _lock:
        if cache_key in _models:
            print(f"[ModelServer] Using cached Qwen model: {cache_key}", file=sys.stderr)
            cached = _models[cache_key]
            return cached['model'], cached['tokenizer']
        
        print(f"[ModelServer] Loading Qwen model: {cache_key}", file=sys.stderr)
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
        
        model_name = "Qwen/Qwen2.5-3B-Instruct"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
        )
        
        if device == "cpu":
            model = model.to(device)
        
        _models[cache_key] = {
            'model': model,
            'tokenizer': tokenizer
        }
        print(f"[ModelServer] Qwen model loaded and cached: {cache_key}", file=sys.stderr)
        return model, tokenizer

class ModelHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            action = data.get('action')
            
            if action == 'transcribe':
                result = self.handle_transcribe(data)
            elif action == 'generate_summary':
                result = self.handle_generate_summary(data)
            elif action == 'generate_quiz':
                result = self.handle_generate_quiz(data)
            elif action == 'generate_flashcards':
                result = self.handle_generate_flashcards(data)
            else:
                result = {"success": False, "error": f"Unknown action: {action}"}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[ModelServer] Error: {str(e)}", file=sys.stderr)
            print(f"[ModelServer] Traceback: {error_trace}", file=sys.stderr)
            
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": str(e),
                "details": error_trace
            }).encode('utf-8'))
    
    def handle_transcribe(self, data):
        """Handle transcription request"""
        file_path = data.get('file_path')
        model_size = data.get('model_size', 'large-v3')
        language = data.get('language')
        device = data.get('device', 'cuda')
        
        if not file_path or not os.path.exists(file_path):
            return {"success": False, "error": f"File not found: {file_path}"}
        
        # Load model (will use cache if already loaded)
        model = load_whisper_model(model_size, device, "float16")
        
        # Use the cached model directly for transcription
        import sys
        try:
            import torch
            torch_module = torch
            cuda_available = torch.cuda.is_available() if torch.cuda.is_available() else False
        except ImportError:
            torch_module = None
            cuda_available = (device == "cuda" or device == "gpu")
        
        # Transcribe using cached model with quality settings
        is_gpu = (device == "cuda" or device == "gpu")
        is_large_model = "large" in model_size.lower() or "medium" in model_size.lower()
        
        # Optimal quality/speed balance settings for Whisper
        # beam_size=5 gives excellent quality with good speed (recommended by faster-whisper)
        if is_gpu and is_large_model:
            beam_size = 5
            best_of = 5
            patience = 1.0
        elif is_gpu:
            beam_size = 5
            best_of = 5
            patience = 1.0
        else:
            beam_size = 3
            best_of = 3
            patience = 1.0
        
        # Prepare ULTRA-ENHANCED initial prompt for maximum accuracy (especially for Arabic)
        initial_prompt = None
        if language == "ar":
            initial_prompt = "هذه محاضرة أكاديمية تعليمية باللغة العربية الفصحى. المتحدث يتحدث بوضوح وبطء معتدل. النص دقيق ومفصل مع استخدام المصطلحات العلمية والأكاديمية الصحيحة. علامات الترقيم والفواصل واضحة."
        elif language == "en":
            initial_prompt = "This is an academic educational lecture in clear English. The speaker speaks clearly and at a moderate pace. The text is accurate and detailed with proper use of scientific and academic terminology. Punctuation and pauses are clear."
        elif language and language != "None":
            initial_prompt = f"This is an academic educational lecture in {language}. The speaker speaks clearly. The text is accurate and detailed with proper terminology."
        
        print(f"[ModelServer] Transcribing: {file_path} (beam_size={beam_size}, best_of={best_of}, patience={patience}, optimal quality/speed)", file=sys.stderr)
        segments, info = model.transcribe(
            file_path,
            language=language,
            beam_size=beam_size,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=300,  # Lower for better detection
                threshold=0.3,  # Lower threshold for maximum detection
                min_speech_duration_ms=250,  # Minimum speech duration
            ),
            condition_on_previous_text=True,  # Always use context for better accuracy
            initial_prompt=initial_prompt,  # Ultra-enhanced prompt for maximum accuracy
            word_timestamps=True,  # Enable for better word-level accuracy
            temperature=0.0,  # Deterministic output (most accurate)
            compression_ratio_threshold=2.2,  # Stricter filter for better quality
            log_prob_threshold=-0.8,  # Higher threshold for better confidence
            no_speech_threshold=0.4,  # Lower threshold for maximum speech detection
            best_of=best_of,  # Maximum candidates for best quality
            patience=patience,  # Higher patience for better results
            suppress_blank=True,  # Suppress blank outputs
            suppress_tokens=[-1],  # Suppress special tokens
            without_timestamps=False,  # Keep timestamps for better alignment
        )
        
        # Collect segments
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
        
        full_text = " ".join(full_text.split()).strip()
        detected_language = info.language if hasattr(info, 'language') else language or 'unknown'
        
        print(f"[ModelServer] Transcription complete: {len(full_text)} chars", file=sys.stderr)
        
        return {
            "success": True,
            "transcript": full_text,
            "wordCount": len(full_text.split()),
            "characterCount": len(full_text),
            "language": detected_language,
            "segments": segments_list
        }
    
    def handle_generate_summary(self, data):
        """Handle summary generation request"""
        transcript = data.get('transcript')
        device = data.get('device', 'cuda')
        
        if not transcript:
            return {"success": False, "error": "Transcript is required"}
        
        # Load model (will use cache if already loaded)
        model, tokenizer = load_qwen_model(device)
        
        # Import generation logic from generate_summary.py
        from generate_summary import generate_summary
        return generate_summary(transcript, device)
    
    def handle_generate_quiz(self, data):
        """Handle quiz generation request"""
        transcript = data.get('transcript')
        device = data.get('device', 'cuda')
        
        if not transcript:
            return {"success": False, "error": "Transcript is required"}
        
        # Load model (will use cache if already loaded)
        model, tokenizer = load_qwen_model(device)
        
        # Import generation logic from generate_quiz.py
        from generate_quiz import generate_quiz
        return generate_quiz(transcript, device)
    
    def handle_generate_flashcards(self, data):
        """Handle flashcards generation request"""
        transcript = data.get('transcript')
        device = data.get('device', 'cuda')
        
        if not transcript:
            return {"success": False, "error": "Transcript is required"}
        
        # Load model (will use cache if already loaded)
        model, tokenizer = load_qwen_model(device)
        
        # Import generation logic from generate_flashcards.py
        from generate_flashcards import generate_flashcards
        return generate_flashcards(transcript, device)
    
    def log_message(self, format, *args):
        # Suppress default logging
        pass

def preload_models():
    """Preload all models at startup for better performance"""
    print("[ModelServer] ========================================", file=sys.stderr)
    print("[ModelServer] Preloading models at startup...", file=sys.stderr)
    print("[ModelServer] This may take 30-60 seconds...", file=sys.stderr)
    print("[ModelServer] ========================================", file=sys.stderr)
    
    try:
        # Preload Whisper large-v3 on GPU (most commonly used)
        print("[ModelServer] [1/2] Preloading Whisper large-v3 on GPU...", file=sys.stderr)
        load_whisper_model("large-v3", "cuda", "float16")
        print("[ModelServer] ✓ Whisper large-v3 loaded successfully", file=sys.stderr)
        
        # Preload Qwen model on GPU
        print("[ModelServer] [2/2] Preloading Qwen 3B-Instruct on GPU...", file=sys.stderr)
        load_qwen_model("cuda")
        print("[ModelServer] ✓ Qwen 3B-Instruct loaded successfully", file=sys.stderr)
        
        print("[ModelServer] ========================================", file=sys.stderr)
        print("[ModelServer] ✓ All models preloaded successfully!", file=sys.stderr)
        print("[ModelServer] Server is ready to handle requests", file=sys.stderr)
        print("[ModelServer] ========================================", file=sys.stderr)
    except Exception as e:
        print(f"[ModelServer] ⚠ Warning: Failed to preload some models: {e}", file=sys.stderr)
        print(f"[ModelServer] Models will be loaded on first request instead", file=sys.stderr)
        import traceback
        print(f"[ModelServer] Traceback: {traceback.format_exc()}", file=sys.stderr)

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    
    # Preload models before starting server
    preload_models()
    
    server = HTTPServer(('localhost', port), ModelHandler)
    print(f"[ModelServer] Starting model server on port {port}", file=sys.stderr)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"[ModelServer] Shutting down model server", file=sys.stderr)
        server.shutdown()

if __name__ == "__main__":
    main()

