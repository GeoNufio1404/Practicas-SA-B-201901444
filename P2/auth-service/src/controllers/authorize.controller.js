const { RESOURCE_ROLES } = require('../permissions');

// Tasa de fallo simulado, solo para PROBAR que el retry loop del backend
// realmente funciona. En 0 (default) el servicio nunca falla a propósito.
// Configúrala temporalmente vía env var para hacer la prueba y luego vuélvela a 0.
const SIMULATED_FAILURE_RATE = parseFloat(process.env.SIMULATE_FAILURE_RATE || '0');

function authorize(req, res) {
  // Simulación de falla temporal / timeout, solo con fines de prueba del retry loop.
  if (Math.random() < SIMULATED_FAILURE_RATE) {
    // No respondemos nada -> el cliente (backend) eventualmente hace timeout.
    return; // deja la conexión colgada hasta que el timeout del backend actúe
  }

  const { rol, recurso } = req.body;

  if (!rol || !recurso) {
    return res.status(400).json({ error: 'rol y recurso son requeridos.' });
  }

  const rolesPermitidos = RESOURCE_ROLES[recurso];

  if (!rolesPermitidos) {
    return res.status(404).json({ error: `Recurso desconocido: ${recurso}` });
  }

  const permitido = rolesPermitidos.includes(rol);

  return res.status(200).json({ permitido });
}

module.exports = { authorize };
