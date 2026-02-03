# Player Pro Frontend

React frontend application for the Player Pro music education platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure `VITE_API_URL` in `.env`

4. Start development server:
```bash
npm run dev
```

## Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)

## Deployment

Deploy to Render as a Static Site using the `render.yaml` configuration file.
