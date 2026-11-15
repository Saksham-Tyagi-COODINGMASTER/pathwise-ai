# Pathwise AI — API Contract

**API title:** Pathwise AI API  
**Version:** 1.0.0  
**Description:** Personalised Learning Buddy for Students  
**Local base URL:** `http://127.0.0.1:8000`  
**Interactive API docs:** `http://127.0.0.1:8000/docs`  
**OpenAPI source:** `openapi.json` generated from the running FastAPI application.

---

## 1. Important notes for frontend integration

- Send and receive JSON unless an endpoint says otherwise.
- `student_id` is an integer path parameter. `course_id` is a string path parameter.
- The backend currently has no authentication requirement in the exposed OpenAPI specification.
- A `404` generally means the requested student, course, assessment, or quiz data was not found. Some route-specific details are documented below.
- FastAPI request validation failures return `422` with a `detail` array.
- The OpenAPI file confirms request schemas and methods, but most successful responses have an empty schema (`{}`). Response examples below are **illustrative shapes based on the backend route code shared during development**, not response models enforced by OpenAPI. Use Swagger's **Try it out** to confirm live values before treating them as a strict frontend type.
- Academic eligibility and prerequisite checks are deterministic backend logic. The frontend must display the backend's result; it must not decide eligibility itself.
- AI explanations are optional. If no Anthropic API key is configured, the backend should use its template fallback. Do not make dashboard rendering depend on AI being available.

## 2. Endpoint index

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API health/home response |
| GET | `/courses` | List available courses |
| GET | `/courses/{course_id}/resources` | Get resources for a course |
| GET | `/courses/{course_id}/prerequisites` | Check course prerequisites |
| GET | `/courses/{course_id}/quiz` | Fetch quiz questions without answers |
| POST | `/students` | Create a student |
| GET | `/students` | List students |
| GET | `/students/{student_id}` | Get one student |
| PATCH | `/students/{student_id}/completed-courses` | Update completed courses |
| POST | `/students/{student_id}/assessment` | Submit self-assessment |
| GET | `/students/{student_id}/skill-gap` | Get skill gaps |
| POST | `/students/{student_id}/generate-plan` | Generate a learning plan |
| GET | `/students/{student_id}/mastery` | Get quiz-based skill mastery |
| GET | `/students/{student_id}/recommendations` | Get recommendations |
| GET | `/students/{student_id}/dashboard` | Get combined dashboard data |
| POST | `/students/{student_id}/quiz/submit` | Submit quiz answers |
| GET | `/students/{student_id}/quiz/history` | Get quiz history |

There are **16 distinct paths and 17 method/operation combinations** because `/students` supports both GET and POST.

---

## 3. Student endpoints

### 3.1 Create student

`POST /students`

Request body — `StudentCreate`:

```json
{
  "name": "Alex",
  "programme": "BTech Computer Science",
  "year": 1,
  "goal": "Build strong programming fundamentals",
  "hours_per_week": 15,
  "skills": ["Python"],
  "completed_courses": [],
  "learning_preferences": ["Hands-on projects"]
}
```

Required fields:
- `name`: string, minimum 2 characters
- `programme`: string
- `year`: integer from 1 to 8
- `goal`: string
- `hours_per_week`: number greater than 0 and at most 168

Optional fields default to empty arrays:
- `skills`: string array
- `completed_courses`: string array
- `learning_preferences`: string array

Illustrative success response (based on route implementation):

```json
{
  "message": "Student created successfully",
  "student": {
    "id": 3,
    "name": "Alex",
    "programme": "BTech Computer Science",
    "year": 1,
    "goal": "Build strong programming fundamentals",
    "hours_per_week": 15,
    "skills": ["Python"],
    "completed_courses": [],
    "learning_preferences": ["Hands-on projects"]
  }
}
```

### 3.2 List students

`GET /students`

No request body or parameters.

Illustrative success response:

