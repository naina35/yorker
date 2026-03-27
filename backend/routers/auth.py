"""
routers/auth.py
---------------
Endpoints:
  POST /auth/register   — create a new user account
  POST /auth/login      — returns a JWT token
  GET  /auth/me         — returns the logged-in user's profile (requires token)
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

from db import fetch_one, execute

router = APIRouter()

# Password hashing

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)



# JWT helpers

JWT_SECRET       = os.getenv("JWT_SECRET")
JWT_ALGORITHM    = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 10080))  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> int:
    """Decode JWT and return user_id. Raises 401 if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# -------------------------------------------------------
# Dependency — use this in any route that needs auth
#
# Example:
#   @router.get("/protected")
#   def protected(current_user = Depends(get_current_user)):
#       return current_user
# -------------------------------------------------------
def get_current_user(token: str = Depends(oauth2_scheme)):
    user_id = decode_token(token)
    user = fetch_one(
        "SELECT id, name, email, avatar_url, lat, lng, created_at FROM users WHERE id = %s",
        (user_id,)
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# Pydantic schemas — request/response shapes

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str

class UpdateLocationRequest(BaseModel):
    lat: float
    lng: float


# Routes


@router.post("/register", status_code=201)
def register(body: RegisterRequest):
    # Check if email already exists
    existing = fetch_one("SELECT id FROM users WHERE email = %s", (body.email,))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password before storing
    hashed = hash_password(body.password)

    result = execute(
        """
        INSERT INTO users (name, email, password)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (body.name, body.email, hashed)
    )

    user_id = result["id"]
    token = create_access_token(user_id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "name": body.name,
        "message": "Account created successfully"
    }


@router.post("/login", response_model=LoginResponse)
def login(form: OAuth2PasswordRequestForm = Depends()):
    # OAuth2PasswordRequestForm gives us form.username and form.password
    # We use email as the username field
    user = fetch_one("SELECT * FROM users WHERE email = %s", (form.username,))

    if not user or not verify_password(form.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(user["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["id"],
        "name": user["name"]
    }


@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    """Returns the profile of the currently logged-in user."""
    return current_user


@router.put("/me/location")
def update_location(body: UpdateLocationRequest, current_user = Depends(get_current_user)):
    """
    Update the logged-in user's location.
    Call this when the user grants GPS permission in the browser.
    """
    execute(
        "UPDATE users SET lat = %s, lng = %s WHERE id = %s",
        (body.lat, body.lng, current_user["id"])
    )
    return {"message": "Location updated"}