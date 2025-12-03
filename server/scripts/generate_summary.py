#!/usr/bin/env python3
"""
AI Summary Generation using Qwen/Qwen2.5-3B-Instruct
Generates summaries from lecture transcripts using transformers
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
        
        # Load model and tokenizer (use cache)
        from model_cache import get_qwen_model
        print(f"[Qwen] Loading model: Qwen/Qwen2.5-3B-Instruct on {device}", file=sys.stderr)
        
        model, tokenizer = get_qwen_model(device=device)
        
        print(f"[Qwen] Model ready", file=sys.stderr)
        
        # Detect language
        has_arabic = any('\u0600' <= char <= '\u06FF' for char in transcript)
        language = "Arabic" if has_arabic else "English"
        
        # Calculate optimal chunk size (leave room for prompt and response)
        max_transcript_length = 20000
        
        # Truncate transcript if too long, but try to keep complete sentences
        transcript_to_use = transcript
        if len(transcript) > max_transcript_length:
            cut_point = max_transcript_length
            for i in range(max_transcript_length, max(0, max_transcript_length - 500), -1):
                if transcript[i] in '.!?\n':
                    cut_point = i + 1
                    break
            transcript_to_use = transcript[:cut_point]
            print(f"[Qwen] Transcript truncated from {len(transcript)} to {len(transcript_to_use)} characters", file=sys.stderr)
        
        # Define section headings based on language
        heading_intro = "المقدمة" if has_arabic else "Introduction"
        heading_summary = "الملخص" if has_arabic else "Summary"
        heading_points = "أهم النقاط" if has_arabic else "Key Points"
        
        # Helper function to generate a section
        def generate_section(section_prompt, max_tokens=800):
            messages = [{"role": "user", "content": section_prompt}]
            text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            model_inputs = tokenizer([text], return_tensors="pt").to(device)
            
            with torch.no_grad():
                generated_ids = model.generate(
                    model_inputs.input_ids,
                    max_new_tokens=max_tokens,
                    temperature=0.5,
                    do_sample=True,
                    top_p=0.85,
                    top_k=50,
                    repetition_penalty=1.15,
                    length_penalty=1.1,
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    no_repeat_ngram_size=3
                )
            
            generated_ids = [
                output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
            ]
            response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
            return response.strip()
        
        print(f"[Qwen] Generating multi-section summary for {len(transcript)} characters ({language})", file=sys.stderr)
        
        # 1) Generate Introduction section
        if has_arabic:
            intro_prompt = f"""أنت خبير في المحاضرات التعليمية. اكتب فقط قسم المقدمة لهذه المحاضرة.

المتطلبات:
- اللغة: العربية. لا تغير اللغة.
- الطول: 2-4 جمل كحد أقصى.
- الأسلوب: واضح وملموس وجذاب، كما لو كنت تتحدث إلى طالب متحمس.
- المحتوى: أجب باختصار: ما الموضوع الرئيسي؟ لماذا هو مهم؟ ما السؤال أو الالتباس الذي ستحل هذه المحاضرة؟
- النبرة: واثق لكن بسيط، تجنب الكلمات الرنانة.
- مهم: لا تضع أي عناوين مثل "{heading_intro}" في إجابتك، فقط نص المقدمة نفسه.

نص المحاضرة:
{transcript_to_use[:12000]}

المقدمة:"""
        else:
            intro_prompt = f"""You are an expert academic lecturer. Write ONLY the introduction section for this lecture transcript.

Requirements:
- Language: {language}. Do NOT switch languages.
- Length: 2-4 sentences maximum.
- Style: Clear, concrete, and engaging, as if you are talking to a motivated student.
- Content: Briefly answer: What is the main topic? Why is it important? What key question or confusion will this lecture resolve?
- Tone: Confident but simple, avoid buzzwords.
- IMPORTANT: Do NOT include any headings like "{heading_intro}" in your answer, just the introduction text itself.

Lecture Transcript:
{transcript_to_use[:12000]}

Introduction:"""
        
        print(f"[Qwen] Generating introduction section...", file=sys.stderr)
        intro_text = generate_section(intro_prompt, max_tokens=200)
        
        # Clean intro text
        if "Introduction:" in intro_text:
            intro_text = intro_text.split("Introduction:")[-1].strip()
        if "المقدمة:" in intro_text:
            intro_text = intro_text.split("المقدمة:")[-1].strip()
        intro_text = intro_text.strip()
        
        # 2) Generate Summary section
        if has_arabic:
            summary_prompt = f"""أنت خبير في تلخيص المحاضرات الأكاديمية. اكتب فقط قسم الملخص الرئيسي لهذه المحاضرة.

المتطلبات:
- اللغة: العربية. لا تغير اللغة.
- الطول: 2-3 فقرات قوية ومنظمة جيداً.
- الأسلوب: مجرد، أعد الصياغة بكلماتك الخاصة (لا تنسخ الجمل كما هي). استخدم انتقالات سلسة وتفسيرات واضحة.
- المحتوى: التقط القصة الكاملة للمحاضرة بالترتيب. اشرح بوضوح:
  * ما الذي يتم مقارنته أو شرحه؟
  * ما هي المفاهيم والتعريفات الرئيسية؟
  * كيف توضح الأمثلة والاستعارات الفرق؟
  * ما الآثار العملية أو حالات الاستخدام التي تسلط عليها المحاضرة الضوء؟
- الهدف: القارئ الذي يرى هذا الملخص فقط يجب أن يفهم المحاضرة بالكامل ولا يشعر أنه يفتقد أفكاراً مهمة.
- مهم: لا تضع أي عناوين مثل "{heading_summary}" في إجابتك، فقط فقرات الملخص.