```json
[
  {
    "id": 3,
    "name": "Alex",
    "programme": "BTech Computer Science",
    "year": 1,
    "goal": "Build strong programming fundamentals",
    "hours_per_week": 15,
    "skills": ["Python"],
    "completed_courses": [],
    "learning_preferences": ["Hands-on projects"]
  }
]
```

### 3.3 Get one student

`GET /students/{student_id}`

Path parameter:
- `student_id`: integer

Illustrative success response: one student object with the fields listed in the create-student example.

Errors:
- `404`: student does not exist.
- `422`: invalid path parameter.

### 3.4 Update completed courses

`PATCH /students/{student_id}/completed-courses`

Path parameter:
- `student_id`: integer

Request body is a JSON array of strings (not an object):

```json
["CS101", "MA101"]
```

Illustrative success response:

```json
{
  "message": "Completed courses updated successfully",
  "completed_courses": ["CS101", "MA101"]
}
```

Errors:
- `404`: student does not exist.
- `422`: body is not a string array or path parameter is invalid.

---

## 4. Assessment and skill endpoints

### 4.1 Submit assessment

`POST /students/{student_id}/assessment`

Path parameter:
- `student_id`: integer

Request body — `AssessmentInput`:

```json
{
  "skill_levels": {
    "Python": 2,
    "Programming Logic": 3
  },
  "interests": ["AI", "Web Development"],
  "confidence_levels": {
    "Python": 3,
    "Programming Logic": 2
  },
  "available_hours": 15
}
```

Rules:
- `skill_levels` and `confidence_levels` are objects mapping skill names to integer levels.
- Skill and confidence values must be from 0 through 5 (validated by route logic).
- `interests` is a string array.
- `available_hours` must be an integer greater than 0 and at most 168.

Illustrative success response:

```json
{
  "message": "Assessment submitted successfully",
  "assessment_id": 1,
  "student_id": 3
}
```

Errors:
- `404`: student does not exist.
- `400`: skill/confidence level outside 0–5, if returned by route validation.
- `422`: request body has the wrong shape or violates Pydantic constraints.

### 4.2 Get skill gaps

`GET /students/{student_id}/skill-gap`

Path parameter:
- `student_id`: integer

No request body.

Illustrative success response:

```json
{
  "student_id": 3,
  "skill_gaps": [
    {
      "skill": "Calculus",
      "current_level": 2,
      "target_level": 3,
      "gap": 1,
      "related_course": "MA101",
      "self_assessed_level": 2,
      "quiz_level": null,
      "level_source": "self_assessment"
    }
  ]
}
```

The route requires an existing student and an assessment.

Errors:
- `404`: student not found, or no assessment exists yet.
- `422`: invalid path parameter.

---

## 5. Course endpoints

### 5.1 List courses

`GET /courses`

No request body or parameters.

Returns the course records loaded from `data/courses.json`. Course records currently include fields such as `course_id`, `course_name`, `credits`, `skills`, and `resources`; use the actual response as the source of truth for the complete current record shape.

Illustrative response:

```json
[
  {
    "course_id": "CS101",
    "course_name": "Introduction to Programming",
    "credits": 4,
    "skills": ["Python", "Programming Logic"],
    "resources": [
      {
        "name": "Example learning resource",
        "url": "https://example.com/resource"
      }
    ]
  }
]
```

The resource URL above is a placeholder example, not a supplied project resource.

### 5.2 Get course resources

`GET /courses/{course_id}/resources`

Path parameter:
- `course_id`: string; lookup is case-insensitive in the shared route implementation.

Illustrative response:

```json
{
  "course_id": "CS101",
  "course_name": "Introduction to Programming",
  "resources": [
    {
      "name": "Resource name from course data",
      "url": "https://actual-resource-url.example"
    }
  ]
}
```

The resource name and URL must come from the course data. The frontend must not invent or construct resource links.

Errors:
- `404`: course does not exist.
- `422`: invalid path parameter.

### 5.3 Check prerequisites

