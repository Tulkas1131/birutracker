
# BiruTracker - Documentación del Proyecto

¡Bienvenido a la documentación de BiruTracker! Esta guía te ayudará a entender cómo funciona la aplicación, cómo está estructurada y cómo puedes realizar modificaciones o añadir nuevas funcionalidades en el futuro.

## 1. ¿Qué es BiruTracker?

BiruTracker es una aplicación web diseñada para cervecerías y distribuidores que permite llevar un control preciso de activos retornables, como barriles de cerveza (Kegs) y cilindros de CO₂. La aplicación permite registrar activos (individualmente o por lotes), clientes y los movimientos de entrada y salida de los activos, manteniendo un historial completo de cada operación.

Una de sus características clave es el uso de **códigos QR** para agilizar el registro de movimientos, permitiendo a los operadores escanear activos directamente con la cámara de su dispositivo móvil o subiendo una imagen del QR en un ordenador.

---

## 2. Guía Rápida de Uso

Aquí te explicamos de forma sencilla cómo usar la aplicación en tu día a día.

### Paso 1: Crear tu Cuenta

Para registrarte, un administrador primero debe añadir tu correo electrónico a una lista de usuarios permitidos. Una vez que tu correo esté autorizado, simplemente ve a la página de registro, introduce tu email y crea una contraseña. ¡Y listo!

### Paso 2: Dar de Alta tus Barriles (Activos)

Antes de mover nada, necesitas registrar tus barriles y cilindros en el sistema.

1.  **Ve a la sección "Activos"**: Aquí puedes crear un barril individual o, si tienes muchos iguales, usar la opción **"Crear Lote"** para generar varios a la vez (por ejemplo, 20 barriles de 50L).
2.  **Imprime los Códigos QR**: Cada barril creado tendrá un código QR único. Puedes imprimirlos individualmente o usar el botón **"Imprimir Lote de QR"** para generar una hoja A4 con una cuadrícula de etiquetas. Cada etiqueta tiene un borde punteado para delimitarla visualmente, manteniendo los márgenes de la hoja simétricos. Pega cada QR en su barril físico correspondiente.

### Paso 3: El Ciclo de Vida de un Barril

Este es el proceso completo que sigue un barril, gestionado desde la sección **"Registrar Movimiento"**.

#### **Fase 1: El barril sale de la planta (Lleno)**

*   **Acción**: Selecciona **"Salida a Reparto"**.
*   **¿Qué haces?**: Escanea el QR del barril que estás cargando en el camión y selecciona el cliente al que va destinado.
*   **Resultado**: El barril ahora figura como "En Reparto".

#### **Fase 2: El barril llega al cliente**

*   **Acción**: Selecciona **"Entrega a Cliente"**.
*   **¿Qué haces?**: Al llegar al bar o local, escanea el QR del barril que estás entregando. La app ya sabrá a qué cliente pertenece.
*   **Resultado**: El barril queda registrado como "En Cliente". ¡Ahora puedes ver en el historial cuántos días lleva allí!

#### **Fase 3: Recoges el barril del cliente (Vacío)**

*   **Acción**: Selecciona **"Recolección de Cliente"**.
*   **¿Qué haces?**: Cuando vayas a retirar el barril vacío, escanea su QR. La app lo asociará automáticamente con el cliente correcto.
*   **Resultado**: El barril vuelve a figurar como "En Reparto", pero esta vez volviendo a la planta.

#### **Fase 4: El barril vuelve a la planta**

*   **Acción**: Selecciona **"Recepción en Planta"**.
*   **¿Qué haces?**: Al descargar el camión en tu planta, escanea el QR del barril vacío que ha regresado.
*   **Resultado**: El barril figura como "En Planta" y "Vacío", listo para ser lavado y llenado de nuevo. **¡El ciclo se ha completado!**

¡Con estos pasos, tendrás un control total sobre dónde está cada uno de tus activos en todo momento!

---

## 3. Tecnologías Utilizadas

La aplicación está construida con un conjunto de tecnologías modernas y robustas:

