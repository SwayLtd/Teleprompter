from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_socketio import SocketIO, emit, join_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import OperationalError
import random, string, os
# import redis used for caching to improve performance for the future

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'bewr_prompter'
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Disables modification tracking

# Initialize SocketIO
socketio = SocketIO(app)

# Initialize SQLAlchemy
print(f'DATABASE_URL: {os.getenv("DATABASE_URL")}')
db = SQLAlchemy(app)

# Initialize Redis
# r = redis.Redis(host='localhost', port=6379, db=0) used for caching to improve performance for the future

# Initialize the limiter
limiter = Limiter(app=app, key_func=get_remote_address)

class Room(db.Model):
    id = db.Column(db.String(11), primary_key=True, unique=True, nullable=False)
    room_name = db.Column(db.String(100), nullable=False)

# Function to generate a random ID with a default length of 11
def generate_random_id(length=11):
    allowed_chars = string.ascii_letters + string.digits + '-_'
    return ''.join(random.choice(allowed_chars) for _ in range(length))

# Route for the creation of a new room
@app.route('/')
def index():
    return render_template('index.html')

# Route to create a new room
@app.route('/create_room', methods=['POST'])
@limiter.limit("10/minute")
def create_room():
    room_name = request.form.get('room_name', '').strip()
    room_id = generate_random_id()
    new_room = Room(id=room_id, room_name=room_name)
    db.session.add(new_room)
    db.session.commit()
    return jsonify({'redirect_url': url_for('room', room_id=room_id)})

# Route to join a specific room
@app.route('/r/<room_id>')
@limiter.limit("100/minute")
def room(room_id):
    room = db.session.get(Room, room_id)
    if not room:
        return redirect(url_for('room_not_found'))
    return render_template('room.html', room_id=room.id, room_name=room.room_name)

# Socket event when a user joins a room
@socketio.on('join_room')
def on_join(data):
    room_id = data['room_id']
    join_room(room_id)
    room = db.session.get(Room, room_id)
    if room:
        emit('update_properties', {'room_name': room.room_name})

# used for caching to improve performance for the future
"""
def get_room(room_id):
    # Try to get the result from Redis first
    room = r.get(room_id)
    if room is None:
        # If it's not in Redis, get it from the database
        room = db.session.get(Room, room_id)
        # Then store it in Redis for next time
        r.set(room_id, room)
    return room
"""

# Route for the 404 page
@app.route('/notfound')
@limiter.limit("100/minute")
def room_not_found():
    return render_template('errors/404.html'), 404

# Route to load the state of a room
@app.route('/load_state', methods=['GET'])
@limiter.limit("100/minute")
def load_state():
    room_id = request.args.get('room_id')
    room = db.session.get(Room, room_id)
    if room:
        return jsonify({'room_name': room.room_name})
    else:
        return jsonify({})

# Socket event when a user updates the properties of a room
@socketio.on('properties_updated')
def handle_properties_update(data):
    room_id = data['room_id']
    room = db.session.get(Room, room_id)
    if room:
        try:
            room.room_name = data.get('room_name', room.room_name)
            db.session.commit()
        except OperationalError as e:
            db.session.rollback()
            # Handle or log the error as appropriate
    else:
        new_room = Room(id=room_id, room_name=data.get('room_name', 'Unnamed Room'))
        db.session.add(new_room)
        db.session.commit()
    emit('update_properties', data, room=room_id, include_self=False)

# Run the Flask app
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000)
    # socketio.run(app)
