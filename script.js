"use strict";

/* ====================================================
   Selector de tema claro/oscuro para la web personal.
   La elección se conserva en localStorage.
   ==================================================== */

// Localizar el botón y el elemento raíz (<html>).
const botonTema = document.getElementById("boton-tema");
const pagina = document.documentElement;
const CLAVE_TEMA = "tema";

/** Guardar el tema sin interrumpir la web si el navegador lo impide. */
function guardarTema(tema) {
    try {
        localStorage.setItem(CLAVE_TEMA, tema);
    } catch (error) {
        console.warn("No se pudo guardar la preferencia del tema.");
    }
}

/** Leer la elección previa; si no existe, usar el diseño oscuro original. */
function obtenerTemaGuardado() {
    try {
        const tema = localStorage.getItem(CLAVE_TEMA);
        if (tema === "claro" || tema === "oscuro") return tema;
    } catch (error) {
        console.warn("No se pudo recuperar la preferencia del tema.");
    }
    return "oscuro";
}

/** Aplicar el tema, actualizar el botón y guardar la preferencia. */
function aplicarTema(tema) {
    const esOscuro = tema === "oscuro";

    // El CSS usa el atributo data-tema para seleccionar sus colores.
    pagina.dataset.tema = tema;

    // El botón indica la acción disponible, no el tema actual.
    botonTema.textContent = esOscuro ? "☀️ Modo claro" : "🌙 Modo oscuro";

    // aria-pressed=true indica que el modo oscuro está activo.
    botonTema.setAttribute("aria-pressed", String(esOscuro));
    guardarTema(tema);
}

// Inicializar una vez cargado el script (está al final del <body>).
if (botonTema) {
    aplicarTema(obtenerTemaGuardado());

    // Alternar al pulsar y recordar la nueva elección.
    botonTema.addEventListener("click", function () {
        const nuevoTema = pagina.dataset.tema === "oscuro" ? "claro" : "oscuro";
        aplicarTema(nuevoTema);
    });
}
