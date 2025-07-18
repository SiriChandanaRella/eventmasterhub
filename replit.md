# EventMasterHub

## Overview

EventMasterHub is a Flask-based event management web application that allows administrators to create, manage, and track events while enabling users to browse, register for, and view events through multiple interfaces including a calendar view. The application features a modern dark-themed interface with Bootstrap styling and comprehensive event management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

EventMasterHub follows a traditional MVC (Model-View-Controller) pattern using Flask as the web framework. The application is structured as a monolithic web application with server-side rendering using Jinja2 templates.

### Core Architecture Components:
- **Web Framework**: Flask with SQLAlchemy ORM
- **Database**: SQLite (configurable to other databases via DATABASE_URL)
- **Frontend**: Server-side rendered HTML templates with Bootstrap 5 dark theme
- **Email Service**: Flask-Mail with SMTP configuration
- **File Storage**: Local file system for uploaded videos and images

## Key Components

### Backend Components

1. **Application Factory** (`app.py`)
   - Flask application initialization
   - Database and mail service configuration
   - Environment-based configuration management
   - Proxy fix middleware for deployment

2. **Data Models** (`models.py`)
   - `Admin`: User authentication and management
   - `Event`: Core event entity with capacity tracking
   - `Registration`: User event registrations (referenced but not fully implemented)

3. **Routes** (`routes.py`)
   - Public routes for event browsing and registration
   - Admin authentication and dashboard
   - Event CRUD operations
   - Email notification system

### Frontend Components

1. **Template System**
   - Base template with Bootstrap dark theme
   - Responsive design with mobile support
   - Component-based template inheritance
   - Font Awesome icons integration

2. **Static Assets**
   - Custom CSS for enhanced styling
   - JavaScript utilities for calendar and form handling
   - FullCalendar integration for event visualization

3. **User Interfaces**
   - Public event browsing and registration
   - Admin dashboard with statistics
   - Calendar view for event visualization
   - Event detail and management pages

## Data Flow

### Event Management Flow:
1. Admin logs in through authentication system
2. Admin creates/edits events through form interfaces
3. Events are stored in SQLite database with metadata
4. Public users browse events through list/calendar views
5. Users register for events with email confirmation

### Registration Flow:
1. User selects event and fills registration form
2. System generates unique registration code
3. Registration data stored in database
4. Confirmation email sent via Flask-Mail
5. Success page displayed with registration details

## External Dependencies

### Python Packages:
- **Flask**: Web framework and routing
- **SQLAlchemy**: Database ORM and migrations
- **Flask-Mail**: Email sending capabilities
- **qrcode**: QR code generation for events
- **Werkzeug**: Security utilities and file handling

### Frontend Libraries:
- **Bootstrap 5**: UI framework with dark theme
- **Font Awesome**: Icon library
- **FullCalendar**: Calendar widget for event display

### Infrastructure Dependencies:
- **SMTP Server**: Email delivery (configurable, defaults to Gmail)
- **File System**: Local storage for uploaded media
- **Database**: SQLite by default, PostgreSQL/MySQL via environment configuration

## Deployment Strategy

### Environment Configuration:
- Environment variables for sensitive data (database URL, email credentials, session secrets)
- Development defaults with production overrides
- Upload folder and file size limit configuration

### File Structure:
- Templates in `/templates` directory
- Static assets in `/static` directory
- Uploaded files in `/uploads` directory
- SQLite database file in project root

### Production Considerations:
- ProxyFix middleware for reverse proxy deployment
- Configurable database pooling and connection management
- File upload size limits and security
- Session secret key management

The application is designed for easy deployment on platforms like Replit, Heroku, or traditional web servers with minimal configuration changes required.