`GET /courses/{course_id}/prerequisites`

Path parameter:
- `course_id`: string

Optional query parameter:
- `completed_courses`: string; default is an empty string. The shared implementation accepts comma-separated completed course IDs/names.

Example:

```text
GET /courses/CS102/prerequisites?completed_courses=CS101,MA101
```

Illustrative response:

```json
{
  "course_id": "CS102",
  "course_name": "Data Structures and Algorithms",
  "valid": true,
  "missing_prerequisites": [],
  "message": "All prerequisites completed"
}
```

If prerequisites are missing, `valid` is false and `missing_prerequisites` identifies what is missing. The exact message is generated by the backend.

**Eligibility rule:** The backend's prerequisite checker is authoritative. A course that is blocked must not be presented as currently eligible to start merely because the frontend thinks it should be.

Errors:
- `404`: course does not exist (if returned by the route).
- `422`: invalid parameter format.

---

## 6. Quiz workflow

The intended frontend flow is:

1. Fetch the quiz for a course.
2. Render only the returned question text and options.
3. Store the learner's selected option values keyed by question ID.
4. Submit `{ course_id, answers }` to the student's quiz-submit endpoint.
5. Display the returned score/status.
6. Refresh quiz history, mastery, recommendations, and dashboard data as appropriate.

### 6.1 Fetch quiz questions

`GET /courses/{course_id}/quiz`

Path parameter:
- `course_id`: string

Illustrative response:

```json
{
  "course_id": "CS101",
  "total_questions": 4,
  "questions": [
    {
      "id": "CS101_Q1",
      "skill": "Python",
      "difficulty": "easy",
      "question": "Question text from the course quiz data",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      }
    }
  ]
}
```

The endpoint deliberately does **not** return `correct_answer` or `explanation`. Never expose answer keys in the frontend before submission.

Errors:
- `404`: no quiz questions are available for that course.
- `422`: invalid path parameter.

### 6.2 Submit quiz answers

`POST /students/{student_id}/quiz/submit`

Path parameter:
- `student_id`: integer

Request body — `QuizSubmission`:

```json
{
  "course_id": "CS101",
  "answers": {
    "CS101_Q1": "B",
    "CS101_Q2": "A"
  }
}
```

Rules from the shared route implementation:
- `course_id` is a string.
- `answers` maps question IDs to selected option keys.
- Submitted question IDs must belong to that course.
- Answer keys must be valid option keys (A–D).
- The route accepts partial answer submissions; it does not require every question to be answered.
- The current scoring function calculates the percentage against the **full question count for the course**, not only the number submitted. Therefore, unanswered questions do not contribute correct answers and affect the percentage denominator.

Illustrative success response:

```json
{
  "message": "Quiz submitted successfully",
  "student_id": 3,
  "course_id": "CS101",
  "answers_received": 2,
  "correct_answers": 1,
  "total_questions": 4,
  "score_percentage": 25.0,
  "attempt_id": 1,
  "status": "..."
}
```

The exact `status` value should be read from a live response; do not hardcode an assumed set of labels.

Errors:
- `404`: student does not exist or quiz data is unavailable.
- `400`: submitted question ID is invalid or answer key is invalid.
- `422`: malformed request body.

### 6.3 Get quiz history

`GET /students/{student_id}/quiz/history`

Path parameter:
- `student_id`: integer

Illustrative response:

```json
{
  "student_id": 3,
  "total_attempts": 1,
  "attempts": [
    {
      "attempt_id": 1,
      "course_id": "CS101",
      "score": 25.0,
      "total_questions": 4,
      "answers": {
        "CS101_Q1": "B",
        "CS101_Q2": "A"
      },
      "created_at": "2026-11-12T10:00:00"
    }
  ]
}
```

Errors:
- `404`: student does not exist.
- `422`: invalid path parameter.

---

## 7. Mastery, recommendations, planning, and dashboard

### 7.1 Get mastery

