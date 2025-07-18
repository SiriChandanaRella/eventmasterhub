from flask import render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from flask_mail import Message
from werkzeug.utils import secure_filename
from app import app, db, mail
from models import Admin, Event, Registration
from datetime import datetime, timedelta
import os
import secrets
import string
from sqlalchemy import func, extract

# Allowed file extensions
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_registration_code():
    """Generate a unique registration code"""
    characters = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(secrets.choice(characters) for _ in range(8))
        if not Registration.query.filter_by(registration_code=code).first():
            return code

def send_confirmation_email(registration):
    """Send confirmation email to registered user"""
    try:
        msg = Message(
            subject=f'Registration Confirmation - {registration.event.title}',
            recipients=[registration.email],
            html=render_template('email/registration_confirmation.html', registration=registration)
        )
        mail.send(msg)
        return True
    except Exception as e:
        app.logger.error(f"Failed to send email: {e}")
        return False

# Public Routes
@app.route('/')
def index():
    """Homepage with featured events"""
    current_time = datetime.utcnow()
    featured_events = Event.query.filter(
        Event.is_active == True,
        Event.date > current_time
    ).order_by(Event.date.asc()).limit(6).all()
    
    return render_template('index.html', events=featured_events)

@app.route('/events')
def event_list():
    """Public event listing with search and filters"""
    search_query = request.args.get('search', '')
    category = request.args.get('category', '')
    date_filter = request.args.get('date', '')
    
    query = Event.query.filter(Event.is_active == True)
    
    if search_query:
        query = query.filter(Event.title.contains(search_query))
    
    if category:
        query = query.filter(Event.category == category)
    
    if date_filter:
        if date_filter == 'today':
            today = datetime.utcnow().date()
            query = query.filter(func.date(Event.date) == today)
        elif date_filter == 'this_week':
            start_of_week = datetime.utcnow().date() - timedelta(days=datetime.utcnow().weekday())
            end_of_week = start_of_week + timedelta(days=6)
            query = query.filter(func.date(Event.date).between(start_of_week, end_of_week))
        elif date_filter == 'this_month':
            current_month = datetime.utcnow().month
            current_year = datetime.utcnow().year
            query = query.filter(
                extract('month', Event.date) == current_month,
                extract('year', Event.date) == current_year
            )
    
    events = query.order_by(Event.date.asc()).all()
    categories = db.session.query(Event.category).distinct().all()
    categories = [cat[0] for cat in categories if cat[0]]
    
    return render_template('event_list.html', 
                         events=events, 
                         categories=categories,
                         search_query=search_query,
                         selected_category=category,
                         selected_date=date_filter)

@app.route('/calendar')
def calendar():
    """Calendar view of events"""
    events = Event.query.filter(Event.is_active == True).all()
    
    # Convert events to calendar format
    calendar_events = []
    for event in events:
        calendar_events.append({
            'id': event.id,
            'title': event.title,
            'start': event.date.isoformat(),
            'url': url_for('event_detail', event_id=event.id),
            'description': event.description[:100] + '...' if len(event.description) > 100 else event.description
        })
    
    return render_template('calendar.html', events=calendar_events)

@app.route('/event/<int:event_id>')
def event_detail(event_id):
    """Event detail page"""
    event = Event.query.get_or_404(event_id)
    return render_template('event_detail.html', event=event)

@app.route('/register/<int:event_id>', methods=['GET', 'POST'])
def register(event_id):
    """User registration for an event"""
    event = Event.query.get_or_404(event_id)
    
    if event.is_full:
        flash('Sorry, this event is fully booked!', 'error')
        return redirect(url_for('event_detail', event_id=event_id))
    
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        phone = request.form.get('phone', '')
        
        # Check if user already registered
        existing_registration = Registration.query.filter_by(
            event_id=event_id,
            email=email
        ).first()
        
        if existing_registration:
            flash('You have already registered for this event!', 'error')
            return redirect(url_for('event_detail', event_id=event_id))
        
        # Create new registration
        registration = Registration(
            event_id=event_id,
            name=name,
            email=email,
            phone=phone,
            registration_code=generate_registration_code()
        )
        
        # Generate QR code
        registration.generate_qr_code()
        
        db.session.add(registration)
        db.session.commit()
        
        # Send confirmation email
        if send_confirmation_email(registration):
            flash('Registration successful! Confirmation email sent.', 'success')
        else:
            flash('Registration successful! However, we could not send the confirmation email.', 'warning')
        
        return redirect(url_for('registration_success', registration_id=registration.id))
    
    return render_template('register.html', event=event)

@app.route('/registration_success/<int:registration_id>')
def registration_success(registration_id):
    """Registration success page"""
    registration = Registration.query.get_or_404(registration_id)
    return render_template('registration_success.html', registration=registration)

