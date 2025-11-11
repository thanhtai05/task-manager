## Project Overview & Next Steps
# Task Manager Monorepo

Dự án gồm hai phần: `backend` (Express + TypeScript + Mongoose) và `client` (React + Vite + Tailwind + shadcn/ui). Tài liệu này tổng hợp kiến trúc, công nghệ, cách chạy, scripts, biến môi trường, và các API chính.

## Kiến trúc & Công nghệ
- Backend: `Express`, `Passport` (Local + Google OAuth), `cookie-session`, `CORS`, `Mongoose`, `Zod`, `dotenv`, seeding dev.
- Client: `React` + `Vite`, `React Router`, `@tanstack/react-query`, `Zustand`, `axios`, `Tailwind CSS`, `shadcn/ui`, `react-hook-form`, `zod`.
- Ngôn ngữ: TypeScript cho cả hai phần.
- Giao tiếp: Client proxy tới Backend trên `/auth` và `/api`.

## Cấu trúc thư mục
```
root
├── backend/               # API server (Express + Mongoose)
│   ├── src/
│   │   ├── config/        # app config, DB, passport, http
│   │   ├── controllers/   # bộ điều khiển cho các route
│   │   ├── middlewares/   # error handler, async handler, auth guard
│   │   ├── models/        # Mongoose models (User, Workspace, Project, Task, ...)
│   │   ├── routes/        # định tuyến: auth, user, workspace, member, project, task
│   │   ├── seeders/       # seed dữ liệu demo và multi-tenant
│   │   ├── services/      # logic nghiệp vụ
│   │   └── validation/    # zod schema
│   └── .env.example       # mẫu biến môi trường
└── client/                # Ứng dụng web React
    ├── src/
    │   ├── components/    # UI components (shadcn/ui)
    │   ├── lib/           # axios client, API wrappers
    │   ├── routes/        # định tuyến client
    │   ├── context/       # auth, state
    │   └── page/          # trang chức năng
    ├── vite.config.ts     # proxy, alias
    └── tailwind.config.js # cấu hình Tailwind
```

## Cách chạy nhanh
1) Cài dependencies:
- Backend: `cd backend && npm install`
- Client: `cd client && npm install`

2) Tạo file môi trường:
- Backend: tạo `backend/.env` từ mẫu `backend/.env.example` và điền giá trị (xem phần Biến môi trường Backend).
- Client: nếu cần, tạo `client/.env` dựa trên nhu cầu UI (dự án hiện không bắt buộc biến env riêng cho client).

3) Chạy dev:
- Backend: `npm run dev` (cổng mặc định `8000`)
- Client: `npm run dev` (cổng mặc định `3000`)

4) Truy cập ứng dụng:
- Client chạy tại `http://localhost:3000`
- API nền chạy tại `http://localhost:8000`; client proxy sang backend cho `/auth` và `/api`.

## Backend

### Scripts
- `npm run dev`: chạy server phát triển với `ts-node-dev`.
- `npm run build`: build TypeScript sang `dist`.
- `npm run start`: chạy từ `dist`.
- `npm run seed`: seed vai trò/permissions cơ bản.
- `npm run seed:fixtures`: nhập dữ liệu mẫu.
- `npm run migrate:realnames`: script phục vụ đổi tên hiển thị.

### Biến môi trường (backend/.env)
Trích từ `backend/.env.example`:
- `PORT=8000`
- `NODE_ENV=development`
- `MONGO_URI=mongodb://127.0.0.1:27017/task_manager` — khuyến nghị dùng `127.0.0.1` trên Windows để tránh vấn đề IPv6 `::1`.
- `SESSION_SECRET` (bắt buộc) và `SESSION_EXPIRES_IN`, ví dụ `1d`.
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback`.
- CORS: `FRONTEND_ORIGIN=http://localhost:3000`.
- `FRONTEND_GOOGLE_CALLBACK_URL=http://localhost:3000/google/callback`.
- Seeding dev: `SEED_DEMO_COUNT=100`, `SEED_MULTI_ENABLE=false`.
- Tuỳ chọn MongoDB in-memory (dev): `MONGO_USE_MEMORY=false`, `MONGO_MEMORY_PORT=27017`, `MONGO_MEMORY_DBPATH=.mongo-memory`.

Ghi chú DB:
- Nếu `MONGO_URI` không kết nối được, server có thể fallback chạy MongoDB in-memory (Replica Set) trong môi trường `development` khi bật `MONGO_USE_MEMORY` hoặc không có URI hợp lệ.

### Middlewares & Bảo mật
- `cookie-session`: quản lý session cookie (`secure` bật trong production, `sameSite: lax`).
- `passport`: Local + Google OAuth.
- `cors`: cấp quyền truy cập từ `FRONTEND_ORIGIN` với `credentials: true`.
- `errorHandler`: middleware xử lý lỗi tập trung.

