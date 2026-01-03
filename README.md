# تطبيق تسجيل المدفوعات

تطبيق ويب React مع Supabase لتسجيل وعرض المدفوعات مع إمكانية التصفية.

## المميزات

- ✅ تسجيل المدفوعات مع الحقول التالية:
  - تاريخ
  - المستفيد
  - الحساب
  - المشروع
  - وصف
  - الإجمالي
- ✅ عرض جميع السجلات
- ✅ تصفية السجلات حسب جميع الحقول
- ✅ تصميم متجاوب بالكامل للهواتف المحمولة
- ✅ تحديث فوري عند إضافة أو حذف السجلات

## الإعداد

### 1. تثبيت المتطلبات

```bash
npm install
```

### 2. إعداد Supabase

1. أنشئ مشروع جديد على [Supabase](https://supabase.com)
2. في SQL Editor، قم بتشغيل الاستعلام التالي لإنشاء الجدول:

```sql
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  beneficiary TEXT NOT NULL,
  account TEXT NOT NULL,
  project TEXT NOT NULL,
  description TEXT NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (optional, for security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations" ON payments
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

3. احصل على URL و Anon Key من Project Settings > API

### 3. إعداد متغيرات البيئة

1. انسخ ملف `.env.example` إلى `.env`:
```bash
cp .env.example .env
```

2. املأ القيم في ملف `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. تشغيل التطبيق

```bash
npm run dev
```

التطبيق سيعمل على `http://localhost:5173`

## البناء للإنتاج

```bash
npm run build
```

الملفات المبنية ستكون في مجلد `dist`

## التقنيات المستخدمة

- React 18
- Vite
- Supabase
- CSS3 (Responsive Design)