`GET /students/{student_id}/mastery`

Path parameter:
- `student_id`: integer

Illustrative response:

```json
{
  "student_id": 3,
  "total_attempts": 1,
  "how_calculated": "Explanation supplied by the backend",
  "skills": {
    "Python": {
      "mastery_percent": 50.0,
      "level_0_to_5": 2.5,
      "status": "developing",
      "questions_answered": 2,
      "questions_correct": 1,
      "evidence_confidence": "low"
    }
  }
}
```

Mastery is derived from quiz evidence. In the shared implementation:
- Difficulty weights are easy = 1, medium = 2, hard = 3.
- Older attempts receive a recency multiplier of `0.7` per attempt position behind the newest attempt.
- Status bands are beginner (<40%), developing (<70%), proficient (<90%), and mastered (90% or above).
- Evidence confidence is low for fewer than 3 answered questions, medium for fewer than 6, and high otherwise.

Errors:
- `404`: student does not exist.
- `422`: invalid path parameter.

### 7.2 Get recommendations

`GET /students/{student_id}/recommendations`

Path parameter:
- `student_id`: integer

Requires a student and an assessment.

Illustrative response:

```json
{
  "student_id": 3,
  "next_step": {
    "course_id": "MA101",
    "course_name": "Calculus",
    "action": "take_quiz"
  },
  "recommended_courses": [],
  "review_completed": [],
  "blocked_courses": []
}
```

The actual nested fields should be read from the live response. The shared implementation uses deterministic skill levels and prerequisite checks. It may recommend actions such as `take_quiz`, `study_resources`, or `practise_quiz`.

Errors:
- `404`: student does not exist or assessment is missing.
- `422`: invalid path parameter.

### 7.3 Generate learning plan

`POST /students/{student_id}/generate-plan`

Path parameter:
- `student_id`: integer

No request body is defined in the OpenAPI specification.

Illustrative response:

```json
{
  "message": "Learning plan generated successfully",
  "student_id": 3,
  "student_name": "Alex",
  "plan": {
    "available_hours": 15,
    "weekly_plan": []
  }
}
```

The shared planner:
- Excludes completed courses.
- Checks prerequisites before considering a course eligible.
- Prioritises courses by the total skill gap.
- Applies a maximum of 10 allocated hours per course.
- Distributes allocated hours across weekdays (Monday–Friday).

Errors:
- `404`: student does not exist or assessment is missing.
- `422`: invalid path parameter.

### 7.4 Get dashboard

`GET /students/{student_id}/dashboard`

Path parameter:
- `student_id`: integer

This endpoint combines student information, assessment-derived skill information, recommendations, plan summary, quiz history, and an explanation.

Illustrative response shape when an assessment exists:

```json
{
  "student": {
    "id": 3,
    "name": "Alex",
    "programme": "BTech Computer Science",
    "year": 1,
    "goal": "Build strong programming fundamentals",
    "completed_courses": ["CS101"]
  },
  "has_assessment": true,
  "skills": [],
  "skill_gaps": [],
  "next_step": {},
  "recommended_courses": [],
  "review_completed": [],
  "blocked_courses": [],
  "plan_summary": {
    "available_hours": 15,
    "allocated_hours": 15,
    "courses": []
  },
  "explanation": {
    "text": "Explanation text generated by the backend.",
    "source": "template"
  },
  "total_quiz_attempts": 0,
  "recent_quiz_history": []
}
```

When there is **no assessment**, the shared dashboard implementation returns:
- `has_assessment: false`
- a message explaining that an assessment is needed
- `explanation: null`
- empty arrays for skills, skill gaps, recommendations, review-completed courses, and blocked courses
- `next_step: null`
- `plan_summary: null`
- quiz attempt count and recent quiz history are still included

Illustrative no-assessment response:

