const usuariosSistemas = [
    {user: "admin", pass: "admin2026", rol: "ADMIN"},
    {user: "torregranados", pass: "torre2026", rol: "OPERADOR"}
];

let usuarioActivo = null;

window.onload = () => {
    const savedUser = localStorage.getItem("rememberedUser");
    if(savedUser) {
        document.getElementById("loginUser").value = savedUser;
        document.getElementById("rememberMe").checked = true;
    }
};

let activos = JSON.parse(localStorage.getItem("activos")) || [];
activos = activos.map(v => ({...v, horaEntrada: new Date(v.horaEntrada), sellos: v.sellos || 0}));
let historial = JSON.parse(localStorage.getItem("historial")) || [];

// RELOJ
setInterval(() => {
    const relojCont = document.getElementById('reloj');
    if(!relojCont) return;
    const ahora = new Date();
    relojCont.innerText = ahora.toLocaleTimeString();
    document.getElementById('fecha').innerText = ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}, 1000);

// LOGIN
function login(){
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value.trim();
    const rem = document.getElementById("rememberMe").checked;
    const encontrado = usuariosSistemas.find(x => x.user === u && x.pass === p);

    if(encontrado) {
        if(rem) localStorage.setItem("rememberedUser", u);
        else localStorage.removeItem("rememberedUser");
        usuarioActivo = encontrado;
        document.getElementById("loginCard").style.display = "none";
        document.getElementById("appCard").style.display = "block";
        document.getElementById("userDisplay").innerHTML = `👤 ${usuarioActivo.rol}: ${usuarioActivo.user.toUpperCase()}`;
        actualizarLista();
    } else {
        alert("Usuario o contraseña incorrectos");
    }
}

// ENTRADA
function registrarEntrada(){
    let input = document.getElementById("plateInput");
    let placa = input.value.trim().toUpperCase();
    if(!placa) return;
    let v = {placa, horaEntrada: new Date(), user: usuarioActivo.user, sellos: 0};
    activos.push(v);
    localStorage.setItem("activos", JSON.stringify(activos));
    imprimirTicketEntrada(v);
    input.value = "";
    actualizarLista();
}

// OTROS COBROS
function cobrarTicketPerdido() {
    let placa = prompt("Ingrese la PLACA del vehículo:");
    if(!placa) return;
    historial.push({placa: "T. PERDIDO: " + placa.toUpperCase(), tipo: "TICKET PERDIDO", precio: 25, fecha: new Date().toLocaleDateString(), operador: usuarioActivo.user, valorSello: 0});
    localStorage.setItem("historial", JSON.stringify(historial));
    alert("Cobro de Ticket Perdido registrado (Q25)");
}

function cobrarBaño() {
    historial.push({placa: "USO DE BAÑO", tipo: "BAÑO", precio: 3, fecha: new Date().toLocaleDateString(), operador: usuarioActivo.user, valorSello: 0});
    localStorage.setItem("historial", JSON.stringify(historial));
    alert("Uso de baño registrado (Q3)");
}

function abrirModalMensual() { document.getElementById("modalMensual").style.display = "flex"; }
function cerrarModalMensual() { document.getElementById("modalMensual").style.display = "none"; }

function guardarMensualidad() {
    const nombre = document.getElementById("mNombre").value;
    const costo = parseFloat(document.getElementById("mCosto").value);
    if(!nombre || !costo) return alert("Faltan datos");
    historial.push({placa: `MENSUAL: ${nombre.toUpperCase()}`, tipo: "MENSUAL", precio: costo, fecha: new Date().toLocaleDateString(), operador: usuarioActivo.user, valorSello: 0});
    localStorage.setItem("historial", JSON.stringify(historial));
    cerrarModalMensual();
    alert("Pago mensual guardado");
}

// GESTIÓN DE SALIDAS
function agregarSello(index){
    activos[index].sellos += 1;
    let v = activos[index];
    let min = Math.ceil((new Date() - v.horaEntrada) / 60000);
    if((v.sellos * 30) >= min) darSalida(index);
    else { localStorage.setItem("activos", JSON.stringify(activos)); actualizarLista(); }
}

