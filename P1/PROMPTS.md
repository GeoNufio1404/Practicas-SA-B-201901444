# Prompts

IA utilizada: Claude

# Instrucciones generales para todo el proyecto

![alt text](image.png)

## Prompt Completo

```
Actúa como un Ingeniero de Software Senior experto en arquitectura limpia y buenas prácticas. Vamos a desarrollar un CRUD sencillo para la gestión de Solicitudes. Te detallo los requisitos, restricciones y la estructura que debes seguir:

1. Endpoints a implementar
Debes generar los endpoints estándar para un CRUD de solicitudes:
* Crear una solicitud.
* Obtener el listado de solicitudes.
*Obtener el detalle de una solicitud específica.
*Actualizar una solicitud existente.
*Eliminar una solicitud.

2. Arquitectura del Proyecto
Yo te proporcionare la estructura de archivos y carpetas del proyecto. 
* Tu deber es mantenerla y respetarla en todo momento.

Estructura base: El proyecto se organiza estrictamente en las siguientes capas o módulos: controllers, services, models, routes, middlewares y config.

Regla de cambio: Si consideras que es estrictamente necesario cambiar o reestructurar algo de esta arquitectura, NO lo hagas directamente. Primero debes justificar detalladamente el porqué del cambio y esperar mi aprobación.

3. Restricciones del Desarrollo 
Flujo Modular: No entregues todo el código de un solo golpe. Trabaja de manera modular, componente por componente (por ejemplo, empieza por las rutas y modelos, luego servicios, etc.). Detén tu respuesta en cada módulo y pregúntame si podemos avanzar al siguiente.

Principios SOLID: Cada línea de código que escribas debe respetar y aplicar visiblemente los principios SOLID (Responsabilidad Única, Abierto/Cerrado, Sustitución de Liskov, Segregación de Interfaces e Inversión de Dependencias). Antes de pasar al siguiente módulo, confírmame brevemente cómo se están cumpliendo estos principios en lo que acabas de escribir.Pruebas y Cobertura: Todo el código implementado debe incluir sus respectivas pruebas (unitarias o de integración según corresponda al módulo) para asegurar su correcto funcionamiento.Cero Código sin Verificar: Asegúrate de que todo el código que me entregues sea funcional, lógicamente consistente y libre de errores sintácticos o de referencia.Restricción de Formato: Queda estrictamente prohibido el uso de emojis en tus explicaciones o respuestas. Mantén un tono puramente profesional y técnico.

4. Documentación del Código
Cada función, clase o método debe incluir una explicación breve, concisa y clara de lo que hace. El objetivo es que cualquier persona, independientemente de su nivel técnico, pueda leer los comentarios o la descripción adjunta y ubicarse rápidamente en el flujo del código.Para iniciar, confírmame que has entendido todas las restricciones y la estructura solicitada, y pídeme la información del lenguaje/framework que usaremos o la definición de la estructura de carpetas para el primer módulo.
```

# 1. Conexion inicial  con neonDB

## 1.1 Prompt

Siguiendo la arquitectura de carpetas actual, me ayudaras con la primera  conexion con neonDB, tengo creado el proyecto con el connection string, siempre siguiendo los principios solid, me enseñaras a realizar una peticion sencilla, por ejemplo  un post, con la finalidad de saber como continuar.

restricciones:

* No modificaras la estructura de carpetas actual, si consideras que deberian tener un cambio, me notificaras y justificaras el porque del cambio
* Respetaras los principios  solid

## 1.2 Respuesta

![alt text](images/prompt1.png)

![alt text](images/prompt1_2.png)

## 1.3 Analisis

# 2. Endpoint GET (Con POST ya implementado)

## 2.1 Prompt
Necesito agregar un endpoint GET que liste todas las solicitudes operativas, siguiendo la misma arquitectura en capas (routes/controller/service/repository) que ya tengo para el POST. Debe respetar la interfaz ISolicitudRepository existente, usar consultas parametrizadas y devolver 200 con un array JSON.


## 2.2 Respuesta

![prompt2](images/prompt2.png)

![alt text](images/prompt2_1.png)

## 2.3 Analisis 

- Verifique que el ORDER BY no permitiera inyeccion (no recibe input del
  usuario, es una constante en el codigo).
- Confirme que el metodo se agrego a la interfaz ISolicitudRepository
  antes de implementarlo, para mantener consistencia con ISP.
- Ajuste el nombre del metodo en el service a "obtenerTodas" en español
  para mantener consistencia con "crearSolicitud".

## 3. Endpoints PUT y PATCH con manejo de 404

## 3.1 Prompt
Agrega actualizacion completa (PUT) y actualizacion exclusiva de estado
(PATCH) siguiendo la arquitectura existente. El PATCH no debe poder
modificar ningun otro campo aparte de estado, ni siquiera si el cliente
lo envia. Si el id no existe, debe responder 404 usando la clase AppError
que ya existe en el proyecto.

## 3.2 Respuesta

![alt text](images/prompt3.png)

![alt text](images/prompt3_1.png)

## 3.3 Analisis 

- La IA inicialmente puso el chequeo de "no encontrado" dentro del
  repositorio (haciendo que haya un error). Lo modifique para que el repositorio devuelva null y sea el SolicitudService quien decida   lanzar el 404, manteniendo la logica de negocio fuera de la capa
  de acceso a datos (separacion de responsabilidades).
- Separe "actualizarEstado" como metodo independiente de "actualizarSolicitud" en el service, en vez de un unico metodo con parametros opcionales, para que fuera imposible pasar accidentalmente otros campos al actualizar solo el estado.
- Agregue validacion de formato UUID en el :id antes de llegar al controller, para evitar una consulta innecesaria a la base de datos con un id mal formado.