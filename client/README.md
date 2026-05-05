# TirthOne - Frontend (React.js)

Welcome to the frontend repository of **TirthOne**, a premium VIP Darshan and Temple Services Booking portal. Designed with modern UX/UI principles, this frontend delivers a seamless, high-performance experience for Devotees, Priests, Guides, Gate Officers, and Administrators.

## 🌟 Project Overview

This Single Page Application (SPA) acts as the unified interface for the entire TirthOne ecosystem. It empowers devotees to seamlessly book complex packages (Darshan + Priest + Guide) through an intuitive checkout flow, while providing dedicated, data-rich dashboards for temple staff to manage their incoming queues and payouts.

## ✨ Key Features

* **Dynamic Role-Based Dashboards:** Completely customized user experiences based on JWT roles (Admin, Devotee, Priest, Guide, Gate Officer).
* **Complex Booking Engine:** A multi-step, state-managed booking flow handling family member data, dynamic pricing, and concurrent service scheduling.
* **Real-time QR Scanning:** Integrated `html5-qrcode` scanner for Gate Officers to validate Darshan passes instantly using camera input.
* **Analytics & Data Visualization:** Interactive charts powered by `react-chartjs-2` to give Admins a clear view of daily revenue, visitor footfall, and staff performance.
* **Modern CSS Grid Layouts:** Fully responsive UI utilizing modern CSS Grid and Flexbox for a flawless experience across mobile and desktop devices.

## 🛠️ Technology Stack

* **Core:** React 19, React Router DOM (v7)
* **Styling:** Custom CSS3 with modern variables, Grid, and Flexbox layouts.
* **API Communication:** Axios with centralized interceptors for token injection and automated error handling.
* **Data Visualization:** Chart.js & React-Chartjs-2
* **Utilities:** html2canvas, jspdf (for ticket downloading), lucide-react (for iconography)

## ⚙️ Local Setup

1. Clone the repository and navigate to the `client` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```
4. Start the development server:
   ```bash
   npm start
   ```

## 🏗️ Architectural Decisions
* **Context API for State Management:** Utilizes React's Context API (`AuthContext`) to manage global user state securely across the application, minimizing prop drilling.
* **Axios Interceptors:** All outgoing requests automatically attach the `Authorization` Bearer token, and incoming `401 Unauthorized` responses automatically trigger a clean logout flow, ensuring robust session management.