function darSalida(index){
    let v = activos[index];
    let salida = new Date();
    let minTotales = Math.ceil((salida - v.horaEntrada) / 60000);
    let minFinales = Math.max(0, minTotales - (v.sellos * 30));
    let inicial = v.placa[0];
    let precio = 0;
    
    let valSelloTotal = Math.ceil(minTotales / 30) * (inicial === "M" ? 3 : 5);
    if(minFinales > 0) precio = Math.ceil(minFinales / 30) * (inicial === "M" ? 3 : 5);

    let registro = {
        placa: v.placa,
        tipo: (minFinales === 0 && v.sellos > 0) ? "SELLO TOTAL" : "EFECTIVO",
        horaE: v.horaEntrada.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        horaS: salida.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        fecha: salida.toLocaleDateString(),
        sellos: v.sellos,
        valorSello: (v.sellos > 0) ? valSelloTotal - precio : 0,
        precio: precio,
        operador: usuarioActivo.user
    };

    historial.push(registro);
    imprimirTicketSalida(registro);
    activos.splice(index, 1);
    localStorage.setItem("activos", JSON.stringify(activos));
    localStorage.setItem("historial", JSON.stringify(historial));
    actualizarLista();
}

function actualizarLista(){
    let cont = document.getElementById("activeList");
    cont.innerHTML = "";
    activos.forEach((v, i) => {
        let div = document.createElement("div"); div.className = "vehiculo-item";
        div.innerHTML = `<div class="placa-badge">${v.placa}</div>
            <div style="display:flex; gap:8px;">
                <button class="btn-sello" onclick="agregarSello(${i})">SELLO (${v.sellos})</button>
                <button class="btn-salida-list" onclick="darSalida(${i})">SALIDA</button>
            </div>`;
        cont.appendChild(div);
    });
}

// HISTORIAL Y CIERRE DE TURNO
function toggleHistorial(){
    let box = document.getElementById("historialBox");
    if(box.style.display === "none") {
        box.style.display = "block";
        let html = historial.slice().reverse().map(h => `<div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;"><b>${h.placa}</b> - Q${h.precio} (${h.tipo})</div>`).join('');
        
        // LÓGICA DE BOTONES SEGÚN ROL
        if(usuarioActivo.rol === "ADMIN") {
            html += `<button class="ios-btn-danger" onclick="borrarHistorialTotal()">BORRAR TODO (ADMIN)</button>`;
        } else {
            html += `<button class="ios-btn-danger" style="background:#ff9500;" onclick="cerrarTurnoOperador()">CERRAR TURNO (BORRAR MI HISTORIAL)</button>`;
        }
        
        box.innerHTML = html || "Sin movimientos en este turno";
    } else box.style.display = "none";
}

function cerrarTurnoOperador(){
    if(confirm("¿Seguro que desea cerrar su turno? Esto borrará el historial actual para el siguiente operador.")){
        historial = [];
        localStorage.setItem("historial", JSON.stringify(historial));
        toggleHistorial();
        alert("Turno cerrado. El historial está limpio.");
    }
}

function borrarHistorialTotal(){
    if(confirm("¿BORRAR TODO EL HISTORIAL DEL SISTEMA?")){
        historial = [];
        localStorage.setItem("historial", JSON.stringify(historial));
        toggleHistorial();
    }
}

// TICKETS
function imprimirTicketEntrada(v){
    let w = window.open("","","width=300,height=450");
    w.document.write(`<html><body onload="window.print();window.close()"><center style="font-family:sans-serif; padding:20px; border:1px solid #000;">
        <img src="logotorre.png" width="100"><br>
        <h1 style="font-size:45px; margin:10px 0;">${v.placa}</h1>
        <p>ENTRADA: ${new Date().toLocaleTimeString()}</p>
        <p style="font-size:10px;">30 MIN GRATIS POR SELLO</p>
    </center></body></html>`);
    w.document.close();
}

