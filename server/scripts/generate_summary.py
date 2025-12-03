#!/usr/bin/env python3
"""
AI Summary Generation using Qwen/Qwen2.5-3B-Instruct
Generates summaries from lecture transcripts using transformers
"""
import sys
import json
import os

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Required libraries not installed: {str(e)}. Please install: pip install transformers torch accelerate"
    }))
    sys.exit(1)

def generate_summary(transcript, device="cuda"):
    """Generate summary from transcript using Qwen model
    
    Args:
        transcript: Lecture transcript text
        device: 'cuda' for GPU or 'cpu' for CPU
    
    Returns:
        Dictionary with summary results
    """
    try:
        # Check if CUDA is available
        if device == "cuda" and not torch.cuda.is_available():
            print(f"[Qwen] CUDA not available, falling back to CPU", file=sys.stderr)
            device = "cpu"
        
        if device == "cuda":
            print(f"[Qwen] Using GPU: {torch.cuda.get_device_name(0)}", file=sys.stderr)
            print(f"[Qwen] GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB", file=sys.stderr)
        else:
            print(f"[Qwen] Using CPU", file=sys.stderr)
        
        # Load model and tokenizer
        model_name = "Qwen/Qwen2.5-3B-Instruct"
        print(f"[Qwen] Loading model: {model_name} on {device}", file=sys.stderr)
        
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
        )
        
        if device == "cpu":
            model = model.to(device)
        
        print(f"[Qwen] Model loaded successfully", file=sys.stderr)
        
        # Detect language
        has_arabic = any('\u0600' <= char <= '\u06FF' for char in transcript)
        language = "Arabic" if has_arabic else "English"
        
        # Create prompt based on language
        if has_arabic:
            prompt = f"""أنت مساعد ذكي متخصص في تلخيص المحاضرات التعليمية. قم بإنشاء ملخص شامل ومفيد للمحاضرة التالية.

المتطلبات:
- اكتب الملخص بنفس لغة النص (عربي)
- اكتب فقرات متصلة (بدون نقاط، بدون ترقيم، بدون JSON)
- ركز على المحتوى الحقيقي، وليس التعليقات الجانبية
- اجعل الملخص واضحاً ومفيداً للطلاب

نص المحاضرة:
{transcript[:15000]}

الملخص:"""
        else:
            prompt = f"""You are an expert academic lecture summarizer. Your task is to create a comprehensive summary of the lecture.

Requirements:
- Summarize the transcript in the SAME language it is written in.
- Write continuous paragraphs (no bullets, no numbering, no JSON).
- Focus on the real content, not meta-comments.
- Make the summary clear and useful for students.

Transcript:
{transcript[:15000]}

Summary:"""
        
        # Tokenize and generate
        print(f"[Qwen] Generating summary for {len(transcript)} characters ({language})", file=sys.stderr)
        
        messages = [
            {"role": "user", "content": prompt}
        ]
        
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        model_inputs = tokenizer([text], return_tensors="pt").to(device)
        
        # Generate with appropriate parameters
        with torch.no_grad():
            generated_ids = model.generate(
                model_inputs.input_ids,
                max_new_tokens=1000,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
                pad_token_id=tokenizer.eos_token_id
            )
        
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        # Clean up response
        summary_text = response.strip()
        
        # Remove any prompt remnants
        if "Summary:" in summary_text:
            summary_text = summary_text.split("Summary:")[-1].strip()
        if "الملخص:" in summary_text:
            summary_text = summary_text.split("الملخص:")[-1].strip()
        
        if len(summary_text) < 50:
            return {
                "success": False,
                "error": "Generated summary is too short"
            }
        
        print(f"[Qwen] Summary generated successfully ({len(summary_text)} characters)", file=sys.stderr)
        
        return {
            "success": True,
            "summary": summary_text
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Qwen] Error: {str(e)}", file=sys.stderr)
        print(f"[Qwen] Traceback: {error_trace}", file=sys.stderr)
        return {
            "success": False,
            "error": f"Summary generation failed: {str(e)}",
            "details": error_trace
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Transcript is required as argument"
        }))
        sys.exit(1)
    
    transcript = sys.argv[1]
    device = sys.argv[2] if len(sys.argv) > 2 else "cuda"
    
    # Normalize device name
    if device == "gpu":
        device = "cuda"
    
    if not transcript or len(transcript) < 100:
        print(json.dumps({
            "success": False,
            "error": "Transcript is too short (minimum 100 characters)"
        }))
        sys.exit(1)
    
    result = generate_summary(transcript, device)
    print(json.dumps(result))

