# دليل استخدام AI Models

## استخدام موديل محلي بدون API (Qwen)

### 1. تثبيت المكتبات المطلوبة

**تثبيت Python dependencies:**

```bash
pip install transformers torch accelerate
```

**للاستفادة من GPU (CUDA):**

```bash
# تثبيت PyTorch مع دعم CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 2. التحقق من توفر GPU

```bash
python3 -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
```

### 3. الموديل المستخدم

المشروع يستخدم **Qwen/Qwen2.5-3B-Instruct** مباشرة عبر `transformers`:
- يعمل على GPU مباشرة (CUDA) إذا كان متوفراً
- يعمل على CPU كبديل تلقائي
- يدعم العربية والإنجليزية بشكل ممتاز
- يتم تحميله تلقائياً عند أول استخدام

### 4. الأولوية في الاستخدام

الكود سيستخدم بالترتيب:
1. **Gemini API** (إذا كان API key موجود وليس GPU mode) - جودة عالية
2. **Qwen GPU** (إذا كان GPU mode مفعّل) - مجاني ومحلي وسريع
3. **Simple Summary** (fallback) - بدون AI

### 5. استخدام GPU Mode

للاستفادة من Qwen على GPU:
1. تأكد من تثبيت PyTorch مع دعم CUDA
2. تأكد من توفر GPU (NVIDIA مع CUDA)
3. اختر "LM-Titan (GPU)" في واجهة المستخدم
4. سيتم استخدام Qwen تلقائياً على GPU

### 6. استخدام API Mode

للاستفادة من Gemini API:
1. احصل على Gemini API Key من [Google AI Studio](https://makersuite.google.com/app/apikey)
2. أضف المفتاح إلى `.env`:
   ```env
   GEMINI_API_KEY=your_key_here
   ```
3. اختر "LM-Cloud (API)" في واجهة المستخدم

## ملاحظات

- Qwen يعمل محلياً، لا يحتاج إنترنت بعد تحميل الموديل
- الموديل يحتاج ~6GB RAM عند التحميل
- على GPU، يعمل بشكل أسرع بكثير من CPU
- الموديل يدعم العربية والإنجليزية بشكل ممتاز
- يتم تحميل الموديل تلقائياً عند أول استخدام (قد يستغرق بضع دقائق)

## استكشاف الأخطاء

### المشكلة: CUDA not available

**الحل:**
```bash
# التحقق من CUDA
nvidia-smi

# إعادة تثبيت PyTorch مع CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### المشكلة: Out of Memory

**الحل:**
- استخدم CPU mode بدلاً من GPU
- تأكد من وجود RAM كافٍ (~8GB+)
- أغلق التطبيقات الأخرى التي تستخدم GPU

### المشكلة: Model download failed

**الحل:**
```bash
# تحميل الموديل يدوياً
python3 -c "from transformers import AutoTokenizer, AutoModelForCausalLM; AutoTokenizer.from_pretrained('Qwen/Qwen2.5-3B-Instruct'); AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-3B-Instruct')"
```

### المشكلة: transformers not installed

**الحل:**
```bash
pip install transformers torch accelerate
```

## الأداء المتوقع

### على GPU (RTX 3090 أو أفضل):
- **توليد الملخص**: ~5-15 ثانية
- **توليد الأسئلة**: ~10-30 ثانية

### على CPU:
- **توليد الملخص**: ~30-60 ثانية
- **توليد الأسئلة**: ~60-120 ثانية

## الدعم

إذا واجهت أي مشاكل، راجع:
- [Transformers Documentation](https://huggingface.co/docs/transformers)
- [Qwen Model Card](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct)
- [PyTorch CUDA Installation](https://pytorch.org/get-started/locally/)
