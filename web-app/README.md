# Web Application (Login Client)

Browser-based client that renders the login form and authenticates against the Authentication Service (ADR-004).

## Stack
- Static HTML / CSS / vanilla JavaScript
- Served by Nginx in production

## Configuration
Edit `config.js` (or rewrite it at deploy time) to point `API_BASE_URL` at your Authentication Service.

## Run locally
Any static server works, for example:
```bash
npx serve -l 8080 .
# or
python3 -m http.server 8080
```
Then open http://localhost:8080.

## Docker
```bash
docker build -t login-web .
docker run -p 8080:8080 login-web
```

Demo credentials (seeded by the database repo): `demo@example.com` / `password123`.
