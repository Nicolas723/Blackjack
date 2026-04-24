# 🃏 Blackjack Multijugador en Tiempo Real

Juego de Blackjack multijugador en tiempo real con salas públicas y privadas, donde cada jugador juega contra la casa en partidas sincronizadas.

---

## 🚀 Demo

> *(Agrega aquí el enlace en producción cuando lo despliegues)*

Ejemplo:
- https://tu-app.netlify.app

---

## 🧠 Descripción

Este proyecto es un juego de Blackjack online donde múltiples jugadores pueden:

- Crear o unirse a salas públicas o privadas
- Marcarse como listos para iniciar la partida
- Jugar contra la casa (dealer)
- Ver sus cartas en tiempo real
- Jugar turnos sincronizados con otros jugadores

El sistema está diseñado para manejar estado en tiempo real y múltiples conexiones simultáneas.

---

## ⚙️ Stack tecnológico

### Frontend
- React (o Vite / Next.js)
- TailwindCSS
- Socket.IO Client

### Backend
- Node.js
- Express.js
- Socket.IO

### Lógica del juego
- JavaScript modular (Blackjack engine)
- Manejo de estados del juego en servidor

### Realtime
- WebSockets (Socket.IO)

---

## 📦 Instalación

### 1. Clonar repositorio
```bash
git clone https://github.com/tuusuario/blackjack-multiplayer.git
cd blackjack-multiplayer
```

---

### 2. Backend
```bash
cd server
npm install
npm run dev
```

Servidor corre en:
```
http://localhost:3000
```

---

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

Frontend corre en:
```
http://localhost:5173
```

---

## 🧩 Funcionalidades

### 🎮 Juego
- Blackjack clásico
- Turnos por jugador
- Dealer automático
- Validación de victoria/derrota

### 🏠 Salas
- Crear sala privada con código
- Unirse a salas públicas
- Lista de jugadores en tiempo real
- Sistema de “Ready” antes de iniciar

### 🔄 Tiempo real
- Sincronización de estado entre jugadores
- Actualización de cartas en vivo
- Eventos WebSocket para acciones del juego

---

## 📡 Eventos Socket.IO

### Cliente → Servidor
- `join_room`
- `player_ready`
- `player_hit`
- `player_stand`
- `create_room`

### Servidor → Cliente
- `room_update`
- `game_start`
- `game_state`
- `player_update`
- `game_end`

---

## 🧠 Lógica del juego

- Cada jugador recibe 2 cartas iniciales
- Turnos secuenciales
- El dealer juega al final
- El objetivo es acercarse a 21 sin pasarse

---

## 🖼️ Screenshots

> *(Reemplaza con imágenes reales del proyecto)*

### Lobby / Salas
![Lobby](./screenshots/lobby.png)

### Juego en partida
![Game](./screenshots/game.png)

### Resultado final
![Result](./screenshots/result.png)

---

## 📁 Estructura del proyecto

```
blackjack-multiplayer/
│
├── client/        # Frontend React
├── server/        # Backend Node + Socket.IO
├── game/          # Lógica del blackjack
├── README.md
```

---

## 🔮 Futuras mejoras

- Sistema de monedas virtuales
- Ranking de jugadores
- Animaciones de cartas
- Chat en salas
- Matchmaking automático

---

## 👨‍💻 Autor

Desarrollado por Nicolas Baron Ortiz 🚀

