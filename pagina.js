// Mi Sara 💗 — descifra datos/m.bin con la clave y arma el chat.
// Formato (lo escribe herramientas/preparar.py): "MS1" + sal 16 + iv 12 + AES-256-GCM(JSON).
(() => {
  "use strict";

  const ITERACIONES = 310000;
  // 30-ago-2026, 7:16 p. m. en Colombia (UTC−5)
  const INICIO = Date.UTC(2026, 7, 31, 0, 16);
  const DOS_MESES = Date.UTC(2026, 9, 31, 0, 16);
  const DIA_MS = 86400000;

  const $ = (id) => document.getElementById(id);
  const form = $("formClave");
  const campo = $("clave");
  const boton = $("abrir");
  const aviso = $("aviso");

  let bytes = null;

  boton.disabled = false;

  async function leerBytes() {
    if (!bytes) {
      const r = await fetch("datos/m.bin", { cache: "no-store" });
      if (!r.ok) throw new Error("no se pudo leer");
      bytes = new Uint8Array(await r.arrayBuffer());
    }
    return bytes;
  }

  async function descifrar(clave) {
    const b = await leerBytes();
    const sal = b.slice(3, 19);
    const iv = b.slice(19, 31);
    const base = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveKey"]);
    const llave = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: sal, iterations: ITERACIONES, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, llave, b.slice(31));
    return JSON.parse(new TextDecoder().decode(plano));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const clave = campo.value.replace(/\D/g, "");
    if (!clave) return;
    boton.disabled = true;
    aviso.textContent = "abriendo…";
    let datos;
    try {
      datos = await descifrar(clave);
    } catch (err) {
      boton.disabled = false;
      aviso.textContent = err instanceof DOMException || err.name === "OperationError"
        ? "uy, esa no es 🌸 inténtalo otra vez"
        : "no cargó bien, revisa el internet y vuelve a intentar";
      form.classList.remove("tiembla");
      void form.offsetWidth;
      form.classList.add("tiembla");
      return;
    }
    mostrar(datos);
  });

  function plural(n, uno, varios) {
    return n === 1 ? uno : varios;
  }

  function textoDias() {
    const ahora = Date.now();
    const dias = Math.floor((ahora - INICIO) / DIA_MS);
    let t = `llevamos ${dias} ${plural(dias, "día", "días")} de pétalos 🌸`;
    if (ahora < DOS_MESES) {
      const faltan = Math.ceil((DOS_MESES - ahora) / DIA_MS);
      t += ` · ${plural(faltan, "falta", "faltan")} ${faltan} ${plural(faltan, "día", "días")} para los dos meses`;
    }
    return t;
  }

  function fechaLarga(iso) {
    const [a, m, d] = iso.split("-").map(Number);
    const f = new Date(Date.UTC(a, m - 1, d, 12));
    return f.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  }

  function horaBonita(hhmm) {
    let [h, m] = hhmm.split(":").map(Number);
    const sufijo = h < 12 ? "a. m." : "p. m.";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${sufijo}`;
  }

  function nodo(tag, clase, texto) {
    const el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto != null) el.textContent = texto;
    return el;
  }

  function mostrar(datos) {
    $("dias").textContent = textoDias();
    $("portadaTexto").textContent = datos.portada;
    $("cierreTexto").textContent = datos.cierre;

    const caja = $("globos");
    let diaAnterior = "";
    let quienAnterior = "";
    for (const g of datos.globos) {
      if (g.f !== diaAnterior) {
        caja.appendChild(nodo("div", "dia", fechaLarga(g.f)));
        diaAnterior = g.f;
        quienAnterior = "";
      }
      const globo = nodo("div", `globo ${g.q}${g.q !== quienAnterior ? " primero" : ""}`);
      globo.appendChild(document.createTextNode(g.t));
      globo.appendChild(nodo("span", "hora", horaBonita(g.h)));
      caja.appendChild(globo);
      quienAnterior = g.q;
    }

    const c = datos.cifras;
    const cifras = $("cifras");
    cifras.appendChild(nodo("p", "chico", "desde la otra página hasta hoy"));
    cifras.appendChild(nodo("p", "grande", c.mensajes.toLocaleString("es-CO")));
    cifras.appendChild(nodo("p", null, "mensajes entre tú y yo"));
    cifras.appendChild(nodo("p", "grande", (c.te_amo_el + c.te_amo_ella).toLocaleString("es-CO")));
    cifras.appendChild(nodo("p", null, "«te amo»"));
    cifras.appendChild(nodo("p", "chico", `${c.te_amo_el} míos y ${c.te_amo_ella} tuyos 🙈`));

    $("entrada").hidden = true;
    $("chat").hidden = false;
    window.scrollTo(0, 0);
    animarAlBajar();
  }

  function animarAlBajar() {
    const cosas = document.querySelectorAll(".globo, .aparece");
    if (!("IntersectionObserver" in window)) {
      cosas.forEach((el) => el.classList.add("ver"));
      return;
    }
    const io = new IntersectionObserver((entradas) => {
      for (const en of entradas) {
        if (en.isIntersecting) {
          en.target.classList.add("ver");
          io.unobserve(en.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    cosas.forEach((el) => io.observe(el));
  }
})();
