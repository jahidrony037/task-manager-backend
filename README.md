# Task Manager Backend

A RESTful API backend for managing tasks efficiently.

## Features

- Create, read, update, and delete tasks
- Task categorization and prioritization
- User authentication and authorization
- Real-time task status tracking

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Database (MongoDB/PostgreSQL)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

## Running the Server

```bash
npm start
```

## API Documentation

- `GET /api/tasks` - Retrieve all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

## Testing

```bash
npm test
```

## Contributing

Pull requests are welcome. For major changes, open an issue first.

## License

## BASE URL

- https://task-manager-backend-mr5x.onrender.com/api