- **Framework Frontend:** [Next.js](https://nextjs.org/) (con React y App Router)
- **Base de Datos:** [Cloud Firestore](https://firebase.google.com/docs/firestore) (de Firebase)
- **Autenticación de Usuarios:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Hosting:** [Firebase App Hosting](https://firebase.google.com/docs/hosting)
- **Estilos y Componentes UI:** [Tailwind CSS](https://tailwindcss.com/) y [ShadCN UI](https://ui.shadcn.com/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **Escaneo de QR:** [html5-qrcode](https://github.com/mebjas/html5-qrcode)

---

## 4. Estructura de la Base de Datos (Firestore)

La base de datos en Firestore es el corazón de la aplicación. Se organiza en las siguientes colecciones:

- **`allowed_emails`**:
  - **Propósito:** Funciona como una "lista de invitados". Contiene los correos electrónicos de las personas que tienen permiso para registrarse. Si un correo no está aquí, el registro falla.
  - **Campos:** `email` (string), `role` (string, "Admin" u "Operador").

- **`users`**:
  - **Propósito:** Almacena la información de los usuarios que ya se han registrado, asociando su UID de Firebase con su rol.
  - **Campos:** `email` (string), `role` (string).

- **`assets`**:
  - **Propósito:** Contiene un documento por cada activo físico (barril o cilindro de CO₂).
  - **Campos:** `code`, `type`, `format`, `state`, `location`, `variety`.

- **`customers`**:
  - **Propósito:** Almacena la información de los clientes (bares, distribuidores, etc.).
  - **Campos:** `name`, `type`, `address`, `contact`, `phone`.

- **`events`**:
  - **Propósito:** Es el historial de todos los movimientos. Cada vez que se registra una salida o un retorno, se crea un nuevo documento en esta colección.
  - **Campos:** `asset_code`, `asset_id`, `customer_id`, `customer_name`, `event_type`, `timestamp`, `user_id`, `variety`.

- **`app_logs`**:
  - **Propósito:** Guarda un registro de eventos importantes y errores que ocurren en la aplicación. Solo es visible para los administradores y ayuda a diagnosticar problemas.
  - **Campos:** `timestamp`, `level`, `message`, `component`, `userEmail`, `stack` (opcional).

---

## 5. Funcionalidades Clave y Estructura de Archivos

La estructura de archivos clave se encuentra dentro de la carpeta `src/`.

### 5.1. Panel de Control (`src/app/dashboard/page.tsx`)

- **Resumen Visual del Inventario:** Muestra un gráfico de barras apiladas que visualiza dónde se encuentran los activos (`En Planta`, `En Cliente`, `En Reparto`) y desglosa cada barra por tipo de activo (Barriles 50L, 30L y CO2), ofreciendo una visión completa de la distribución.
- **Top Clientes:** Incluye un gráfico de barras que clasifica a los clientes con la mayor cantidad de activos en su posesión, permitiendo identificar rápidamente a los clientes más importantes.
- **Tarjetas de Métricas Rápidas:** Presenta indicadores clave como el total de movimientos en las últimas 24 horas, el número de activos críticos (más de 30 días en un cliente) y los totales de activos y clientes.

### 5.2. Gestión de Activos (`src/app/dashboard/assets/page.tsx`)

- **Creación Individual y por Lotes:** Permite crear un único activo o generar múltiples activos a la vez (ej., 50 barriles de 50L) con códigos autoincrementales.
- **Generación e Impresión de QR:** Cada activo tiene un código QR único. La interfaz permite imprimir estos códigos, ya sea individualmente o en una hoja A4 para toda una categoría de activos. El diseño de impresión está optimizado con bordes punteados individuales para cada etiqueta y márgenes simétricos.
- **Contadores por Estado:** Muestra un resumen de cuántos activos de cada formato se encuentran `En Planta`, `En Cliente` y `En Reparto`.

### 5.3. Gestión de Clientes (`src/app/dashboard/customers/page.tsx`)

- **CRUD de Clientes:** Funcionalidad completa para crear, leer, actualizar y eliminar clientes.
- **Gestión de Teléfonos:** Permite añadir uno o varios números de teléfono por cliente, separados por comas. Cada número se convierte en un enlace `tel:` que, en dispositivos móviles, abre directamente la aplicación de teléfono para realizar una llamada, agilizando el contacto.

### 5.4. Registro de Movimientos (`src/app/dashboard/movements/page.tsx`)

- **Flujo Guiado por QR:** La funcionalidad principal se centra en el escaneo de un código QR. La aplicación identifica el activo, su estado actual (ej., `LLENO` y `EN_PLANTA`) y sugiere automáticamente la acción más lógica (ej., `SALIDA_A_REPARTO`).
- **Flexibilidad y Control Manual:** Aunque la app sugiere una acción, el operario puede seleccionar una "acción manual" diferente si la situación lo requiere (ej., registrar una devolución inesperada).
- **Compatibilidad Universal:** En dispositivos móviles, activa la cámara para un escaneo en tiempo real. En ordenadores de escritorio, ofrece la opción de subir un archivo de imagen, garantizando compatibilidad total.

### 5.5. Historial de Movimientos (`src/app/dashboard/overview/page.tsx`)

- **Trazabilidad Completa:** Muestra un registro paginado y en tiempo real de todos los eventos.
- **Filtros Avanzados:** Permite filtrar el historial por nombre de cliente, tipo de activo (Barril/CO2) y tipo de evento.
- **Alerta de Activos Críticos:** Incluye un interruptor para mostrar únicamente los activos que llevan 30 días o más en posesión de un cliente, resaltándolos visualmente para facilitar el seguimiento y la recuperación.

### 5.6. Logs del Sistema (Solo Admins) (`src/app/dashboard/logs/page.tsx`)

- **Diagnóstico y Monitoreo:** Esta sección, accesible solo para usuarios con rol de "Admin", muestra un registro de todos los eventos y errores que ocurren en la aplicación, facilitando la identificación y solución de problemas.

### 5.7. Tipos y Esquemas (`src/lib/types.ts`)

- **¡Archivo muy importante!** Define las estructuras de datos (tipos de TypeScript) y los esquemas de validación de formularios (con Zod). Si quieres añadir o modificar un campo en un activo o cliente, debes empezar por este archivo.

---

## 6. Progressive Web App (PWA)

La aplicación está configurada como una PWA, lo que significa que se puede "instalar" en la pantalla de inicio de un dispositivo móvil o en el escritorio de un ordenador para una experiencia similar a una app nativa.

- **Instalación:** Un botón de "Instalar App" aparece automáticamente en la interfaz si el navegador es compatible. En iOS, se proporcionan instrucciones para añadirla manually desde Safari.
- **Service Worker:** Utiliza un Service Worker para gestionar el caché y las actualizaciones de la aplicación. Cuando hay una nueva versión disponible, el sistema la detecta y actualiza la app automáticamente en la siguiente recarga.

---

## 7. Despliegue

El despliegue de esta aplicación se realiza a través de **Firebase App Hosting**.

- **Plan Gratuito:** La configuración actual del proyecto en el archivo `apphosting.yaml` está optimizada para mantenerse dentro de los límites del plan gratuito ("Spark") de Firebase.
- **Proceso:** Dentro de Firebase Studio, puedes usar el botón "Deploy" para publicar la versión más reciente de tu código a la URL de producción. El proceso es automático y se encarga de construir y optimizar la aplicación para el mejor rendimiento.
