# Taskia — frontend

Interfaz web de **Taskia**, una app de estudio para alumnos con un panel para el adulto que los acompaña.

El alumno organiza tareas, estudia con un tutor de IA (chat y pizarra) y practica en mundos con misiones y desafíos. El adulto no usa el tablero: entra al panel administrativo para crear cuentas, asignar cursos y ver el progreso.

La API vive en `[taskia_backend](../taskia_backend)`. Este paquete solo habla con ella (`VITE_API_URL`) y guarda la sesión en una cookie httpOnly que el navegador envía solo (`credentials: 'include'`).

## Qué puede hacer cada rol

### Alumno

- Iniciar sesión. No hay registro público: las cuentas las crea un adulto.
- **Tablero kanban** de tareas (Pendiente, En proceso, En estudio, Terminado), con arrastrar y soltar, filtros y candado de estudio en dificultades altas.
- Crear y editar tareas (curso, dificultad, tipo diaria/proyecto, vencimiento, pizarra opcional).
- **Modo estudio** de una tarea: chat con el tutor (Gemini), fases de comprensión / práctica / repaso, voz a texto (revisar y sumar a la caja, sin enviar de frente) y pizarra Excalidraw si la tarea la usa.
- **Mundos**: crear mundos, agregar cursos, crear o importar misiones, estudiar un tema y lanzar desafíos (mundo, curso o misión).
- Tema claro/oscuro y color de acento.



### Administrador

Al entrar, la app abre solo el panel (`AdminPage`):

- Dashboard con indicadores, gráficas y listado de alumnos.
- Crear y editar alumnos, pausar o reactivar cuentas.
- Asignar materias (crear, archivar, importar desde otro alumno).
- Ficha del alumno: resumen, tareas, sesiones de estudio, mundos y revisión de desafíos.



## Stack

- React 19 + TypeScript + Vite
- Framer Motion, Phosphor Icons
- `@dnd-kit` (tablero)
- Excalidraw (pizarra)
- Recharts (dashboard admin)

La navegación no usa React Router: `App.tsx` cambia de vista (`board`, `study`, `worlds`, `world`, `course`, `mission`, `challenge`). Al arrancar se llama a `GET /auth/me`; mientras responde se muestra el loader.

## Cómo correrlo

1. Copia `.env.example` a `.env.development`.
2. Asegúrate de que el backend esté en marcha (por defecto `http://localhost:3001`).
3. Instala y arranca:

```bash
npm install
npm run dev
```

Vite usa `--mode development` y lee `.env.development`.


| Script                                    | Qué hace                                                           |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                             | Desarrollo local (`.env.development`)                              |
| `npm run dev:pd`                          | Mismo Vite con `.env.pd`                                           |
| `npm run build` / `build:qa` / `build:pd` | Build según modo (`qa` o `pd` congela `VITE_API_URL` en el bundle) |
| `npm run preview` / `preview:pd`          | Sirve el build                                                     |


Variable de entorno:

```
VITE_API_URL=http://localhost:3001
```

Si el front y la API están en dominios distintos (por ejemplo dos servicios en Render), el backend tiene que enviar la cookie con `SameSite=None` y `Secure`. Ver el README del backend.

## Carpetas

```
src/
  App.tsx            Vistas y sesión
  api.ts             Cliente HTTP
  pages/             Tablero, estudio, auth, admin, mundos
  components/        UI compartida, estudio, mundos
  accent.tsx         Color de acento
  theme.tsx          Claro / oscuro
```

