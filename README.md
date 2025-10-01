# 🚀 Coding Journey

<div align="center">

![Coding Journey Logo](https://img.shields.io/badge/Coding%20Journey-Professional%20Dashboard-blue?style=for-the-badge&logo=code&logoColor=white)

**A comprehensive full-stack web application that aggregates coding profiles and provides AI-powered career guidance**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-green?style=for-the-badge&logo=vercel&logoColor=white)](https://coding-journey-9rlm.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend%20API-Render-orange?style=for-the-badge&logo=render&logoColor=white)](https://codingjourney.onrender.com)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [️ Tech Stack](#️-tech-stack)
- [ Quick Start](#-quick-start)
- [📱 Screenshots](#-screenshots)
- [🏗️ Architecture](#️-architecture)
- [🔧 API Documentation](#-api-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

### **Core Dashboard**

- **Multi-Platform Profile Aggregation**: Seamlessly integrate data from GitHub, LeetCode, CodeChef, and Codeforces
- **Real-time Statistics**: Live updates of coding progress, ratings, and achievements
- **Intelligent Caching**: 30-minute cache system for optimal performance
- **Responsive Design**: Beautiful, mobile-first UI with Tailwind CSS

### 🤖 **AI-Powered Features**

- **Personalized Chat Assistant**: Google Gemini AI integration for coding guidance
- **Chat History**: View and search your previous AI conversations, organized by session
- **Smart Recommendations**: Tailored learning paths based on your coding profiles
- **Resume Analysis**: AI-powered resume analysis with job description matching
- **Career Insights**: Data-driven suggestions for skill development

### 📄 **Resume Builder**

- **Professional Templates**: Multiple resume layouts with customizable themes
- **Rich Text Editor**: Advanced formatting with WYSIWYG editor
- **Real-time Preview**: Live preview as you build your resume
- **PDF Export**: One-click download in professional PDF format
- **Local Storage**: Auto-save progress with browser storage

### 🔐 **Authentication & Security**

- **Clerk Integration**: Secure user authentication and management
- **JWT Tokens**: Stateless authentication for API security
- **CORS Protection**: Secure cross-origin resource sharing
- **Input Validation**: Pydantic models for data validation

### 📊 **Data Management**

- **PostgreSQL Database**: Robust data persistence with SQLAlchemy ORM
- **Database Migrations**: Alembic for schema versioning
- **User Data EDA & Analysis Page**: Visualize your coding journey with interactive charts and exportable reports (CSV/PDF)
- **Error Handling**: Comprehensive error management across all layers
- **Retry Mechanisms**: Automatic retry for failed API calls

---

## 🛠️ Tech Stack

### **Backend Technologies**

| Category           | Technology        | Purpose                        |
| ------------------ | ----------------- | ------------------------------ |
| **Framework**      | FastAPI           | Modern, fast web framework     |
| **Server**         | Uvicorn           | ASGI server for production     |
| **Database**       | PostgreSQL        | Primary production database    |
| **ORM**            | SQLAlchemy        | Python SQL toolkit and ORM     |
| **Migrations**     | Alembic           | Database schema versioning     |
| **AI/ML**          | Google Gemini AI  | AI chat and recommendations    |
| **PDF Processing** | PyMuPDF, pdfminer | Resume analysis and processing |
| **HTTP Client**    | httpx, requests   | API integrations               |
| **Authentication** | PyJWT, Clerk      | User management and security   |

### **Frontend Technologies**

| Category           | Technology           | Purpose                           |
| ------------------ | -------------------- | --------------------------------- |
| **Framework**      | React 19             | Modern UI library                 |
| **Build Tool**     | Vite                 | Next-generation build system      |
| **Styling**        | Tailwind CSS 4.0     | Utility-first CSS framework       |
| **Animation**      | Framer Motion        | Smooth animations and transitions |
| **Icons**          | Lucide React         | Beautiful icon library            |
| **Authentication** | Clerk React          | User authentication               |
| **HTTP Client**    | Axios                | API communication                 |
| **Routing**        | React Router DOM 7   | Client-side routing               |
| **Rich Text**      | react-simple-wysiwyg | Resume content editing            |

### **Deployment & Infrastructure**

| Service        | Purpose                         |
| -------------- | ------------------------------- |
| **Vercel**     | Frontend hosting and deployment |
| **Render**     | Backend API hosting             |
| **PostgreSQL** | Managed database service        |
| **GitHub**     | Version control and CI/CD       |

---

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+ and npm/yarn
- Python 3.8+
- PostgreSQL database
- Clerk account for authentication
- Google AI API key

### **Backend Setup**

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/coding-journey.git
   cd coding-journey/backend
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Environment configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**

   ```bash
   alembic upgrade head
   ```

5. **Start the server**
   ```bash
   uvicorn main:app --reload
   ```

### **Frontend Setup**

1. **Navigate to frontend directory**

   ```bash
   cd ../frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment configuration**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### **Environment Variables**

#### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/codingjourney
GITHUB_TOKEN=your_github_token
GOOGLE_API_KEY=your_gemini_api_key
CLERK_SECRET_KEY=your_clerk_secret
FRONTEND_URL=http://localhost:5173,https://your-vercel-app.vercel.app
ENVIRONMENT=development
```

#### Frontend (.env.local)

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:8000
```

---

## Screenshots

### Home Page

![Home Page](images/homepage.png)

### Dashboard Overview

![Dashboard](images/d1.png)
![Dashboard](images/d2.png)
![Dashboard](images/d3.png)
![Dashboard](images/d4.png)

### Resume Builder

![Resume Builder](images/r1.png)
![Resume Builder](images/r2.png)
![Resume Builder](images/r3.png)

### Resume Analyzer

![resume analyzer](images/Re.png)
![resume analyzer](images/re1.png)
![resume analyzer](images/re2.png)

### AI Chat Interface

![AI Chat](images/c1.png)

### Chat History

![Chat History]![AI Chat](images/c2.png)

### Analysis Page (User Data EDA)

![Analysis Page](images/eda.png)

### Settings

![Settings](images/settings.png)

---

## 🏗️ Architecture

![Architecture Diagram](images/ar.png)

<!-- Replace the above link with your own architecture diagram image -->

---

## 🔧 API Documentation

### **Authentication Endpoints**

- `POST /users/sync` - Sync user data from Clerk
- `GET /api/users/me` - Get current user data
- `PUT /api/settings` - Update user settings

### **Platform Data Endpoints**

- `GET /api/platform/{platform}/{username}` - Get platform statistics
- `POST /api/settings/profile-picture` - Upload profile picture

### **AI & Analysis Endpoints**

- `POST /chat` - AI chat interface
- `GET /api/chat/history` - Get previous chat history for the current user
- `GET /api/analysis-data` - Get user data for EDA/Analysis Page
- `GET /api/recommendations` - Get personalized recommendations
- `POST /analyze` - Analyze resume with AI

### **Health & Monitoring**

- `GET /health` - System health check
- `GET /` - API status

---

## 🎯 Key Features Deep Dive

### **1. Multi-Platform Data Aggregation**

- **GitHub**: Contributions, stars, languages, streaks using GraphQL API v4
- **LeetCode**: Problems solved, difficulty breakdown, ranking via GraphQL
- **CodeChef**: Ratings, stars, rankings through unofficial API
- **Codeforces**: Ratings, problems solved via REST API

### **2. AI-Powered Resume Builder**

- **Step-by-step Forms**: Personal details, summary, experience, education, skills
- **Rich Text Editing**: WYSIWYG editor with formatting options
- **Theme Customization**: Multiple color schemes and layouts
- **Real-time Preview**: Live preview as you build
- **PDF Export**: Professional PDF generation with print optimization

### **3. Analysis Page (User Data EDA)**

- **Interactive Visualizations**: Explore your coding progress, language usage, and platform stats with charts and graphs
- **Export Options**: Download your analysis as CSV or PDF for offline use
- **Secure Access**: Only available to authenticated users
- **API**: `/api/analysis-data` endpoint provides structured data for the frontend

### **4. Chat History**

- **Session-Based Conversations**: Chats are grouped by session for easy navigation
- **Search & Filter**: Quickly find past conversations by keywords
- **Persistent Storage**: All chats are securely stored and retrievable via `/api/chat/history`
- **Seamless Integration**: Access chat history directly from the chat interface

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### **Development Guidelines**

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 📄 License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Clerk** for authentication services
- **Google** for Gemini AI capabilities
- **Vercel** and **Render** for hosting services
- **Open source community** for amazing libraries and tools

---

<div align="center">

**Built with ❤️ by Mukkala Rohit**

[![GitHub](https://img.shields.io/badge/GitHub-Profile-black?style=for-the-badge&logo=github)](https://github.com/RohitMukkala)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/mukkala-rohit)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-green?style=for-the-badge&logo=portfolio)](https://portfolio3-taupe-nine.vercel.app/)

</div>


