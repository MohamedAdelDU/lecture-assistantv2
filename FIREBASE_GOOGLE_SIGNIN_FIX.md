# إصلاح مشكلة تسجيل الدخول عبر Google في Firebase

## المشكلة
تسجيل الدخول عبر Google لا يعمل على السيرفر (RunPod أو أي سيرفر آخر).

## الحلول

### 1. إضافة Authorized Domains في Firebase Console

**هذه هي الخطوة الأهم!**

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك: **lecture-assistant-ab472**
3. اضغط على أيقونة الإعدادات ⚙️ → **Project settings**
4. اذهب إلى تبويب **General**
5. ابحث عن قسم **Authorized domains**
6. اضغط على **Add domain**
7. أضف domain السيرفر:
   - إذا كان على RunPod: `px6gx941q16qg7-5000.proxy.runpod.net`
   - أو أي domain آخر تستخدمه
   - يمكنك أيضاً إضافة `localhost` للتطوير المحلي

**مثال:**
```
localhost
px6gx941q16qg7-5000.proxy.runpod.net
your-custom-domain.com
```

### 2. التحقق من OAuth Consent Screen في Google Cloud Console

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. اختر نفس المشروع: **lecture-assistant-ab472**
3. اذهب إلى **APIs & Services** → **OAuth consent screen**
4. تأكد من:
   - **User Type**: External (أو Internal إذا كان للمؤسسة فقط)
   - **Application name**: Lecture Assistant
   - **Authorized domains**: أضف domain السيرفر
   - **Scopes**: تأكد من وجود `email` و `profile`

### 3. التحقق من أن Google Sign-In مفعّل في Firebase

1. في Firebase Console
2. اذهب إلى **Authentication** → **Sign-in method**
3. تأكد من أن **Google** مفعّل (Enabled)
4. اضغط على **Google** وافتح الإعدادات
5. تأكد من:
   - **Enable** مفعّل
   - **Project support email** محدّد
   - **Authorized domains** محدّدة

### 4. إضافة Domain في Firebase Hosting (إذا كنت تستخدمه)

إذا كنت تستخدم Firebase Hosting:

1. اذهب إلى **Hosting** في Firebase Console
2. اضغط على **Add custom domain**
3. أضف domain السيرفر

### 5. التحقق من Console Logs

افتح Developer Console في المتصفح (F12) وتحقق من الأخطاء:

```javascript
// الأخطاء الشائعة:
- "auth/unauthorized-domain" → Domain غير مضاف في Firebase
- "auth/popup-blocked" → المتصفح يمنع popup
- "auth/popup-closed-by-user" → المستخدم أغلق popup
- "auth/network-request-failed" → مشكلة في الاتصال
```

### 6. إصلاح Popup Blocker

إذا كان المتصفح يمنع popup:

1. في Chrome/Edge: اضغط على أيقونة 🔒 بجانب URL
2. اختر **Site settings**
3. غيّر **Pop-ups and redirects** إلى **Allow**
4. أعد تحميل الصفحة

### 7. استخدام signInWithRedirect بدلاً من signInWithPopup (بديل)

إذا استمرت المشكلة، يمكن استخدام redirect بدلاً من popup:

```typescript
// في client/src/contexts/AuthContext.tsx
import { signInWithRedirect } from "firebase/auth";

const signInWithGoogle = async () => {
  await signInWithRedirect(auth, googleProvider);
  // سيتم redirect إلى Google ثم العودة
};
```

## التحقق من الإصلاح

بعد إضافة domain:

1. أعد تحميل الصفحة
2. اضغط على "Sign in with Google"
3. يجب أن يفتح popup Google Sign-in
4. بعد تسجيل الدخول، يجب أن تعود إلى التطبيق

## نصائح إضافية

- تأكد من أن domain السيرفر يبدأ بـ `https://` (ليس `http://`)
- إذا كنت تستخدم proxy (مثل RunPod)، تأكد من إضافة domain الـ proxy
- يمكنك إضافة عدة domains في Firebase Console

## الأخطاء الشائعة وحلولها

| الخطأ | الحل |
|------|------|
| `auth/unauthorized-domain` | أضف domain في Firebase Console → Authorized domains |
| `auth/popup-blocked` | اسمح بـ popups في إعدادات المتصفح |
| `auth/network-request-failed` | تحقق من الاتصال بالإنترنت |
| `auth/operation-not-allowed` | فعّل Google Sign-in في Firebase Console |

## الدعم

إذا استمرت المشكلة:
1. تحقق من Console logs (F12)
2. تحقق من Network tab في Developer Tools
3. تأكد من أن domain مضاف في Firebase Console

