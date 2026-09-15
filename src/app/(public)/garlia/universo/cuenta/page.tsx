import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";
import Personal from "@/domains/garlia/perfil-jugador/PerfilJugador";

export default async function Page() {
  const datos = {
    username: "",
    status: "",
    avatar_url: "",
    inventario_usuario: [],
  };

  return (
    <PaginaUniversoPlantilla slug="cuenta" fullBleed>
      <Personal
        datos={{
          username: datos.username,
          status: datos.status,
          avatar_url: datos.avatar_url,
          inventario_usuario: datos.inventario_usuario,
        }}
      />
    </PaginaUniversoPlantilla>
  );
}
