from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode
import io
import base64

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), default='General')
    capacity = db.Column(db.Integer, default=100)
    video_url = db.Column(db.String(500))
    video_file = db.Column(db.String(200))
    image_url = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    registrations = db.relationship('Registration', backref='event', lazy=True, cascade='all, delete-orphan')
    
    @property
    def registration_count(self):
        return len(self.registrations)
    
    @property
    def available_spots(self):
        return self.capacity - self.registration_count
    
    @property
    def is_full(self):
        return self.registration_count >= self.capacity

class Registration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    qr_code = db.Column(db.Text)
    registration_code = db.Column(db.String(20), unique=True, nullable=False)
    is_confirmed = db.Column(db.Boolean, default=False)
    checked_in = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def generate_qr_code(self):
        """Generate QR code for the registration"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr_data = f"EventHub-{self.registration_code}-{self.event_id}"
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Convert to base64 for embedding in HTML
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        self.qr_code = f"data:image/png;base64,{img_base64}"
        
    def __repr__(self):
        return f'<Registration {self.name} for Event {self.event_id}>'
