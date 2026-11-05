# Andén

Una sola pantalla para buscar una ruta de TransMilenio en Bogotá, ver los buses que la están operando y seguir uno: placa, próxima parada, tiempo estimado y un mapa compacto.

El navegador habla con este backend. El backend habla con el servidor MCP de Croma. La clave no sale del servidor.

## Qué datos hay

Croma publica, entre otras, estas herramientas: `transmilenio_routes_search`, `transmilenio_route`, `transmilenio_vehicles`, `transmilenio_stop_arrivals` y `transmilenio_alerts`.

- La placa llega en `license_plate`. Si viene vacía, la interfaz dice «Placa no publicada».
- La posición, la parada y el estado (`incoming_at`, `stopped_at`, `in_transit_to`) vienen en el vehículo.
- El tiempo estimado no viene en el vehículo. Está en las llegadas de su próxima parada (`minutes_away`) y solo se muestra si el `vehicle_id` coincide. Si no hay cruce, dice «Sin estimación».
- El recorrido es un GeoJSON `LineString` de la ruta, cuando Croma lo envía.

## Requisitos

- Node.js 20 o superior
- Una clave de Croma en el entorno del backend

## Configuración

```bash
cp backend/.env.example backend/.env
```

En `backend/.env`:

```bash
CROMA_API_KEY=tu_clave
PORT=8787
```

No pongas la clave en el frontend ni en el repositorio.

## Ejecución

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

- API: http://localhost:8787
- App: http://localhost:5173

## Pruebas

```bash
npm test
```

Cubren el parseo de la respuesta MCP, el cruce de llegadas por `vehicle_id` y los casos de placa o estimación ausentes. No llaman a Croma.

## Imágenes

La marca, la bienvenida, el vacío, el error y el bus del mapa se generaron con Ideogram y viven en `frontend/public`. La aplicación en marcha no vuelve a llamar a Ideogram ni a Refero.
