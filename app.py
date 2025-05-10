"""
Main application file for Sway Prompter.
All code, comments, and docstrings must be in English.
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_socketio import SocketIO, emit, join_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import OperationalError
import random
import string
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=True)
print("RAW DATABASE_URL:", os.environ.get("DATABASE_URL"))

# Initialize Flask app
app = Flask(__name__)
app.config["SECRET_KEY"] = "sway_prompter"
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # Disables modification tracking

# Initialize SocketIO
socketio = SocketIO(app)

# Initialize SQLAlchemy
print(f'DATABASE_URL: {os.getenv("DATABASE_URL")}')
db = SQLAlchemy(app)

# Initialize the limiter
limiter = Limiter(app=app, key_func=get_remote_address)


class Room(db.Model):
    """
    SQLAlchemy model for a room.
    """

    id: str = db.Column(db.String(11), primary_key=True, unique=True, nullable=False)
    room_name: str = db.Column(db.String(100), nullable=False)


def generate_random_id(length: int = 11) -> str:
    """
    Generate a random string ID for a room.
    Args:
        length (int): Length of the ID. Default is 11.
    Returns:
        str: Randomly generated ID.
    """
    allowed_chars = string.ascii_letters + string.digits + "-_"
    return "".join(random.choice(allowed_chars) for _ in range(length))


@app.route("/")
def index():
    """
    Render the index page for room creation.
    """
    return render_template("index.html")


@app.route("/create_room", methods=["POST"])
@limiter.limit("10/minute")
def create_room():
    """
    Create a new room and redirect to it.
    """
    room_name: str = request.form.get("room_name", "").strip()
    room_id: str = generate_random_id()
    new_room = Room(id=room_id, room_name=room_name)
    db.session.add(new_room)
    db.session.commit()
    return jsonify({"redirect_url": url_for("room", room_id=room_id)})


@app.route("/r/<room_id>")
@limiter.limit("100/minute")
def room(room_id: str):
    """
    Join a specific room by ID.
    """
    room = db.session.get(Room, room_id)
    if not room:
        return redirect(url_for("room_not_found"))
    return render_template("room.html", room_id=room.id, room_name=room.room_name)


@socketio.on("join_room")
def on_join(data: dict) -> None:
    """
    Handle a user joining a room via SocketIO.
    """
    room_id: str = data["room_id"]
    join_room(room_id)
    room = db.session.get(Room, room_id)
    if room:
        emit("update_properties", {"room_name": room.room_name})


@app.route("/notfound")
@limiter.limit("100/minute")
def room_not_found():
    """
    Render the 404 error page for missing rooms.
    """
    return render_template("errors/404.html"), 404


@app.route("/load_state", methods=["GET"])
@limiter.limit("100/minute")
def load_state():
    """
    Load the state of a room by ID.
    """
    room_id: str = request.args.get("room_id")
    room = db.session.get(Room, room_id)
    if room:
        return jsonify({"room_name": room.room_name})
    else:
        return jsonify({})


@socketio.on("properties_updated")
def handle_properties_update(data: dict) -> None:
    """
    Handle updates to room properties via SocketIO.
    """
    room_id: str = data["room_id"]
    room = db.session.get(Room, room_id)
    if room:
        try:
            room.room_name = data.get("room_name", room.room_name)
            db.session.commit()
        except OperationalError:
            db.session.rollback()
            # Log or handle the error as needed
    else:
        new_room = Room(id=room_id, room_name=data.get("room_name", "Unnamed Room"))
        db.session.add(new_room)
        db.session.commit()
    emit("update_properties", data, room=room_id, include_self=False)


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000)
    # socketio.run(app)
