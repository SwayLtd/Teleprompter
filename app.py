from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_socketio import SocketIO, emit, join_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import random, string

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'bewr_prompter'

# Initialize SocketIO
socketio = SocketIO(app)

# Initialize the limiter
limiter = Limiter(app=app, key_func=get_remote_address)

# A dictionary to store the state data
room_state = {}

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
    room_state[room_id] = {'room_name': room_name}
    return jsonify({'redirect_url': url_for('room', room_id=room_id)})

# Route to join a specific room
@app.route('/r/<room_id>')
@limiter.limit("100/minute")
def room(room_id):
    if room_id not in room_state:
        return redirect(url_for('room_not_found'))
    room_name = room_state[room_id].get('room_name', 'Unnamed Room')
    return render_template('room.html', room_id=room_id, room_name=room_name)

# Socket event when a user joins a room
@socketio.on('join_room')
def on_join(data):
    room_id = data['room_id']
    join_room(room_id)
    if room_id in room_state:
        emit('update_properties', room_state[room_id])

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
    if room_id in room_state:
        return jsonify(room_state[room_id])
    else:
        return jsonify({})

# Socket event when a user updates the properties of a room
@socketio.on('properties_updated')
def handle_properties_update(data):
    room_id = data['room_id']
    if room_id in room_state:
        room_state[room_id].update(data)  # Update the existing room state with the new properties
    else:
        room_state[room_id] = data  # Create a new room state if it doesn't exist
    emit('update_properties', data, room=room_id, include_self=False)

# Run the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
    # socketio.run(app)
