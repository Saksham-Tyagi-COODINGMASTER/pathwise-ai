# IIT Dharwad curriculum integration

## Included

- Onboarding captures institute, degree, branch, admission year, current semester and curriculum version.
- Authenticated curriculum endpoints:
  - `GET /curriculum/options`
  - `GET /curriculum/me`
  - `PUT /curriculum/progress/{course_key}`
- Per-student course completion tracking, isolated by the authenticated student's profile.
- Dashboard curriculum view with semester groups, completion tracking and credit progress.
- Nullable database fields preserve compatibility with existing student profiles.

## Catalogue coverage

The catalogue now contains **428 course and elective-slot rows across 10 curriculum records**: the nine current branch choices plus a separate historical EE 2023 record. The 2023 EE curriculum is not assigned as the current EE curriculum. The current EE branch remains Semester-I-only until a newer EE source is provided. ECE, EEE and EE Semester I follow the shared course-list instruction.

Semesters II–VIII were extracted from the supplied PDFs. Named courses with readable codes and credits are represented individually. Source-defined elective, project and BTP allocations without fixed course identities are represented as `pending_configuration` slots; they are not falsely presented as specific courses. Rows with missing/placeholder codes and unresolved source variants remain pending verification.

### Credit discrepancies

The catalogue enforces one canonical credit value per course code. These source discrepancies are recorded and their credits withheld pending official confirmation:

- `CS101C`: 8 vs 9 credits (ECE vs CSE and other supplied curriculum PDFs).
- `HS101T`: PP/NP in most PDFs vs 1 credit in Mechanical Engineering.
- `CS201C`: 6 vs 9 credits.
- `EE205T`: 3 vs 6 credits.
- `EE302C`: 3 vs 6 credits.
- `ME101C`: 5 vs 6 credits.

The EEE PDF contains two Semester IV table variants; affected rows are flagged for confirmation. Some PDFs omit course codes or use placeholders, and these are not silently assigned invented codes.

## Validation

Run from `backend`:

```bash
python validate_curriculum.py
```

The validator checks JSON structure, required fields, semester range and duplicate course keys. It does not replace official review of flagged source discrepancies.

## Database migration

1. Back up `backend/pathwise.db`.
2. Open a terminal in `backend` with the project's Python environment activated.
3. Run:

   ```bash
   python migrate_curriculum.py
   ```

4. Start the backend normally. `create_all()` creates the progress table if needed; the migration adds nullable columns to the existing `students` table.

The migration is idempotent. Do not delete the existing database.

## Run the app

Backend (from `backend`):

```bash
uvicorn main:app --reload
```

Frontend (from `frontend`):

```bash
npm install
npm run dev
```

## API behavior

- Curriculum endpoints require the existing JWT bearer token.
- Students can only read/update their own curriculum progress.
- Courses awaiting verification or configuration are visible but cannot be marked complete.
- The JSON catalogue is the source of truth; do not infer missing codes or credits.

## Known limitation

Admission year and curriculum version are stored on the student profile, but the present catalogue assignment still selects by branch. Before production use, add an explicit admission-year-to-curriculum-version mapping and require a confirmed version where multiple versions exist. Do not silently migrate existing students between curriculum versions.
