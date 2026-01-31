const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'secreto_valenti',
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
    fs.appendFileSync(path.join(__dirname, 'logs', 'accesos.txt'), log);

    res.locals.tema = req.cookies.tema || 'light';
    res.locals.usuario = req.session.usuario || null;
    next();
});

app.get('/', (req, res) => {
    res.render('inicio');
});

app.get('/registro', (req, res) => {
    res.render('registro', { errores: null });
});

app.post('/registro', (req, res) => {
    const { nombre, email, edad, ciudad, intereses } = req.body;
    let errores = [];

    if (!nombre || nombre.length < 2) errores.push("Nombre inválido");
    if (!email || !email.includes('@')) errores.push("Email inválido");
    if (!edad || parseInt(edad) <= 0) errores.push("Edad incorrecta");

    const rutaDb = path.join(__dirname, 'data', 'usuarios.json');
    let usuarios = [];
    if (fs.existsSync(rutaDb)) {
        usuarios = JSON.parse(fs.readFileSync(rutaDb));
    }

    if (errores.length > 0) {
        return res.render('registro', { errores });
    }

    usuarios.push({
        nombre,
        email,
        edad,
        ciudad,
        intereses
    });

    fs.writeFileSync(rutaDb, JSON.stringify(usuarios, null, 2));
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email } = req.body;
    const rutaDb = path.join(__dirname, 'data', 'usuarios.json');
    const usuarios = JSON.parse(fs.readFileSync(rutaDb));
    const usuario = usuarios.find(u => u.email === email);

    if (!usuario) {
        return res.send("Usuario no encontrado. <a href='/login'>Volver</a>");
    }

    req.session.usuario = usuario;
    if (!req.session.carrito) req.session.carrito = [];
    res.redirect('/perfil');
});

app.get('/perfil', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');
    res.render('perfil', {
        carrito: req.session.carrito
    });
});

app.get('/sesiones', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');
    res.render('sesiones');
});

app.post('/sesiones/agregar', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');
    const { sesion } = req.body;

    if (!req.session.carrito.includes(sesion)) {
        req.session.carrito.push(sesion);
        const log = `[${new Date().toISOString()}] Usuario ${req.session.usuario.email} añadió sesión: ${sesion}\n`;
        fs.appendFileSync(path.join(__dirname, 'logs', 'accesos.txt'), log);
    }
    res.redirect('/sesiones');
});

app.post('/perfil/eliminar', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');
    const { sesion } = req.body;

    req.session.carrito = req.session.carrito.filter(s => s !== sesion);
    const log = `[${new Date().toISOString()}] Usuario ${req.session.usuario.email} eliminó sesión: ${sesion}\n`;
    fs.appendFileSync(path.join(__dirname, 'logs', 'accesos.txt'), log);

    res.redirect('/perfil');
});

app.get('/preferencias', (req, res) => {
    res.render('preferencias');
});

app.post('/preferencias', (req, res) => {
    const { tema } = req.body;
    res.cookie('tema', tema, { maxAge: 900000, httpOnly: true });
    res.redirect('/preferencias');
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000, () => {
    console.log('Servidor activo en http://localhost:3000');
});
