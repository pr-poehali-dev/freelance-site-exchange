"""
Система аутентификации и регистрации пользователей для биржи фриланса
Обрабатывает регистрацию заказчиков и исполнителей, вход в систему и управление сессиями
"""

import json
import hashlib
import secrets
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Обрабатывает запросы аутентификации: регистрация, вход, выход, проверка сессии
    Args: event с httpMethod, body, headers; context с request_id и другими атрибутами
    Returns: HTTP response с токеном сессии или ошибкой
    """
    method: str = event.get('httpMethod', 'GET')
    
    # Обработка CORS OPTIONS запросов
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    # Подключение к базе данных
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database configuration error'})
        }
    
    try:
        # Используем схему проекта вместо public
        conn = psycopg2.connect(database_url, options='-c search_path=t_p95310697_freelance_site_excha,public')
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'register':
                return handle_register(cur, conn, body_data, context)
            elif action == 'login':
                return handle_login(cur, conn, body_data, context)
            elif action == 'logout':
                return handle_logout(cur, conn, event.get('headers', {}), context)
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid action'})
                }
        
        elif method == 'GET':
            # Проверка текущей сессии
            return handle_session_check(cur, conn, event.get('headers', {}), context)
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
    except psycopg2.Error as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Database error: {str(e)}'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }
    finally:
        if 'conn' in locals():
            conn.close()

def hash_password(password: str) -> str:
    """Хеширует пароль с солью"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{password_hash.hex()}"

def verify_password(stored_hash: str, password: str) -> bool:
    """Проверяет пароль против сохраненного хеша"""
    try:
        salt, hash_hex = stored_hash.split(':')
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return password_hash.hex() == hash_hex
    except ValueError:
        return False

def generate_session_token() -> str:
    """Генерирует безопасный токен сессии"""
    return secrets.token_urlsafe(64)

def handle_register(cur, conn, data: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Обрабатывает регистрацию нового пользователя"""
    # Валидация данных
    required_fields = ['email', 'password', 'userType', 'firstName', 'lastName']
    for field in required_fields:
        if not data.get(field):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Missing required field: {field}'})
            }
    
    email = data['email'].lower().strip()
    password = data['password']
    user_type = data['userType']
    first_name = data['firstName'].strip()
    last_name = data['lastName'].strip()
    
    # Валидация типа пользователя
    if user_type not in ['client', 'freelancer']:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid user type'})
        }
    
    # Валидация пароля
    if len(password) < 6:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Password must be at least 6 characters'})
        }
    
    # Проверка существующего пользователя
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User with this email already exists'})
        }
    
    # Создание пользователя
    password_hash = hash_password(password)
    
    cur.execute("""
        INSERT INTO users (email, password_hash, user_type, first_name, last_name)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, email, user_type, first_name, last_name, created_at
    """, (email, password_hash, user_type, first_name, last_name))
    
    user = cur.fetchone()
    user_id = user['id']
    
    # Создание профиля в зависимости от типа пользователя
    if user_type == 'client':
        cur.execute("""
            INSERT INTO client_profiles (user_id)
            VALUES (%s)
            RETURNING id
        """, (user_id,))
        profile_id = cur.fetchone()['id']
    else:  # freelancer
        title = data.get('title', 'Freelancer')
        cur.execute("""
            INSERT INTO freelancer_profiles (user_id, title)
            VALUES (%s, %s)
            RETURNING id
        """, (user_id, title))
        profile_id = cur.fetchone()['id']
    
    # Создание сессии
    session_token = generate_session_token()
    expires_at = datetime.now() + timedelta(days=30)
    
    cur.execute("""
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES (%s, %s, %s)
    """, (user_id, session_token, expires_at))
    
    conn.commit()
    
    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'message': 'User registered successfully',
            'sessionToken': session_token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'userType': user['user_type'],
                'firstName': user['first_name'],
                'lastName': user['last_name'],
                'profileId': profile_id
            }
        })
    }

def handle_login(cur, conn, data: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Обрабатывает вход пользователя в систему"""
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    
    if not email or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Email and password are required'})
        }
    
    # Поиск пользователя
    cur.execute("""
        SELECT id, email, password_hash, user_type, first_name, last_name, is_active
        FROM users 
        WHERE email = %s
    """, (email,))
    
    user = cur.fetchone()
    if not user or not user['is_active']:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid credentials'})
        }
    
    # Проверка пароля
    if not verify_password(user['password_hash'], password):
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid credentials'})
        }
    
    # Получение профиля
    profile_id = None
    if user['user_type'] == 'client':
        cur.execute("SELECT id FROM client_profiles WHERE user_id = %s", (user['id'],))
    else:
        cur.execute("SELECT id FROM freelancer_profiles WHERE user_id = %s", (user['id'],))
    
    profile = cur.fetchone()
    if profile:
        profile_id = profile['id']
    
    # Создание новой сессии
    session_token = generate_session_token()
    expires_at = datetime.now() + timedelta(days=30)
    
    cur.execute("""
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES (%s, %s, %s)
    """, (user['id'], session_token, expires_at))
    
    conn.commit()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'message': 'Login successful',
            'sessionToken': session_token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'userType': user['user_type'],
                'firstName': user['first_name'],
                'lastName': user['last_name'],
                'profileId': profile_id
            }
        })
    }

def handle_logout(cur, conn, headers: Dict[str, str], context: Any) -> Dict[str, Any]:
    """Обрабатывает выход пользователя (удаляет сессию)"""
    session_token = headers.get('x-session-token') or headers.get('X-Session-Token')
    
    if not session_token:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Session token required'})
        }
    
    # Удаление сессии (в реальности лучше просто пометить как неактивную)
    cur.execute("UPDATE user_sessions SET expires_at = NOW() WHERE session_token = %s", (session_token,))
    conn.commit()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Logout successful'})
    }

def handle_session_check(cur, conn, headers: Dict[str, str], context: Any) -> Dict[str, Any]:
    """Проверяет валидность текущей сессии"""
    session_token = headers.get('x-session-token') or headers.get('X-Session-Token')
    
    if not session_token:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Session token required'})
        }
    
    # Проверка сессии
    cur.execute("""
        SELECT s.user_id, s.expires_at, u.email, u.user_type, u.first_name, u.last_name
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = %s AND s.expires_at > NOW() AND u.is_active = true
    """, (session_token,))
    
    session = cur.fetchone()
    if not session:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid or expired session'})
        }
    
    # Получение профиля
    profile_id = None
    if session['user_type'] == 'client':
        cur.execute("SELECT id FROM client_profiles WHERE user_id = %s", (session['user_id'],))
    else:
        cur.execute("SELECT id FROM freelancer_profiles WHERE user_id = %s", (session['user_id'],))
    
    profile = cur.fetchone()
    if profile:
        profile_id = profile['id']
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'valid': True,
            'user': {
                'id': session['user_id'],
                'email': session['email'],
                'userType': session['user_type'],
                'firstName': session['first_name'],
                'lastName': session['last_name'],
                'profileId': profile_id
            }
        })
    }