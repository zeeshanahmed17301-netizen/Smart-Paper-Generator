# Smart Paper Generator

A React, Express, and MongoDB application for teachers to organize teaching materials, build a reviewed question bank, and prepare examination papers.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB running locally, or a MongoDB connection URI

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a private `JWT_SECRET` of at least 32 characters.
3. Ensure the configured MongoDB Atlas cluster and network access rules are available. If Node's default DNS server cannot resolve Atlas SRV records, set `MONGODB_DNS_SERVERS` to the DNS server IPs configured on your machine.
4. Start both applications:

   ```sh
   npm run dev
   ```

5. Open <http://localhost:5173>. The React development server forwards `/api` requests to the Express API on port 4000.

The backend exposes `GET /api/health` for a basic health check. Authentication is available at `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`. The session token is stored in an HTTP-only cookie.

Authenticated users can upload PDF, DOCX, TXT, and Markdown materials (up to 10 MB). The backend stores extracted text and metadata in MongoDB, not the original file. Users can add questions manually from supported types: multiple choice, short answer, long answer, true/false, and fill-in-the-blank. Questions must be reviewed and approved by the teacher before use.

## Examination papers

Teachers can prepare a 50-question, 50-mark paper from approved questions in English or Urdu: 20 MCQs, 10 fill-in-the-blanks, 10 true/false questions, and 10 short-answer questions, each worth one mark. The builder reports shortages instead of silently substituting drafts. Questions are randomized for each paper, answers are excluded, and the print view can be saved as a PDF through the browser.

## Planned next phase

Multiple paper versions (A, B, C, and D), institution templates/logos, and separate answer-key exports are not implemented yet.

## Current features

- React dashboard, registration, and sign-in.
- Private per-user materials and question collections.
- Validated Express APIs for material uploads and question CRUD.
- Manual question creation with draft review, editing, approval, and deletion.
- Approved-question examination papers with shortage checks and print-to-PDF layout.
- Optional Node DNS server configuration for MongoDB SRV lookups.

## Useful commands

- `npm run dev` — start frontend and backend in development mode.
- `npm run build` — type-check and build both applications.
- `npm test` — run backend tests.

The backend fails explicitly at startup if MongoDB or required environment settings are unavailable. For deployment, use HTTPS and a strong secret supplied by your hosting platform.
