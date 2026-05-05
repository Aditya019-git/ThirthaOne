# TirthOne - Backend (Node.js & Express)

Welcome to the backend repository of **TirthOne**, a comprehensive Temple Management and VIP Darshan Booking system. This robust backend infrastructure is built using Node.js, Express, and MongoDB, specifically engineered to handle secure authentication, complex role-based booking logic, and real-time payment processing.

## 🚀 Key Features

* **Microservices-Inspired Architecture:** Modular routing and controller logic separating Darshan passes, Priest rituals, and Guide itineraries.
* **Role-Based Access Control (RBAC):** Secure JWT-based authentication distinguishing between Admins, Devotees, Priests, Guides, and Gate Officers.
* **Automated Refund Engine:** Built-in cron jobs (`node-cron`) to automatically process refunds for unfulfilled or declined bookings.
* **Secure Payment Integration:** End-to-end Razorpay webhook integration for verifying payments and maintaining immutable transaction ledgers.
* **Dynamic QR Code Generation:** On-the-fly Base64 QR code generation (`qrcode`) for secure physical entry validation.

## 🛠️ Technology Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (via Mongoose ODM)
* **Authentication:** JSON Web Tokens (JWT) & bcryptjs for password hashing
* **Payment Gateway:** Razorpay
* **Scheduling:** node-cron
* **Validation:** express-validator

## ⚙️ Local Setup

1. Clone the repository and navigate to the `server` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on your local configuration:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/tirthone
   JWT_SECRET=your_super_secret_key
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🔒 Security Practices
* **Input Validation:** All incoming payloads are strictly sanitized using `express-validator` to prevent NoSQL injection and XSS attacks.
* **Stateless Auth:** Secure, stateless JWTs are used for all protected routes, ensuring high scalability and security.
* **Webhook Verification:** Razorpay webhooks are cryptographically verified using SHA256 HMAC signatures to prevent payment spoofing.
