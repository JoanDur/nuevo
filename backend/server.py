from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class PersonalityTraits(BaseModel):
    playful: int = Field(ge=1, le=10)  # 1-10 scale
    calm: int = Field(ge=1, le=10)
    energetic: int = Field(ge=1, le=10)
    friendly: int = Field(ge=1, le=10)
    independent: int = Field(ge=1, le=10)
    social: int = Field(ge=1, le=10)

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    age: int = Field(ge=18)
    user_type: Literal['foundation', 'adopter']
    personality_traits: Optional[PersonalityTraits] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    age: int
    user_type: Literal['foundation', 'adopter']
    personality_traits: Optional[PersonalityTraits] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfile(BaseModel):
    id: str
    email: EmailStr
    name: str
    age: int
    user_type: str
    personality_traits: Optional[PersonalityTraits] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=18)
    personality_traits: Optional[PersonalityTraits] = None

class PetCreate(BaseModel):
    name: str
    breed: str
    age: int = Field(ge=0)
    personality_traits: PersonalityTraits
    images: List[str] = []  # URLs or base64

class Pet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    foundation_id: str
    name: str
    breed: str
    age: int
    personality_traits: PersonalityTraits
    images: List[str] = []
    status: Literal['available', 'adopted'] = 'available'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PetUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    age: Optional[int] = Field(None, ge=0)
    personality_traits: Optional[PersonalityTraits] = None
    images: Optional[List[str]] = None
    status: Optional[Literal['available', 'adopted']] = None

class MatchCreate(BaseModel):
    pet_id: str
    action: Literal['like', 'pass']

