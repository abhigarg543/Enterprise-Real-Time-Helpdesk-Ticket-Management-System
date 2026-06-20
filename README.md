# HelpDesk Pro - Enterprise Real-Time Ticket Management System

HelpDesk Pro is a modern, responsive, and easy-to-use enterprise SaaS ticket management platform. It features a bright, clean light-theme interface built with React and Spring Boot, leveraging real-time WebSockets, automatic load-balancing ticket assignment, and service level agreement (SLA) scheduling.

---

## 🌟 Key Features

### 1. Modern SaaS UI/UX Redesign
* **Welcoming Light Theme**: Outfitted with a professional blue-gray and white color system, rounded cards and buttons (12–16px radius), and soft drop shadows to minimize visual clutter.
* **Typographic Hierarchy**: Styled with the Poppins/Inter font stack for clear, readable metadata and layouts.
* **Responsive Sidebar & Views**: Built a collapsible navigation sidebar with collapsible layout modes supporting:
  * **Dashboard**: Key analytics, stats cards, and timeline logs.
  * **Ticket Registry**: A distraction-free, full-width ticket database grid.
  * **Knowledge Base**: Dedicated self-help search card layouts.
  * **Settings**: Volume slider range adjusters for audio feedback.

### 2. Advanced System Intelligence
* **AI Auto-Triage & Sentiment Analysis**: Analyzes incoming ticket text to auto-assign category tags (e.g., `TECHNICAL`, `BILLING`, `NETWORK`) and gauge sentiment. Tickets with highly negative customer text are automatically escalated to `CRITICAL` or `URGENT` priority status.
* **SLA Target Timers & Progress Bars**: Assigns SLA response limits dynamically (from 1 hour to 24 hours based on priority). Renders visual, color-changing progress meters in ticket lists showing remaining response time.
* **Smart Auto-Assignment (Least-Loaded Agent)**: Assigns incoming tickets to the active agent who currently has the minimum number of open tickets in their queue.
* **SLA Breach Scheduler**: A background scheduler checks unresolved tickets every 30 seconds, automatically flags SLA breaches, logs actions, and notifies assignees.
* **AI Reply Assistant**: Offers agents pre-generated draft responses inside the comment drawers to facilitate one-click draft insertions.

### 3. Real-Time Operations
* **WebSocket In-App Notifications**: Dispatches live notifications (assigned tickets, status updates, comments) to specific agents and users using SockJS and STOMP brokers.
* **Live System Audit Log**: Formats complex system events into a timeline feed directly on the dashboard.
* **Customer CSAT Review Rating**: Allows customers to review resolved or closed tickets with 1–5 star scores and optional text feedback.

---

## 🛠️ Technology Stack

### Backend Architecture
* **Core Framework**: Java 21, Spring Boot (v4.0.6)
* **Security**: Spring Security (JWT-based token authentication)
* **Data Layer**: Spring Data JPA, Hibernate, H2/MySQL
* **Real-time**: Spring WebSockets, SockJS, STOMP Messaging Protocol
* **Task Automation**: Spring `@Scheduled` background worker engines

### Frontend Architecture
* **Core Framework**: React (Vite-powered SPA)
* **Styling**: Vanilla CSS custom design tokens, React-Bootstrap, Poppins Typography
* **WebSockets**: `@stomp/stompjs`, `sockjs-client`
* **HTTP Client**: Axios (configured with token request interceptors)

---

## 🚀 Setup & Execution Instructions

### Prerequisites
* Java 21 JDK or higher
* Node.js v18 or higher
* Maven (installed locally or via the Maven wrapper)

### Running the Spring Boot Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Build and run the project using the Maven wrapper:
   ```bash
   ./mvnw spring-boot:run
   ```
   *The backend will launch on port `8080`.*

### Running the React Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend application will launch locally at `http://localhost:5173` (or configured dev port).*

---

## 📂 Codebase Structure
```
├── backend/
│   ├── src/main/java/com/HelpDeskPro/Project/
│   │   ├── controller/     # REST Endpoints
│   │   ├── entity/         # JPA Databases
│   │   ├── repository/     # Data Access Queries
│   │   ├── service/        # Assignment, SLA, AI logic
│   │   └── config/         # Database Seeder & WebSocket Brokers
│   └── pom.xml             # Java Dependencies
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios endpoints integration
│   │   ├── pages/          # Login, Dashboard, Drawers
│   │   ├── context/        # Auth states
│   │   └── index.css       # Slate-light styling token design
│   └── package.json        # Node configurations
└── README.md               # Documentation guide
```
