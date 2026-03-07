import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlmodel import SQLModel, Field, create_engine, Session, select
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)  

engine = create_engine('sqlite:///tracker.db', echo=False)

SECRET_KEY = os.getenv('SECRET_KEY', 'mobilyandextrackerkey')
TOKEN_EXPIRY_DAYS = 30 

class User(SQLModel, table=True):
    user_id: int | None = Field(primary_key=True, default=None)
    username: str = Field(unique=True, index=True)
    password_hash: str
    token: str | None = Field(default=None, index=True)  # Простой токен
    token_created: datetime | None = Field(default=None)
    tracking_enabled: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Site(SQLModel, table=True):
    site_id: int | None = Field(primary_key=True, default=None)
    user_id: int = Field(foreign_key="user.user_id", index=True)
    name: str  
    domain: str  
    url_pattern: str | None = Field(default=None) 
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Visit(SQLModel, table=True):
    visit_id: int | None = Field(primary_key=True, default=None)
    user_id: int = Field(foreign_key="user.user_id", index=True)
    url: str
    domain: str
    duration: int  
    timestamp: datetime
    action: str 
    created_at: datetime = Field(default_factory=datetime.utcnow)


def generate_token():
    """Генерирует уникальный токен."""
    return str(uuid.uuid4())

def token_required(f):
    """Декоратор для проверки токена в заголовке Authorization."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Token is missing or invalid'}), 401
        token = token.split(' ')[1]
        with Session(engine) as session:
            user = session.exec(select(User).where(User.token == token)).first()
            if not user:
                return jsonify({'error': 'Invalid token'}), 401
        return f(user, *args, **kwargs)
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    """Регистрация нового пользователя."""
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    username = data['username'].strip()
    password = data['password']

    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == username)).first()
        if existing:
            return jsonify({'error': 'Username already exists'}), 409

        hashed = generate_password_hash(password)
        user = User(
            username=username,
            password_hash=hashed,
            token=generate_token(),
            token_created=datetime.utcnow()
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    return jsonify({
        'user_id': user.user_id,
        'username': user.username,
        'token': user.token,
        'tracking_enabled': user.tracking_enabled
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    """Вход пользователя, выдача токена."""
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    username = data['username'].strip()
    password = data['password']

    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid credentials'}), 401

        user.token = generate_token()
        user.token_created = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)

    return jsonify({
        'user_id': user.user_id,
        'username': user.username,
        'token': user.token,
        'tracking_enabled': user.tracking_enabled
    }), 200

@app.route('/api/sites', methods=['GET'])
@token_required
def get_sites(user):
    """Возвращает список образовательных сайтов пользователя."""
    with Session(engine) as session:
        sites = session.exec(select(Site).where(Site.user_id == user.user_id)).all()
        return jsonify([
            {
                'site_id': s.site_id,
                'name': s.name,
                'domain': s.domain,
                'url_pattern': s.url_pattern
            }
            for s in sites
        ]), 200

@app.route('/api/sites', methods=['POST'])
@token_required
def add_site(user):
    """Добавляет новый образовательный сайт для пользователя."""
    data = request.get_json()
    if not data or not data.get('name') or not data.get('domain'):
        return jsonify({'error': 'name and domain required'}), 400

    site = Site(
        user_id=user.user_id,
        name=data['name'],
        domain=data['domain'].lower().replace('www.', ''),
        url_pattern=data.get('url_pattern')
    )
    with Session(engine) as session:
        session.add(site)
        session.commit()
        session.refresh(site)

    return jsonify({'site_id': site.site_id}), 201

@app.route('/api/sites/<int:site_id>', methods=['DELETE'])
@token_required
def delete_site(user, site_id):
    """Удаляет сайт по ID (только если он принадлежит пользователю)."""
    with Session(engine) as session:
        site = session.get(Site, site_id)
        if not site or site.user_id != user.user_id:
            return jsonify({'error': 'Site not found'}), 404
        session.delete(site)
        session.commit()
    return jsonify({'message': 'Deleted'}), 200

@app.route('/api/visits', methods=['POST'])
@token_required
def add_visit(user):
    """Сохраняет одно посещение (page_view или page_exit)."""
    data = request.get_json()
    required = ['url', 'domain', 'duration', 'timestamp', 'action']
    if not data or not all(k in data for k in required):
        return jsonify({'error': f'Missing fields: {required}'}), 400

    try:
        timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
    except:
        return jsonify({'error': 'Invalid timestamp format'}), 400

    visit = Visit(
        user_id=user.user_id,
        url=data['url'],
        domain=data['domain'].lower().replace('www.', ''),
        duration=data['duration'],
        timestamp=timestamp,
        action=data['action']
    )
    with Session(engine) as session:
        session.add(visit)
        session.commit()

    return jsonify({'visit_id': visit.visit_id}), 201

@app.route('/api/visits/batch', methods=['POST'])
@token_required
def batch_visits(user):
    """Пакетное сохранение нескольких посещений (для офлайн-очереди)."""
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({'error': 'Expected a list'}), 400

    saved = 0
    with Session(engine) as session:
        for item in data:
            try:
                timestamp = datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00'))
                visit = Visit(
                    user_id=user.user_id,
                    url=item['url'],
                    domain=item['domain'].lower().replace('www.', ''),
                    duration=item['duration'],
                    timestamp=timestamp,
                    action=item['action']
                )
                session.add(visit)
                saved += 1
            except:
                # Пропускаем некорректные записи
                continue
        session.commit()

    return jsonify({'saved': saved}), 201

@app.route('/api/user/tracking', methods=['PUT'])
@token_required
def set_tracking(user):
    """Включает/выключает отслеживание для пользователя."""
    data = request.get_json()
    if 'enabled' not in data:
        return jsonify({'error': 'enabled field required'}), 400

    user.tracking_enabled = bool(data['enabled'])
    with Session(engine) as session:
        session.add(user)
        session.commit()

    return jsonify({'tracking_enabled': user.tracking_enabled}), 200

@app.route('/log', methods=['POST'])
def old_log():
    """Старый эндпоинт, оставлен для обратной совместимости."""
    pass

@app.before_first_request
def create_tables():
    SQLModel.metadata.create_all(engine)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