class Match(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    pet_id: str
    match_score: float
    is_match: bool = False
    status: Literal['pending', 'accepted', 'rejected'] = 'pending'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentCreate(BaseModel):
    match_id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    date: str
    time: str
    status: Literal['scheduled', 'completed', 'cancelled'] = 'scheduled'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    sender_id: str
    sender_type: Literal['user', 'foundation']
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessageCreate(BaseModel):
    message: str

class Chat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== UTILITIES ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0, 'password_hash': 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def calculate_compatibility(traits1: PersonalityTraits, traits2: PersonalityTraits) -> float:
    """Calculate personality compatibility score (0-100)"""
    traits1_dict = traits1.model_dump()
    traits2_dict = traits2.model_dump()
    
    total_diff = 0
    max_possible_diff = 0
    
    for key in traits1_dict.keys():
        diff = abs(traits1_dict[key] - traits2_dict[key])
        total_diff += diff
        max_possible_diff += 9  # Max difference is 9 (10-1)
    
    # Convert to similarity percentage
    similarity = (1 - (total_diff / max_possible_diff)) * 100
    return round(similarity, 2)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Create user
    user_dict = user_data.model_dump()
    password = user_dict.pop('password')
    user_dict['password_hash'] = hash_password(password)
    user_obj = User(**user_dict)
    
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    token = create_token(user_obj.id, user_obj.email)
    
    return {
        'token': token,
        'user': UserProfile(
            id=user_obj.id,
            email=user_obj.email,
            name=user_obj.name,
            age=user_obj.age,
            user_type=user_obj.user_type,
            personality_traits=user_obj.personality_traits
        )
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user['id'], user['email'])
    
    return {
        'token': token,
        'user': UserProfile(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            age=user['age'],
            user_type=user['user_type'],
            personality_traits=user.get('personality_traits')
        )
    }

# ==================== USER ROUTES ====================

@api_router.get("/users/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserProfile(**current_user)

@api_router.put("/users/profile", response_model=UserProfile)
async def update_profile(update_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one({'id': current_user['id']}, {'$set': update_dict})
    
    updated_user = await db.users.find_one({'id': current_user['id']}, {'_id': 0, 'password_hash': 0})
    return UserProfile(**updated_user)

# ==================== PET ROUTES ====================

@api_router.post("/pets", response_model=Pet)
async def create_pet(pet_data: PetCreate, current_user: dict = Depends(get_current_user)):
    if current_user['user_type'] != 'foundation':
        raise HTTPException(status_code=403, detail="Solo las fundaciones pueden crear mascotas")
    
    pet_dict = pet_data.model_dump()
    pet_dict['foundation_id'] = current_user['id']
    pet_obj = Pet(**pet_dict)
    
    doc = pet_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.pets.insert_one(doc)
    return pet_obj

@api_router.get("/pets", response_model=List[Pet])
async def get_pets(current_user: dict = Depends(get_current_user)):
    if current_user['user_type'] != 'foundation':
        raise HTTPException(status_code=403, detail="Solo las fundaciones pueden ver sus mascotas")
    
    pets = await db.pets.find({'foundation_id': current_user['id']}, {'_id': 0}).to_list(1000)
    
    for pet in pets:
        if isinstance(pet['created_at'], str):
            pet['created_at'] = datetime.fromisoformat(pet['created_at'])
    
    return pets

@api_router.get("/pets/{pet_id}", response_model=Pet)
async def get_pet(pet_id: str, current_user: dict = Depends(get_current_user)):
    pet = await db.pets.find_one({'id': pet_id}, {'_id': 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    
    if isinstance(pet['created_at'], str):
        pet['created_at'] = datetime.fromisoformat(pet['created_at'])
    
    return Pet(**pet)

@api_router.put("/pets/{pet_id}", response_model=Pet)
async def update_pet(pet_id: str, update_data: PetUpdate, current_user: dict = Depends(get_current_user)):
    if current_user['user_type'] != 'foundation':
        raise HTTPException(status_code=403, detail="Solo las fundaciones pueden actualizar mascotas")
    
    pet = await db.pets.find_one({'id': pet_id, 'foundation_id': current_user['id']})
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.pets.update_one({'id': pet_id}, {'$set': update_dict})
    
    updated_pet = await db.pets.find_one({'id': pet_id}, {'_id': 0})
    if isinstance(updated_pet['created_at'], str):
        updated_pet['created_at'] = datetime.fromisoformat(updated_pet['created_at'])
    
    return Pet(**updated_pet)

@api_router.delete("/pets/{pet_id}")
async def delete_pet(pet_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['user_type'] != 'foundation':
        raise HTTPException(status_code=403, detail="Solo las fundaciones pueden eliminar mascotas")
    
    result = await db.pets.delete_one({'id': pet_id, 'foundation_id': current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    
    return {'message': 'Mascota eliminada exitosamente'}

# ==================== MATCHING ROUTES ====================

@api_router.get("/pets/available/list", response_model=List[Pet])
async def get_available_pets(current_user: dict = Depends(get_current_user)):
    if current_user['user_type'] != 'adopter':
        raise HTTPException(status_code=403, detail="Solo los adoptantes pueden ver mascotas disponibles")
    
    # Get pets not yet liked/passed by this user
    user_interactions = await db.matches.find({'user_id': current_user['id']}, {'pet_id': 1, '_id': 0}).to_list(1000)
    interacted_pet_ids = [m['pet_id'] for m in user_interactions]
    
    pets = await db.pets.find({
        'status': 'available',
        'id': {'$nin': interacted_pet_ids}
    }, {'_id': 0}).to_list(100)
    
    for pet in pets:
        if isinstance(pet['created_at'], str):
            pet['created_at'] = datetime.fromisoformat(pet['created_at'])
    
    return pets

@api_router.post("/matches/like", response_model=Match)
async def create_match(match_data: MatchCreate, current_user: dict = Depends(get_current_user)):
    if current_user['user_type'] != 'adopter':
        raise HTTPException(status_code=403, detail="Solo los adoptantes pueden dar like")
    
    if not current_user.get('personality_traits'):
        raise HTTPException(status_code=400, detail="Debes completar tu perfil de personalidad primero")
    
    # Check if already interacted
    existing = await db.matches.find_one({'user_id': current_user['id'], 'pet_id': match_data.pet_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya interactuaste con esta mascota")
    
    if match_data.action == 'pass':
        # Just record the pass, no match
        match_obj = Match(
            user_id=current_user['id'],
            pet_id=match_data.pet_id,
            match_score=0,
            is_match=False,
            status='rejected'
        )
    else:
        # Calculate compatibility
        pet = await db.pets.find_one({'id': match_data.pet_id})
        if not pet:
            raise HTTPException(status_code=404, detail="Mascota no encontrada")
        
        user_traits = PersonalityTraits(**current_user['personality_traits'])
        pet_traits = PersonalityTraits(**pet['personality_traits'])
        
        score = calculate_compatibility(user_traits, pet_traits)
        is_match = score >= 70  # 70% threshold
        
        match_obj = Match(
            user_id=current_user['id'],
            pet_id=match_data.pet_id,
            match_score=score,
            is_match=is_match,
            status='pending' if is_match else 'rejected'
        )
    
    doc = match_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.matches.insert_one(doc)
    return match_obj

@api_router.get("/matches", response_model=List[dict])
async def get_matches(current_user: dict = Depends(get_current_user)):
    if current_user['user_type'] == 'adopter':
        matches = await db.matches.find({
            'user_id': current_user['id'],
            'is_match': True
        }, {'_id': 0}).to_list(1000)
    else:
        # Foundation sees matches for their pets
        pets = await db.pets.find({'foundation_id': current_user['id']}, {'id': 1, '_id': 0}).to_list(1000)
        pet_ids = [p['id'] for p in pets]
        matches = await db.matches.find({
            'pet_id': {'$in': pet_ids},
            'is_match': True
        }, {'_id': 0}).to_list(1000)
    
    # Enrich with pet and user data
    result = []
    for match in matches:
        if isinstance(match['created_at'], str):
            match['created_at'] = datetime.fromisoformat(match['created_at'])
        
        pet = await db.pets.find_one({'id': match['pet_id']}, {'_id': 0})
        user = await db.users.find_one({'id': match['user_id']}, {'_id': 0, 'password_hash': 0})
        
        result.append({
            **match,
            'pet': pet,
            'user': user
        })
    
    return result

@api_router.put("/matches/{match_id}/accept")
async def accept_match(match_id: str, current_user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({'id': match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    if current_user['user_type'] == 'adopter' and match['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    await db.matches.update_one({'id': match_id}, {'$set': {'status': 'accepted'}})
    
    return {'message': 'Match aceptado. Puedes proceder con el chat para coordinar la adopción.'}

# ==================== APPOINTMENT ROUTES ====================

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appointment_data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({'id': appointment_data.match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    # Verify authorization
    if current_user['user_type'] == 'adopter' and match['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    if current_user['user_type'] == 'foundation':
        pet = await db.pets.find_one({'id': match['pet_id'], 'foundation_id': current_user['id']})
        if not pet:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    appointment_obj = Appointment(**appointment_data.model_dump())
    
    doc = appointment_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.appointments.insert_one(doc)
    return appointment_obj

@api_router.get("/appointments", response_model=List[dict])
async def get_appointments(current_user: dict = Depends(get_current_user)):
    if current_user['user_type'] == 'adopter':
        matches = await db.matches.find({'user_id': current_user['id']}, {'id': 1, '_id': 0}).to_list(1000)
    else:
        pets = await db.pets.find({'foundation_id': current_user['id']}, {'id': 1, '_id': 0}).to_list(1000)
        pet_ids = [p['id'] for p in pets]
        matches = await db.matches.find({'pet_id': {'$in': pet_ids}}, {'id': 1, '_id': 0}).to_list(1000)
    
    match_ids = [m['id'] for m in matches]
    appointments = await db.appointments.find({'match_id': {'$in': match_ids}}, {'_id': 0}).to_list(1000)
    
    result = []
    for apt in appointments:
        if isinstance(apt['created_at'], str):
            apt['created_at'] = datetime.fromisoformat(apt['created_at'])
        
        match = await db.matches.find_one({'id': apt['match_id']}, {'_id': 0})
        pet = await db.pets.find_one({'id': match['pet_id']}, {'_id': 0})
        user = await db.users.find_one({'id': match['user_id']}, {'_id': 0, 'password_hash': 0})
        
        result.append({
            **apt,
            'match': match,
            'pet': pet,
            'user': user
        })
    
    return result

# ==================== CHAT ROUTES ====================

@api_router.get("/chat/{match_id}", response_model=Chat)
async def get_chat(match_id: str, current_user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({'id': match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    # Verify authorization
    authorized = False
    if current_user['user_type'] == 'adopter' and match['user_id'] == current_user['id']:
        authorized = True
    elif current_user['user_type'] == 'foundation':
        pet = await db.pets.find_one({'id': match['pet_id'], 'foundation_id': current_user['id']})
        if pet:
            authorized = True
    
    if not authorized:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    chat = await db.chats.find_one({'match_id': match_id}, {'_id': 0})
    
    if not chat:
        chat_obj = Chat(match_id=match_id)
        doc = chat_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.chats.insert_one(doc)
        return chat_obj
    
    if isinstance(chat['created_at'], str):
        chat['created_at'] = datetime.fromisoformat(chat['created_at'])
    
    for msg in chat['messages']:
        if isinstance(msg['timestamp'], str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return Chat(**chat)

@api_router.post("/chat/{match_id}/messages")
async def send_message(match_id: str, message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({'id': match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    
    # Verify authorization and determine sender type
    sender_type = None
    if current_user['user_type'] == 'adopter' and match['user_id'] == current_user['id']:
        sender_type = 'user'
    elif current_user['user_type'] == 'foundation':
        pet = await db.pets.find_one({'id': match['pet_id'], 'foundation_id': current_user['id']})
        if pet:
            sender_type = 'foundation'
    
    if not sender_type:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    message = ChatMessage(
        sender_id=current_user['id'],
        sender_type=sender_type,
        message=message_data.message
    )
    
    message_doc = message.model_dump()
    message_doc['timestamp'] = message_doc['timestamp'].isoformat()
    
    await db.chats.update_one(
        {'match_id': match_id},
        {'$push': {'messages': message_doc}},
        upsert=True
    )
    
    return {'message': 'Mensaje enviado exitosamente'}

# ==================== MAIN ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()