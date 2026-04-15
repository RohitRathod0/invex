from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime

from models.database import get_db
from models.db_models import User, AuditLog
from security.password_handler import hash_password, verify_password
from security.jwt_handler import create_access_token, decode_token
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.split(" ")[1]
    payload = decode_token(token) # Will raise 401 if invalid
    user_id = payload.get("sub")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

@router.post("/register")
def register(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = hash_password(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        user_id=new_user.id,
        action="REGISTER",
        details="User registered via API",
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent")
    )
    db.add(audit_log)
    db.commit()

    access_token = create_access_token(user_id=new_user.id, email=new_user.email, name=new_user.name)
    return {"access_token": access_token, "token_type": "bearer", "user_id": new_user.id}

@router.post("/login")
def login(user_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        # We also want to record failed logins in audit potentially, but let's stick to successful for now
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    user.last_login = datetime.utcnow()
    
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        user_id=user.id,
        action="LOGIN",
        details="User logged in via API",
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent")
    )
    db.add(audit_log)
    db.commit()

    access_token = create_access_token(user_id=user.id, email=user.email, name=user.name)
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "status": current_user.status,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        user_id=current_user.id,
        action="LOGOUT",
        details="User logged out via API",
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent")
    )
    db.add(audit_log)
    db.commit()
    return {"message": "Successfully logged out"}