### Điểm vào server
- `src/index.ts`: cấu hình app, kết nối DB (`connectDatabase`), nạp passport, đăng ký routes dưới `BASE_PATH` (mặc định `/api`).

### API chính (tóm tắt đường dẫn)
- Auth (`/auth`):
  - `POST /register`, `POST /login`, `POST /logout`
  - `POST /forgot-password`, `POST /reset-password`
  - `GET /google`, `GET /google/callback` (Google OAuth)
- User (`/user`, yêu cầu đăng nhập):
  - `GET /current`
- Workspace (`/workspace`, yêu cầu đăng nhập):
  - `POST /create/new`, `PUT /update/:id`, `DELETE /delete/:id`
  - `GET /all`, `GET /members/:id`, `GET /analytics/:id`, `GET /:id`
  - `PUT /change/member/role/:id`
- Member (`/member`, yêu cầu đăng nhập):
  - `POST /workspace/:inviteCode/join`
- Project (`/project`, yêu cầu đăng nhập):
  - `POST /workspace/:workspaceId/create`
  - `PUT /:id/workspace/:workspaceId/update`
  - `DELETE /:id/workspace/:workspaceId/delete`
  - `GET /workspace/:workspaceId/all`
  - `GET /:id/workspace/:workspaceId/analytics`
  - `GET /:id/workspace/:workspaceId`
- Task (`/task`, yêu cầu đăng nhập):
  - `POST /project/:projectId/workspace/:workspaceId/create`
  - `PUT /:id/project/:projectId/workspace/:workspaceId/update`
  - `DELETE /:id/workspace/:workspaceId/delete`
  - `GET /workspace/:workspaceId/all`
  - `GET /:id/project/:projectId/workspace/:workspaceId`

### Models (Mongoose)
- `User`: tên, email (unique), mật khẩu (hash), `profilePicture`, `currentWorkspace`, trạng thái, lần đăng nhập gần nhất, `passwordResetToken/Expires`.
- `Workspace`: không gian làm việc, liên kết thành viên.
- `Project`: thuộc `Workspace`, thống kê, CRUD.
- `Task`: `taskCode` (tạo bằng `uuid`), `title`, `description`, `project`, `workspace`, `status` (TODO/...), `priority`, `assignedTo`, `createdBy`, `dueDate`, timestamps.
- `Member`: vai trò trong workspace.
- `roles-permission`: ánh xạ role → quyền (`Permissions`).
- `Account`: thông tin tài khoản OAuth nhà cung cấp.

## Client

### Scripts
- `npm run dev`: chạy Vite dev server (mặc định port `3000`).
- `npm run build`: build production.
- `npm run preview`: xem thử bản build.
- `npm run lint`: ESLint.

### Cấu hình
- `vite.config.ts`:
  - Alias: `@` → `./src`.
  - Proxy: `/auth` và `/api` → `http://localhost:8000`.
- `tailwind.config.js`: bật `darkMode: class`, mở rộng theme, dùng `tailwindcss-animate`.
- `components.json`: cấu hình shadcn/ui, aliases (`@/components`, `@/lib`, `@/hooks`, ...).

### Thư viện chính
- Routing: `react-router-dom`.
- Dữ liệu: `@tanstack/react-query` (queries/mutations, cache).
- State: `zustand`.
- UI: `shadcn/ui`, `lucide-react`, `tailwindcss-animate`.
- Form/Validation: `react-hook-form` + `zod`.
- HTTP: `axios` với client wrapper (`src/lib/axios-client` và `src/lib/api.ts`).

## Quy trình phát triển đề xuất
- Khởi chạy Backend trước để client có thể proxy API.
- Với Google OAuth: đảm bảo `GOOGLE_CLIENT_ID/SECRET` hợp lệ và `GOOGLE_CALLBACK_URL`, `FRONTEND_GOOGLE_CALLBACK_URL` tương ứng.
- Nếu chưa có MongoDB local, có thể bật in-memory trong dev bằng `MONGO_USE_MEMORY=true`.

## Ghi chú & Khuyến nghị
- Yêu cầu Node.js ≥ 18.
- Trên Windows, ưu tiên `127.0.0.1` thay vì `localhost` cho `MONGO_URI` (đã có cơ chế normalize/fallback IPv4 trong `database.config.ts`).
- Seeding dev: khi `NODE_ENV=development`, server sẽ seed demo (`SEED_DEMO_COUNT`) và tùy chọn seed multi-tenant (`SEED_MULTI_ENABLE`).

## License
- Xem `TECHWITHEMMA-LICENSE.md` để biết thêm điều khoản.