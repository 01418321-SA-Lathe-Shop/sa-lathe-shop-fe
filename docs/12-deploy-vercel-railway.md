# Deploy frontend บน Vercel และเชื่อม backend บน Railway

คู่มือนี้สำหรับทีมใช้พัฒนา ทดสอบ และส่งงาน โดยไม่ต้องใช้ Docker บนเครื่อง

- **Frontend (repo นี้)** ขึ้น **Vercel Hobby** (ฟรี)
- **Backend** ขึ้น **Railway** ตามคู่มือ `docs/DEPLOY_RAILWAY.md` ใน repo backend

ทำได้สองระดับ:
- **ระดับ A:** ขึ้น Vercel อย่างเดียว ใช้ปุ่ม "บัญชีทดสอบ — Mock backend" ได้ทันทีโดยไม่ต้องมี backend
- **ระดับ B:** ต่อ backend จริงบน Railway

## ก่อนเริ่ม

- branch ที่ใช้ deploy คือ `develop` (`main` ยังเป็นเวอร์ชันเก่า)
- ต้องใช้ Next.js 16.4.3 ขึ้นไป อัปเกรดแล้วใน commit `3e583fb`
  - เวอร์ชันก่อนหน้านั้น `next build` ไม่ผ่านด่านตรวจความปลอดภัย และ Vercel ไม่รับ deploy
- `npm ci` และ `npm run build` ใช้ได้โดยไม่ต้องใส่ flag พิเศษ

## ระดับ A: Frontend อย่างเดียว (mock)

1. vercel.com → **Add New… → Project** → **Import** repo `sa-lathe-shop-fe`
2. ค่าที่ Vercel ตรวจเจออัตโนมัติ ใช้ได้เลย:
   - Framework: **Next.js**
   - Install: `npm install`
   - Build: `next build`
3. กด **Deploy** แล้วรอ build เสร็จ
4. **Settings → Git → Production Branch** → เปลี่ยนเป็น `develop` → **Deployments** → **Redeploy** (หรือ push commit ใหม่เข้า `develop`)
5. เปิด `https://<ชื่อโปรเจกต์>.vercel.app/login` → **บัญชีทดสอบ — Mock backend**

ใช้ได้ครบ UC1–UC9 ทั้ง Customer, Staff และ Admin โดยข้อมูลเป็นตัวอย่างในเบราว์เซอร์และเริ่มใหม่เมื่อรีโหลด

## ระดับ B: เชื่อม backend จริงบน Railway

1. **Deploy backend** ตาม `docs/DEPLOY_RAILWAY.md` (repo backend) ให้ `https://<api-domain>/health/ready` ตอบ ok และสร้าง Admin คนแรกให้เรียบร้อย
2. **ตั้ง env ใน Vercel:** **Settings → Environment Variables**
   - Key: `NEXT_PUBLIC_API_BASE_URL`
   - Value: `https://<api-domain>` (ไม่มี `/` ท้าย)
   - Environments: Production และ Preview
3. **Redeploy frontend:** ค่า `NEXT_PUBLIC_*` ถูกฝังตอน build จึงต้อง redeploy ทุกครั้งที่แก้
4. **ตั้งค่าฝั่ง Railway และ bucket:**
   - `CORS_ORIGINS` ของ service `api` ต้องมี `https://<ชื่อโปรเจกต์>.vercel.app` (ถ้าใช้ Preview URL ของ Vercel ต้องเพิ่ม origin นั้นด้วย)
   - CORS ของ bucket ต้องมีโดเมนเดียวกัน
5. **ทดสอบ:**
   - login ด้วย Admin ที่สร้างไว้ → badge มุมขวาบนต้องเป็น **Connected API**
   - Admin สร้าง Staff ในหน้า **จัดการพนักงาน**
   - ลูกค้าสมัครที่ `/register`
   - ไล่ flow UC1 → UC9 ตาม checklist ใน `docs/11-phase-ten-handoff.md`

ปุ่มบัญชีทดสอบ (mock) ยังใช้ได้ตามปกติ และแยกขาดจากข้อมูลจริง

## ความปลอดภัย

- Vercel มีแค่ URL สาธารณะของ API ห้ามใส่รหัสฐานข้อมูล S3 key หรือ token ใดๆ ใน env ของ Vercel
- session เก็บใน memory ของหน้าเว็บเท่านั้น รีโหลดแล้วต้อง login ใหม่ (ตั้งใจออกแบบไว้แบบนี้)
- ลิงก์ Vercel/Railway เป็นสาธารณะ ใช้บัญชีและข้อมูลสมมติเท่านั้น และลบ project เมื่อส่งงานเสร็จ

## แก้ปัญหา

| อาการ | ตรวจที่ |
| --- | --- |
| Vercel build ล้ม | log ของ build; ตรวจว่า deploy branch `develop` ที่มี Next.js 16.4.3 |
| Login จริงขึ้น "Cannot reach the API…" | `NEXT_PUBLIC_API_BASE_URL` + redeploy, `CORS_ORIGINS` บน Railway, `/health/ready` |
| อัปโหลดไฟล์ไม่ผ่าน | CORS ของ bucket และค่า `S3_*` บน Railway |
| ใช้ได้แต่การแจ้งเตือนไม่ขึ้น | service `worker` บน Railway ยังไม่รันหรือ env ไม่ครบ |
