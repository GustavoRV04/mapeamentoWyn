import csv
import hashlib
import hmac
import io
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, ValidationInfo, field_validator
from sqlalchemy import DateTime, ForeignKey, LargeBinary, String, Text, create_engine, func, or_, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker


BASE_DIR = Path(__file__).resolve().parents[1]
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'data' / 'ativos.db'}")
INVITE_CODE = os.getenv("INVITE_CODE")
SESSION_DURATION = timedelta(hours=12)
MAX_PHOTOS = 5
MAX_PHOTO_SIZE = 5 * 1024 * 1024
ALLOWED_PHOTOS = {
    "image/jpeg": (".jpg", b"\xff\xd8\xff"),
    "image/png": (".png", b"\x89PNG\r\n\x1a\n"),
    "image/webp": (".webp", b"RIFF"),
}

if DATABASE_URL.startswith("sqlite"):
    Path(DATABASE_URL.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SessionToken(Base):
    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Record(Base):
    __tablename__ = "records"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_type: Mapped[str] = mapped_column(String(32), index=True)
    serial: Mapped[str] = mapped_column(String(120), index=True)
    model: Mapped[str] = mapped_column(String(160))
    mac_address: Mapped[str] = mapped_column(String(32), default="")
    unit: Mapped[str] = mapped_column(String(160), index=True)
    retired_serial: Mapped[str] = mapped_column(String(120), default="")
    retired_model: Mapped[str] = mapped_column(String(160), default="")
    diagnostic: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    technician_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    technician: Mapped[User] = relationship()
    photos: Mapped[list["Photo"]] = relationship(cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(80))
    media_type: Mapped[str] = mapped_column(String(32))
    content: Mapped[bytes] = mapped_column(LargeBinary)


class Asset(Base):
    __tablename__ = "assets"

    serial: Mapped[str] = mapped_column(String(120), primary_key=True)
    model: Mapped[str] = mapped_column(String(160))
    mac_address: Mapped[str] = mapped_column(String(32), default="")
    unit: Mapped[str] = mapped_column(String(160), index=True)
    status: Mapped[str] = mapped_column(String(24), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestão de Ativos de Rede", version="0.1.0")
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


class UserInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    invite_code: str = Field(min_length=1, max_length=128)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = value.strip()
        if len(name) < 2:
            raise ValueError("Informe o nome completo.")
        return name


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserOutput(BaseModel):
    id: int
    name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class AuthOutput(BaseModel):
    token: str
    user: UserOutput


class RecordInput(BaseModel):
    request_type: Literal["Instalação", "Substituição", "Recolhimento", "Preventiva", "Manutenção", "Transferência"]
    serial: str = Field(min_length=1, max_length=120)
    model: str = Field(min_length=1, max_length=160)
    mac_address: str = Field(default="", max_length=32)
    unit: str = Field(min_length=1, max_length=160)
    retired_serial: str = Field(default="", max_length=120)
    retired_model: str = Field(default="", max_length=160)
    diagnostic: str = Field(default="", max_length=2000)
    notes: str = Field(default="", max_length=4000)

    @field_validator("serial", "retired_serial")
    @classmethod
    def normalize_serial(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("serial")
    @classmethod
    def require_serial(cls, value: str) -> str:
        if not value:
            raise ValueError("Informe o número de série.")
        return value

    @field_validator("model", "mac_address", "unit", "retired_model", "diagnostic", "notes")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("model", "unit")
    @classmethod
    def require_location_and_model(cls, value: str, info: ValidationInfo) -> str:
        if not value:
            raise ValueError(f"Informe {info.field_name.replace('_', ' ')}.")
        return value

class RecordOutput(BaseModel):
    id: int
    request_type: str
    serial: str
    model: str
    mac_address: str
    unit: str
    retired_serial: str
    retired_model: str
    diagnostic: str
    notes: str
    created_at: datetime
    technician_id: int
    technician_name: str
    photo_ids: list[int]


class RecordPageOutput(BaseModel):
    items: list[RecordOutput]
    total: int
    type_counts: dict[str, int]


class AssetOutput(BaseModel):
    serial: str
    model: str
    mac_address: str
    unit: str
    status: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


def asset_to_output(asset: Asset) -> AssetOutput:
    return AssetOutput(
        serial=asset.serial,
        model=asset.model,
        mac_address=asset.mac_address,
        unit=asset.unit,
        status=asset.status,
        updated_at=to_utc(asset.updated_at),
    )


class UnitCountOutput(BaseModel):
    unit: str
    count: int


class AssetPageOutput(BaseModel):
    items: list[AssetOutput]
    total: int
    status_counts: dict[str, int]
    unit_counts: list[UnitCountOutput]


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}:{derived.hex()}"


def password_matches(password: str, encoded: str) -> bool:
    salt_hex, expected = encoded.split(":", maxsplit=1)
    actual = hash_password(password, bytes.fromhex(salt_hex)).split(":", maxsplit=1)[1]
    return hmac.compare_digest(actual, expected)


def issue_session(db: Session, user: User) -> AuthOutput:
    token = secrets.token_urlsafe(32)
    db.add(SessionToken(
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + SESSION_DURATION,
    ))
    db.commit()
    return AuthOutput(token=token, user=UserOutput.model_validate(user))


def to_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Entre na sua conta para continuar.")
    token = authorization.removeprefix("Bearer ").strip()
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    session_token = db.get(SessionToken, token_hash)
    if not session_token:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    expires_at = session_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        db.delete(session_token)
        db.commit()
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    user = db.get(User, session_token.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    return user


@app.get("/")
def health():
    return {"status": "online", "database": "sqlite" if DATABASE_URL.startswith("sqlite") else "configured"}


@app.post("/auth/register", response_model=AuthOutput, status_code=status.HTTP_201_CREATED)
def register(payload: UserInput, db: Session = Depends(get_db)):
    if not INVITE_CODE:
        raise HTTPException(status_code=503, detail="O cadastro está desativado até a equipe configurar o código de convite.")
    if not hmac.compare_digest(payload.invite_code, INVITE_CODE):
        raise HTTPException(status_code=403, detail="Código de convite inválido.")
    email = str(payload.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Este e-mail já possui uma conta.")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return issue_session(db, user)


@app.post("/auth/login", response_model=AuthOutput)
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not user or not password_matches(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    return issue_session(db, user)


@app.get("/auth/me", response_model=UserOutput)
def me(user: User = Depends(get_current_user)):
    return user


@app.delete("/auth/session", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    authorization: Annotated[str, Header()],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token_hash = hashlib.sha256(authorization.removeprefix("Bearer ").strip().encode()).hexdigest()
    db.query(SessionToken).filter(SessionToken.token_hash == token_hash).delete()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def record_to_output(record: Record) -> RecordOutput:
    return RecordOutput(
        id=record.id,
        request_type=record.request_type,
        serial=record.serial,
        model=record.model,
        mac_address=record.mac_address,
        unit=record.unit,
        retired_serial=record.retired_serial,
        retired_model=record.retired_model,
        diagnostic=record.diagnostic,
        notes=record.notes,
        created_at=to_utc(record.created_at),
        technician_id=record.technician_id,
        technician_name=record.technician.name,
        photo_ids=[photo.id for photo in record.photos],
    )


@app.get("/records", response_model=RecordPageOutput)
def list_records(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    q: str = Query(default="", max_length=120),
    request_type: str = Query(default="", max_length=32),
    mine: bool = False,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    base_filters = []
    if q.strip():
        search = f"%{q.strip()}%"
        base_filters.append(or_(
            Record.serial.ilike(search),
            Record.model.ilike(search),
            Record.unit.ilike(search),
            Record.retired_serial.ilike(search),
            User.name.ilike(search),
        ))
    if mine:
        base_filters.append(Record.technician_id == user.id)
    filters = [*base_filters]
    if request_type:
        filters.append(Record.request_type == request_type)
    total = db.scalar(
        select(func.count(Record.id)).join(User, Record.technician_id == User.id).where(*filters)
    ) or 0
    type_counts = {
        record_type: count
        for record_type, count in db.execute(
            select(Record.request_type, func.count(Record.id))
            .join(User, Record.technician_id == User.id)
            .where(*base_filters)
            .group_by(Record.request_type)
        ).all()
    }
    query = (
        select(Record)
        .join(User, Record.technician_id == User.id)
        .where(*filters)
        .order_by(Record.created_at.desc(), Record.id.desc())
        .offset(offset)
        .limit(limit)
    )
    items = [record_to_output(record) for record in db.scalars(query).all()]
    return {"items": items, "total": total, "type_counts": type_counts}


def update_asset(db: Session, serial: str, model: str, mac_address: str, unit: str, asset_status: str):
    asset = db.get(Asset, serial)
    if asset is None:
        asset = Asset(serial=serial, model=model, mac_address=mac_address, unit=unit, status=asset_status)
        db.add(asset)
    else:
        asset.model = model
        asset.mac_address = mac_address
        asset.unit = unit
        asset.status = asset_status
        asset.updated_at = datetime.now(timezone.utc)


@app.post("/records", response_model=RecordOutput, status_code=status.HTTP_201_CREATED)
async def create_record(
    payload: Annotated[str, Form()],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    photos: list[UploadFile] = File(default=[]),
):
    if len(photos) > MAX_PHOTOS:
        raise HTTPException(status_code=413, detail=f"É possível anexar até {MAX_PHOTOS} fotos por registro.")
    try:
        data = RecordInput.model_validate_json(payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=f"Dados do registro inválidos: {error}") from error

    saved_photos: list[tuple[str, str, bytes]] = []
    for photo in photos:
        media_type = photo.content_type or ""
        signature = ALLOWED_PHOTOS.get(media_type)
        if not signature:
            raise HTTPException(status_code=415, detail="Use imagens JPEG, PNG ou WebP.")
        content = await photo.read(MAX_PHOTO_SIZE + 1)
        if len(content) > MAX_PHOTO_SIZE:
            raise HTTPException(status_code=413, detail="Cada foto deve ter no máximo 5 MB.")
        extension, magic = signature
        if not content.startswith(magic) or (media_type == "image/webp" and content[8:12] != b"WEBP"):
            raise HTTPException(status_code=415, detail="O arquivo enviado não corresponde ao formato da imagem.")
        saved_photos.append((f"{uuid4().hex}{extension}", media_type, content))

    record = Record(
        **data.model_dump(),
        technician_id=user.id,
        photos=[Photo(filename=name, media_type=media, content=content) for name, media, content in saved_photos],
    )
    db.add(record)
    new_status = "ESTOQUE" if data.request_type == "Recolhimento" else "DEFEITUOSO" if data.request_type == "Manutenção" else "EM_USO"
    asset_unit = "Estoque central" if data.request_type == "Recolhimento" else data.unit
    update_asset(db, data.serial, data.model, data.mac_address, asset_unit, new_status)
    if data.retired_serial:
        update_asset(db, data.retired_serial, data.retired_model or "Modelo não informado", "", "Estoque central", "ESTOQUE")
    db.commit()
    db.refresh(record)
    return record_to_output(record)


@app.get("/records/{record_id}/photos/{photo_id}")
def get_photo(
    record_id: int,
    photo_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo = db.scalar(select(Photo).where(Photo.id == photo_id, Photo.record_id == record_id))
    if not photo:
        raise HTTPException(status_code=404, detail="Foto não encontrada.")
    return Response(content=photo.content, media_type=photo.media_type, headers={"Cache-Control": "private, max-age=3600"})


@app.get("/assets", response_model=AssetPageOutput)
def list_assets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    q: str = Query(default="", max_length=120),
    asset_status: str = Query(default="", alias="status", max_length=24),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    base_filters = []
    if q.strip():
        search = f"%{q.strip()}%"
        base_filters.append(or_(Asset.serial.ilike(search), Asset.model.ilike(search), Asset.mac_address.ilike(search), Asset.unit.ilike(search)))
    filters = [*base_filters]
    if asset_status:
        filters.append(Asset.status == asset_status)
    total = db.scalar(select(func.count(Asset.serial)).where(*filters)) or 0
    status_counts = dict(db.execute(
        select(Asset.status, func.count(Asset.serial)).where(*base_filters).group_by(Asset.status)
    ).all())
    unit_counts = [
        {"unit": unit, "count": count}
        for unit, count in db.execute(
            select(Asset.unit, func.count(Asset.serial))
            .where(*base_filters)
            .group_by(Asset.unit)
            .order_by(func.count(Asset.serial).desc(), Asset.unit)
        ).all()
    ]
    query = select(Asset).where(*filters).order_by(Asset.updated_at.desc(), Asset.serial).offset(offset).limit(limit)
    return {
        "items": [asset_to_output(asset) for asset in db.scalars(query).all()],
        "total": total,
        "status_counts": status_counts,
        "unit_counts": unit_counts,
    }


@app.get("/assets/export")
def export_assets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    q: str = Query(default="", max_length=120),
    asset_status: str = Query(default="", alias="status", max_length=24),
):
    filters = []
    if q.strip():
        search = f"%{q.strip()}%"
        filters.append(or_(Asset.serial.ilike(search), Asset.model.ilike(search), Asset.mac_address.ilike(search), Asset.unit.ilike(search)))
    if asset_status:
        filters.append(Asset.status == asset_status)
    assets = db.scalars(select(Asset).where(*filters).order_by(Asset.updated_at.desc(), Asset.serial)).all()
    output = io.StringIO(newline="")
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["Número de série", "Modelo", "Endereço MAC", "Unidade", "Situação", "Atualizado em"])
    labels = {"EM_USO": "Em operação", "ESTOQUE": "Em estoque", "DEFEITUOSO": "Com defeito", "MANUTENCAO": "Em manutenção"}
    for asset in assets:
        values = [
            asset.serial,
            asset.model,
            asset.mac_address,
            asset.unit,
            labels.get(asset.status, asset.status),
            to_utc(asset.updated_at).isoformat(),
        ]
        writer.writerow([f"'{value}" if value.startswith(("=", "+", "-", "@")) else value for value in values])
    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="inventario-ativos.csv"'},
    )


@app.get("/units", response_model=list[str])
def list_units(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(select(Asset.unit).where(Asset.unit != "").distinct().order_by(Asset.unit)).all()
