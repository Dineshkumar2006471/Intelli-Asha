# Security Policy

## Supported Versions

Currently, only the `main` branch (v1.0.0+) is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Security is a critical component of public health software. We take all security vulnerabilities seriously. 

If you discover a security vulnerability within IntelliASHA, please send an e-mail to the maintainer at bingitechs@gmail.com instead of using the public issue tracker. All security vulnerabilities will be promptly addressed.

### Data Privacy & HIPAA/ABHA Compliance
IntelliASHA handles sensitive Patient Health Information (PHI). 
- All LLM interactions (Gemini) must occur strictly on the server (Firebase Cloud Functions). Client-side API keys for Gemini are strictly forbidden.
- Audio transcriptions must not be permanently stored unless explicitly required and anonymised.
- Firestore Rules must strictly validate that `workerId` matches `request.auth.uid` for all writes.

### API Keys
- Do not commit API keys to version control.
- `VITE_FIREBASE_*` and `VITE_GOOGLE_MAPS_API_KEY` are safe for public clients.
- `GEMINI_API_KEY` must exclusively be stored in Google Cloud Secret Manager and accessed via Cloud Functions runtime environment variables.
