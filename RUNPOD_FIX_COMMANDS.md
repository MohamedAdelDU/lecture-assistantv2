# 🔧 أوامر إصلاح المشكلة على RunPod

## الخطوة 1: سحب آخر التحديثات من GitHub

```bash
cd /workspace/lecture-assistantv2
git pull origin main
```

## الخطوة 2: إعادة البناء (بدون تحذيرات!)

```bash
npm run build
```

الآن يجب أن ترى:
```
✓ built in XX.XXs
building server...
  dist/index.mjs  XXXkb
⚡ Done in XXXXms
```

**بدون تحذيرات!** ✅

## الخطوة 3: تشغيل السيرفر

```bash
npm start
```

يجب أن ترى:
```
serving on 0.0.0.0:5000
```

---

## إذا لم تعمل الخطوة 1 (git pull)

إذا كان المشروع لم يتم clone بعد، استخدم:

```bash
cd /workspace
git clone https://github.com/MohamedAdelDU/lecture-assistantv2.git
cd lecture-assistantv2
npm install
npm run build
npm start
```

---

## ملخص الأوامر (نسخ ولصق)

```bash
# إذا كان المشروع موجود بالفعل
cd /workspace/lecture-assistantv2
git pull origin main
npm run build
npm start

# إذا كان المشروع جديد
cd /workspace
git clone https://github.com/MohamedAdelDU/lecture-assistantv2.git
cd lecture-assistantv2
npm install
npm run build
npm start
```