function imprimirTicketSalida(h){
    let w = window.open("","","width=300,height=450");
    let visualPrecio = h.precio > 0 ? `Q${h.precio}.00` : `Q0.00 (Q${h.valorSello}.00)`;
    w.document.write(`<html><body onload="window.print();window.close()"><center style="font-family:sans-serif; padding:20px; border:1px solid #000;">
        <img src="logotorre.png" width="100"><br>
        <h1 style="font-size:40px; margin:10px 0;">${h.placa}</h1>
        <div style="background:#000; color:#fff; padding:10px;"><h2>${visualPrecio}</h2></div>
        <p style="font-size:12px; margin-top:10px;">E: ${h.horaE} | S: ${h.horaS}</p>
    </center></body></html>`);
    w.document.close();
}

// REPORTE A4
function generarReporteHTML() {
    let trabajador = prompt("Nombre del trabajador para el reporte:");
    if (!trabajador) return;

    let vehiculos = historial.filter(x => x.tipo === "EFECTIVO" || x.tipo === "SELLO TOTAL");
    let otrosServicios = historial.filter(x => x.tipo === "BAÑO" || x.tipo === "TICKET PERDIDO" || x.tipo === "MENSUAL");
    
    let totalCaja = historial.reduce((s, x) => s + x.precio, 0);
    let totalSoloVehiculos = vehiculos.reduce((s, x) => s + x.precio, 0);
    let totalOtros = otrosServicios.reduce((s, x) => s + x.precio, 0);
    let totalSellos = historial.reduce((s, x) => s + (x.valorSello || 0), 0);

    let reportContainer = document.createElement("div");
    reportContainer.style.position = "fixed"; 
    reportContainer.style.left = "-9999px";
    reportContainer.style.width = "595px"; 
    reportContainer.style.background = "white"; 
    reportContainer.style.padding = "40px";

    reportContainer.innerHTML = `
        <div style="border: 1px solid #000; padding: 30px; min-height: 800px; font-family: Arial;">
            <center>
                <img src="logotorre.png" width="180">
                <h1>REPORTE DE TURNO</h1>
            </center>
            <div style="display:flex; justify-content:space-between; margin-top:30px;">
                <span><b>OPERADOR:</b> ${trabajador.toUpperCase()}</span>
                <span><b>FECHA:</b> ${new Date().toLocaleDateString()}</span>
            </div>
            <hr>
            <h3>DETALLE DE VEHÍCULOS</h3>
            <table style="width:100%; font-size:12px; border-collapse:collapse;">
                <tr style="border-bottom:2px solid #000; text-align:left;"><th>Placa</th><th>Tipo</th><th style="text-align:right;">Monto</th></tr>
                ${vehiculos.map(x => `<tr><td style="padding:5px; border-bottom:1px solid #ddd;">${x.placa}</td><td>${x.tipo}</td><td style="text-align:right;">${x.precio > 0 ? 'Q'+x.precio+'.00' : 'Q0.00 (Q'+x.valorSello+')'}</td></tr>`).join('')}
            </table>

            ${otrosServicios.length > 0 ? `
                <h3 style="margin-top:20px;">OTROS SERVICIOS</h3>
                <table style="width:100%; font-size:12px; border-collapse:collapse;">
                    ${otrosServicios.map(x => `<tr><td style="padding:5px; border-bottom:1px solid #ddd;">${x.placa}</td><td style="text-align:right;">Q${x.precio}.00</td></tr>`).join('')}
                </table>
            ` : ''}

            <div style="margin-top:40px; border:2px solid #000; padding:20px; background:#f9f9f9;">
                <table style="width:100%; font-size:18px;">
                    <tr><td>Total Vehículos:</td><td style="text-align:right;">Q${totalSoloVehiculos}.00</td></tr>
                    <tr><td>Otros Servicios:</td><td style="text-align:right;">Q${totalOtros}.00</td></tr>
                    <tr style="font-size:24px; font-weight:bold;"><td>TOTAL CAJA:</td><td style="text-align:right;">Q${totalCaja}.00</td></tr>
                </table>
                <p style="font-size:12px; margin-top:10px;">* Pendiente por cobrar sellos: Q${totalSellos}.00</p>
            </div>
        </div>
    `;

    document.body.appendChild(reportContainer);
    html2canvas(reportContainer, {scale: 2}).then(canvas => {
        let link = document.createElement("a");
        link.download = `Reporte_${trabajador.toUpperCase()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        document.body.removeChild(reportContainer);
    });
}
