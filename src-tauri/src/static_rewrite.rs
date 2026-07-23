// Replica, dentro de la app de Tauri, los `rewrites` de vercel.json.
//
// Contexto: el sitio usa `output: "export"` (HTML estático) y rutas
// dinámicas tipo `/garlia/libros/[id]` que solo se prerrenderizan como
// `.../placeholder`. En la web, vercel.json reescribe cualquier
// `/garlia/libros/mi-slug` hacia el archivo `placeholder` PERO deja la URL
// del navegador intacta, así que el componente cliente puede leer el slug
// real desde `window.location`. Tauri sirve los archivos del build
// (`frontendDist`) directo, sin ningún motor de rewrites, así que
// cualquier id que no sea literalmente "placeholder" da 404.
//
// Esta función decide, para un path pedido por el WebView, qué archivo del
// build hay que devolver en su lugar (sin tocar la URL visible).
pub fn rewrite_path(path: &str) -> String {
    let segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

    let rewritten: Vec<String> = match segments.as_slice() {
        // /garlia/libros/:id/leer/:capId
        ["garlia", "libros", _id, "leer", _cap_id] => vec![
            "garlia".into(),
            "libros".into(),
            "placeholder".into(),
            "leer".into(),
            "placeholder".into(),
        ],
        // /garlia/libros/:id
        ["garlia", "libros", _id] => {
            vec!["garlia".into(), "libros".into(), "placeholder".into()]
        }
        // /garlia/canciones/:id
        ["garlia", "canciones", _id] => {
            vec!["garlia".into(), "canciones".into(), "placeholder".into()]
        }
        // /garlia/personal/:username
        ["garlia", "personal", _username] => {
            vec!["garlia".into(), "personal".into(), "placeholder".into()]
        }
        // /personal/mensajes/:id
        ["personal", "mensajes", _id] => {
            vec!["personal".into(), "mensajes".into(), "placeholder".into()]
        }
        _ => return path.to_string(),
    };

    format!("/{}", rewritten.join("/"))
}

#[cfg(test)]
mod tests {
    use super::rewrite_path;

    #[test]
    fn reescribe_libro() {
        assert_eq!(
            rewrite_path("/garlia/libros/mi-novela"),
            "/garlia/libros/placeholder"
        );
    }

    #[test]
    fn reescribe_capitulo() {
        assert_eq!(
            rewrite_path("/garlia/libros/mi-novela/leer/cap-3"),
            "/garlia/libros/placeholder/leer/placeholder"
        );
    }

    #[test]
    fn reescribe_cancion() {
        assert_eq!(
            rewrite_path("/garlia/canciones/mi-cancion"),
            "/garlia/canciones/placeholder"
        );
    }

    #[test]
    fn reescribe_personal() {
        assert_eq!(
            rewrite_path("/garlia/personal/algun_user"),
            "/garlia/personal/placeholder"
        );
    }

    #[test]
    fn reescribe_mensajes() {
        assert_eq!(
            rewrite_path("/personal/mensajes/123"),
            "/personal/mensajes/placeholder"
        );
    }

    #[test]
    fn no_toca_rutas_no_dinamicas() {
        assert_eq!(rewrite_path("/garlia/libros"), "/garlia/libros");
        assert_eq!(rewrite_path("/_next/static/chunk.js"), "/_next/static/chunk.js");
        assert_eq!(rewrite_path("/"), "/");
    }

    #[test]
    fn ya_es_placeholder_no_rompe() {
        assert_eq!(
            rewrite_path("/garlia/libros/placeholder"),
            "/garlia/libros/placeholder"
        );
    }
}