نص المحاضرة:
{transcript_to_use}

الملخص:"""
        else:
            summary_prompt = f"""You are an expert academic summarizer. Write ONLY the main summary section for this lecture transcript.

Requirements:
- Language: {language}. Do NOT switch languages.
- Length: 2-3 strong, well-structured paragraphs.
- Style: Abstract, rewrite in your own words (do NOT copy raw sentences). Use smooth transitions and clear explanations.
- Content: Capture the full story of the lecture in order. Explicitly explain:
  * What is being compared or explained?
  * What are the key concepts and definitions?
  * How do the examples and analogies clarify the difference?
  * What practical implications or use-cases does the lecture highlight?
- Goal: A reader who only sees this summary should fully understand the lecture and not feel they are missing important ideas.
- IMPORTANT: Do NOT include any headings like "{heading_summary}" in your answer, just the summary paragraphs.

Lecture Transcript:
{transcript_to_use}

Summary:"""
        
        print(f"[Qwen] Generating summary section...", file=sys.stderr)
        summary_text_raw = generate_section(summary_prompt, max_tokens=1000)
        
        # Clean summary text
        if "Summary:" in summary_text_raw:
            summary_text_raw = summary_text_raw.split("Summary:")[-1].strip()
        if "الملخص:" in summary_text_raw:
            summary_text_raw = summary_text_raw.split("الملخص:")[-1].strip()
        summary_text_raw = summary_text_raw.strip()
        
        # 3) Generate Key Points section
        if has_arabic:
            points_prompt = f"""أنت خبير في تدوين الملاحظات. استخرج فقط النقاط الرئيسية من نص هذه المحاضرة.

المتطلبات:
- اللغة: العربية. لا تغير اللغة.
- تنسيق الإخراج: قائمة نصية عادية حيث كل سطر هو نقطة واحدة تبدأ بـ "- ".
- اجعل النقاط غنية ومفيدة، وليست تسميات من كلمة واحدة.
- حاول تجميع الأفكار ذات الصلة ببدء بعض النقاط بتسميات بخط عريض، على سبيل المثال:
  - **تشبيه أساسي:** ...
  - **ما هو الـ LLM؟:** ...
  - **قصور الـ LLM:** ...
  - **ما هو الـ AI Agent؟:** ...
  - **مثال عملي:** ...
- ركز على: أهم الأفكار، المقارنات، التعريفات، الأمثلة الملموسة، الاستعارات، والآثار العملية.
- الطول: 8-16 نقطة كحد أقصى.
- مهم: لا تضيف أي عناوين خارج القائمة، لا مقدمات أو خواتم، فقط القائمة نفسها.

نص المحاضرة:
{transcript_to_use}

النقاط الرئيسية:"""
        else:
            points_prompt = f"""You are an expert note-taker. Extract ONLY the key points from this lecture transcript.

Requirements:
- Language: {language}. Do NOT switch languages.
- Output format: a plain text list where EACH line is ONE bullet point starting with "- ".
- Make the bullets rich and informative, not one-word labels.
- Try to group related ideas by starting some bullets with bold-style labels, for example:
  - **Key Analogy:** ...
  - **What is LLM?:** ...
  - **LLM Limitations:** ...
  - **What is AI Agent?:** ...
  - **Practical Example:** ...
- Focus on: the most important ideas, comparisons, definitions, concrete examples, analogies, and practical implications.
- Length: 8-16 bullet points maximum.
- IMPORTANT: Do NOT add any headings outside the list, no intros or outros, just the bullet list itself.

Lecture Transcript:
{transcript_to_use}

Key Points:"""
        
        print(f"[Qwen] Generating key points section...", file=sys.stderr)
        points_raw = generate_section(points_prompt, max_tokens=800)
        
        # Clean and parse key points
        if "Key Points:" in points_raw:
            points_raw = points_raw.split("Key Points:")[-1].strip()
        if "النقاط الرئيسية:" in points_raw:
            points_raw = points_raw.split("النقاط الرئيسية:")[-1].strip()
        
        # Extract bullet points
        key_points = []
        for line in points_raw.split('\n'):
            line = line.strip()
            if line and len(line) > 5:  # Minimum length for a meaningful point
                # Remove bullet markers if present
                line = re.sub(r'^[-•▪·]\s*', '', line).strip()
                # Remove markdown bold if present (we'll add it back if needed)
                line = re.sub(r'\*\*([^*]+)\*\*', r'\1', line)
                if line and len(line) > 5:
                    key_points.append(line)
        
        # Limit to 16 points max
        key_points = key_points[:16]
        
        # Build final summary with same structure as Gemini API
        final_summary_parts = []
        
        if intro_text and len(intro_text) > 20:
            final_summary_parts.append(heading_intro)
            final_summary_parts.append(intro_text)
        
        if summary_text_raw and len(summary_text_raw) > 50:
            if final_summary_parts:
                final_summary_parts.append("")
            final_summary_parts.append(heading_summary)
            final_summary_parts.append(summary_text_raw)
        
        if key_points:
            if final_summary_parts:
                final_summary_parts.append("")
            final_summary_parts.append(heading_points)
            final_summary_parts.append("\n".join([f"- {p}" for p in key_points]))
        
        final_summary = "\n\n".join(final_summary_parts).strip()
        
        # Final validation
        if len(final_summary) < 100:
            return {
                "success": False,
                "error": f"Generated summary is too short ({len(final_summary)} characters). Minimum required: 100 characters"
            }
        
        print(f"[Qwen] Multi-section summary generated successfully ({len(final_summary)} characters, {len(key_points)} key points)", file=sys.stderr)
        
        return {
            "success": True,
            "summary": final_summary
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