# Admin Routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin login"""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        admin = Admin.query.filter_by(username=username).first()
        
        if admin and admin.check_password(password):
            session['admin_id'] = admin.id
            session['admin_username'] = admin.username
            flash('Login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid username or password!', 'error')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_id', None)
    session.pop('admin_username', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/admin/dashboard')
def admin_dashboard():
    """Admin dashboard with analytics"""
    if 'admin_id' not in session:
        flash('Please login to access admin dashboard.', 'error')
        return redirect(url_for('admin_login'))
    
    # Get statistics
    total_events = Event.query.count()
    active_events = Event.query.filter(Event.is_active == True).count()
    total_registrations = Registration.query.count()
    
    # Recent events
    recent_events = Event.query.order_by(Event.created_at.desc()).limit(5).all()
    
    # Registration trends (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_registrations = Registration.query.filter(
        Registration.created_at >= thirty_days_ago
    ).count()
    
    # Top events by registration
    top_events = db.session.query(Event, func.count(Registration.id).label('reg_count')).join(
        Registration, Event.id == Registration.event_id
    ).group_by(Event.id).order_by(func.count(Registration.id).desc()).limit(5).all()
    
    return render_template('admin_dashboard.html',
                         total_events=total_events,
                         active_events=active_events,
                         total_registrations=total_registrations,
                         recent_events=recent_events,
                         recent_registrations=recent_registrations,
                         top_events=top_events)

@app.route('/admin/create_event', methods=['GET', 'POST'])
def create_event():
    """Create new event"""
    if 'admin_id' not in session:
        flash('Please login to access admin dashboard.', 'error')
        return redirect(url_for('admin_login'))
    
    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        date_str = request.form['date']
        location = request.form['location']
        category = request.form['category']
        capacity = int(request.form['capacity'])
        video_url = request.form.get('video_url', '')
        image_url = request.form.get('image_url', '')
        
        # Parse date
        try:
            event_date = datetime.strptime(date_str, '%Y-%m-%dT%H:%M')
        except ValueError:
            flash('Invalid date format!', 'error')
            return redirect(url_for('create_event'))
        
        # Handle video file upload
        video_file = None
        if 'video_file' in request.files:
            file = request.files['video_file']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                video_file = filename
        
        # Create event
        event = Event(
            title=title,
            description=description,
            date=event_date,
            location=location,
            category=category,
            capacity=capacity,
            video_url=video_url,
            video_file=video_file,
            image_url=image_url
        )
        
        db.session.add(event)
        db.session.commit()
        
        flash('Event created successfully!', 'success')
        return redirect(url_for('admin_dashboard'))
    
    return render_template('create_event.html')

@app.route('/admin/edit_event/<int:event_id>', methods=['GET', 'POST'])
def edit_event(event_id):
    """Edit existing event"""
    if 'admin_id' not in session:
        flash('Please login to access admin dashboard.', 'error')
        return redirect(url_for('admin_login'))
    
    event = Event.query.get_or_404(event_id)
    
    if request.method == 'POST':
        event.title = request.form['title']
        event.description = request.form['description']
        event.location = request.form['location']
        event.category = request.form['category']
        event.capacity = int(request.form['capacity'])
        event.video_url = request.form.get('video_url', '')
        event.image_url = request.form.get('image_url', '')
        
        # Parse date
        try:
            event.date = datetime.strptime(request.form['date'], '%Y-%m-%dT%H:%M')
        except ValueError:
            flash('Invalid date format!', 'error')
            return redirect(url_for('edit_event', event_id=event_id))
        
        # Handle video file upload
        if 'video_file' in request.files:
            file = request.files['video_file']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                event.video_file = filename
        
        event.updated_at = datetime.utcnow()
        db.session.commit()
        
        flash('Event updated successfully!', 'success')
        return redirect(url_for('admin_dashboard'))
    
    return render_template('edit_event.html', event=event)

@app.route('/admin/delete_event/<int:event_id>')
def delete_event(event_id):
    """Delete event"""
    if 'admin_id' not in session:
        flash('Please login to access admin dashboard.', 'error')
        return redirect(url_for('admin_login'))
    
    event = Event.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    
    flash('Event deleted successfully!', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/registrations/<int:event_id>')
def view_registrations(event_id):
    """View registrations for an event"""
    if 'admin_id' not in session:
        flash('Please login to access admin dashboard.', 'error')
        return redirect(url_for('admin_login'))
    
    event = Event.query.get_or_404(event_id)
    registrations = Registration.query.filter_by(event_id=event_id).all()
    
    return render_template('view_registrations.html', event=event, registrations=registrations)

# File serving
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# API endpoints for calendar
@app.route('/api/events')
def api_events():
    """API endpoint for calendar events"""
    events = Event.query.filter(Event.is_active == True).all()
    
    events_data = []
    for event in events:
        events_data.append({
            'id': event.id,
            'title': event.title,
            'start': event.date.isoformat(),
            'url': url_for('event_detail', event_id=event.id),
            'description': event.description[:100] + '...' if len(event.description) > 100 else event.description,
            'location': event.location,
            'category': event.category
        })
    
    return jsonify(events_data)

# Initialize admin user
def create_admin():
    """Create default admin user if none exists"""
    try:
        if not Admin.query.first():
            admin = Admin(
                username='admin',
                email='admin@eventhub.com'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            app.logger.info("Default admin user created: admin/admin123")
    except Exception as e:
        app.logger.error(f"Error creating admin user: {e}")

# Create admin user after tables are created
@app.before_request
def create_admin_once():
    """Create admin user on first request"""
    if not hasattr(app, 'admin_created'):
        create_admin()
        app.admin_created = True
