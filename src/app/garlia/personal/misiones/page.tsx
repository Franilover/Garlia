import Misiones from "@/features/garlia/views/misiones";

export default async function Page() {
  const datos = {
    username: "",
    avatar_url: "",
  };

  return (
    <Misiones
      datos={{
        username: datos.username,
        avatar_url: datos.avatar_url,
      }}
    />
  );
}
