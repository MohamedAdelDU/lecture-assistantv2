#!/usr/bin/env python3
"""
Model Cache for Whisper and Qwen models
Prevents reloading models on every request
"""
import os
import sys
from typing import Optional, Dict, Any
import threading

# Global model cache
_model_cache: Dict[str, Any] = {}
_cache_lock = threading.Lock()

def get_whisper_model(model_size: str, device: str = "cuda", compute_type: str = "float16"):
    """Get or load Whisper model from cache"""
    cache_key = f"whisper_{model_size}_{device}_{compute_type}"
    
    with _cache_lock:
        if cache_key in _model_cache:
            print(f"[ModelCache] Using cached Whisper model: {cache_key}", file=sys.stderr)
            return _model_cache[cache_key]
        
        print(f"[ModelCache] Loading Whisper model: {cache_key}", file=sys.stderr)
        from faster_whisper import WhisperModel
        
        try:
            if device == "cuda":
                model = WhisperModel(model_size, device="cuda", compute_type=compute_type)
            else:
                model = WhisperModel(model_size, device="cpu", compute_type="int8")
            
            _model_cache[cache_key] = model
            print(f"[ModelCache] Whisper model cached: {cache_key}", file=sys.stderr)
            return model
        except Exception as e:
            print(f"[ModelCache] Error loading Whisper model: {e}", file=sys.stderr)
            # Fallback: try without caching
            if device == "cuda":
                return WhisperModel(model_size, device="cuda", compute_type=compute_type)
            else:
                return WhisperModel(model_size, device="cpu", compute_type="int8")

def get_qwen_model(device: str = "cuda"):
    """Get or load Qwen model from cache"""
    cache_key = f"qwen_3b_{device}"
    
    with _cache_lock:
        if cache_key in _model_cache:
            print(f"[ModelCache] Using cached Qwen model: {cache_key}", file=sys.stderr)
            cached = _model_cache[cache_key]
            return cached['model'], cached['tokenizer']
        
        print(f"[ModelCache] Loading Qwen model: {cache_key}", file=sys.stderr)
        try:
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
            
            _model_cache[cache_key] = {
                'model': model,
                'tokenizer': tokenizer
            }
            print(f"[ModelCache] Qwen model cached: {cache_key}", file=sys.stderr)
            return model, tokenizer
        except Exception as e:
            print(f"[ModelCache] Error loading Qwen model: {e}", file=sys.stderr)
            raise

def clear_cache():
    """Clear model cache (useful for memory management)"""
    global _model_cache
    with _cache_lock:
        _model_cache.clear()
        print("[ModelCache] Cache cleared", file=sys.stderr)

