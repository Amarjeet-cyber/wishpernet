# WishperNet (Docker build/run instructions)

This repository contains a Spring Boot-based encrypted anonymous chat application. The project is set up to build with Maven (Java 17).

Prerequisites (local):
- Java 17
- Maven 3.x
- Docker & Docker Compose (optional; recommended if you don't want to install Maven locally)

Build & run locally with Maven:

```bash
cd /path/to/WishperNetJava
mvn -DskipTests package
# Run via Spring Boot plugin
mvn -DskipTests spring-boot:run
# or run the generated jar
java -jar target/wishpernet-1.0.0.jar
```

Build & run with Docker (no Maven install needed):

```bash
# Build the image
docker build -t wishpernet:local .

# Run container mapping ports (Spring Boot default 8080, SocketIO configured default 3000)
docker run --rm -p 8080:8080 -p 3000:3000 wishpernet:local
```

Using docker-compose:

```bash
docker compose up --build
```

Notes:
- The project uses `server.port` for the Socket.IO server port fallback (default 3000 in `SocketIOConfig`). If you want to change ports, update `src/main/resources/application.properties` or pass `-Dserver.port=...`.
- If you run into build errors, run `mvn -DskipTests package` locally and paste the output here; I can help fix compile/runtime issues.
