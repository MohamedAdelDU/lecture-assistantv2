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
pip install faster-whisper torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# تثبيت متطلبات المشروع
pip install -r requirements.txt
```

### 3. التحقق من GPU

```bash
# التحقق من توفر CUDA
python3 -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"

# التحقق من faster-whisper
python3 -c "from faster_whisper import WhisperModel; print('faster-whisper installed successfully')"
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
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

### 5. اختبار التحويل الصوتي

```bash
# اختبار بسيط
python3 server/scripts/transcribe_audio.py /path/to/audio.mp3 large-v3 None cuda
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

### 2. تحميل الموديل مسبقاً

عند أول استخدام، سيتم تحميل الموديل تلقائياً. يمكنك تحميله مسبقاً:

```python
from faster_whisper import WhisperModel
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
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

1. **الموديل الافتراضي**: `large-v3` (الأفضل دقة)
2. **الجهاز الافتراضي**: GPU (cuda)
3. **Compute Type**: float16 للـ GPU (أفضل أداء)
4. **التحميل التلقائي**: الموديلات تُحمّل تلقائياً عند أول استخدام

## الأداء المتوقع

### على A100 40GB:

- **large-v3**: ~2-5x أسرع من الوقت الفعلي للصوت
- **medium**: ~5-10x أسرع من الوقت الفعلي للصوت
- **base**: ~10-20x أسرع من الوقت الفعلي للصوت

### على RTX 3090:

- **large-v3**: ~1-3x أسرع من الوقت الفعلي للصوت
- **medium**: ~3-5x أسرع من الوقت الفعلي للصوت
- **base**: ~5-10x أسرع من الوقت الفعلي للصوت

## الدعم

إذا واجهت أي مشاكل، راجع:
- [faster-whisper Documentation](https://github.com/guillaumekln/faster-whisper)
- [RunPod Documentation](https://docs.runpod.io/)

