# Intelligent Examination Paper Generation Framework Using RAG & Semantic Question Analysis

A modern, responsive full-stack web application for automated, syllabus-oriented university examination paper generation using **Retrieval-Augmented Generation (RAG)**, **Natural Language Processing (NLP)**, and **Semantic Question Analysis**.

---

## Key Highlights & Core Capabilities

1. **Document Ingestion & Multi-Format Parsing (Module 2)**
   - Upload academic curriculum materials in **PDF**, **DOCX**, and **TXT** formats up to 25MB.
   - Extracts clean text while mapping syllabus units, course codes, and academic years.
   - Preserves document integrity and tracks processing states (`Uploaded` → `Processing` → `Indexed` → `Error`).

2. **Retrieval-Augmented Generation (RAG) Architecture (Module 3)**
   - Sentence/paragraph boundary-aware chunking (~600 characters with 100-character overlap).
   - Generates normalized dense vector embeddings stored persistently in SQLite with WAL performance indexing.
   - Vector similarity retrieval ranks grounded chunks using cosine similarity before generating questions.
   - Zero hallucination: questions are grounded in syllabus documents with traceable chunk citations.

3. **AI-Based Question Generation (Module 4)**
   - Supports 4 distinct academic question formats:
     - **Multiple Choice Questions (MCQ)** with 4 plausible options, correct key, and distractor rationale.
     - **Short Answer Questions** (2–4 marks) with key criteria.
     - **Long Answer Questions** (5–10 marks) with structured solution breakdown.
     - **Descriptive Questions** (12–16 marks) with comprehensive multi-tier grading rubrics.
   - Grounded in retrieved academic chunks with source document references.

4. **Semantic Question Analysis & Duplicate Detection (Module 5)**
   - Dense cosine vector comparison captures conceptual equivalence across differing surface text:
     - e.g., *"Define cloud computing."* vs *"What is meant by cloud computing?"* $\rightarrow$ **94% conceptual similarity match**.
   - Near-duplicate threshold ($\ge 0.78$) automatically flags conceptual redundancies in the Question Bank.
   - Interactive Pairwise Comparator, Question Bank duplicate scanner, and $N \times N$ similarity matrix heatmap.
   - Faculty controls to **Retain**, **Edit**, or **Discard** candidate questions.

5. **Bloom's Revised Taxonomy Classification (Module 6)**
   - Classifies questions across all 6 cognitive tiers:
     1. **Remember** (Recall & definition)
     2. **Understand** (Comprehension & explanation)
     3. **Apply** (Application & calculation)
     4. **Analyze** (Categorization & differentiation)
     5. **Evaluate** (Critical assessment & justification)
     6. **Create** (Architectural design & synthesis)
   - Visual cognitive distribution bars across the Question Bank.

6. **Psychometric Difficulty Calibration (Module 7)**
   - Tri-level classification (**Easy**, **Medium**, **Hard**) evaluated by cognitive verb, syntactic complexity, and marks.
   - Faculty override controls to adjust difficulty anytime.

7. **Centralized Question Bank (Module 8)**
   - Real-time search, multi-filtering (subject, unit, difficulty, Bloom's level, status, duplicates).
   - Full CRUD, inline editing, model answer inspection, approval, and rejection workflows.

8. **Automated Examination Paper Assembly (Module 9)**
   - Multi-section blueprint wizard (Part A, Part B, Part C) with customizable marks per question and counts.
   - Optimization engine satisfies:
     - Exact total marks validation.
     - Multi-unit syllabus coverage balance.
     - Difficulty & Bloom's taxonomy proportions.
     - **Strict avoidance of semantic duplicates** ($\text{similarity} < 0.70$) so no two conceptually identical questions ever appear on the same paper.

9. **Export & Solution Scheme Generation (Module 10)**
   - **Download Paper as PDF**: Institutional header, duration, max marks, candidate instructions, numbered questions with right-aligned marks.
   - **Download Paper as DOCX**: Microsoft Word format with tables and formatting.
   - **Official Answer Key / Solution Scheme**: Exportable in both PDF and DOCX with marking scheme and source citations.
   - **Print-Ready Layout**: In-browser print stylesheet (`@media print`).

10. **Role-Based Access Control & Administrator Portal (Module 1)**
    - Secure JWT authentication with bcrypt password hashing.
    - Persona switcher:
      - **Faculty Member**: `faculty@university.edu` / `faculty123`
      - **Administrator**: `admin@university.edu` / `admin123`
    - User management, system audit trail, and engine diagnostics.

---

## Project Structure

```
intelligent-exam-generator/
├── client/                     # React 19 + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # User management, audit logs, system stats
│   │   │   ├── analysis/       # Semantic comparator, duplicate scanner, matrix
│   │   │   ├── dashboard/      # Faculty analytics dashboard & charts
│   │   │   ├── documents/      # File upload & vector chunks inspector
│   │   │   ├── exams/          # Blueprint wizard, preview, PDF/DOCX export
│   │   │   ├── generation/     # RAG question generator & evidence viewer
│   │   │   ├── layout/         # Navbar, sidebar, notifications
│   │   │   ├── questionBank/   # Search, filters, edit modal, approval
│   │   │   └── settings/       # API keys, threshold sliders
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── services/           # api.ts (REST client)
│   │   └── types/              # TypeScript definitions
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/             # node:sqlite WAL DB & academic seeding
│   │   ├── middleware/         # JWT auth & admin guards
│   │   ├── routes/             # Auth, documents, questions, exams, admin, settings
│   │   └── services/
│   │       ├── auditService.js             # Audit logging
│   │       ├── documentExtractor.js        # PDF, DOCX, TXT parser & chunker
│   │       ├── examAssemblerService.js     # Constraint satisfaction assembly
│   │       ├── exportService.js            # PDFKit & docx document exporters
│   │       ├── ragGeneratorService.js      # RAG generator & Bloom's classifier
│   │       ├── semanticAnalysisService.js  # Cosine duplicate detector & matrix
│   │       └── vectorService.js            # Dense embeddings & vector search
└── package.json
```

---

## Getting Started

### 1. Default Access Accounts
- **Faculty Account**: `faculty@university.edu` / `faculty123`
- **Administrator Account**: `admin@university.edu` / `admin123`
*(A quick one-click persona switcher is always visible in the top navigation bar).*

### 2. Running the Servers
- **Full-Stack Application**: Accessible on `http://localhost:5000` (Backend API + Built React Client)
- **Vite Development Live-Reload Server**: Accessible on `http://localhost:5173` (with `/api` proxy to port 5000)

```bash
# Start backend server
node server/src/server.js

# Start frontend dev server
cd client
npm run dev
```
