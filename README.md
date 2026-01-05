# MoreMaps
<p align="center">
  <img width="100" height="100" alt="logo" src="https://github.com/user-attachments/assets/dfd79a29-dee4-49b5-b1d3-5bdb4dd2454c" /><br><br>
  <a href="https://github.com/MoreMaps/MoreMaps/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat" alt="build"/></a>
  <a href="https://ei1041-moremaps.web.app/"><img src="https://img.shields.io/badge/release-website-blue?style=flat" alt="release"/></a>
</p>
Proyecto conjunto de las asignaturas EI1039 Diseño del Software y EI1048 Paradigmas del Software, realizado por Carlos Manuel Járrega Camargo, Daniel Ortiz Salvador y Diego Roig Lecha.

# Contenidos
- [Descripción breve del proyecto](#descripción-breve-del-proyecto)  
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [API principales y su uso](#api-principales-y-su-uso)


## Descripción breve del proyecto
El objetivo del proyecto es desarrollar una aplicación que permita identificar puntos de interés en un mapa y trazar rutas entre ellos utilizando vehículos registrados, permitiendo acceso a los datos guardados en cualquier momento. Para ello, el grupo ha optado por crear una aplicación web utilizando TypeScript y el framework Angular.


El proceso de desarrollo se ha realizado siguiendo la metodología ágil de Desarrollo Guiado por Pruebas de Aceptación (ATDD, por sus siglas en inglés). Para ello se han implementado pruebas de aceptación que aportan valor al usuario por cada requisito funcional, junto a pruebas de integración que permiten verificar el correcto funcionamiento del código sin depender de servicios externos. También se busca aplicar patrones de diseño adecuados que faciliten la comprensión y el mantenimiento del código.


## Tecnologías utilizadas
El proyecto está escrito mayoritariamente en TypeScript, al ser el lenguaje nativo del framework Angular, sobre el que se ha desarrollado la aplicación. La versión de Angular utilizada ha sido la 20.3.10. Está constituido principalmente por un mapa basado en la librería [Leaflet](https://leafletjs.com) sobre el cual se pueden visualizar puntos de interés y rutas en coche, bicicleta o a pie.
Todos los datos pertinentes (usuarios, puntos de interés, vehículos, rutas) se guardan mediante Firestore, desarrollado por [Google Firebase](https://firebase.google.com).


El proyecto contiene tanto pruebas de [integración](src/app/tests/integration) como de [aceptación](src/app/tests/acceptance), ambas escritas con la librería [Jasmine](https://jasmine.github.io), y se ejecutan en [Karma](https://karma-runner.github.io).


## API principales y su uso
El proyecto se apoya en las siguientes API durante la ejecución del código:
- [OpenRouteService](https://openrouteservice.org/): gestión del cálculo de coordenadas y rutas, compatible con Leaflet
- [datos.gob.es](https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas): obtención del precio del combustible (funciona únicamente en España).
- [Red Eléctrica Española](https://www.ree.es/es/datos/apidatos): obtención del precio de la electricidad (funciona únicamente en España).
Téngase en cuenta que estas deben estar disponibles para el correcto funcionamiento de la aplicación.

## Autores
<a href="https://github.com/CarlosMJCamargo" title="Carlos Manuel Járrega Camargo">
  <img src="https://avatars.githubusercontent.com/u/128591864?v=4" alt="Carlos Manuel Járrega Camargo" width="120"/>
</a>
<a href="https://github.com/al426198" title="Daniel Ortiz Salvador">
  <img src="https://avatars.githubusercontent.com/u/120575816?v=4" alt="Daniel Ortiz Salvador" width="120"/>
</a>
<a href="https://github.com/al426211" title="Diego Roig Lecha">
  <img src="https://avatars.githubusercontent.com/u/128591824?v=4" alt="Diego Roig Lecha" width="120"/>
</a>

## Licencia
Este proyecto está licenciado bajo la licencia MIT.
