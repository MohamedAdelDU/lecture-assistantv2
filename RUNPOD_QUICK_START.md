# 🚀 دليل سريع لتشغيل المشروع على RunPod

## الخطوة 1: إنشاء Pod على RunPod

1. اذهب إلى [RunPod](https://www.runpod.io/)
2. اضغط على **"GPU Pods"** → **"Deploy"**
3. اختر الإعدادات التالية:
   - **GPU**: A40 (48GB) أو A100 (40GB) - موصى به
   - **Template**: `PyTorch` أو `CUDA`
   - **Container Disk**: 80GB+
   - **Volume Disk**: 50GB+ (اختياري - لحفظ الموديلات)

## الخطوة 2: الاتصال بالـ Pod

بعد إنشاء الـ Pod، اضغط على **"Connect"** واختر **"SSH"** أو **"Jupyter"**

## الخطوة 3: تثبيت المتطلبات الأساسية

افتح Terminal في الـ Pod وشغّل:

```bash
# تحديث النظام
apt-get update && apt-get upgrade -y

# تثبيت FFmpeg (ضروري جداً لمعالجة الصوت)
apt-get install -y ffmpeg git curl

# تثبيت Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# التحقق من التثبيت
node -v  # يجب أن يكون 18.x أو أحدث
npm -v
ffmpeg -version
```

## الخطوة 4: Clone المشروع

```bash
cd /workspace
git clone https://github.com/MohamedAdelDU/lecture-assistantv2.git
cd lecture-assistantv2
```

## الخطوة 5: تثبيت Python Dependencies

```bash
# تحديث pip
pip install --upgrade pip

# تثبيت PyTorch مع CUDA (مهم جداً!)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# تثبيت متطلبات المشروع
pip install -r requirements.txt
```

## الخطوة 6: التحقق من GPU

```bash
# التحقق من CUDA
python3 -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"

# يجب أن ترى:
# CUDA Available: True
# GPU: NVIDIA A40 (أو GPU الخاص بك)
```

## الخطوة 7: تثبيت Node.js Dependencies

```bash
npm install
```

## الخطوة 8: إعداد Environment Variables

```bash
# إنشاء ملف .env
cat > .env << EOF
# Gemini API (اختياري - للـ API mode)
GEMINI_API_KEY=AIzaSyA8QmJkUqEpXvGZD0jh-dp2MuvdnIlLHo8

# Python Configuration
PYTHON_CMD=python3
CUDA_VISIBLE_DEVICES=0

# Server Configuration
PORT=5000
NODE_ENV=production
EOF
```

**ملاحظة**: استبدل `your_gemini_api_key_here` بـ API key الخاص بك من [Google AI Studio](https://makersuite.google.com/app/apikey)

## الخطوة 9: إعداد Firebase (مهم جداً!)

### 9.1: إضافة Domain في Firebase Console

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك: **lecture-assistant-ab472**
3. اضغط على ⚙️ → **Project settings**
4. اذهب إلى تبويب **General**
5. ابحث عن **Authorized domains**
6. اضغط على **Add domain**
7. أضف domain الـ Pod (مثلاً: `px6gx941q16qg7-5000.proxy.runpod.net`)

### 9.2: تفعيل Google Sign-in

1. في Firebase Console
2. اذهب إلى **Authentication** → **Sign-in method**
3. تأكد من أن **Google** مفعّل (Enabled)

## الخطوة 10: بناء المشروع

```bash
npm run build
```

هذه العملية قد تستغرق 2-5 دقائق.

## الخطوة 11: تشغيل السيرفر

```bash
npm start
```

يجب أن ترى:
```
serving on 0.0.0.0:5000
```

## الخطوة 12: فتح Port Forwarding

1. في صفحة الـ Pod على RunPod
2. اضغط على **"HTTP Service"** أو **"Ports"**
3. أضف Port: **5000**
4. سيتم إنشاء رابط مثل: `https://px6gx941q16qg7-5000.proxy.runpod.net`

## الخطوة 13: اختبار التطبيق

1. افتح الرابط في المتصفح
2. يجب أن ترى صفحة تسجيل الدخول
3. جرب تسجيل الدخول عبر Google
4. أضف محاضرة من YouTube واختبر الميزات

---

## ⚠️ استكشاف الأخطاء

### المشكلة: CUDA not available
```bash
# تحقق من GPU
nvidia-smi

# إعادة تثبيت PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 --force-reinstall
```

### المشكلة: Google Sign-in لا يعمل
- تأكد من إضافة domain في Firebase Console → Authorized domains
- تأكد من أن Google Sign-in مفعّل في Firebase Console

### المشكلة: Port 5000 لا يعمل
- تأكد من أن السيرفر يعمل: `npm start`
- تحقق من Port Forwarding في RunPod

### المشكلة: Python scripts لا تعمل
```bash
# تحقق من Python
which python3

# تحقق من المتطلبات
pip list | grep transformers
pip list | grep torch
```

---

## 📊 الأداء المتوقع

### على A40 (48GB VRAM):
- **Whisper large-v3**: ~2-5x أسرع من الوقت الفعلي
- **Qwen Summary**: ~5-10 ثواني
- **Qwen Quiz**: ~10-20 ثانية
- **Qwen Flashcards**: ~8-15 ثانية

### على A100 (40GB VRAM):
- **Whisper large-v3**: ~3-8x أسرع من الوقت الفعلي
- **Qwen Summary**: ~3-8 ثواني
- **Qwen Quiz**: ~5-15 ثانية
- **Qwen Flashcards**: ~5-12 ثانية

---

## ✅ قائمة التحقق السريعة

- [ ] Pod تم إنشاؤه مع GPU مناسب
- [ ] FFmpeg مثبت
- [ ] Node.js 18.x+ مثبت
- [ ] Python dependencies مثبتة
- [ ] PyTorch مع CUDA مثبت
- [ ] GPU يعمل (nvidia-smi)
- [ ] Node.js dependencies مثبتة
- [ ] ملف .env مُعد
- [ ] Firebase domain مضاف
- [ ] Google Sign-in مفعّل
- [ ] المشروع تم بناؤه (npm run build)
- [ ] السيرفر يعمل (npm start)
- [ ] Port Forwarding مفعّل
- [ ] التطبيق يعمل في المتصفح

---

## 🎉 كل شيء جاهز!

إذا أكملت جميع الخطوات، المشروع جاهز للعمل على RunPod!

### الخطوات التالية:
1. اختبر جميع الميزات
2. راقب استخدام GPU (nvidia-smi)
3. راقب logs السيرفر
4. استمتع! 🚀

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من logs السيرفر
2. تحقق من Console logs في المتصفح (F12)
3. تحقق من nvidia-smi للـ GPU
4. راجع ملفات التوثيق:
   - `RUNPOD_SETUP.md` - دليل مفصل
   - `RUNPOD_CHECKLIST.md` - قائمة تحقق كاملة
   - `FIREBASE_GOOGLE_SIGNIN_FIX.md` - إصلاح Google Sign-in

