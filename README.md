# Teamschedule

A full-stack application with Angular frontend and Apollo GraphQL backend, all running in Docker containers.

## Architecture

- **Frontend**: Angular 17 with Apollo Client
- **Backend**: Apollo GraphQL Server with TypeScript
- **Database**: PostgreSQL 16
- **Admin UI**: pgAdmin 4

All services run in Docker containers and communicate through a shared network.

## Prerequisites

- Docker Desktop installed and running
- Git (optional, for version control)

## Getting Started

### 1. Clone or Navigate to the Project

```bash
cd d:\apco\teamschedule
```

### 2. Environment Setup

The project includes default environment variables in `docker-compose.yml`. For custom configuration, create a `.env` file:

```bash
cp .env.example .env
```

### 3. Build and Start All Services

```bash
docker-compose up --build
```

This command will:
- Build the frontend and backend Docker images
- Start PostgreSQL database
- Start pgAdmin
- Start Apollo Server backend
- Start Angular frontend

### 4. Access the Applications

Once all containers are running, you can access:

- **Angular Frontend**: http://localhost:4200
- **Apollo GraphQL Server**: http://localhost:4000/graphql
- **pgAdmin**: http://localhost:5050
  - Email: `admin@teamschedule.com`
  - Password: `admin`

### 5. Configure pgAdmin (First Time Only)

1. Open pgAdmin at http://localhost:5050
2. Login with the credentials above
3. Right-click "Servers" and select "Register" > "Server"
4. In the "General" tab, give it a name (e.g., "Teamschedule DB")
5. In the "Connection" tab:
   - Host: `postgres`
   - Port: `5432`
   - Database: `teamschedule`
   - Username: `teamschedule_user`
   - Password: `teamschedule_pass`
6. Click "Save"

## Development

### Running Individual Services

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up frontend
docker-compose up backend

# Run in detached mode
docker-compose up -d
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v
```

### Rebuilding After Changes

```bash
# Rebuild specific service
docker-compose up --build backend

# Rebuild all services
docker-compose up --build
```

## Project Structure

```
teamschedule/
├── backend/                 # Apollo GraphQL Server
│   ├── src/
│   │   └── index.ts        # Server entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # Angular Application
│   ├── src/
│   │   ├── app/
│   │   │   └── app.component.ts
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── Dockerfile
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml       # Docker orchestration
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Testing the Setup

The Angular frontend includes a test component that queries the Apollo Server, which in turn tests the PostgreSQL connection. When you open http://localhost:4200, you should see:

- A greeting message from Apollo Server
- A database connection status with current timestamp

## Common Issues

### Port Already in Use

If you see port conflicts, stop any services using these ports:
- 4200 (Angular)
- 4000 (Apollo Server)
- 5432 (PostgreSQL)
- 5050 (pgAdmin)

### Frontend Can't Connect to Backend

Ensure all services are running:
```bash
docker-compose ps
```

Check backend logs:
```bash
docker-compose logs backend
```

### Database Connection Issues

1. Wait for PostgreSQL to fully start (check logs: `docker-compose logs postgres`)
2. Verify credentials in `docker-compose.yml`
3. Restart the backend: `docker-compose restart backend`

## Next Steps

- Add database migrations and schema
- Implement GraphQL queries and mutations
- Create Angular components and services
- Add authentication and authorization
- Set up production builds

## License

ISC
