# GAPT Backend

This is the Node.js + Express backend for the GAPT Full Web Application.

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Create a `.env` file in the backend root (see `.env.example`).
3. Start the development server:
   ```sh
   npm run dev
   ```

## Project Structure

- `src/controllers/`   – Route handlers
- `src/models/`        – Database models
- `src/routes/`        – Express route definitions
- `src/middlewares/`   – Express middlewares
- `src/services/`      – Business logic
- `src/utils/`         – Helper functions
- `src/config/`        – Configuration files
- `tests/`             – Unit/integration tests

## API
All endpoints are prefixed with `/api`.

---

For more details, see the code and comments in each folder.
