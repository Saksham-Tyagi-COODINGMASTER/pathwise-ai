
# Pathwise AI 🎓

### Your AI-Powered Personalised Learning Companion

Pathwise AI is an intelligent learning platform designed to help students navigate their academic journey through personalised learning, AI-powered quiz generation, curriculum tracking, and adaptive assessments.

Built with a focus on university students, Pathwise AI combines structured academic curriculum data with AI-assisted learning to make studying more organised, interactive, and personalised.

---

## ✨ Key Features

### 🤖 AI-Powered Quiz Generation
- Generate quizzes based on subjects and course content.
- AI-assisted question generation using configurable AI providers.
- Support for Google Gemini and Groq integrations.
- Multiple-choice questions (MCQs).
- Structured question bank with course-specific question IDs.

### 🧠 Adaptive Learning
- Multiple difficulty levels: Easy, Medium, Hard, and Adaptive.
- Personalised assessments based on selected courses.
- Flexible quiz generation through the backend.

### 🎓 IIT Dharwad Curriculum Integration
- Integrated undergraduate curriculum catalogue.
- Supports multiple engineering branches.
- Semester-wise course organisation.
- Course completion tracking.
- Credit progress monitoring.
- Personalised curriculum dashboard.
- Student-specific academic progress.

### 🔐 Authentication & Student Profiles
- Google OAuth authentication.
- JWT-based authentication.
- Student profile management.
- Personalised onboarding.
- Individual student curriculum progress.

### 📊 Academic Dashboard
- Organised academic information.
- Semester-wise curriculum overview.
- Course completion status.
- Credit progress tracking.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | React.js |
| Build Tool | Vite |
| Backend | Python, FastAPI |
| Database | SQLite |
| Authentication | Google OAuth, JWT |
| AI Integration | Google Gemini, Groq |
| API Communication | REST API |
| Deployment | Render |

---

## 📁 Project Structure

```text
pathwise-ai/
│
├── backend/
│   ├── main.py
│   ├── quiz.py
│   ├── ai_provider.py
│   ├── validate_curriculum.py
│   ├── migrate_curriculum.py
│   ├── data/
│   │   └── questions.json
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .github/
│   └── workflows/
│
├── CURRICULUM_INTEGRATION.md
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Saksham-Tyagi-COODINGMASTER/pathwise-ai.git

cd pathwise-ai
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables and API credentials.

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

Backend runs at:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend runs at:

`http://localhost:5173`

---

## 📚 Curriculum Validation

Run the curriculum validation utility from the backend directory:

```bash
python validate_curriculum.py
```

This validates:

- JSON structure.
- Required curriculum fields.
- Semester ranges.
- Duplicate course keys.

For additional curriculum implementation details, see [CURRICULUM_INTEGRATION.md](CURRICULUM_INTEGRATION.md).

---

## 🔑 Environment Configuration

The application requires appropriate credentials and configuration for its authentication and AI integrations.

Configure the necessary environment variables for:

- Google OAuth credentials.
- JWT authentication and signing.
- Google Gemini API.
- Groq API.
- Backend and frontend API communication.

**Important:** Never commit API keys, OAuth secrets, database credentials, or other sensitive configuration to GitHub. Use environment variables and deployment platform secrets.

---

## 🌐 Deployment

Pathwise AI supports separate frontend and backend deployment.

The backend can be deployed using Render, while the frontend can be hosted through a compatible static frontend hosting service.

Ensure that:

- The frontend points to the deployed backend URL.
- CORS allows the deployed frontend origin.
- Google OAuth includes the correct authorised origins and redirect configuration.
- Required API credentials are configured in the deployment environment.

---

## 🗺️ Roadmap

- [x] React frontend and FastAPI backend.
- [x] Google OAuth authentication integration.
- [x] Student onboarding and profiles.
- [x] IIT Dharwad curriculum integration.
- [x] Semester-wise academic progress tracking.
- [x] Structured question bank.
- [x] AI provider integration.
- [ ] Expand and improve subject-wise question coverage.
- [ ] Improve adaptive difficulty and personalisation.
- [ ] Advanced student performance analytics.
- [ ] More detailed learning recommendations.
- [ ] Production-ready deployment and database infrastructure.

---

## 🎯 Vision

The goal of Pathwise AI is to build more than just another quiz application.

It aims to become a personalised academic companion that understands a student's curriculum, helps them practise relevant concepts, tracks their progress, and makes their university learning journey more structured.

**Learn smarter. Track your progress. Find your path.**

---

## 👨‍💻 Author

**Saksham Tyagi**

GitHub: [@Saksham-Tyagi-COODINGMASTER](https://github.com/Saksham-Tyagi-COODINGMASTER)

Project Repository: [Pathwise AI](https://github.com/Saksham-Tyagi-COODINGMASTER/pathwise-ai)

---

*Built with curiosity, code, and a vision for smarter learning.*
