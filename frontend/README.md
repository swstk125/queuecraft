# QueueCraft Dashboard

A modern, responsive dashboard UI for QueueCraft - Distributed Task Queue & Job Processor.

## 🎯 Features

### Core Functionality
- **Job Status Overview**: Real-time monitoring of Pending, Running, Completed, and Failed jobs
- **Interactive Dashboard**: Click-through drill-down from summary cards to detailed job lists
- **DLQ Viewer**: Dedicated interface for Dead Letter Queue management
- **Job Details**: Comprehensive view of individual job information
- **Job Creation**: Create new jobs directly from the dashboard
- **Real-time Updates**: Manual and auto-refresh capabilities

### UI/UX Highlights
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **Modern Design**: Clean, minimal interface with enterprise-grade styling
- **Color-Coded Status**: Intuitive visual indicators for job states
- **Sortable Tables**: Click column headers to sort jobs
- **Status Filtering**: Quick filters to view specific job categories
- **Loading States**: Smooth loading indicators and skeleton screens
- **Error Handling**: Graceful error messages with retry options

## 🏗️ Architecture

### Folder Structure
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── StatusBadge.jsx  # Color-coded status indicators
│   │   ├── SummaryCard.jsx  # Dashboard summary cards
│   │   ├── JobTable.jsx     # Sortable job listing table
│   │   ├── DLQTable.jsx     # Dead Letter Queue table
│   │   └── Layout.jsx       # Main layout with navigation
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx    # Main dashboard page
│   │   ├── DLQViewer.jsx    # DLQ management page
│   │   ├── JobDetails.jsx   # Individual job details
│   │   └── Login.jsx        # Authentication page
│   ├── services/            # API service layer
│   │   ├── api.js           # Axios instance with interceptors
│   │   ├── jobService.js    # Job-related API calls
│   │   └── authService.js   # Authentication API calls
│   ├── context/             # React Context providers
│   │   └── AuthContext.jsx  # Authentication state management
│   ├── hooks/               # Custom React hooks
│   │   └── useJobs.js       # Jobs data fetching hook
│   ├── utils/               # Utility functions
│   │   └── dateUtils.js     # Date formatting utilities
│   ├── App.jsx              # Main app component with routing
│   ├── main.jsx             # Application entry point
│   └── index.css            # Global styles with Tailwind
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

### Tech Stack
- **React 18.2**: Modern React with hooks
- **Vite 5.0**: Fast build tool and dev server
- **React Router 6**: Client-side routing
- **Axios**: HTTP client with interceptors
- **Tailwind CSS 3.3**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Backend server running on `http://localhost:2000`

### Installation

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file** (optional):
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   ```
   http://localhost:3000
   ```

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint
```

## 🔌 Backend Integration

### API Endpoints Used

The dashboard integrates with the following backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/login` | POST | User authentication |
| `/user/create` | POST | Create new user |
| `/job` | GET | Fetch all jobs (with filters) |
| `/job/create` | POST | Create new job |
| `/sync` | GET | Health check |

### API Configuration

The frontend uses Vite's proxy feature in development:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:2000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

For production, set the `VITE_API_URL` environment variable:

```bash
VITE_API_URL=https://your-api-domain.com
```

## 🎨 Component Documentation

### StatusBadge
Color-coded badge component for job status display.

```jsx
<StatusBadge status="pending" size="md" showIcon={true} />
```

**Props:**
- `status`: 'pending' | 'running' | 'completed' | 'dlq'
- `size`: 'sm' | 'md' | 'lg'
- `showIcon`: boolean

### SummaryCard
Dashboard summary card with icon and optional trend indicator.

```jsx
<SummaryCard
  title="Pending Jobs"
  value={5}
  icon={Clock}
  color="yellow"
  trend={10}
  onClick={() => {}}
/>
```

**Props:**
- `title`: string
- `value`: number
- `icon`: Lucide icon component
- `color`: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
- `trend`: number (optional)
- `onClick`: function (optional)

### JobTable
Sortable table component for displaying job lists.

```jsx
<JobTable 
  jobs={jobsArray} 
  loading={false} 
  onRefresh={() => {}} 
/>
```

**Props:**
- `jobs`: Array of job objects
- `loading`: boolean
- `onRefresh`: function (optional)

### DLQTable
Specialized table for Dead Letter Queue jobs with detail modal.

