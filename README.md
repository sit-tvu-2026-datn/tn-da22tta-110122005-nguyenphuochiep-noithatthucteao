# XÂY DỰNG HỆ THỐNG BÁN NỘI THẤT KẾT HỢP HỖ TRỢ TRẢI NGHIỆM THỰC TẾ ẢO VÀ TƯ VẤN TỰ ĐỘNG

Thông tin  
Loại: Đồ án tốt nghiệp khoá 2022  
Giảng viên hướng dẫn: ThS. Phạm Minh Đương  
Sinh viên thực hiện: Nguyễn Phước Hiệp - 110122005 - DA22TTA  
Email: nphhiep1301@gmail.com  

# 🧰 Tech Stack
| Công nghệ |
| --- |
| React `19.1.1` |
| Tailwind CSS `3.4.17` |
| Three.js, `@react-three/fiber`, `@react-three/drei` |
| `@google/model-viewer` |
| Java `21` |
| Spring Boot `3.5.6` |
|MySQL|

# 🗂️ Project Structure

```text
cn-da22tta-NguyenPhuocHiep-InteriorShop/
│
├── backend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── mvnw
│   ├── mvnw.cmd
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/example/backend/
│       │   │   ├── component/
│       │   │   ├── config/
│       │   │   ├── controller/
│       │   │   ├── DTO/
│       │   │   ├── exception/
│       │   │   ├── model/
│       │   │   ├── repository/
│       │   │   ├── security/
│       │   │   ├── service/
│       │   │   ├── util/
│       │   │   └── BackendApplication.java
│       │   └── resources/
│       │       ├── application.properties
│       │       └── db/migration/
│       └── test/
│           └── java/com/example/backend/
│
├── frontend/
│   ├── .env.example
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── config/
│       ├── context/
│       ├── layouts/
│       ├── pages/
│       ├── services/
│       ├── App.jsx
│       └── main.jsx
│
├── .gitignore
└── README.md
```
# 🚀 Installation

## Clone project

```bash
git clone https://github.com/phuochiep131/tn-da22tta-110122005-nguyenphuochiep-noithatthucteao.git
cd tn-da22tta-110122005-nguyenphuochiep-noithatthucteao
```
# 🔧 Environment Variables

## Frontend `.env`

File mẫu: `frontend/.env.example`.

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL backend. Khi chạy dev với Vite proxy có thể để rỗng. Nếu backend chạy domain riêng, đặt ví dụ `http://localhost:8080` hoặc domain API. |
| `VITE_PAYPAL_CLIENT_ID` | PayPal Client ID dùng cho PayPal button ở frontend. |

## Backend `.env`

File mẫu: `backend/.env.example`.  
Lưu ý: `backend/src/main/resources/application.properties` yêu cầu nhiều biến hơn file `.env.example` hiện tại. Dưới đây là danh sách tổng hợp từ source code.

