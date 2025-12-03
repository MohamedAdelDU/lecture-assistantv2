#!/usr/bin/env python3
"""
AI Quiz Generation using Qwen/Qwen2.5-3B-Instruct
Generates quiz questions from lecture transcripts using transformers
"""
import sys
import json
import os
import re

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Required libraries not installed: {str(e)}. Please install: pip install transformers torch accelerate"
    }))
    sys.exit(1)

def generate_quiz(transcript, device="cuda"):
    """Generate quiz questions from transcript using Qwen model
    
    Args:
        transcript: Lecture transcript text
        device: 'cuda' for GPU or 'cpu' for CPU
    
    Returns:
        Dictionary with quiz questions
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
            prompt = f"""أنت خبير في إنشاء الاختبارات التعليمية. قم بإنشاء 5-10 أسئلة اختيار من متعدد عالية الجودة بناءً على نص المحاضرة التالي.

المتطلبات الحرجة:
- النص بالعربية. يجب أن تكتب جميع الأسئلة والخيارات بالعربية. لا تترجم.
- أنشئ 5-10 أسئلة تختبر فهم المفاهيم الرئيسية والحقائق المهمة والأفكار الرئيسية من النص.
- كل سؤال يجب أن يحتوي على 4 خيارات بالضبط (أ، ب، ج، د).
- حدد الإجابة الصحيحة بوضوح.
- يجب أن تكون الأسئلة واضحة ومحددة وتختبر الفهم الفعلي (وليس فقط الحفظ).
- أعد فقط JSON صالح بهذا الشكل بالضبط (بدون markdown، بدون كتل كود، بدون نص إضافي):
{{
  "questions": [
    {{
      "id": 1,
      "text": "نص السؤال هنا؟",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correctIndex": 0,
      "type": "multiple-choice"
    }}
  ]
}}

نص المحاضرة:
{transcript[:20000]}

JSON:"""
        else:
            prompt = f"""You are an expert educational quiz generator. Create 5-10 high-quality multiple-choice quiz questions based on the following lecture transcript.

CRITICAL REQUIREMENTS:
- The transcript is in {language}. You MUST write ALL questions, options, and explanations in {language}. Do NOT translate.
- Generate 5-10 questions that test understanding of key concepts, important facts, and main ideas from the transcript.
- Each question must have exactly 4 options (A, B, C, D).
- Mark the correct answer clearly.
- Questions should be clear, specific, and test actual understanding (not just memorization).
- Return ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):
{{
  "questions": [
    {{
      "id": 1,
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "type": "multiple-choice"
    }}
  ]
}}

Transcript:
{transcript[:20000]}

JSON:"""
        
        # Tokenize and generate
        print(f"[Qwen] Generating quiz for {len(transcript)} characters ({language})", file=sys.stderr)
        
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
                max_new_tokens=2000,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
                pad_token_id=tokenizer.eos_token_id
            )
        
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        # Clean up response - extract JSON
        response = response.strip()
        
        # Try to extract JSON from response (may contain markdown or extra text)
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            response = json_match.group(0)
        
        # Remove markdown code blocks if present
        response = re.sub(r'```json\s*', '', response)
        response = re.sub(r'```\s*', '', response)
        response = response.strip()
        
        # Parse JSON
        try:
            quiz_data = json.loads(response)
        except json.JSONDecodeError as e:
            print(f"[Qwen] Failed to parse JSON, attempting to fix: {e}", file=sys.stderr)
            # Try to fix common JSON issues
            response = re.sub(r',\s*}', '}', response)  # Remove trailing commas
            response = re.sub(r',\s*]', ']', response)  # Remove trailing commas in arrays
            try:
                quiz_data = json.loads(response)
            except json.JSONDecodeError:
                return {
                    "success": False,
                    "error": f"Failed to parse JSON response: {str(e)}",
                    "raw_response": response[:500]
                }
        
        # Validate and format questions
        if not quiz_data.get("questions") or not isinstance(quiz_data["questions"], list):
            return {
                "success": False,
                "error": "Invalid quiz format: missing questions array"
            }
        
        questions = []
        for idx, q in enumerate(quiz_data["questions"]):
            if not q.get("text") or not q.get("options"):
                continue
            
            options = q["options"]
            if not isinstance(options, list) or len(options) < 2:
                continue
            
            # Ensure exactly 4 options
            while len(options) < 4:
                options.append("Option not available" if language == "English" else "خيار غير متاح")
            options = options[:4]
            
            correct_index = q.get("correctIndex", 0)
            if not isinstance(correct_index, int) or correct_index < 0 or correct_index >= len(options):
                correct_index = 0
            
            questions.append({
                "id": idx + 1,
                "text": q["text"].strip(),
                "options": [opt.strip() for opt in options],
                "correctIndex": correct_index,
                "type": q.get("type", "multiple-choice")
            })
        
        if len(questions) == 0:
            return {
                "success": False,
                "error": "No valid questions generated"
            }
        
        print(f"[Qwen] Quiz generated successfully with {len(questions)} questions", file=sys.stderr)
        
        return {
            "success": True,
            "questions": questions
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Qwen] Error: {str(e)}", file=sys.stderr)
        print(f"[Qwen] Traceback: {error_trace}", file=sys.stderr)
        return {
            "success": False,
            "error": f"Quiz generation failed: {str(e)}",
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
    
    if not transcript or len(transcript) < 200:
        print(json.dumps({
            "success": False,
            "error": "Transcript is too short (minimum 200 characters)"
        }))
        sys.exit(1)
    
    result = generate_quiz(transcript, device)
    print(json.dumps(result))

