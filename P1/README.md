# Practicas-SA-B-201901444

## Principios SOLID

## "Cheatsheet" de SOLID

S: Un solo trabajo para cada quien.
O: Cambiar piezas como Legos, sin romper la base.
L: Los repuestos deben encajar perfectamente.
I: No colocar herramientas innecesarias.
D: Conectarse a enchufes estandares, no encadenarse a una sola marca.

### Principio S - Solo una responsabilidad

Estre principio nos dice como cada herramiente debe hacer solamente una cosa, pero hacerla bien. Ademas de que se busca que en el caso que se deba cambiar algo, se pueda hacer sin afectar otras partes de nuestro sistema.

### Principio O - Abierto a extension, cerrado a modificacion

Este principio nos dice que una clase debe ser capaz de agregar nuevas funcionalidades sin romper las que ya existen. Se logra utilizando herencia de clase evitando modificar las clases que ya existen ya que solo las manda a llamar para hacer uso de sus funcionalidades.

### Principio L - Principio de sustitucion de Liskov

Este principio nos dice que se se debe utilziar cierto "molde" en el cual cada objeto debe ser capaz de ser reemplazado por otro sin romper el programa. Es decir que si yo quiero hacer una funcion y esta puede ser utiliada por 2 objetos diferentes, estos deben ser capaces de usarla sin romper el programa.  

### Principio I - Principio de segregacion de interfaces

Este principio nos dice que es mejor tener varias interfaces pequeñas que una sola interface grande. Evitando asi la carga de metodos que no siempre se estaran utilizando de manera completa, sino parcial.

### Principio D - Principio de inversion de dependencias

Este principio nos dice que no deberiamos encasillarnos en una sola tecnologia, sino que deberiamos trabajar con "estandares" para que el momento que queramos cambiar de tecnologia lo podamos hacer sin romper el programa y no tener que modificar absolutamente todo el codigo existente.

## Ejemplos dentro del codigo donde se utilizo cada principio

- S 
    - SolicitudService: solo se encarga de la logica de negocio sobre solicitudes operativas. No sabe nada de HTTP ni de SQL.
    - SolicitudController: solo sabe traducir HTTP <-> service. No valida reglas de negocio ni construye SQL.
    - SolicitudPostgresService: solo se encarga de la persistencia de datos en PostgreSQL. No sabe nada de HTTP ni de logica de negocio.
- O 
    - Se puede agregar nuevos repositorios sin modificar el servicio o el controlador.
    - Se puede agregar nuevos validadores sin modificar el servicio o el repositorio.
- L 
    - Se puede reemplazar el repositorio con otro sin modificar el servicio.
    - Se puede reemplazar el controlador con otro sin modificar el repositorio.
- I 
    - Se puede agregar nuevos metodos al repositorio sin modificar el servicio.
    - Se puede agregar nuevos metodos al controlador sin modificar el repositorio.
- D 
    - Se puede agregar nuevos repositorios sin modificar el servicio.
    - Se puede agregar nuevos controladores sin modificar el repositorio.
