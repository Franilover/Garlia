// page.tsx
import Personal from "@/paginas/wiki/personal";

// Solo pasa los datos que SÍ sigues trayendo desde el servidor
<Personal datos={{
  username: datos.username,
  status: datos.status,
  avatar_url: datos.avatar_url,
  inventario_usuario: datos.inventario_usuario, // si lo traes del server
}} />