```json
{
  "student": {
    "id": 4,
    "name": "New Student",
    "programme": "BTech",
    "year": 1,
    "goal": "Explore interests",
    "completed_courses": []
  },
  "has_assessment": false,
  "message": "Please complete your assessment to generate your personalised dashboard.",
  "explanation": null,
  "skills": [],
  "skill_gaps": [],
  "next_step": null,
  "recommended_courses": [],
  "review_completed": [],
  "blocked_courses": [],
  "plan_summary": null,
  "total_quiz_attempts": 0,
  "recent_quiz_history": []
}
```

**Explanation source:**
- `source: "ai"` means the AI rewrite succeeded.
- `source: "template"` means the deterministic template was used, including when the API key is absent or the AI request fails.
- The dashboard should render `explanation.text` when an explanation object exists. It must also handle `explanation: null`.
- The Anthropic key is a backend-only optional secret. Never put it in frontend code or a `VITE_` variable.

Errors:
- `404`: student does not exist.
- `422`: invalid path parameter.

---

## 8. Error handling

| HTTP status | Meaning | Frontend behavior |
|---|---|---|
| 200 | Request succeeded | Parse and render response |
| 400 | Route-level invalid input (for example, invalid quiz question/answer) | Show a useful validation message; allow correction |
| 404 | Requested student/course/assessment/quiz data not found | Show an appropriate empty/not-found state |
| 422 | FastAPI request validation failed | Check the request shape and field constraints |
| 500 | Unexpected server error | Show a generic retry message; do not expose stack traces |

FastAPI validation error shape (illustrative):

```json
{
  "detail": [
    {
      "loc": ["body", "year"],
      "msg": "Input should be less than or equal to 8",
      "type": "less_than_equal"
    }
  ]
}
```

The exact message and `type` depend on the validation failure and installed Pydantic version.

Recommended frontend handling:
- Check `response.ok` before assuming a request succeeded.
- Parse the JSON error body when available.
- Do not assume every error body has the same structure; route-level HTTP errors may use a string `detail`, while validation errors use an array.
- Keep the page usable when AI explanation is unavailable.

---

## 9. Suggested frontend integration order

1. `GET /courses` to populate course lists.
2. `POST /students` or `GET /students/{student_id}` to establish the current student.
3. `POST /students/{student_id}/assessment`.
4. `GET /students/{student_id}/dashboard` to populate the main dashboard.
5. `GET /courses/{course_id}/quiz`, then `POST /students/{student_id}/quiz/submit`.
6. Refresh `GET /students/{student_id}/mastery`, `/recommendations`, `/quiz/history`, and `/dashboard` after a quiz submission.
7. Use `GET /courses/{course_id}/prerequisites` or the dashboard's `blocked_courses` data to display prerequisite status.
8. Use `POST /students/{student_id}/generate-plan` when the user requests a plan or when the UI needs a refreshed plan.

Avoid calling every endpoint repeatedly if the dashboard response already contains the data needed for the current screen.

---

## 10. Live verification checklist

Before the frontend developer finalises integration, use Swagger at `http://127.0.0.1:8000/docs` and verify:

- [ ] `GET /courses` returns the current course records.
- [ ] `POST /students` creates a test student.
- [ ] `POST /students/{id}/assessment` accepts valid 0–5 skill levels.
- [ ] Dashboard for a student without assessment has `has_assessment: false` and `explanation: null`.
- [ ] Dashboard for a student with assessment includes `explanation.text` and `explanation.source`.
- [ ] With no Anthropic key, dashboard remains successful and uses `source: "template"`.
- [ ] `GET /courses/{id}/quiz` does not reveal correct answers or explanations.
- [ ] Quiz submission rejects invalid question IDs and invalid answer keys.
- [ ] Quiz history and mastery update after a quiz attempt.
- [ ] Prerequisite response correctly identifies missing prerequisites.
- [ ] Learning plan excludes completed and prerequisite-blocked courses.

**Current AI-key status:** No Anthropic API key is configured by the project owner at this stage. Template fallback is the expected demo behavior; an API key is not required to continue local development.