| Variable | Description |
| --- | --- |
| `SPRING_DATASOURCE_URL` | JDBC URL MySQL, ví dụ `jdbc:mysql://localhost:3306/interior_shop?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC`. |
| `SPRING_DATASOURCE_USERNAME` | Username MySQL. |
| `SPRING_DATASOURCE_PASSWORD` | Password MySQL. |
| `SERVER_PORT` | Port backend, thường dùng `8080`. |
| `APP_CORS_ALLOWED_ORIGINS` | Origin frontend được phép gọi API, ví dụ `http://localhost:5173`. |
| `OPENAI_API_KEY` | API key cho chatbot. |
| `OPENAI_MODEL` | Model chatbot. |
| `OPENAI_API_URL` | URL API chat completions tương thích OpenAI. |
| `VNPAY_TMN_CODE` | VNPay terminal code. |
| `VNPAY_HASH_SECRET` | VNPay hash secret. |
| `VNPAY_PAY_URL` | URL thanh toán VNPay. |
| `VNPAY_RETURN_URL` | URL frontend nhận kết quả thanh toán, mặc định theo code là `/payment-return`. |
| `PAYPAL_CLIENT_ID` | PayPal client ID backend. |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret backend. |
| `PAYPAL_BASE_URL` | PayPal API URL, mặc định sandbox `https://api-m.sandbox.paypal.com`. |
| `PAYPAL_CURRENCY` | Tiền tệ PayPal, mặc định `USD`. |
| `PAYPAL_VND_TO_USD_RATE` | Tỉ giá quy đổi VND sang USD, mặc định `25000`. |
| `SPRING_MAIL_HOST` | SMTP host. |
| `SPRING_MAIL_PORT` | SMTP port. |
| `SPRING_MAIL_USERNAME` | SMTP username. |
| `SPRING_MAIL_PASSWORD` | SMTP password/app password. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_KEY` | Supabase service key/API key dùng upload storage. |
| `SUPABASE_IMAGE_BUCKET` | Bucket ảnh sản phẩm. |
| `SUPABASE_MODEL_BUCKET` | Bucket model `.glb`. |
| `SUPABASE_MODEL_PREFIX` | Prefix object model, mặc định trong code là `products/models`. |
| `SUPABASE_MAX_MODEL_SIZE_BYTES` | Giới hạn dung lượng model `.glb`. |
| `GHN_BASE_URL` | Base URL GHN API. |
| `GHN_TOKEN` | Token GHN. |
| `GHN_SHOP_ID` | Shop ID GHN. |
| `GHN_FROM_DISTRICT_ID` | Mã quận/huyện gửi hàng. |
| `GHN_DEFAULT_HEIGHT` | Chiều cao mặc định khi sản phẩm thiếu thông số. |
| `GHN_DEFAULT_LENGTH` | Chiều dài mặc định khi sản phẩm thiếu thông số. |
| `GHN_DEFAULT_WIDTH` | Chiều rộng mặc định khi sản phẩm thiếu thông số. |
| `GHN_DEFAULT_WEIGHT` | Khối lượng mặc định khi sản phẩm thiếu thông số. |
| `GHN_DEFAULT_INSURANCE_VALUE` | Giá trị bảo hiểm mặc định. |
| `GHN_RETRY_ATTEMPTS` | Số lần retry khi gọi GHN. |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret. |

Ví dụ backend `.env` tối thiểu để khởi động local:

```properties
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/interior_shop?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your-password
SERVER_PORT=8080
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173

OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=your-model
OPENAI_API_URL=https://api.openai.com/v1/chat/completions

VNPAY_TMN_CODE=your-vnpay-tmn-code
VNPAY_HASH_SECRET=your-vnpay-hash-secret
VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment-return

PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CURRENCY=USD
PAYPAL_VND_TO_USD_RATE=25000

SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your-email@example.com
SPRING_MAIL_PASSWORD=your-mail-password

SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
SUPABASE_IMAGE_BUCKET=images
SUPABASE_MODEL_BUCKET=product-models
SUPABASE_MODEL_PREFIX=products/models
SUPABASE_MAX_MODEL_SIZE_BYTES=104857600

GHN_BASE_URL=https://online-gateway.ghn.vn/shiip/public-api
GHN_TOKEN=your-ghn-token
GHN_SHOP_ID=your-shop-id
GHN_FROM_DISTRICT_ID=1454
GHN_DEFAULT_HEIGHT=20
GHN_DEFAULT_LENGTH=20
GHN_DEFAULT_WIDTH=20
GHN_DEFAULT_WEIGHT=1000
GHN_DEFAULT_INSURANCE_VALUE=0
GHN_RETRY_ATTEMPTS=2

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

# ▶️ Running the Project

## Backend

```bash
cd backend
./mvnw spring-boot:run
```


## Frontend

```bash
cd frontend
npm run dev
```


# 🌐 Default URLs

| Service | URL |
| --- | --- |
| Frontend dev | `http://localhost:5173` |
| Backend | `http://localhost:8080` |
| API base | `http://localhost:8080/api` |
| Google OAuth2 start | `http://localhost:8080/oauth2/authorization/google` |

