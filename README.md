# 🃏 Blackjack Multijugador en Tiempo Real

Juego de Blackjack multijugador premium con sistema de apuestas, persistencia de sesión y animaciones cinematográficas. Los jugadores compiten contra la casa en un entorno sincronizado de alta fidelidad.

---

## 🚀 Demo en Vivo

Puedes probar el juego directamente aquí:
👉 **[https://blackjack-c2cp.onrender.com](https://blackjack-c2cp.onrender.com)**

---

## 🧠 Descripción del Proyecto

Este proyecto es una plataforma de Blackjack online diseñada para ofrecer una experiencia de casino profesional. A diferencia de juegos simples, este sistema permite:

- **Sistema de Persistencia**: Si recargas la página o pierdes la conexión, el sistema te reconoce y te devuelve a tu partida con tu saldo y cartas intactas.
- **Salas Públicas y Privadas**: Crea mesas privadas con código para jugar solo con amigos o únete a la acción en mesas públicas.
- **Multijugador Real**: Observa las apuestas y jugadas de otros usuarios en tiempo real.
- **Estética Premium**: Interfaz diseñada con modo oscuro, tipografía moderna (Outfit/Inter) y animaciones de cartas realistas.
- **Gestión de Banca**: Comienza con $1.000.000 COP y utiliza el sistema de recarga automática si te quedas sin fondos.

---

## ⚙️ Stack Tecnológico

### Frontend
- **React 18**: SPA reactiva para una experiencia fluida.
- **Vanilla CSS (Moderno)**: Diseño personalizado con variables CSS, animaciones @keyframes y layouts Flexbox/Grid (sin frameworks pesados).
- **Socket.IO Client**: Comunicación bidireccional de baja latencia.

### Backend
- **Node.js & Express**: Servidor robusto para manejar la lógica de negocio y servir archivos estáticos.
- **Socket.IO**: Orquestación de eventos multijugador y sincronización de estado.
- **UUID**: Gestión de sesiones persistentes.

---

## 🧩 Funcionalidades Destacadas

- **🎮 Gameplay Cinematográfico**: Animaciones de cartas deslizándose desde el mazo hacia los jugadores.
- **💰 Sistema de Apuestas**: Chips interactivos ($10k, $50k, $100k, $500k) con validación de saldo.
- **🔄 Ciclo de Juego Continuo**: Las cartas se recogen y se inicia una nueva ronda de apuestas automáticamente al finalizar la mano.
- **🛠️ Resiliencia**: Manejo de reconexiones automáticas y estados de "espera" para jugadores que se unen a mitad de partida.
- **📊 Marcador en Vivo**: Suma de cartas visible en todo momento para facilitar la toma de decisiones.

---

## 📦 Instalación Local

Si deseas ejecutar el proyecto en tu propia máquina:

### 1. Clonar el repositorio
```bash
git clone https://github.com/Nicolas723/Blackjack.git
cd Blackjack
```

### 2. Configurar el Backend
```bash
cd server
npm install
npm run dev
```
*El servidor correrá en el puerto 3001 por defecto.*

### 3. Configurar el Frontend
```bash
cd ../client
npm install
npm run dev
```
*La interfaz estará disponible en http://localhost:5173.*

---

## 📡 Arquitectura de Red (Socket.IO)

El juego utiliza un sistema de eventos optimizado:
- **`register` / `resume_session`**: Manejo de identidad y persistencia.
- **`join_room` / `leave_room`**: Gestión de lobbies.
- **`place_bet`**: Sincronización de apuestas.
- **`player_action`**: Acciones de juego (Hit/Stand).
- **`restock_chips`**: Reposición de fondos para jugadores en quiebra.

---

## 📁 Estructura del Proyecto

```text
Blackjack/
├── client/           # Aplicación React (Frontend)
│   ├── src/pages/    # Landing, Lobby, Room y Game
│   └── src/components# Componentes de cartas y manos
├── server/           # Servidor Node.js (Backend)
│   ├── src/game/     # Motor de lógica de Blackjack
│   ├── src/socket/   # Manejadores de eventos realtime
│   └── src/rooms/    # Gestor de salas y estados
└── README.md
```

---

## 👨‍💻 Autor

Desarrollado por **Nicolas Baron Ortiz** 🚀
*Proyecto enfocado en sistemas distribuidos y diseño de interfaces modernas.*
