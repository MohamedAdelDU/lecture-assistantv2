# إعداد المشروع على RunPod

هذا الدليل يوضح كيفية إعداد المشروع على RunPod للاستفادة من GPU القوي.

## المتطلبات الأساسية

1. **حساب RunPod** مع GPU متاح
2. **Pod** مع:
   - GPU: RTX 3090 أو أفضل (موصى به: A100, A6000)
   - RAM: 16GB+ (موصى به: 32GB+)
   - Storage: 50GB+ (لتحميل الموديلات)

## خطوات الإعداد

### 1. إنشاء Pod على RunPod

1. اذهب إلى [RunPod](https://www.runpod.io/)
2. اختر **GPU Pod**
3. اختر Template: **PyTorch** أو **CUDA**
4. اختر GPU مناسب (A100 موصى به للموديلات الكبيرة)
5. اختر Storage: 50GB+

### 2. تثبيت المتطلبات

```bash
# تحديث النظام
sudo apt-get update
sudo apt-get upgrade -y

# تثبيت Python dependencies
pip install --upgrade pip

# تثبيت PyTorch مع دعم CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# تثبيت متطلبات المشروع (يشمل transformers, accelerate, faster-whisper)
pip install -r requirements.txt
```

### 3. التحقق من GPU

```bash
# التحقق من توفر CUDA
python3 -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"

# التحقق من faster-whisper
python3 -c "from faster_whisper import WhisperModel; print('faster-whisper installed successfully')"

# التحقق من transformers و Qwen
python3 -c "from transformers import AutoTokenizer, AutoModelForCausalLM; print('transformers installed successfully')"
```

### 4. إعداد المتغيرات البيئية

أنشئ ملف `.env`:

```env
# GPU Configuration
CUDA_VISIBLE_DEVICES=0

# Python Path (if needed)
PYTHON_CMD=python3

# Other settings
GEMINI_API_KEY=your_key_here

# Python Path (if needed)
PYTHON_CMD=python3
```

### 5. اختبار الموديلات

```bash
# اختبار التحويل الصوتي
python3 server/scripts/transcribe_audio.py /path/to/audio.mp3 large-v3 None cuda

# اختبار توليد الملخص (Qwen)
python3 server/scripts/generate_summary.py "This is a test transcript for summary generation." cuda

# اختبار توليد الأسئلة (Qwen)
python3 server/scripts/generate_quiz.py "This is a test transcript for quiz generation. It contains important information about the topic." cuda
```

## الإعدادات الموصى بها

### للموديلات الكبيرة (large-v3):

- **GPU**: A100 40GB أو أفضل
- **RAM**: 32GB+
- **Compute Type**: float16 (افتراضي)
- **Beam Size**: 5

### للموديلات المتوسطة (medium):

- **GPU**: RTX 3090 أو أفضل
- **RAM**: 16GB+
- **Compute Type**: float16
- **Beam Size**: 5

## تحسينات الأداء

### 1. استخدام float16 للـ GPU

المشروع يستخدم تلقائياً `float16` للـ GPU للحصول على أفضل أداء.

### 2. تحميل الموديلات مسبقاً

عند أول استخدام، سيتم تحميل الموديلات تلقائياً. يمكنك تحميلها مسبقاً:

```python
# تحميل Whisper
from faster_whisper import WhisperModel
whisper_model = WhisperModel("large-v3", device="cuda", compute_type="float16")

# تحميل Qwen
from transformers import AutoTokenizer, AutoModelForCausalLM
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-3B-Instruct")
qwen_model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-3B-Instruct",
    torch_dtype=torch.float16,
    device_map="auto"
)
```

### 3. استخدام Batch Processing

للملفات المتعددة، يمكنك معالجتها بشكل متوازي.

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
- استخدم موديل أصغر (medium بدلاً من large-v3)
- استخدم `int8_float16` بدلاً من `float16`
- قلل `beam_size` إلى 3

### المشكلة: Model download failed

**الحل:**
```bash
# تحميل الموديل يدوياً
python3 -c "from faster_whisper import WhisperModel; WhisperModel('large-v3', device='cuda')"
```

## ملاحظات مهمة

1. **Whisper Model**: `large-v3` (الأفضل دقة للتحويل الصوتي)
2. **Qwen Model**: `Qwen/Qwen2.5-3B-Instruct` (للملخصات والأسئلة)
3. **الجهاز الافتراضي**: GPU (cuda)
4. **Compute Type**: float16 للـ GPU (أفضل أداء)
5. **التحميل التلقائي**: الموديلات تُحمّل تلقائياً عند أول استخدام
6. **Qwen يحتاج**: ~6GB RAM عند التحميل

## الأداء المتوقع

### على A100 40GB:

- **large-v3**: ~2-5x أسرع من الوقت الفعلي للصوت
- **medium**: ~5-10x أسرع من الوقت الفعلي للصوت
- **base**: ~10-20x أسرع من الوقت الفعلي للصوت

### على RTX 3090:

- **large-v3**: ~1-3x أسرع من الوقت الفعلي للصوت
- **medium**: ~3-5x أسرع من الوقت الفعلي للصوت
- **base**: ~5-10x أسرع من الوقت الفعلي للصوت

## الأداء المتوقع لـ Qwen

### على A100 40GB:
- **توليد الملخص**: ~3-8 ثواني
- **توليد الأسئلة**: ~5-15 ثانية

### على RTX 3090:
- **توليد الملخص**: ~5-15 ثانية
- **توليد الأسئلة**: ~10-30 ثانية

## الدعم

إذا واجهت أي مشاكل، راجع:
- [faster-whisper Documentation](https://github.com/guillaumekln/faster-whisper)
- [Transformers Documentation](https://huggingface.co/docs/transformers)
- [Qwen Model Card](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct)
- [RunPod Documentation](https://docs.runpod.io/)

