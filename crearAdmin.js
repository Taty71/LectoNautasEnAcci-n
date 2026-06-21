require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('./models/Usuario');

async function crearAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB...');

    const emailAdmin = 'admin@lectonautas.com';
    const existeAdmin = await Usuario.findOne({ email: emailAdmin });

    if (existeAdmin) {
      console.log('El administrador ya existe en la base de datos.');
      process.exit(0);
    }

    const nuevoAdmin = new Usuario({
      nombre: 'Administrador',
      apellido: 'Principal',
      email: emailAdmin,
      password: 'adminpassword123', // El modelo se encargará de encriptarla
      dni: '12345678',
      rol: 'Administrador'
    });

    await nuevoAdmin.save();
    console.log('¡Administrador creado con éxito!');
    console.log('-----------------------------------');
    console.log(`Correo: ${emailAdmin}`);
    console.log(`Contraseña: adminpassword123`);
    console.log('-----------------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error('Error al crear administrador:', error);
    process.exit(1);
  }
}

crearAdmin();
