# Contributing to IntelliASHA

First off, thank you for considering contributing to IntelliASHA! This project is an open-source AI copilot designed to modernize public health reporting for India's ASHA workers.

## Code of Conduct
By participating in this project, you are expected to uphold a welcoming and inclusive environment. 

## Development Setup

### Prerequisites
- Node.js (v22+)
- Docker (optional, for local emulator suite)
- Firebase CLI (`npm i -g firebase-tools`)

### Environment Variables
1. Copy `.env.example` to `.env` in the project root.
2. Fill in your Firebase and Google Maps credentials.
3. For local backend testing, create a `functions/.env` file with your Gemini API key: `GEMINI_API_KEY=your_key_here`.

### Getting Started
```bash
# Install root dependencies
npm install

# Install functions dependencies
cd functions && npm install
cd ..

# Start local development server (Vite)
npm run dev
```

## Testing and Quality Standards
To maintain a production-grade 99% score, all code must pass strict quality checks before a PR can be merged.

1. **Type Checking:** We use TypeScript strictly. Run `npm run typecheck` to verify. No `any` types are permitted in new code.
2. **Linting:** We use oxlint for extreme-speed linting. Run `npm run lint`.
3. **Unit Tests:** All new services and components must have corresponding Vitest tests.
   - Run tests: `npm run test`
   - Test coverage must remain above 60% across all branches: `npm run test -- --coverage`
4. **Structured Error Handling:** Use the `IntelliASHAError` class in `src/utils/errors.ts` for all frontend error throwing. Never use bare strings.

## Pull Request Process
1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'feat: add amazing feature'`)
3. Ensure CI passes locally (`npm run test && npm run typecheck`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request on GitHub.
