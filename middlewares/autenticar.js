const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const cabecera = req.headers.authorization;

  if (!cabecera || !cabecera.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token no enviado.' });
  }

  const token = cabecera.split(' ')[1];

  try {
    const secreto = process.env.JWT_SECRET;
    if (!secreto) {
      return res.status(500).json({ success: false, error: 'JWT_SECRET no configurado.' });
    }

    const payload = jwt.verify(token, secreto);
    req.usuario = payload;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido o vencido.' });
  }
}

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ success: false, error: 'Acceso no autenticado.' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ success: false, error: 'No tiene permisos para esta acción.' });
    }

    next();
  };
}

module.exports = { verificarToken, permitirRoles };
