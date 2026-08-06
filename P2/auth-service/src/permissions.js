// Fuente de verdad de qué roles pueden acceder a qué recurso.
// Vive AQUÍ, en el microservicio de autorización, desacoplado del backend principal.
const RESOURCE_ROLES = {
  ruta1: ['admin'], // Solo Admin
  ruta2: ['admin', 'cliente'], // Admin y Cliente
};

module.exports = { RESOURCE_ROLES };