```jsx
<DLQTable jobs={dlqJobs} onRetry={(job) => {}} />
```

**Props:**
- `jobs`: Array of DLQ job objects
- `onRetry`: function (optional)

## 🔐 Authentication

### Login Flow
1. User enters email and password
2. Frontend calls `/login` endpoint
3. Backend returns JWT token
4. Token stored in localStorage
5. Token added to all subsequent API requests via axios interceptor
6. On 401 response, user redirected to login

### Creating a User
Before logging in, create a user via:

```bash
curl -X POST http://localhost:2000/user/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

Then login with:
- Email: `admin@example.com`
- Password: `admin123`

## 📊 Mock Data Support

The dashboard includes mock data fallback for development without a backend:

```javascript
// .env
VITE_USE_MOCK_DATA=true
```

Mock data provides:
- 5 sample jobs across different statuses
- Realistic timestamps and metadata
- Full CRUD simulation

## 🎯 Key Features Explained

### Dashboard Overview
- **Summary Cards**: Quick overview of job counts by status
- **Status Filters**: Toggle between all jobs or filter by specific status
- **Sortable Columns**: Click headers to sort by name, status, retry count, or dates
- **Create Job Modal**: Quick job creation with validation and error handling
- **Responsive Grid**: Adapts from 4 columns (desktop) to 1 column (mobile)

### DLQ Viewer
- **Failed Jobs List**: All jobs that exceeded retry limits
- **Detail Modal**: Click any job to view complete information
- **Visual Warnings**: Clear indicators that manual intervention needed
- **Guidance Panel**: Helpful information about DLQ management

### Job Details Page
- **Comprehensive View**: All job metadata in organized sections
- **Status Warnings**: Special alerts for failed jobs
- **Raw Data View**: JSON display for debugging
- **Quick Navigation**: Easy return to dashboard or DLQ viewer

## 🎨 Styling & Theming

The dashboard uses Tailwind CSS with a custom color palette:

```javascript
// Primary colors (blue theme)
primary: {
  50: '#eff6ff',
  500: '#3b82f6',
  600: '#2563eb',
  900: '#1e3a8a',
}
```

### Status Colors
- **Pending**: Yellow (`bg-yellow-100 text-yellow-800`)
- **Running**: Blue (`bg-blue-100 text-blue-800`)
- **Completed**: Green (`bg-green-100 text-green-800`)
- **Failed/DLQ**: Red (`bg-red-100 text-red-800`)

### Responsive Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md-lg)
- **Desktop**: > 1024px (lg+)

## 🔧 Customization

### Changing API URL
```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://your-backend:port',
    // ...
  }
}
```

### Adjusting Auto-Refresh
```javascript
// In Dashboard.jsx or any component
const { jobs, stats, refetch } = useJobs({
  autoRefresh: true,
  refreshInterval: 10000, // 10 seconds
})
```

### Custom Status Colors
```javascript
// src/components/StatusBadge.jsx
const statusConfig = {
  pending: {
    color: 'bg-purple-100 text-purple-800', // Your custom color
    // ...
  }
}
```

## 🐛 Troubleshooting

### Backend Connection Issues
```
Error: Network Error
```
**Solution**: Ensure backend server is running on port 2000:
```bash
cd ..
node appServer.js
```

### CORS Errors
**Solution**: Backend should include CORS middleware (already configured in this repo)

### Authentication Issues
```
Error: 401 Unauthorized
```
**Solution**: 
1. Create a user first via `/user/create`
2. Login with correct credentials
3. Check that JWT token is being sent in headers

### Build Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📱 Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### Deployment Options

#### Static Hosting (Netlify, Vercel, etc.)
```bash
# Build
npm run build

# Deploy dist folder
# Configure environment variables in hosting platform
```

#### Docker
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables for Production
```bash
VITE_API_URL=https://api.yourdomain.com
```

## 📄 License

This project is part of the QueueCraft repository. See the main repository for license information.

## 🤝 Contributing

This is a complete, production-ready implementation. For enhancements:

1. Follow the existing component structure
2. Use Tailwind CSS for styling
3. Maintain responsive design principles
4. Add proper error handling
5. Include loading states

## 📞 Support

For issues or questions:
- Check the main QueueCraft README
- Review the backend API documentation
- Inspect browser console for errors
- Verify backend server is running

---

**Built with ❤️ using React, Vite, and Tailwind CSS**

