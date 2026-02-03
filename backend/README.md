# Player Pro Backend API

Express.js REST API for the Player Pro music education platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Run database migrations:
```bash
npm run migrate
```

5. Start the server:
```bash
npm run dev  # Development
npm start    # Production
```

## Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration (default: 7d)
- `FRONTEND_URL` - Frontend URL for CORS
- `TEACHER_SERIAL_PEPPER` - Pepper for teacher serial hashing

## API Endpoints

See main README.md for API documentation.

## Database

The application uses PostgreSQL. Run migrations before starting:

```bash
npm run migrate
```

## Deployment

Deploy to Render using the `render.yaml` configuration file.
